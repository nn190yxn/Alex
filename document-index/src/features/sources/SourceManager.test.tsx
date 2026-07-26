import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { commandClient } from "../../lib/commandClient";
import { SourceManager } from "./SourceManager";

vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn().mockResolvedValue(vi.fn()) }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("../../lib/commandClient", () => ({
  commandClient: {
    listSources: vi.fn(),
    listExtensions: vi.fn(),
    listScanErrors: vi.fn(),
    addSource: vi.fn(),
    setSourceEnabled: vi.fn(),
    startScan: vi.fn(),
    updateExtensions: vi.fn(),
  },
}));

const source = {
  id: "source-1",
  path: "C:\\Archive",
  displayName: "Archive",
  enabled: true,
  status: "ready" as const,
  addedAt: "2026-07-24T08:00:00.000Z",
  lastScanAt: "2026-07-24T09:00:00.000Z",
  lastSuccessAt: "2026-07-24T09:05:00.000Z",
};

const rules = [
  { id: "built-in-pdf", extension: "pdf", builtIn: true, enabled: true },
  { id: "built-in-docx", extension: "docx", builtIn: true, enabled: true },
];

describe("SourceManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listen).mockResolvedValue(vi.fn());
    vi.mocked(commandClient.listSources).mockResolvedValue({ ok: true, data: [source], version: 3 });
    vi.mocked(commandClient.listExtensions).mockResolvedValue({ ok: true, data: rules, version: 3 });
    vi.mocked(commandClient.listScanErrors).mockResolvedValue({
      ok: true,
      data: [{
        scanId: "scan-1",
        path: "C:\\Archive\\Restricted",
        errorType: "permission_denied",
        occurredAt: "2026-07-24T09:01:00.000Z",
        retryStatus: "pending",
      }],
      version: 3,
    });
    vi.mocked(commandClient.startScan).mockResolvedValue({
      ok: true,
      data: {
        id: "scan-2",
        sourceIds: ["source-1"],
        status: "queued",
        discoveredCount: 0,
        processedCount: 0,
        topicCount: 0,
        suggestionCount: 0,
        failureCount: 0,
      },
      version: 3,
    });
  });

  it("shows source state and supports refresh, pause, and error inspection", async () => {
    vi.mocked(commandClient.setSourceEnabled).mockResolvedValue({
      ok: true,
      data: { ...source, enabled: false, status: "paused" },
      version: 3,
    });
    render(<SourceManager />);

    expect(await screen.findByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("C:\\Archive")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "手动刷新" }));
    await waitFor(() => expect(commandClient.startScan).toHaveBeenCalledWith(["source-1"]));

    fireEvent.click(screen.getByRole("button", { name: "暂停" }));
    await waitFor(() => expect(commandClient.setSourceEnabled).toHaveBeenCalledWith("source-1", false));
    expect(await screen.findByText("已暂停")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看错误 (1)" }));
    expect(screen.getByText("permission_denied")).toBeInTheDocument();
    expect(screen.getByText("C:\\Archive\\Restricted")).toBeInTheDocument();
  });

  it("adds a selected directory and saves a validated custom extension", async () => {
    const newSource = { ...source, id: "source-2", path: "D:\\Projects", displayName: "Projects" };
    vi.mocked(open).mockResolvedValue("D:\\Projects");
    vi.mocked(commandClient.addSource).mockResolvedValue({ ok: true, data: newSource, version: 3 });
    vi.mocked(commandClient.updateExtensions).mockResolvedValue({
      ok: true,
      data: [...rules, { id: "custom-odt", extension: "odt", builtIn: false, enabled: true }],
      version: 3,
    });
    const onScanStarted = vi.fn();
    const onSourcesChanged = vi.fn();
    render(<SourceManager onScanStarted={onScanStarted} onSourcesChanged={onSourcesChanged} />);
    await screen.findByText("Archive");

    fireEvent.click(screen.getByRole("button", { name: "添加索引位置" }));
    await waitFor(() => expect(open).toHaveBeenCalledWith({
      title: "选择需要建立索引的目录",
      directory: true,
      multiple: false,
    }));
    await waitFor(() => expect(commandClient.addSource).toHaveBeenCalledWith("D:\\Projects"));
    await waitFor(() => expect(commandClient.startScan).toHaveBeenCalledWith(["source-2"]));
    expect(onSourcesChanged).toHaveBeenLastCalledWith([source, newSource]);
    expect(onScanStarted).toHaveBeenCalledWith(expect.objectContaining({ id: "scan-2", status: "queued" }));
    expect(await screen.findByText("Projects")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "自定义扩展名" }), { target: { value: ".ODT" } });
    fireEvent.click(screen.getByRole("button", { name: "加入规则" }));
    expect(screen.getByText(".odt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "保存文件类型" }));
    await waitFor(() => expect(commandClient.updateExtensions).toHaveBeenCalledWith(["pdf", "docx", "odt"]));
  });
});

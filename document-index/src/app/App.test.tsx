import { listen } from "@tauri-apps/api/event";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScanProgress } from "../domain/models";
import { commandClient } from "../lib/commandClient";
import { App } from "./App";

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

vi.mock("../lib/commandClient", () => ({
  commandClient: {
    health: vi.fn().mockResolvedValue({ ok: true, data: "ready", version: 0 }),
    getIndexStatus: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        scanStatus: "completed",
        discoveredCount: 1280,
        processedCount: 1280,
        documentCount: 1248,
        topicCount: 416,
        suggestionCount: 12,
        failureCount: 3,
        lastCompletedAt: "2026-07-24T12:30:00.000Z",
      },
      version: 3,
    }),
    listSources: vi.fn().mockResolvedValue({
      ok: true,
      data: [{
        id: "source-1",
        path: "C:\\Archive",
        displayName: "Archive",
        enabled: true,
        status: "ready",
        addedAt: "2026-07-24T08:00:00.000Z",
        lastScanAt: "2026-07-24T09:00:00.000Z",
        lastSuccessAt: "2026-07-24T09:05:00.000Z",
      }],
      version: 3,
    }),
    listExtensions: vi.fn().mockResolvedValue({ ok: true, data: [], version: 3 }),
    listScanErrors: vi.fn().mockResolvedValue({ ok: true, data: [], version: 3 }),
    searchTopics: vi.fn().mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 20, total: 0 },
      version: 3,
    }),
    listOrganizeSuggestions: vi.fn().mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 20, total: 0 },
      version: 3,
    }),
    getTopicDetail: vi.fn().mockResolvedValue({
      ok: false,
      error: { code: "TOPIC_NOT_FOUND", message: "Missing" },
    }),
    exportIndexBackup: vi.fn(),
    restoreIndexBackup: vi.fn(),
  },
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    vi.mocked(commandClient.listSources).mockResolvedValue({ ok: true, data: [source], version: 3 });
  });

  it("switches themes immediately and persists the selection", async () => {
    render(<App />);
    await screen.findByText("本地索引服务已就绪");

    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    fireEvent.click(screen.getByRole("button", { name: /极简黑白/ }));

    expect(document.documentElement).toHaveAttribute("data-theme", "minimal");
    expect(window.localStorage.getItem("document-index.appearance-theme")).toBe("minimal");
    expect(screen.getByRole("button", { name: /极简黑白/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders the desktop shell and reports a ready backend", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "资料索引" })).toBeInTheDocument();
    expect(await screen.findByText("本地索引服务已就绪")).toBeInTheDocument();
    expect(await screen.findByText("1,248")).toBeInTheDocument();
    expect(screen.getByText("416")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("索引已就绪")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /搜索工作台/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    fireEvent.click(screen.getByRole("button", { name: /索引位置/ }));
    expect(screen.getByRole("heading", { name: "管理应用可以扫描的位置" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "主导航" })).getByRole("button", { name: /索引位置/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByText("Archive")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /待整理/ }));
    expect(screen.getByRole("heading", { name: "检查需要人工确认的归组" })).toBeInTheDocument();
    expect(await screen.findByText("当前没有待确认的系统合并建议。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    expect(screen.getByRole("heading", { name: "调整资料索引偏好" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出备份" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "从备份恢复" })).toBeInTheDocument();
  });

  it("guides a first-time user to add an index location", async () => {
    vi.mocked(commandClient.listSources).mockResolvedValue({ ok: true, data: [], version: 3 });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "管理应用可以扫描的位置" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "索引位置" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("heading", { name: "选择资料目录，开始建立本地索引" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择资料目录" })).toBeInTheDocument();
    expect(screen.getByText("请添加索引位置")).toBeInTheDocument();
  });

  it("updates the persistent status bar from scan progress events", async () => {
    render(<App />);
    await screen.findByText("1,248");
    const handler = vi.mocked(listen).mock.calls[0][1] as (event: {
      payload: ScanProgress;
    }) => void;

    const progress = (status: ScanProgress["status"], processedCount: number): ScanProgress => ({
      id: "scan-2",
      sourceIds: ["source-1"],
      status,
      startedAt: "2026-07-24T13:00:00.000Z",
      completedAt: status === "completed" ? "2026-07-24T13:01:00.000Z" : undefined,
      discoveredCount: 200,
      processedCount,
      topicCount: 32,
      suggestionCount: 4,
      failureCount: status === "failed" ? 2 : 0,
      currentPath: "C:\\Archive",
      elapsedMs: 5000,
    });

    act(() => handler({ payload: progress("queued", 0) }));
    expect(await screen.findByText("等待扫描")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "扫描进度" })).toHaveAttribute("aria-valuenow", "0");

    act(() => handler({ payload: progress("running", 100) }));

    expect(await screen.findByText("正在扫描")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "扫描进度" })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );

    act(() => handler({ payload: progress("failed", 100) }));
    expect(await screen.findByText("扫描遇到错误")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "扫描进度" })).not.toBeInTheDocument();

    const callsBeforeCompletion = vi.mocked(commandClient.getIndexStatus).mock.calls.length;
    act(() => handler({ payload: progress("completed", 200) }));
    expect(await screen.findByText("索引已就绪")).toBeInTheDocument();
    expect(commandClient.getIndexStatus).toHaveBeenCalledTimes(callsBeforeCompletion + 1);
  });
});

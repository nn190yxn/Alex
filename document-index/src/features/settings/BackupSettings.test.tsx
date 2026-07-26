import { open, save } from "@tauri-apps/plugin-dialog";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { commandClient } from "../../lib/commandClient";
import { BackupSettings } from "./BackupSettings";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock("../../lib/commandClient", () => ({
  commandClient: {
    exportIndexBackup: vi.fn(),
    restoreIndexBackup: vi.fn(),
  },
}));

describe("BackupSettings", () => {
  const appearanceProps = {
    onThemeChange: vi.fn(),
    theme: "parchment" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("exports the current preferences to a path selected by the native save dialog", async () => {
    window.localStorage.setItem("document-index.default-time-dimension", "createdAt");
    window.localStorage.setItem("document-index.workspace-split", "56");
    vi.mocked(save).mockResolvedValue("C:\\Backups\\index.json");
    vi.mocked(commandClient.exportIndexBackup).mockResolvedValue({
      ok: true,
      data: { sourceCount: 2, topicCount: 4, documentCount: 8 },
      version: 3,
    });

    render(<BackupSettings {...appearanceProps} onRestored={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "导出备份" }));

    await waitFor(() => expect(commandClient.exportIndexBackup).toHaveBeenCalledWith(
      "C:\\Backups\\index.json",
      { defaultTimeDimension: "createdAt", theme: "parchment", workspaceSplit: 56 },
    ));
    expect(await screen.findByText("备份已导出，包含 8 条文档元数据。")).toBeInTheDocument();
  });

  it("restores preferences to localStorage and refreshes authoritative application data", async () => {
    const onRestored = vi.fn();
    vi.mocked(open).mockResolvedValue("C:\\Backups\\index.json");
    vi.mocked(commandClient.restoreIndexBackup).mockResolvedValue({
      ok: true,
      data: {
        preferences: { defaultTimeDimension: "createdAt", theme: "minimal", workspaceSplit: 61 },
        sourceCount: 1,
        topicCount: 2,
        documentCount: 3,
      },
      version: 3,
    });

    render(<BackupSettings {...appearanceProps} onRestored={onRestored} />);
    fireEvent.click(screen.getByRole("button", { name: "从备份恢复" }));
    await screen.findByRole("button", { name: "确认替换并恢复" });
    expect(commandClient.restoreIndexBackup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "确认替换并恢复" }));

    await screen.findByText("索引已恢复，已重新校验 1 个索引位置。");
    expect(window.localStorage.getItem("document-index.default-time-dimension")).toBe("createdAt");
    expect(window.localStorage.getItem("document-index.workspace-split")).toBe("61");
    expect(appearanceProps.onThemeChange).toHaveBeenCalledWith("minimal");
    expect(onRestored).toHaveBeenCalledOnce();
  });

  it("leaves the current index unchanged when backup validation fails", async () => {
    vi.mocked(open).mockResolvedValue("C:\\Backups\\broken.json");
    vi.mocked(commandClient.restoreIndexBackup).mockResolvedValue({
      ok: false,
      error: { code: "INVALID_INPUT", message: "备份文件无效。", field: "backup" },
    });
    const onRestored = vi.fn();

    render(<BackupSettings {...appearanceProps} onRestored={onRestored} />);
    fireEvent.click(screen.getByRole("button", { name: "从备份恢复" }));
    fireEvent.click(await screen.findByRole("button", { name: "确认替换并恢复" }));

    expect(await screen.findByText("备份文件无效。")).toBeInTheDocument();
    expect(onRestored).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TopicDetail } from "../../domain/models";
import { commandClient, RECYCLE_CONFIRMATION_TOKEN } from "../../lib/commandClient";
import { TopicDetailPanel } from "./TopicDetailPanel";

vi.mock("../../lib/commandClient", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/commandClient")>();
  return {
    ...original,
    commandClient: {
      getTopicDetail: vi.fn(),
      openDocument: vi.fn(),
      revealDocument: vi.fn(),
      recycleDocuments: vi.fn(),
      openRecycleBin: vi.fn(),
    },
  };
});

const detail: TopicDetail = {
  id: "topic-1",
  canonicalName: "年度商业计划",
  displayName: "年度商业计划",
  displayNameManual: false,
  documentCount: 3,
  groupingConfidence: "high",
  newestCreatedDocument: {
    id: "document-new",
    sourceId: "source-1",
    topicId: "topic-1",
    fileName: "年度商业计划-v4.docx",
    normalizedName: "年度商业计划",
    absolutePath: "C:\\资料\\年度商业计划-v4.docx",
    extension: "docx",
    sizeBytes: 2048,
    versionLabel: "v4",
    createdAt: "2026-07-24T10:00:00.000Z",
    modifiedAt: "2026-07-23T10:00:00.000Z",
    availability: "available",
  },
  recentlyModifiedDocument: {
    id: "document-modified",
    sourceId: "source-1",
    topicId: "topic-1",
    fileName: "年度商业计划-v3.docx",
    normalizedName: "年度商业计划",
    absolutePath: "D:\\归档\\年度商业计划-v3.docx",
    extension: "docx",
    sizeBytes: 1024,
    versionLabel: "v3",
    createdAt: "2026-07-20T10:00:00.000Z",
    modifiedAt: "2026-07-25T08:30:00.000Z",
    availability: "available",
  },
  documents: [],
};

detail.documents = [
  detail.recentlyModifiedDocument!,
  detail.newestCreatedDocument!,
  {
    id: "document-missing",
    sourceId: "source-1",
    topicId: "topic-1",
    fileName: "年度商业计划-v2.docx",
    normalizedName: "年度商业计划",
    absolutePath: "E:\\离线\\年度商业计划-v2.docx",
    extension: "docx",
    sizeBytes: 512,
    versionLabel: "v2",
    availability: "missing",
  },
];

const success = { ok: true as const, data: null, version: 3 };

describe("TopicDetailPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(commandClient.getTopicDetail).mockReset().mockResolvedValue({ ok: true, data: detail, version: 3 });
    vi.mocked(commandClient.openDocument).mockReset().mockResolvedValue(success);
    vi.mocked(commandClient.revealDocument).mockReset().mockResolvedValue(success);
    vi.mocked(commandClient.recycleDocuments).mockReset().mockResolvedValue({
      ok: true,
      data: { recycledDocumentIds: ["document-new", "document-modified"], affectedTopicIds: ["topic-1"] },
      version: 3,
    });
    vi.mocked(commandClient.openRecycleBin).mockReset().mockResolvedValue(success);
  });

  it("restores the time dimension and renders every version with dual-time markers", async () => {
    window.localStorage.setItem("document-index.default-time-dimension", "createdAt");
    render(<TopicDetailPanel onTopicUpdated={vi.fn()} topicId="topic-1" />);

    expect(await screen.findByRole("heading", { name: "年度商业计划" })).toBeInTheDocument();
    expect(commandClient.getTopicDetail).toHaveBeenCalledWith("topic-1", "createdAt", "desc");
    expect(screen.getAllByText("规范化名称：年度商业计划")).toHaveLength(4);
    expect(screen.getAllByText("最新创建")).toHaveLength(1);
    expect(screen.getAllByText("最近修改")).toHaveLength(1);
    expect(screen.getByText("文件缺失")).toBeInTheDocument();
    expect(screen.getByLabelText("选择 年度商业计划-v2.docx")).toBeDisabled();

    fireEvent.change(screen.getByRole("combobox", { name: "版本排序" }), { target: { value: "fileName" } });
    await waitFor(() => expect(commandClient.getTopicDetail).toHaveBeenLastCalledWith("topic-1", "fileName", "asc"));
    expect(window.localStorage.getItem("document-index.default-time-dimension")).toBe("createdAt");

    fireEvent.change(screen.getByRole("combobox", { name: "版本排序" }), { target: { value: "version" } });
    await waitFor(() => expect(commandClient.getTopicDetail).toHaveBeenLastCalledWith("topic-1", "version", "desc"));

    fireEvent.change(screen.getByRole("combobox", { name: "版本排序" }), { target: { value: "modifiedAt" } });
    await waitFor(() => expect(commandClient.getTopicDetail).toHaveBeenLastCalledWith("topic-1", "modifiedAt", "desc"));
    expect(window.localStorage.getItem("document-index.default-time-dimension")).toBe("modifiedAt");
  });

  it("opens files, selects available versions, and confirms safe recycle", async () => {
    const onTopicUpdated = vi.fn();
    render(<TopicDetailPanel onTopicUpdated={onTopicUpdated} topicId="topic-1" />);
    await screen.findByRole("heading", { name: "年度商业计划" });

    const modifiedRow = screen.getByText("年度商业计划-v3.docx").closest("article");
    expect(modifiedRow).not.toBeNull();
    fireEvent.click(within(modifiedRow!).getByRole("button", { name: "默认程序打开" }));
    await waitFor(() => expect(commandClient.openDocument).toHaveBeenCalledWith("document-modified"));
    fireEvent.click(within(modifiedRow!).getByRole("button", { name: "打开所在目录" }));
    await waitFor(() => expect(commandClient.revealDocument).toHaveBeenCalledWith("document-modified"));

    fireEvent.click(screen.getByLabelText("选择 年度商业计划-v3.docx"));
    fireEvent.click(screen.getByLabelText("选择 年度商业计划-v4.docx"));
    const toolbar = screen.getByRole("toolbar", { name: "版本批量操作" });
    expect(within(toolbar).getByText("已选择 2 / 2")).toBeInTheDocument();
    fireEvent.click(within(toolbar).getByRole("button", { name: "移入回收站" }));

    const dialog = screen.getByRole("dialog", { name: "确认移入回收站" });
    expect(within(dialog).getByText("D:\\归档\\年度商业计划-v3.docx")).toBeInTheDocument();
    expect(within(dialog).getByText("C:\\资料\\年度商业计划-v4.docx")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "确认移入 Windows 回收站" }));

    await waitFor(() => expect(commandClient.recycleDocuments).toHaveBeenCalledWith(
      ["document-modified", "document-new"],
      RECYCLE_CONFIRMATION_TOKEN,
    ));
    expect(await screen.findByText("2 个文件已移入 Windows 回收站。")).toBeInTheDocument();
    expect(onTopicUpdated).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "打开回收站" }));
    expect(commandClient.openRecycleBin).toHaveBeenCalledOnce();
  });

  it("selects an available version for preview independently from recycle selection", async () => {
    const onPreviewDocument = vi.fn();
    render(
      <TopicDetailPanel
        onPreviewDocument={onPreviewDocument}
        onTopicUpdated={vi.fn()}
        previewDocumentId="document-modified"
        topicId="topic-1"
      />,
    );
    await screen.findByRole("heading", { name: "年度商业计划" });

    const modifiedRow = screen.getByText("年度商业计划-v3.docx").closest("article");
    const newRow = screen.getByText("年度商业计划-v4.docx").closest("article");
    const missingRow = screen.getByText("年度商业计划-v2.docx").closest("article");
    expect(within(modifiedRow!).getByRole("button", { name: "预览" })).toHaveAttribute("aria-pressed", "true");
    expect(within(missingRow!).getByRole("button", { name: "预览" })).toBeDisabled();

    fireEvent.click(within(newRow!).getByRole("button", { name: "预览" }));
    expect(onPreviewDocument).toHaveBeenCalledWith(detail.newestCreatedDocument);
    expect(screen.getByRole("toolbar", { name: "版本批量操作" })).toHaveTextContent("已选择 0 / 2");
  });

  it("keeps the confirmation visible and reports a recycle failure", async () => {
    vi.mocked(commandClient.recycleDocuments).mockResolvedValueOnce({
      ok: false,
      error: { code: "FILE_SYSTEM_ERROR", message: "Recycle operation failed." },
    });
    render(<TopicDetailPanel onTopicUpdated={vi.fn()} topicId="topic-1" />);
    await screen.findByRole("heading", { name: "年度商业计划" });

    const row = screen.getByText("年度商业计划-v4.docx").closest("article");
    fireEvent.click(within(row!).getByRole("button", { name: "移入回收站" }));
    const dialog = screen.getByRole("dialog", { name: "确认移入回收站" });
    fireEvent.click(within(dialog).getByRole("button", { name: "确认移入 Windows 回收站" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("当前索引保持原状");
    expect(screen.getByRole("dialog", { name: "确认移入回收站" })).toBeInTheDocument();
  });
});

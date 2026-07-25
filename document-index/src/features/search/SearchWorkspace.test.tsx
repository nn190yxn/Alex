import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Page, TopicDetail, TopicSummary } from "../../domain/models";
import { commandClient } from "../../lib/commandClient";
import { SearchWorkspace } from "./SearchWorkspace";

vi.mock("../../lib/commandClient", () => ({
  commandClient: {
    listSources: vi.fn(),
    searchTopics: vi.fn(),
    getTopicDetail: vi.fn(),
    createPreviewSession: vi.fn(),
    resizePreviewSession: vi.fn(),
    closePreviewSession: vi.fn(),
  },
}));

const topic: TopicSummary = {
  id: "topic-1",
  displayName: "年度商业计划",
  documentCount: 4,
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
    createdAt: "2026-07-20T10:00:00.000Z",
    modifiedAt: "2026-07-25T08:30:00.000Z",
    availability: "available",
  },
};

const page: Page<TopicSummary> = {
  items: [topic],
  page: 1,
  pageSize: 20,
  total: 21,
};

const topicDetail: TopicDetail = {
  ...topic,
  canonicalName: "年度商业计划",
  displayNameManual: false,
  documents: [topic.recentlyModifiedDocument!, topic.newestCreatedDocument!],
};

describe("SearchWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(commandClient.listSources).mockReset().mockResolvedValue({
      ok: true,
      data: [{
        id: "source-1",
        path: "C:\\资料",
        displayName: "工作资料",
        enabled: true,
        status: "ready",
        addedAt: "2026-07-20T00:00:00.000Z",
      }],
      version: 3,
    });
    vi.mocked(commandClient.searchTopics).mockReset().mockResolvedValue({
      ok: true,
      data: page,
      version: 3,
    });
    vi.mocked(commandClient.getTopicDetail).mockReset().mockResolvedValue({
      ok: true,
      data: topicDetail,
      version: 3,
    });
    vi.mocked(commandClient.createPreviewSession).mockReset().mockResolvedValue({
      ok: true,
      data: {
        id: "preview-1",
        documentId: "document-modified",
        fileName: "年度商业计划-v3.docx",
        extension: "docx",
        sizeBytes: 1024,
        content: { type: "office", sections: [{ label: "正文", text: "计划正文预览" }] },
      },
      version: 3,
    });
    vi.mocked(commandClient.resizePreviewSession).mockReset().mockResolvedValue({ ok: true, data: null, version: 3 });
    vi.mocked(commandClient.closePreviewSession).mockReset().mockResolvedValue({ ok: true, data: null, version: 3 });
  });

  it("queries metadata filters and renders dual-time topic summaries", async () => {
    render(<SearchWorkspace />);

    expect(await screen.findByRole("button", { name: /年度商业计划/ })).toBeInTheDocument();
    expect(screen.getByText("21 个主题")).toBeInTheDocument();
    expect(screen.getByText("最新创建")).toBeInTheDocument();
    expect(screen.getByText("最近修改")).toBeInTheDocument();
    const topicCard = screen.getByRole("button", { name: /年度商业计划/ });
    expect(within(topicCard).getByText("最新创建").closest(".topic-marker")?.querySelector("time"))
      .toHaveAttribute("datetime", "2026-07-24T10:00:00.000Z");
    expect(within(topicCard).getByText("最近修改").closest(".topic-marker")?.querySelector("time"))
      .toHaveAttribute("datetime", "2026-07-25T08:30:00.000Z");
    expect(within(topicCard).getByTitle("C:\\资料\\年度商业计划-v4.docx")).toBeInTheDocument();
    expect(within(topicCard).getByTitle("D:\\归档\\年度商业计划-v3.docx")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索资料" }), {
      target: { value: "  商业计划  " },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "索引位置" }), {
      target: { value: "source-1" },
    });
    fireEvent.change(screen.getByLabelText("修改日期从"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("目录"), {
      target: { value: "C:\\资料\\年度" },
    });
    fireEvent.change(screen.getByLabelText("创建日期从"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByLabelText("创建日期至"), {
      target: { value: "2026-06-30" },
    });
    fireEvent.change(screen.getByLabelText("修改日期至"), {
      target: { value: "2026-07-31" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "排序" }), {
      target: { value: "createdAt:desc" },
    });

    await waitFor(() => {
      expect(commandClient.searchTopics).toHaveBeenLastCalledWith(expect.objectContaining({
        text: "商业计划",
        sourceIds: ["source-1"],
        directory: "C:\\资料\\年度",
        createdFrom: "2026-06-01T00:00:00.000Z",
        createdTo: "2026-06-30T23:59:59.999Z",
        modifiedFrom: "2026-07-01T00:00:00.000Z",
        modifiedTo: "2026-07-31T23:59:59.999Z",
        sortBy: "createdAt",
        sortDirection: "desc",
        page: 1,
      }));
    });
  });

  it("keeps selection context, paginates, and adjusts the split with the keyboard", async () => {
    render(<SearchWorkspace />);
    const result = await screen.findByRole("button", { name: /年度商业计划/ });
    const divider = screen.getByRole("separator", { name: "调整结果与预览宽度" });
    const split = divider.parentElement!;

    expect(split).toHaveAttribute("data-preview-mode", "normal");
    expect(split).toHaveStyle("--result-width: 42%");
    expect(screen.getByRole("region", { name: "主题检索结果" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "文件预览区域" })).toBeInTheDocument();

    fireEvent.click(result);
    expect(await screen.findByRole("heading", { name: "年度商业计划" })).toBeInTheDocument();
    expect(within(screen.getByLabelText("主题版本列表"))
      .getByText("D:\\归档\\年度商业计划-v3.docx")).toBeInTheDocument();

    fireEvent.keyDown(divider, { key: "ArrowRight" });
    expect(divider).toHaveAttribute("aria-valuenow", "44");
    expect(window.localStorage.getItem("document-index.workspace-split")).toBe("44");
    expect(split).toHaveStyle("--result-width: 44%");

    vi.mocked(commandClient.searchTopics).mockResolvedValueOnce({
      ok: true,
      data: { ...page, page: 2 },
      version: 3,
    });
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    await waitFor(() => {
      expect(commandClient.searchTopics).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    });
    expect(await screen.findByText("第 2 / 2 页")).toBeInTheDocument();
  });

  it("renders the empty state and clears every search filter", async () => {
    vi.mocked(commandClient.searchTopics).mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 20, total: 0 },
      version: 3,
    });
    render(<SearchWorkspace />);

    expect(await screen.findByText("当前条件没有找到主题")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "搜索资料" }), { target: { value: "合同" } });
    fireEvent.change(screen.getByRole("combobox", { name: "索引位置" }), { target: { value: "source-1" } });
    fireEvent.change(screen.getByLabelText("目录"), { target: { value: "C:\\资料\\合同" } });
    fireEvent.change(screen.getByLabelText("创建日期从"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("创建日期至"), { target: { value: "2026-01-31" } });
    fireEvent.change(screen.getByLabelText("修改日期从"), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText("修改日期至"), { target: { value: "2026-02-28" } });
    fireEvent.change(screen.getByRole("combobox", { name: "排序" }), { target: { value: "fileName:asc" } });

    fireEvent.click(screen.getByRole("button", { name: "清除全部筛选" }));

    expect(screen.getByRole("searchbox", { name: "搜索资料" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "索引位置" })).toHaveValue("");
    expect(screen.getByLabelText("目录")).toHaveValue("");
    expect(screen.getByLabelText("创建日期从")).toHaveValue("");
    expect(screen.getByLabelText("创建日期至")).toHaveValue("");
    expect(screen.getByLabelText("修改日期从")).toHaveValue("");
    expect(screen.getByLabelText("修改日期至")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "排序" })).toHaveValue("modifiedAt:desc");
    await waitFor(() => {
      expect(commandClient.searchTopics).toHaveBeenLastCalledWith(expect.objectContaining({
        text: "",
        sourceIds: [],
        sortBy: "modifiedAt",
        sortDirection: "desc",
        page: 1,
      }));
    });
  });

  it("restores the split preference and round-trips the full-width layout", async () => {
    window.localStorage.setItem("document-index.workspace-split", "56");
    render(<SearchWorkspace />);

    await screen.findByRole("button", { name: /年度商业计划/ });
    const divider = screen.getByRole("separator", { name: "调整结果与预览宽度" });
    const split = divider.parentElement!;
    expect(divider).toHaveAttribute("aria-valuenow", "56");
    expect(split).toHaveStyle("--result-width: 56%");
    expect(split).toHaveAttribute("data-preview-mode", "normal");

    fireEvent.click(screen.getByRole("button", { name: "工作区全宽" }));
    expect(split).toHaveAttribute("data-preview-mode", "full");
    expect(screen.getByRole("region", { name: "主题检索结果" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "恢复分栏" }));
    expect(split).toHaveAttribute("data-preview-mode", "normal");
    expect(divider).toHaveAttribute("aria-valuenow", "56");
  });

  it("previews a selected version and releases the session when the pane collapses", async () => {
    render(<SearchWorkspace />);
    fireEvent.click(await screen.findByRole("button", { name: /年度商业计划/ }));
    const versionRow = (await screen.findByText("年度商业计划-v3.docx")).closest("article");
    fireEvent.click(within(versionRow!).getByRole("button", { name: "预览" }));

    expect(await screen.findByText("计划正文预览")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "工作区全宽" }));
    expect(screen.getByRole("button", { name: "恢复分栏" })).toBeInTheDocument();
    expect(screen.getByRole("separator", { name: "调整结果与预览宽度" }).parentElement)
      .toHaveAttribute("data-preview-mode", "full");
    fireEvent.click(screen.getByRole("button", { name: "折叠预览" }));
    await waitFor(() => expect(commandClient.closePreviewSession).toHaveBeenCalledWith("preview-1"));
    expect(screen.getByRole("button", { name: "展开文件预览" })).toBeInTheDocument();
    const split = screen.getByRole("separator", { name: "调整结果与预览宽度" }).parentElement!;
    expect(split).toHaveAttribute("data-preview-mode", "collapsed");

    fireEvent.click(screen.getByRole("button", { name: "展开文件预览" }));
    expect(split).toHaveAttribute("data-preview-mode", "normal");
    expect(await screen.findByText("计划正文预览")).toBeInTheDocument();
    expect(commandClient.createPreviewSession).toHaveBeenCalledTimes(2);
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { commandClient } from "../../lib/commandClient";
import { OrganizeQueue } from "./OrganizeQueue";

vi.mock("../../lib/commandClient", () => ({
  commandClient: {
    listOrganizeSuggestions: vi.fn(),
    acceptOrganizeSuggestion: vi.fn(),
    dismissOrganizeSuggestion: vi.fn(),
    searchTopics: vi.fn(),
    getTopicDetail: vi.fn(),
    renameTopic: vi.fn(),
    mergeTopics: vi.fn(),
    moveDocumentsToTopic: vi.fn(),
  },
}));

const topicA = {
  id: "topic-a",
  displayName: "Plan A",
  documentCount: 1,
  groupingConfidence: "medium" as const,
};

const topicB = {
  id: "topic-b",
  displayName: "Plan B",
  documentCount: 1,
  groupingConfidence: "low" as const,
};

const documentA = {
  id: "document-a",
  sourceId: "source-a",
  topicId: "topic-a",
  fileName: "Plan-v1.docx",
  normalizedName: "Plan",
  absolutePath: "C:\\Archive\\Plan-v1.docx",
  extension: "docx",
  sizeBytes: 128,
  availability: "available" as const,
};

const detailA = {
  ...topicA,
  canonicalName: "plan a",
  displayNameManual: false,
  documents: [documentA],
};

const suggestion = {
  id: "suggestion-1",
  sourceTopicIds: ["topic-a", "topic-b"],
  proposedDisplayName: "Quarterly Plan",
  confidence: "medium" as const,
  score: 0.72,
  evidence: [{ kind: "keywords" as const, score: 0.42, summary: "Names overlap." }],
  status: "pending" as const,
};

describe("OrganizeQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(commandClient.listOrganizeSuggestions).mockResolvedValue({
      ok: true,
      data: { items: [], page: 1, pageSize: 20, total: 0 },
      version: 3,
    });
    vi.mocked(commandClient.searchTopics).mockResolvedValue({
      ok: true,
      data: { items: [topicA, topicB], page: 1, pageSize: 100, total: 2 },
      version: 3,
    });
    vi.mocked(commandClient.getTopicDetail).mockResolvedValue({ ok: true, data: detailA, version: 3 });
  });

  it("shows grouping evidence and resolves system suggestions", async () => {
    const onSuggestionResolved = vi.fn();
    vi.mocked(commandClient.listOrganizeSuggestions)
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [suggestion], page: 1, pageSize: 20, total: 1 },
        version: 3,
      })
      .mockResolvedValue({
        ok: true,
        data: { items: [], page: 1, pageSize: 20, total: 0 },
        version: 3,
      });
    vi.mocked(commandClient.acceptOrganizeSuggestion).mockResolvedValue({
      ok: true,
      data: { ...detailA, displayName: "Quarterly Plan", documentCount: 2 },
      version: 3,
    });
    render(<OrganizeQueue onSuggestionResolved={onSuggestionResolved} />);

    expect(await screen.findByText("Quarterly Plan")).toBeInTheDocument();
    expect(screen.getByText("中置信度")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("关键词")).toBeInTheDocument();
    expect(screen.getByText("Names overlap.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "接受合并" }));
    await waitFor(() => expect(commandClient.acceptOrganizeSuggestion).toHaveBeenCalledWith("suggestion-1"));
    expect(await screen.findByText("已合并为“Quarterly Plan”。")).toBeInTheDocument();
    expect(onSuggestionResolved).toHaveBeenCalledTimes(1);
  });

  it("dismisses a suggestion without applying a merge", async () => {
    vi.mocked(commandClient.listOrganizeSuggestions).mockResolvedValue({
      ok: true,
      data: { items: [suggestion], page: 1, pageSize: 20, total: 1 },
      version: 3,
    });
    vi.mocked(commandClient.dismissOrganizeSuggestion).mockResolvedValue({
      ok: true,
      data: { ...suggestion, status: "dismissed" },
      version: 3,
    });
    render(<OrganizeQueue />);

    fireEvent.click(await screen.findByRole("button", { name: "忽略建议" }));
    await waitFor(() => expect(commandClient.dismissOrganizeSuggestion).toHaveBeenCalledWith("suggestion-1"));
    expect(await screen.findByText("已忽略“Quarterly Plan”建议。")).toBeInTheDocument();
    expect(commandClient.acceptOrganizeSuggestion).not.toHaveBeenCalled();
  });

  it("supports topic rename and multi-topic merge", async () => {
    vi.mocked(commandClient.renameTopic).mockResolvedValue({
      ok: true,
      data: { ...detailA, displayName: "Preferred Plan", displayNameManual: true },
      version: 3,
    });
    vi.mocked(commandClient.mergeTopics).mockResolvedValue({
      ok: true,
      data: { ...detailA, displayName: "Combined Plan", documentCount: 2 },
      version: 3,
    });
    render(<OrganizeQueue />);
    await screen.findByText("Plan A");

    fireEvent.change(await screen.findByRole("textbox", { name: "主题显示名称" }), {
      target: { value: "Preferred Plan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存名称" }));
    await waitFor(() => expect(commandClient.renameTopic).toHaveBeenCalledWith("topic-a", "Preferred Plan"));

    fireEvent.click(await screen.findByRole("checkbox", { name: "选择主题 Plan A" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "选择主题 Plan B" }));
    fireEvent.change(screen.getByRole("textbox", { name: "合并后的主题名称" }), {
      target: { value: "Combined Plan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "合并所选主题" }));
    await waitFor(() => expect(commandClient.mergeTopics).toHaveBeenCalledWith(
      ["topic-a", "topic-b"],
      "Combined Plan",
    ));
  });

  it("paginates the complete topic catalog for manual editing", async () => {
    const topicC = { ...topicB, id: "topic-c", displayName: "Plan C" };
    vi.mocked(commandClient.searchTopics).mockImplementation(async (query) => ({
      ok: true,
      data: query.page === 1
        ? { items: [topicA, topicB], page: 1, pageSize: 100, total: 101 }
        : { items: [topicC], page: 2, pageSize: 100, total: 101 },
      version: 3,
    }));

    render(<OrganizeQueue />);

    expect(await screen.findByText("101 个主题")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "选择主题 Plan A" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "选择文档 Plan-v1.docx" }));
    const pagination = screen.getByRole("navigation", { name: "人工主题目录分页" });
    fireEvent.click(within(pagination).getByRole("button", { name: "下一页" }));

    fireEvent.click(await screen.findByRole("checkbox", { name: "选择主题 Plan C" }));
    fireEvent.change(screen.getByRole("textbox", { name: "合并后的主题名称" }), {
      target: { value: "Combined Plan" },
    });
    expect(screen.getByRole("button", { name: "合并所选主题" })).toBeEnabled();
    fireEvent.change(screen.getByRole("combobox", { name: "拆分到现有主题" }), {
      target: { value: "topic-c" },
    });
    expect(screen.getByRole("button", { name: "移动所选文档" })).toBeEnabled();
    expect(commandClient.searchTopics).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));
  });

  it("moves selected documents to a new topic", async () => {
    vi.mocked(commandClient.moveDocumentsToTopic).mockResolvedValue({
      ok: true,
      data: [{ ...detailA, id: "topic-new", displayName: "Archive", documents: [documentA] }],
      version: 3,
    });
    render(<OrganizeQueue />);

    fireEvent.click(await screen.findByRole("checkbox", { name: "选择文档 Plan-v1.docx" }));
    fireEvent.change(screen.getByRole("textbox", { name: "拆分到新主题" }), {
      target: { value: "Archive" },
    });
    fireEvent.click(screen.getByRole("button", { name: "移动所选文档" }));

    await waitFor(() => expect(commandClient.moveDocumentsToTopic).toHaveBeenCalledWith(
      ["document-a"],
      undefined,
      "Archive",
    ));
  });
});

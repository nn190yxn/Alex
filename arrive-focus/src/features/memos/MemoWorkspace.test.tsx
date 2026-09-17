// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/I18nContext";
import type { MemoClient } from "./memoClient";
import { MemoWorkspace } from "./MemoWorkspace";
import type { MemoRecord, MemoSummary } from "./types";

const record: MemoRecord = {
  id: "memo-1", title: "边界", body: "写清边界", displayTitle: "边界", tags: [{ id: "design", name: "设计" }], pinnedAt: null, reminder: null,
  createdAt: "2026-07-19T09:00:00Z", updatedAt: "2026-07-19T09:00:00Z",
};
const summary: MemoSummary = { id: record.id, displayTitle: record.displayTitle, bodyPreview: record.body, tags: record.tags, pinnedAt: record.pinnedAt, reminder: null, updatedAt: record.updatedAt };
const success = <T,>(data: T) => ({ ok: true as const, data, version: 1 });

function renderWorkspace(client: MemoClient) {
  return render(<I18nProvider locale="zh-CN"><MemoWorkspace client={client} /></I18nProvider>);
}

describe("MemoWorkspace", () => {
  it("loads and edits a memo", async () => {
    const client: MemoClient = {
      list: vi.fn(async () => success([summary])),
      get: vi.fn(async () => success(record)),
      create: vi.fn(), update: vi.fn(async (_id, input) => success({ ...record, ...input, displayTitle: input.title })),
      remove: vi.fn(), listTags: vi.fn(),
    };
    renderWorkspace(client);

    await waitFor(() => expect(screen.getByDisplayValue("边界")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("正文"), { target: { value: "新的内容" } });
    fireEvent.click(screen.getByRole("button", { name: "保存备忘录" }));

    await waitFor(() => expect(client.update).toHaveBeenCalledWith("memo-1", expect.objectContaining({ body: "新的内容" })));
  });

  it("creates a memo from the empty editor", async () => {
    const client: MemoClient = {
      list: vi.fn(async () => success([])),
      create: vi.fn(async (input) => success({ ...record, ...input, id: "memo-2", displayTitle: input.title })),
      update: vi.fn(), remove: vi.fn(), get: vi.fn(async () => success(record)), listTags: vi.fn(),
    };
    renderWorkspace(client);

    fireEvent.click(screen.getByRole("button", { name: "新建备忘录" }));
    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "新线索" } });
    fireEvent.change(screen.getByLabelText("正文"), { target: { value: "记录下来" } });
    fireEvent.click(screen.getByRole("button", { name: "保存备忘录" }));

    await waitFor(() => expect(client.create).toHaveBeenCalledWith(expect.objectContaining({ title: "新线索", body: "记录下来" })));
  });

  it("retries a failed list and removes a memo", async () => {
    let attempts = 0;
    const client: MemoClient = {
      list: vi.fn(async () => attempts++ === 0
        ? { ok: false as const, error: { code: "UNKNOWN", message: "加载失败" }, version: 1 }
        : success([summary])),
      get: vi.fn(async () => success(record)), create: vi.fn(), update: vi.fn(),
      remove: vi.fn(async () => success(null)), listTags: vi.fn(),
    };
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWorkspace(client);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("操作失败"));
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(screen.getByDisplayValue("边界")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "删除备忘录" }));

    await waitFor(() => expect(client.remove).toHaveBeenCalledWith("memo-1"));
    expect(screen.getByText("选择一条备忘录开始编辑")).toBeInTheDocument();
  });
});

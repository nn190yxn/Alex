import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DocumentSummary, PreviewSession } from "../../domain/models";
import { commandClient } from "../../lib/commandClient";
import { PreviewPane } from "./PreviewPane";

vi.mock("../../lib/commandClient", () => ({
  commandClient: {
    createPreviewSession: vi.fn(),
    resizePreviewSession: vi.fn(),
    closePreviewSession: vi.fn(),
    openDocument: vi.fn(),
    revealDocument: vi.fn(),
  },
}));

const document: DocumentSummary = {
  id: "document-1",
  sourceId: "source-1",
  topicId: "topic-1",
  fileName: "运营方案.md",
  normalizedName: "运营方案",
  absolutePath: "C:\\资料\\运营方案.md",
  extension: "md",
  sizeBytes: 2048,
  availability: "available",
};

const textSession: PreviewSession = {
  id: "preview-1",
  documentId: document.id,
  fileName: document.fileName,
  extension: document.extension,
  sizeBytes: document.sizeBytes,
  content: { type: "text", text: "只读预览正文" },
};

describe("PreviewPane", () => {
  beforeEach(() => {
    vi.mocked(commandClient.createPreviewSession).mockReset().mockResolvedValue({ ok: true, data: textSession, version: 3 });
    vi.mocked(commandClient.resizePreviewSession).mockReset().mockResolvedValue({ ok: true, data: null, version: 3 });
    vi.mocked(commandClient.closePreviewSession).mockReset().mockResolvedValue({ ok: true, data: null, version: 3 });
    vi.mocked(commandClient.openDocument).mockReset().mockResolvedValue({ ok: true, data: null, version: 3 });
    vi.mocked(commandClient.revealDocument).mockReset().mockResolvedValue({ ok: true, data: null, version: 3 });
  });

  it("loads one read-only session, synchronizes its viewport, and releases it", async () => {
    const { unmount } = render(
      <PreviewPane document={document} fullWidth={false} onCollapse={vi.fn()} onToggleFullWidth={vi.fn()} />,
    );

    expect(await screen.findByText("只读预览正文")).toBeInTheDocument();
    expect(commandClient.createPreviewSession).toHaveBeenCalledWith("document-1", {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    expect(commandClient.resizePreviewSession).toHaveBeenCalledWith("preview-1", expect.objectContaining({ width: 1, height: 1 }));

    fireEvent.click(screen.getByRole("button", { name: "放大预览" }));
    expect(screen.getByLabelText("预览缩放比例")).toHaveTextContent("120%");
    unmount();
    expect(commandClient.closePreviewSession).toHaveBeenCalledWith("preview-1");
  });

  it("switches Office sections and renders the limited-preview fallback", async () => {
    vi.mocked(commandClient.createPreviewSession)
      .mockResolvedValueOnce({
        ok: true,
        data: {
          ...textSession,
          content: {
            type: "office",
            sections: [
              { label: "工作表 1", text: "一月数据" },
              { label: "工作表 2", text: "二月数据" },
            ],
          },
        },
        version: 3,
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { ...textSession, id: "preview-2", content: { type: "limited", reason: "fileTooLarge" } },
        version: 3,
      });

    const { rerender } = render(
      <PreviewPane document={document} fullWidth={false} onCollapse={vi.fn()} onToggleFullWidth={vi.fn()} />,
    );
    expect(await screen.findByText("一月数据")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "工作表 2" }));
    expect(screen.getByText("二月数据")).toBeInTheDocument();

    const largeDocument = { ...document, id: "document-2", fileName: "大型资料.pdf", extension: "pdf" };
    rerender(<PreviewPane document={largeDocument} fullWidth={false} onCollapse={vi.fn()} onToggleFullWidth={vi.fn()} />);
    expect(await screen.findByText("文件超过当前格式的安全预览大小限制。")).toBeInTheDocument();
    await waitFor(() => expect(commandClient.closePreviewSession).toHaveBeenCalledWith("preview-1"));
    fireEvent.click(screen.getByRole("button", { name: "默认程序打开" }));
    expect(commandClient.openDocument).toHaveBeenCalledWith("document-2");
  });
});

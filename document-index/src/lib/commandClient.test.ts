import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { commandClient } from "./commandClient";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("commandClient", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("invokes health without an argument object", async () => {
    vi.mocked(invoke).mockResolvedValue({ ok: true, data: "ready", version: 0 });

    await expect(commandClient.health()).resolves.toEqual({ ok: true, data: "ready", version: 0 });
    expect(invoke).toHaveBeenCalledWith("health", undefined);
  });

  it("normalizes invoke failures without exposing the original exception", async () => {
    vi.mocked(invoke).mockImplementation(async () => {
      throw new Error("C:\\private\\document.txt");
    });

    await expect(commandClient.listSources()).resolves.toEqual({
      ok: false,
      error: {
        code: "COMMAND_INVOCATION_FAILED",
        message: "The desktop command could not be invoked.",
        field: "list_sources",
      },
    });
  });

  it("maps source and scan arguments to their command contracts", async () => {
    vi.mocked(invoke).mockResolvedValue({ ok: true, data: {}, version: 2 });

    await commandClient.setSourceEnabled("source-1", false);
    await commandClient.startScan(["source-1"]);
    await commandClient.cancelScan("scan-1");
    await commandClient.getScanStatus("scan-1");
    await commandClient.getIndexStatus();
    await commandClient.listScanErrors("scan-1");
    await commandClient.listExtensions();
    await commandClient.updateExtensions(["pdf", "docx"]);

    expect(invoke).toHaveBeenNthCalledWith(1, "set_source_enabled", {
      sourceId: "source-1",
      enabled: false,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "start_scan", { sourceIds: ["source-1"] });
    expect(invoke).toHaveBeenNthCalledWith(3, "cancel_scan", { scanId: "scan-1" });
    expect(invoke).toHaveBeenNthCalledWith(4, "get_scan_status", { scanId: "scan-1" });
    expect(invoke).toHaveBeenNthCalledWith(5, "get_index_status", undefined);
    expect(invoke).toHaveBeenNthCalledWith(6, "list_scan_errors", { scanId: "scan-1" });
    expect(invoke).toHaveBeenNthCalledWith(7, "list_extensions", undefined);
    expect(invoke).toHaveBeenNthCalledWith(8, "update_extensions", {
      extensions: ["pdf", "docx"],
    });
  });

  it("maps backup paths and preferences to their command contracts", async () => {
    vi.mocked(invoke).mockResolvedValue({ ok: true, data: {}, version: 3 });
    const preferences = { defaultTimeDimension: "createdAt" as const, workspaceSplit: 56 };

    await commandClient.exportIndexBackup("C:\\Backups\\index.json", preferences);
    await commandClient.restoreIndexBackup("C:\\Backups\\index.json");

    expect(invoke).toHaveBeenNthCalledWith(1, "export_index_backup", {
      path: "C:\\Backups\\index.json",
      preferences,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "restore_index_backup", {
      path: "C:\\Backups\\index.json",
    });
  });

  it("maps topic organization arguments to their command contracts", async () => {
    vi.mocked(invoke).mockResolvedValue({ ok: true, data: {}, version: 3 });

    await commandClient.renameTopic("topic-1", "Project");
    await commandClient.mergeTopics(["topic-1", "topic-2"], "Project");
    await commandClient.moveDocumentsToTopic(["document-1"], undefined, "Archive");
    await commandClient.listOrganizeSuggestions(2, 25);
    await commandClient.acceptOrganizeSuggestion("suggestion-1");
    await commandClient.dismissOrganizeSuggestion("suggestion-2");

    expect(invoke).toHaveBeenNthCalledWith(1, "rename_topic", {
      topicId: "topic-1",
      displayName: "Project",
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "merge_topics", {
      sourceTopicIds: ["topic-1", "topic-2"],
      targetName: "Project",
    });
    expect(invoke).toHaveBeenNthCalledWith(3, "move_documents_to_topic", {
      documentIds: ["document-1"],
      targetTopicId: undefined,
      newTopicName: "Archive",
    });
    expect(invoke).toHaveBeenNthCalledWith(4, "list_organize_suggestions", {
      page: 2,
      pageSize: 25,
    });
    expect(invoke).toHaveBeenNthCalledWith(5, "accept_organize_suggestion", {
      suggestionId: "suggestion-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(6, "dismiss_organize_suggestion", {
      suggestionId: "suggestion-2",
    });
  });

  it("maps search, detail, and file arguments to their command contracts", async () => {
    vi.mocked(invoke).mockResolvedValue({ ok: true, data: {}, version: 3 });
    const query = {
      text: "plan",
      sourceIds: ["source-1"],
      sortBy: "modifiedAt" as const,
      sortDirection: "desc" as const,
      page: 1,
      pageSize: 25,
    };

    await commandClient.searchTopics(query);
    await commandClient.getTopicDetail("topic-1", "createdAt", "asc");
    await commandClient.openDocument("document-1");
    await commandClient.revealDocument("document-1");

    expect(invoke).toHaveBeenNthCalledWith(1, "search_topics", { query });
    expect(invoke).toHaveBeenNthCalledWith(2, "get_topic_detail", {
      topicId: "topic-1",
      sortBy: "createdAt",
      sortDirection: "asc",
    });
    expect(invoke).toHaveBeenNthCalledWith(3, "open_document", {
      documentId: "document-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(4, "reveal_document", {
      documentId: "document-1",
    });
  });

  it("maps preview and recycle arguments to their command contracts", async () => {
    vi.mocked(invoke).mockResolvedValue({ ok: true, data: {}, version: 3 });
    const viewport = { x: 10, y: 20, width: 800, height: 600 };

    await commandClient.createPreviewSession("document-1", viewport);
    await commandClient.resizePreviewSession("preview-1", viewport);
    await commandClient.closePreviewSession("preview-1");
    await commandClient.recycleDocuments(["document-1", "document-2"], "confirmed");
    await commandClient.openRecycleBin();

    expect(invoke).toHaveBeenNthCalledWith(1, "create_preview_session", {
      documentId: "document-1",
      viewport,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "resize_preview_session", {
      sessionId: "preview-1",
      viewport,
    });
    expect(invoke).toHaveBeenNthCalledWith(3, "close_preview_session", {
      sessionId: "preview-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(4, "recycle_documents", {
      documentIds: ["document-1", "document-2"],
      confirmationToken: "confirmed",
    });
    expect(invoke).toHaveBeenNthCalledWith(5, "open_recycle_bin", undefined);
  });
});

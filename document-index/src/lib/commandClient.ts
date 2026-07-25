import { invoke } from "@tauri-apps/api/core";

import type { CommandContract, CommandName, CommandResult } from "../domain/commands";

export const RECYCLE_CONFIRMATION_TOKEN = "move-to-windows-recycle-bin";

export async function invokeCommand<Name extends CommandName>(
  command: Name,
  ...input: CommandContract[Name]["args"] extends undefined
    ? []
    : [CommandContract[Name]["args"]]
): Promise<CommandResult<CommandContract[Name]["output"]>> {
  try {
    const args = input[0];
    return await invoke<CommandResult<CommandContract[Name]["output"]>>(command, args);
  } catch {
    return {
      ok: false,
      error: {
        code: "COMMAND_INVOCATION_FAILED",
        message: "The desktop command could not be invoked.",
        field: command,
      },
    };
  }
}

export const commandClient = {
  health: () => invokeCommand("health"),
  exportIndexBackup: (
    path: string,
    preferences: CommandContract["export_index_backup"]["args"]["preferences"],
  ) => invokeCommand("export_index_backup", { path, preferences }),
  restoreIndexBackup: (path: string) => invokeCommand("restore_index_backup", { path }),
  listSources: () => invokeCommand("list_sources"),
  addSource: (path: string) => invokeCommand("add_source", { path }),
  setSourceEnabled: (sourceId: string, enabled: boolean) =>
    invokeCommand("set_source_enabled", { sourceId, enabled }),
  startScan: (sourceIds: string[]) => invokeCommand("start_scan", { sourceIds }),
  cancelScan: (scanId: string) => invokeCommand("cancel_scan", { scanId }),
  getScanStatus: (scanId: string) => invokeCommand("get_scan_status", { scanId }),
  getIndexStatus: () => invokeCommand("get_index_status"),
  listScanErrors: (scanId?: string) => invokeCommand("list_scan_errors", { scanId }),
  listExtensions: () => invokeCommand("list_extensions"),
  updateExtensions: (extensions: string[]) => invokeCommand("update_extensions", { extensions }),
  renameTopic: (topicId: string, displayName: string) =>
    invokeCommand("rename_topic", { topicId, displayName }),
  mergeTopics: (sourceTopicIds: string[], targetName: string) =>
    invokeCommand("merge_topics", { sourceTopicIds, targetName }),
  moveDocumentsToTopic: (
    documentIds: string[],
    targetTopicId?: string,
    newTopicName?: string,
  ) => invokeCommand("move_documents_to_topic", { documentIds, targetTopicId, newTopicName }),
  listOrganizeSuggestions: (page: number, pageSize: number) =>
    invokeCommand("list_organize_suggestions", { page, pageSize }),
  acceptOrganizeSuggestion: (suggestionId: string) =>
    invokeCommand("accept_organize_suggestion", { suggestionId }),
  dismissOrganizeSuggestion: (suggestionId: string) =>
    invokeCommand("dismiss_organize_suggestion", { suggestionId }),
  searchTopics: (query: CommandContract["search_topics"]["args"]["query"]) =>
    invokeCommand("search_topics", { query }),
  getTopicDetail: (
    topicId: string,
    sortBy: CommandContract["get_topic_detail"]["args"]["sortBy"],
    sortDirection: CommandContract["get_topic_detail"]["args"]["sortDirection"],
  ) => invokeCommand("get_topic_detail", { topicId, sortBy, sortDirection }),
  openDocument: (documentId: string) => invokeCommand("open_document", { documentId }),
  revealDocument: (documentId: string) => invokeCommand("reveal_document", { documentId }),
  createPreviewSession: (
    documentId: string,
    viewport: CommandContract["create_preview_session"]["args"]["viewport"],
  ) => invokeCommand("create_preview_session", { documentId, viewport }),
  resizePreviewSession: (
    sessionId: string,
    viewport: CommandContract["resize_preview_session"]["args"]["viewport"],
  ) => invokeCommand("resize_preview_session", { sessionId, viewport }),
  closePreviewSession: (sessionId: string) =>
    invokeCommand("close_preview_session", { sessionId }),
  recycleDocuments: (documentIds: string[], confirmationToken: string) =>
    invokeCommand("recycle_documents", { documentIds, confirmationToken }),
  openRecycleBin: () => invokeCommand("open_recycle_bin"),
};

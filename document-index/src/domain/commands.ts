import type {
  DocumentId,
  ExtensionRule,
  GroupingSuggestion,
  IndexStatus,
  IndexSource,
  Page,
  PreviewSession,
  PreviewViewport,
  RecycleResult,
  ScanProgress,
  ScanError,
  ScanRun,
  ScanRunId,
  SearchQuery,
  SourceId,
  SuggestionId,
  TopicDetail,
  TopicId,
  TopicSummary,
} from "./models";

export const errorCodes = [
  "INVALID_INPUT",
  "SOURCE_NOT_FOUND",
  "SOURCE_UNAVAILABLE",
  "SOURCE_OVERLAP",
  "PATH_OUTSIDE_SOURCE",
  "DOCUMENT_NOT_FOUND",
  "TOPIC_NOT_FOUND",
  "SCAN_NOT_FOUND",
  "SCAN_ALREADY_RUNNING",
  "DATABASE_ERROR",
  "FILE_SYSTEM_ERROR",
  "COMMAND_INVOCATION_FAILED",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export interface DomainError {
  code: ErrorCode | (string & {});
  message: string;
  field?: string;
}

export type CommandResult<T> =
  | { ok: true; data: T; version: number }
  | { ok: false; error: DomainError };

export interface BackupPreferences {
  defaultTimeDimension: "modifiedAt" | "createdAt";
  theme: "parchment" | "minimal";
  workspaceSplit: number;
}

export interface BackupExportResult {
  sourceCount: number;
  topicCount: number;
  documentCount: number;
}

export interface BackupRestoreResult extends BackupExportResult {
  preferences: BackupPreferences;
}

export interface CommandContract {
  health: { args: undefined; output: "ready" };
  export_index_backup: { args: { path: string; preferences: BackupPreferences }; output: BackupExportResult };
  restore_index_backup: { args: { path: string }; output: BackupRestoreResult };
  list_sources: { args: undefined; output: IndexSource[] };
  add_source: { args: { path: string }; output: IndexSource };
  set_source_enabled: { args: { sourceId: SourceId; enabled: boolean }; output: IndexSource };
  start_scan: { args: { sourceIds: SourceId[] }; output: ScanRun };
  cancel_scan: { args: { scanId: ScanRunId }; output: ScanRun };
  get_scan_status: { args: { scanId: ScanRunId }; output: ScanProgress };
  get_index_status: { args: undefined; output: IndexStatus };
  list_scan_errors: { args: { scanId?: ScanRunId }; output: ScanError[] };
  list_extensions: { args: undefined; output: ExtensionRule[] };
  search_topics: { args: { query: SearchQuery }; output: Page<TopicSummary> };
  get_topic_detail: { args: { topicId: TopicId; sortBy: SearchQuery["sortBy"]; sortDirection: SearchQuery["sortDirection"] }; output: TopicDetail };
  open_document: { args: { documentId: DocumentId }; output: null };
  reveal_document: { args: { documentId: DocumentId }; output: null };
  create_preview_session: { args: { documentId: DocumentId; viewport: PreviewViewport }; output: PreviewSession };
  resize_preview_session: { args: { sessionId: string; viewport: PreviewViewport }; output: null };
  close_preview_session: { args: { sessionId: string }; output: null };
  recycle_documents: { args: { documentIds: DocumentId[]; confirmationToken: string }; output: RecycleResult };
  open_recycle_bin: { args: undefined; output: null };
  rename_topic: { args: { topicId: TopicId; displayName: string }; output: TopicDetail };
  merge_topics: { args: { sourceTopicIds: TopicId[]; targetName: string }; output: TopicDetail };
  move_documents_to_topic: { args: { documentIds: DocumentId[]; targetTopicId?: TopicId; newTopicName?: string }; output: TopicDetail[] };
  list_organize_suggestions: { args: { page: number; pageSize: number }; output: Page<GroupingSuggestion> };
  accept_organize_suggestion: { args: { suggestionId: SuggestionId }; output: TopicDetail };
  dismiss_organize_suggestion: { args: { suggestionId: SuggestionId }; output: GroupingSuggestion };
  update_extensions: { args: { extensions: string[] }; output: ExtensionRule[] };
}

export type CommandName = keyof CommandContract;

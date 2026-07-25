export type SourceId = string;
export type DocumentId = string;
export type TopicId = string;
export type ScanRunId = string;
export type SuggestionId = string;
export type ExtensionRuleId = string;
export type PreviewSessionId = string;

export interface RecycleResult {
  recycledDocumentIds: DocumentId[];
  affectedTopicIds: TopicId[];
}

export type SourceStatus = "ready" | "scanning" | "unavailable" | "paused" | "error";
export type DocumentAvailability = "available" | "missing" | "inaccessible";
export type GroupingConfidence = "manual" | "high" | "medium" | "low";
export type ScanStatus = "queued" | "running" | "completed" | "cancelled" | "failed";
export type SortField = "modifiedAt" | "createdAt" | "version" | "fileName";
export type SortDirection = "asc" | "desc";

export interface IndexSource {
  id: SourceId;
  path: string;
  displayName: string;
  enabled: boolean;
  status: SourceStatus;
  addedAt: string;
  lastScanAt?: string;
  lastSuccessAt?: string;
}

export interface DocumentSummary {
  id: DocumentId;
  sourceId: SourceId;
  topicId: TopicId;
  fileName: string;
  normalizedName: string;
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  versionLabel?: string;
  versionSortKey?: string;
  createdAt?: string;
  modifiedAt?: string;
  availability: DocumentAvailability;
}

export interface TopicSummary {
  id: TopicId;
  displayName: string;
  documentCount: number;
  newestCreatedDocument?: DocumentSummary;
  recentlyModifiedDocument?: DocumentSummary;
  groupingConfidence: GroupingConfidence;
}

export interface TopicDetail extends TopicSummary {
  canonicalName: string;
  displayNameManual: boolean;
  documents: DocumentSummary[];
}

export type PreviewLimitReason = "unsupportedFormat" | "fileTooLarge" | "invalidContent";

export type PreviewContent =
  | { type: "text"; text: string }
  | { type: "binary"; mediaType: string; dataBase64: string }
  | { type: "office"; sections: PreviewSection[] }
  | { type: "native" }
  | { type: "limited"; reason: PreviewLimitReason };

export interface PreviewViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewSection {
  label: string;
  text: string;
}

export interface PreviewSession {
  id: PreviewSessionId;
  documentId: DocumentId;
  fileName: string;
  extension: string;
  sizeBytes: number;
  content: PreviewContent;
}

export interface SearchQuery {
  text: string;
  sourceIds: SourceId[];
  directory?: string;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  sortBy: SortField;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ScanRun {
  id: ScanRunId;
  sourceIds: SourceId[];
  status: ScanStatus;
  startedAt?: string;
  completedAt?: string;
  discoveredCount: number;
  processedCount: number;
  topicCount: number;
  suggestionCount: number;
  failureCount: number;
}

export interface IndexStatus {
  scanStatus?: ScanStatus;
  discoveredCount: number;
  processedCount: number;
  documentCount: number;
  topicCount: number;
  suggestionCount: number;
  failureCount: number;
  lastCompletedAt?: string;
}

export interface ScanProgress extends ScanRun {
  currentPath?: string;
  elapsedMs: number;
}

export interface ScanError {
  scanId: ScanRunId;
  path: string;
  errorType: string;
  occurredAt: string;
  retryStatus: string;
}

export interface GroupingEvidence {
  kind: "normalizedName" | "keywords" | "editSimilarity" | "version" | "fileType" | "path";
  score: number;
  summary: string;
}

export interface GroupingSuggestion {
  id: SuggestionId;
  sourceTopicIds: TopicId[];
  proposedDisplayName: string;
  confidence: Exclude<GroupingConfidence, "manual">;
  score: number;
  evidence: GroupingEvidence[];
  status: "pending" | "accepted" | "dismissed";
}

export interface ExtensionRule {
  id: ExtensionRuleId;
  extension: string;
  builtIn: boolean;
  enabled: boolean;
}

CREATE TABLE index_sources (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    status TEXT NOT NULL CHECK (status IN ('ready', 'scanning', 'unavailable', 'paused', 'error')),
    added_at TEXT NOT NULL,
    last_scan_at TEXT,
    last_success_at TEXT
);

CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    display_name_manual INTEGER NOT NULL DEFAULT 0 CHECK (display_name_manual IN (0, 1)),
    grouping_confidence TEXT NOT NULL CHECK (grouping_confidence IN ('manual', 'high', 'medium', 'low')),
    newest_created_document_id TEXT,
    recently_modified_document_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES index_sources(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
    absolute_path TEXT NOT NULL,
    file_identity TEXT,
    file_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    extension TEXT NOT NULL,
    version_label TEXT,
    version_sort_key TEXT,
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    created_at TEXT,
    modified_at TEXT,
    availability TEXT NOT NULL CHECK (availability IN ('available', 'missing', 'inaccessible')),
    manual_topic INTEGER NOT NULL DEFAULT 0 CHECK (manual_topic IN (0, 1)),
    indexed_at TEXT NOT NULL,
    UNIQUE (source_id, absolute_path)
);

CREATE TABLE grouping_suggestions (
    id TEXT PRIMARY KEY,
    source_topic_ids_json TEXT NOT NULL,
    proposed_display_name TEXT NOT NULL,
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    score REAL NOT NULL CHECK (score >= 0.0 AND score <= 1.0),
    evidence_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'dismissed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE manual_grouping_rules (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    file_identity TEXT,
    source_id TEXT REFERENCES index_sources(id) ON DELETE CASCADE,
    absolute_path TEXT,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    CHECK (document_id IS NOT NULL OR file_identity IS NOT NULL OR absolute_path IS NOT NULL)
);

CREATE TABLE scan_runs (
    id TEXT PRIMARY KEY,
    source_ids_json TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'cancelled', 'failed')),
    cursor_path TEXT,
    started_at TEXT,
    completed_at TEXT,
    discovered_count INTEGER NOT NULL DEFAULT 0 CHECK (discovered_count >= 0),
    processed_count INTEGER NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
    topic_count INTEGER NOT NULL DEFAULT 0 CHECK (topic_count >= 0),
    suggestion_count INTEGER NOT NULL DEFAULT 0 CHECK (suggestion_count >= 0),
    failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
    error_summary TEXT
);

CREATE TABLE scan_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id TEXT NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    error_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    retry_status TEXT NOT NULL DEFAULT 'pending' CHECK (retry_status IN ('pending', 'resolved', 'ignored'))
);

CREATE TABLE extension_rules (
    id TEXT PRIMARY KEY,
    extension TEXT NOT NULL UNIQUE,
    built_in INTEGER NOT NULL CHECK (built_in IN (0, 1)),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
);

CREATE INDEX idx_documents_topic ON documents(topic_id, availability);
CREATE INDEX idx_documents_source_indexed ON documents(source_id, indexed_at);
CREATE INDEX idx_documents_created ON documents(topic_id, created_at DESC, id);
CREATE INDEX idx_documents_modified ON documents(topic_id, modified_at DESC, id);
CREATE INDEX idx_topics_updated ON topics(updated_at DESC, id);
CREATE INDEX idx_scan_errors_scan ON scan_errors(scan_id, id);
CREATE UNIQUE INDEX idx_manual_rules_document ON manual_grouping_rules(document_id) WHERE document_id IS NOT NULL;
CREATE UNIQUE INDEX idx_manual_rules_identity ON manual_grouping_rules(file_identity) WHERE file_identity IS NOT NULL;
CREATE UNIQUE INDEX idx_manual_rules_path ON manual_grouping_rules(source_id, absolute_path) WHERE absolute_path IS NOT NULL;

INSERT INTO extension_rules(id, extension, built_in, enabled) VALUES
    ('builtin-doc', 'doc', 1, 1),
    ('builtin-docx', 'docx', 1, 1),
    ('builtin-xls', 'xls', 1, 1),
    ('builtin-xlsx', 'xlsx', 1, 1),
    ('builtin-ppt', 'ppt', 1, 1),
    ('builtin-pptx', 'pptx', 1, 1),
    ('builtin-pdf', 'pdf', 1, 1),
    ('builtin-rtf', 'rtf', 1, 1),
    ('builtin-txt', 'txt', 1, 1),
    ('builtin-md', 'md', 1, 1),
    ('builtin-csv', 'csv', 1, 1),
    ('builtin-json', 'json', 1, 1);

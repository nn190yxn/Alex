DROP INDEX idx_manual_rules_identity;

CREATE INDEX idx_manual_rules_identity
ON manual_grouping_rules(file_identity)
WHERE file_identity IS NOT NULL;

CREATE INDEX idx_documents_source_identity
ON documents(source_id, file_identity)
WHERE file_identity IS NOT NULL;

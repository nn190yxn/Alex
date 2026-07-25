CREATE INDEX idx_documents_normalized_name
    ON documents(normalized_name, availability, topic_id);

CREATE INDEX idx_grouping_suggestions_status
    ON grouping_suggestions(status, updated_at DESC, id);

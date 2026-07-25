CREATE VIRTUAL TABLE topic_search USING fts5(
    document_id UNINDEXED,
    topic_id UNINDEXED,
    topic_name,
    file_name,
    normalized_name,
    absolute_path,
    tokenize = 'unicode61'
);

INSERT INTO topic_search(document_id, topic_id, topic_name, file_name, normalized_name, absolute_path)
SELECT d.id, d.topic_id, t.display_name, d.file_name, d.normalized_name, d.absolute_path
FROM documents d
JOIN topics t ON t.id = d.topic_id;

CREATE TRIGGER documents_search_insert AFTER INSERT ON documents BEGIN
    INSERT INTO topic_search(document_id, topic_id, topic_name, file_name, normalized_name, absolute_path)
    SELECT NEW.id, NEW.topic_id, t.display_name, NEW.file_name, NEW.normalized_name, NEW.absolute_path
    FROM topics t WHERE t.id = NEW.topic_id;
END;

CREATE TRIGGER documents_search_update AFTER UPDATE ON documents BEGIN
    DELETE FROM topic_search WHERE document_id = OLD.id;
    INSERT INTO topic_search(document_id, topic_id, topic_name, file_name, normalized_name, absolute_path)
    SELECT NEW.id, NEW.topic_id, t.display_name, NEW.file_name, NEW.normalized_name, NEW.absolute_path
    FROM topics t WHERE t.id = NEW.topic_id;
END;

CREATE TRIGGER documents_search_delete AFTER DELETE ON documents BEGIN
    DELETE FROM topic_search WHERE document_id = OLD.id;
END;

CREATE TRIGGER topics_search_update AFTER UPDATE OF display_name ON topics BEGIN
    UPDATE topic_search SET topic_name = NEW.display_name WHERE topic_id = NEW.id;
END;

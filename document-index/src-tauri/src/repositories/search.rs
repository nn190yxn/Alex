use rusqlite::{params, params_from_iter, types::Value};

use crate::{
    database::Database,
    domain::{
        error::DomainError,
        models::{SearchQuery, SortDirection, SortField},
    },
};

const MAX_PAGE_SIZE: u32 = 100;

pub struct SearchRepository<'a> {
    database: &'a Database,
}

impl<'a> SearchRepository<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn search_topic_ids(
        &self,
        query: &str,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<String>, DomainError> {
        let limit = limit.clamp(1, MAX_PAGE_SIZE);
        self.database.read(|connection| {
            let mut statement = connection.prepare(
                "SELECT DISTINCT topic_search.topic_id
                 FROM topic_search
                 JOIN documents ON documents.id = topic_search.document_id
                 WHERE topic_search MATCH ?1 AND documents.availability = 'available'
                 ORDER BY topic_search.topic_id ASC LIMIT ?2 OFFSET ?3",
            )?;
            let topic_ids = statement
                .query_map(params![query, limit, offset], |row| row.get(0))?
                .collect();
            topic_ids
        })
    }

    pub fn search_topics(&self, query: &SearchQuery) -> Result<(Vec<String>, u64), DomainError> {
        let page = query.page.max(1);
        let page_size = query.page_size.clamp(1, MAX_PAGE_SIZE);
        let offset = u64::from(page - 1) * u64::from(page_size);
        let (from, filters, filter_params) = search_filters(query);
        let aggregate = match (query.sort_by, query.sort_direction) {
            (SortField::ModifiedAt, SortDirection::Asc) => "MIN(d.modified_at)",
            (SortField::ModifiedAt, SortDirection::Desc) => "MAX(d.modified_at)",
            (SortField::CreatedAt, SortDirection::Asc) => "MIN(d.created_at)",
            (SortField::CreatedAt, SortDirection::Desc) => "MAX(d.created_at)",
            (SortField::Version, SortDirection::Asc) => "MIN(d.version_sort_key)",
            (SortField::Version, SortDirection::Desc) => "MAX(d.version_sort_key)",
            (SortField::FileName, SortDirection::Asc) => "MIN(d.file_name COLLATE NOCASE)",
            (SortField::FileName, SortDirection::Desc) => "MAX(d.file_name COLLATE NOCASE)",
        };
        let direction = match query.sort_direction {
            SortDirection::Asc => "ASC",
            SortDirection::Desc => "DESC",
        };
        let count_sql = format!("SELECT COUNT(DISTINCT d.topic_id) FROM {from} WHERE {filters}");
        let limit_parameter = filter_params.len() + 1;
        let offset_parameter = filter_params.len() + 2;
        let page_sql = format!(
            "WITH matched_topics AS (
                SELECT d.topic_id, {aggregate} AS sort_value
                FROM {from} WHERE {filters} GROUP BY d.topic_id
             )
             SELECT topic_id FROM matched_topics
             ORDER BY sort_value IS NULL, sort_value COLLATE NOCASE {direction}, topic_id ASC
             LIMIT ?{limit_parameter} OFFSET ?{offset_parameter}"
        );

        self.database.read(|connection| {
            let total = connection.query_row(
                &count_sql,
                params_from_iter(filter_params.iter()),
                |row| row.get::<_, u64>(0),
            )?;
            let mut page_params = filter_params.clone();
            page_params.push(Value::from(i64::from(page_size)));
            page_params.push(Value::from(offset as i64));
            let mut statement = connection.prepare(&page_sql)?;
            let topic_ids = statement
                .query_map(params_from_iter(page_params.iter()), |row| row.get(0))?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            Ok((topic_ids, total))
        })
    }

    pub fn rebuild(&self) -> Result<(), DomainError> {
        self.database.transaction(|transaction| {
            transaction.execute("DELETE FROM topic_search", [])?;
            transaction.execute(
                "INSERT INTO topic_search(document_id, topic_id, topic_name, file_name, normalized_name, absolute_path)
                 SELECT d.id, d.topic_id, t.display_name, d.file_name, d.normalized_name, d.absolute_path
                 FROM documents d JOIN topics t ON t.id = d.topic_id",
                [],
            )?;
            Ok(())
        })
    }
}

fn search_filters(query: &SearchQuery) -> (String, String, Vec<Value>) {
    let mut clauses = vec!["d.availability = 'available'".to_owned()];
    let mut values = Vec::new();
    let from = if let Some(fts_query) = fts_query(&query.text) {
        values.push(Value::from(fts_query));
        clauses.push(format!("topic_search MATCH ?{}", values.len()));
        "topic_search JOIN documents d ON d.id = topic_search.document_id"
    } else {
        "documents d"
    };

    let source_ids = query
        .source_ids
        .iter()
        .map(|source_id| source_id.trim())
        .filter(|source_id| !source_id.is_empty())
        .collect::<std::collections::BTreeSet<_>>();
    if !source_ids.is_empty() {
        let placeholders = source_ids
            .into_iter()
            .map(|source_id| {
                values.push(Value::from(source_id.to_owned()));
                format!("?{}", values.len())
            })
            .collect::<Vec<_>>()
            .join(", ");
        clauses.push(format!("d.source_id IN ({placeholders})"));
    }

    if let Some(directory) = query
        .directory
        .as_deref()
        .map(str::trim)
        .filter(|directory| !directory.is_empty())
    {
        let directory = directory.trim_end_matches(['/', '\\']);
        values.push(Value::from(directory.to_owned()));
        let parameter = values.len();
        clauses.push(format!(
            "(d.absolute_path = ?{parameter} COLLATE NOCASE
              OR substr(d.absolute_path, 1, length(?{parameter}) + 1) =
                 (?{parameter} || '/') COLLATE NOCASE
              OR substr(d.absolute_path, 1, length(?{parameter}) + 1) =
                 (?{parameter} || '\\') COLLATE NOCASE)"
        ));
    }

    push_range_filter(
        &mut clauses,
        &mut values,
        "d.created_at",
        ">=",
        query.created_from.as_deref(),
    );
    push_range_filter(
        &mut clauses,
        &mut values,
        "d.created_at",
        "<=",
        query.created_to.as_deref(),
    );
    push_range_filter(
        &mut clauses,
        &mut values,
        "d.modified_at",
        ">=",
        query.modified_from.as_deref(),
    );
    push_range_filter(
        &mut clauses,
        &mut values,
        "d.modified_at",
        "<=",
        query.modified_to.as_deref(),
    );

    (from.into(), clauses.join(" AND "), values)
}

fn push_range_filter(
    clauses: &mut Vec<String>,
    values: &mut Vec<Value>,
    column: &str,
    operator: &str,
    value: Option<&str>,
) {
    if let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) {
        values.push(Value::from(value.to_owned()));
        clauses.push(format!("{column} {operator} ?{}", values.len()));
    }
}

fn fts_query(value: &str) -> Option<String> {
    let terms = value
        .split(|character: char| !character.is_alphanumeric())
        .filter(|term| !term.is_empty())
        .map(|term| format!("\"{}\"*", term.replace('"', "\"\"")))
        .collect::<Vec<_>>();
    (!terms.is_empty()).then(|| terms.join(" AND "))
}

#[cfg(test)]
mod tests {
    use super::fts_query;

    #[test]
    fn fts_query_uses_safe_prefix_terms() {
        assert_eq!(
            fts_query("Quarterly plan (2026)"),
            Some("\"Quarterly\"* AND \"plan\"* AND \"2026\"*".into())
        );
        assert_eq!(fts_query(" -- "), None);
    }
}

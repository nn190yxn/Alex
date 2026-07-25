use crate::{
    database::Database,
    domain::{
        error::{DomainError, ErrorCode},
        models::{Page, SearchQuery, TopicSummary},
    },
    repositories::SearchRepository,
};

use super::TopicService;

pub struct SearchService<'a> {
    database: &'a Database,
}

impl<'a> SearchService<'a> {
    pub fn new(database: &'a Database) -> Self {
        Self { database }
    }

    pub fn search_topics(&self, mut query: SearchQuery) -> Result<Page<TopicSummary>, DomainError> {
        validate_range(
            query.created_from.as_deref(),
            query.created_to.as_deref(),
            "createdFrom",
        )?;
        validate_range(
            query.modified_from.as_deref(),
            query.modified_to.as_deref(),
            "modifiedFrom",
        )?;
        query.page = query.page.max(1);
        query.page_size = query.page_size.clamp(1, 100);
        let (topic_ids, total) = SearchRepository::new(self.database).search_topics(&query)?;
        let topics = TopicService::new(self.database);
        let items = topic_ids
            .into_iter()
            .map(|topic_id| {
                topics
                    .detail(&topic_id, query.sort_by, query.sort_direction)
                    .map(|detail| detail.summary)
            })
            .collect::<Result<Vec<_>, _>>()?;
        Ok(Page {
            items,
            page: query.page,
            page_size: query.page_size,
            total,
        })
    }
}

fn validate_range(from: Option<&str>, to: Option<&str>, field: &str) -> Result<(), DomainError> {
    if matches!((from, to), (Some(from), Some(to)) if from > to) {
        Err(DomainError {
            code: ErrorCode::InvalidInput,
            message: "The start of a time range must be before its end.".into(),
            field: Some(field.into()),
        })
    } else {
        Ok(())
    }
}

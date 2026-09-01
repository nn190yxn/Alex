#[cfg(feature = "desktop-app")]
use crate::{
    domain::analysis::{AnalysisQuery, AnalysisSummary},
    repositories::database::Database,
    services::analysis_service::AnalysisService,
    CommandResult, DomainError,
};

#[cfg(feature = "desktop-app")]
#[tauri::command]
pub fn statistics_get_task_breakdown(
    database: tauri::State<'_, Database>,
    query: AnalysisQuery,
) -> CommandResult<AnalysisSummary> {
    result(AnalysisService::new(&database).get_task_breakdown(query))
}

#[cfg(feature = "desktop-app")]
fn result<T>(value: Result<T, DomainError>) -> CommandResult<T> {
    CommandResult::from_result(module_path!(), value, 1)
}

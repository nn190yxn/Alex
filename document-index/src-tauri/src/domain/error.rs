use serde::{ser::SerializeMap, Deserialize, Serialize, Serializer};

pub type DomainVersion = u64;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    InvalidInput,
    SourceNotFound,
    SourceUnavailable,
    SourceOverlap,
    PathOutsideSource,
    DocumentNotFound,
    TopicNotFound,
    ScanNotFound,
    ScanAlreadyRunning,
    DatabaseError,
    FileSystemError,
    InternalError,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, thiserror::Error)]
#[error("{message}")]
#[serde(rename_all = "camelCase")]
pub struct DomainError {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CommandResult<T> {
    Success { data: T, version: DomainVersion },
    Failure { error: DomainError },
}

impl<T: Serialize> Serialize for CommandResult<T> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            Self::Success { data, version } => {
                let mut result = serializer.serialize_map(Some(3))?;
                result.serialize_entry("ok", &true)?;
                result.serialize_entry("data", data)?;
                result.serialize_entry("version", version)?;
                result.end()
            }
            Self::Failure { error } => {
                let mut result = serializer.serialize_map(Some(2))?;
                result.serialize_entry("ok", &false)?;
                result.serialize_entry("error", error)?;
                result.end()
            }
        }
    }
}

impl<T> CommandResult<T> {
    pub fn success(data: T, version: DomainVersion) -> Self {
        Self::Success { data, version }
    }

    pub fn failure(error: DomainError) -> Self {
        Self::Failure { error }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn success_uses_the_stable_discriminated_shape() {
        let value = serde_json::to_value(CommandResult::success("ready", 3)).unwrap();
        assert_eq!(
            value,
            serde_json::json!({ "ok": true, "data": "ready", "version": 3 })
        );
    }

    #[test]
    fn error_codes_serialize_as_stable_screaming_snake_case() {
        let value = serde_json::to_value(ErrorCode::PathOutsideSource).unwrap();
        assert_eq!(value, "PATH_OUTSIDE_SOURCE");
    }
}

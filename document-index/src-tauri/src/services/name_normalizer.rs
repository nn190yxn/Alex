use std::path::Path;

use regex::Regex;
use unicode_normalization::UnicodeNormalization;

use crate::domain::error::{DomainError, ErrorCode};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NormalizedFileName {
    pub original_file_name: String,
    pub extension: String,
    pub normalized_name: String,
    pub version_label: Option<String>,
    pub version_sort_key: Option<String>,
}

pub struct NameNormalizer;

impl NameNormalizer {
    pub fn normalize(file_name: &str) -> Result<NormalizedFileName, DomainError> {
        let path = Path::new(file_name);
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .trim()
            .to_lowercase();
        let stem = path
            .file_stem()
            .and_then(|value| value.to_str())
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| invalid_file_name(file_name))?;
        let mut working = stem.nfkc().collect::<String>();

        let numeric =
            Regex::new(r"(?i)(^|[\s_\-(\[])(v\d+(?:\.\d+)*|\d+\.\d+(?:\.\d+)*)([\s_\-)\]]|$)")
                .expect("numeric version regex is valid");
        let date = Regex::new(r"(^|[\s_\-(\[])(\d{4}[-_.]\d{1,2}[-_.]\d{1,2})([\s_\-)\]]|$)")
            .expect("date version regex is valid");
        let semantic = Regex::new(
            r"(?i)(^|[\s_\-(\[])(副本|copy(?:\s*\(\d+\))?|修订版|最终版|终稿)([\s_\-)\]]|$)",
        )
        .expect("semantic marker regex is valid");

        let numeric_marker = capture_marker(&numeric, &working);
        let date_marker = capture_marker(&date, &working);
        let semantic_markers = semantic
            .captures_iter(&working)
            .filter_map(|captures| captures.get(2).map(|value| value.as_str().to_owned()))
            .collect::<Vec<_>>();

        working = numeric.replace_all(&working, " ").into_owned();
        working = date.replace_all(&working, " ").into_owned();
        working = semantic.replace_all(&working, " ").into_owned();

        let separators = Regex::new(r"[\s_\-()\[\]{}]+").expect("separator regex is valid");
        let mut normalized_name = separators.replace_all(&working, " ").trim().to_lowercase();
        if normalized_name.is_empty() {
            normalized_name = stem.nfkc().collect::<String>().trim().to_lowercase();
        }

        let mut labels = Vec::new();
        labels.extend(numeric_marker.iter().cloned());
        labels.extend(date_marker.iter().cloned());
        labels.extend(semantic_markers.iter().cloned());
        let version_label = (!labels.is_empty()).then(|| labels.join(" "));
        let version_sort_key = numeric_marker
            .as_deref()
            .map(numeric_sort_key)
            .or_else(|| date_marker.as_deref().map(date_sort_key))
            .or_else(|| {
                semantic_markers
                    .last()
                    .map(|value| semantic_sort_key(value))
            });

        Ok(NormalizedFileName {
            original_file_name: file_name.to_owned(),
            extension,
            normalized_name,
            version_label,
            version_sort_key,
        })
    }
}

fn capture_marker(regex: &Regex, value: &str) -> Option<String> {
    regex
        .captures(value)
        .and_then(|captures| captures.get(2))
        .map(|capture| capture.as_str().to_owned())
}

fn numeric_sort_key(marker: &str) -> String {
    let normalized = marker.trim_start_matches(['v', 'V']);
    let components = normalized
        .split('.')
        .map(|component| component.parse::<u64>().unwrap_or_default())
        .map(|component| format!("{component:010}"))
        .collect::<Vec<_>>();
    format!("version:{}", components.join("."))
}

fn date_sort_key(marker: &str) -> String {
    let digits = marker
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>();
    format!("date:{digits:0<8}")
}

fn semantic_sort_key(marker: &str) -> String {
    let rank = match marker.to_lowercase().as_str() {
        "终稿" | "最终版" => 900,
        "修订版" => 500,
        "副本" => 200,
        value if value.starts_with("copy") => 200,
        _ => 100,
    };
    format!("marker:{rank:03}")
}

fn invalid_file_name(file_name: &str) -> DomainError {
    DomainError {
        code: ErrorCode::InvalidInput,
        message: "The file name cannot be normalized.".into(),
        field: Some(file_name.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_numeric_version_and_preserves_original_label() {
        let value = NameNormalizer::normalize("商业计划书_V2.3.docx").unwrap();
        assert_eq!(value.original_file_name, "商业计划书_V2.3.docx");
        assert_eq!(value.normalized_name, "商业计划书");
        assert_eq!(value.version_label.as_deref(), Some("V2.3"));
        assert_eq!(
            value.version_sort_key.as_deref(),
            Some("version:0000000002.0000000003")
        );
    }

    #[test]
    fn extracts_date_and_copy_markers() {
        let value = NameNormalizer::normalize("Budget-2026-07-24-copy (2).PDF").unwrap();
        assert_eq!(value.normalized_name, "budget");
        assert_eq!(value.extension, "pdf");
        assert_eq!(value.version_label.as_deref(), Some("2026-07-24 copy (2)"));
        assert_eq!(value.version_sort_key.as_deref(), Some("date:20260724"));
    }

    #[test]
    fn keeps_unknown_version_text_in_normalized_name() {
        let value = NameNormalizer::normalize("Roadmap-preview.docx").unwrap();
        assert_eq!(value.normalized_name, "roadmap preview");
        assert_eq!(value.version_label, None);
        assert_eq!(value.version_sort_key, None);
    }
}

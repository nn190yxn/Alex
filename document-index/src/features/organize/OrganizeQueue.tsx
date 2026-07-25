import { useEffect, useState } from "react";

import type { GroupingEvidence, GroupingSuggestion, Page } from "../../domain/models";
import { commandClient } from "../../lib/commandClient";
import { TopicEditor } from "./TopicEditor";

const PAGE_SIZE = 20;

type OrganizeQueueProps = {
  onSuggestionResolved?: () => void;
};

export function OrganizeQueue({ onSuggestionResolved }: OrganizeQueueProps) {
  const [suggestions, setSuggestions] = useState<Page<GroupingSuggestion>>({
    items: [],
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();
  const [topicRevision, setTopicRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void commandClient.listOrganizeSuggestions(page, PAGE_SIZE).then((result) => {
      if (!active) return;
      if (result.ok) {
        setSuggestions(result.data);
      } else {
        setFeedback({ type: "error", message: result.error.message });
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [page, topicRevision]);

  const resolveSuggestion = async (suggestion: GroupingSuggestion, action: "accept" | "dismiss") => {
    setResolvingId(suggestion.id);
    setFeedback(undefined);
    const result = action === "accept"
      ? await commandClient.acceptOrganizeSuggestion(suggestion.id)
      : await commandClient.dismissOrganizeSuggestion(suggestion.id);
    setResolvingId(undefined);
    if (!result.ok) {
      setFeedback({ type: "error", message: result.error.message });
      return;
    }
    setFeedback({
      type: "success",
      message: action === "accept"
        ? `已合并为“${suggestion.proposedDisplayName}”。`
        : `已忽略“${suggestion.proposedDisplayName}”建议。`,
    });
    const nextPage = suggestions.items.length === 1 && page > 1 ? page - 1 : page;
    if (nextPage === page) setTopicRevision((value) => value + 1);
    else setPage(nextPage);
    onSuggestionResolved?.();
  };

  const totalPages = Math.max(1, Math.ceil(suggestions.total / PAGE_SIZE));

  return (
    <div className="organize-workspace">
      <header className="organize-header">
        <div>
          <p className="eyebrow">DOCUMENT LEDGER / 03</p>
          <h2 id="workspace-title">检查需要人工确认的归组</h2>
          <p>先核对系统证据，再接受或忽略建议。人工操作会覆盖后续扫描归组。</p>
        </div>
        <span className="organize-count">{suggestions.total} 条待处理</span>
      </header>

      {feedback && (
        <p className={`organize-feedback organize-feedback-${feedback.type}`} role="status">
          {feedback.message}
        </p>
      )}

      <section className="organize-section" aria-labelledby="suggestion-heading">
        <div className="organize-section-heading">
          <div>
            <p className="eyebrow">SYSTEM SUGGESTIONS</p>
            <h3 id="suggestion-heading">系统合并建议</h3>
          </div>
          <span>按评分从高到低</span>
        </div>
        {loading ? (
          <p className="organize-empty">正在读取待整理建议...</p>
        ) : suggestions.items.length === 0 ? (
          <p className="organize-empty">当前没有待确认的系统合并建议。</p>
        ) : (
          <div className="suggestion-list">
            {suggestions.items.map((suggestion) => (
              <article className="suggestion-card" key={suggestion.id}>
                <div className="suggestion-main">
                  <div className="suggestion-title-line">
                    <h4>{suggestion.proposedDisplayName}</h4>
                    <span>{confidenceLabel(suggestion.confidence)}</span>
                    <strong>{Math.round(suggestion.score * 100)}%</strong>
                  </div>
                  <p>{suggestion.sourceTopicIds.length} 个主题将合并</p>
                  <code>{suggestion.sourceTopicIds.join("  +  ")}</code>
                  <ul className="evidence-list" aria-label={`${suggestion.proposedDisplayName} 归组证据`}>
                    {suggestion.evidence.map((evidence, index) => (
                      <EvidenceItem evidence={evidence} key={`${evidence.kind}-${index}`} />
                    ))}
                  </ul>
                </div>
                <div className="suggestion-actions">
                  <button
                    disabled={Boolean(resolvingId)}
                    onClick={() => void resolveSuggestion(suggestion, "accept")}
                    type="button"
                  >
                    接受合并
                  </button>
                  <button
                    disabled={Boolean(resolvingId)}
                    onClick={() => void resolveSuggestion(suggestion, "dismiss")}
                    type="button"
                  >
                    忽略建议
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {suggestions.total > PAGE_SIZE && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">上一页</button>
            <span>第 {page} / {totalPages} 页</span>
            <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} type="button">下一页</button>
          </div>
        )}
      </section>

      <TopicEditor refreshToken={topicRevision} />
    </div>
  );
}

function EvidenceItem({ evidence }: { evidence: GroupingEvidence }) {
  return (
    <li>
      <span>{evidenceLabel(evidence.kind)}</span>
      <strong>{Math.round(evidence.score * 100)}%</strong>
      <p>{evidence.summary}</p>
    </li>
  );
}

function confidenceLabel(confidence: GroupingSuggestion["confidence"]) {
  return confidence === "high" ? "高置信度" : confidence === "medium" ? "中置信度" : "低置信度";
}

function evidenceLabel(kind: GroupingEvidence["kind"]) {
  const labels: Record<GroupingEvidence["kind"], string> = {
    normalizedName: "规范化名称",
    keywords: "关键词",
    editSimilarity: "名称相似度",
    version: "版本标记",
    fileType: "文件类型",
    path: "所在路径",
  };
  return labels[kind];
}

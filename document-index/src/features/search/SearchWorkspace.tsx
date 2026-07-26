import { Fragment, useDeferredValue, useEffect, useState } from "react";
import type { CSSProperties } from "react";

import type { DocumentSummary, IndexSource, Page, SearchQuery, TopicSummary } from "../../domain/models";
import { commandClient } from "../../lib/commandClient";
import { PreviewPane } from "../preview/PreviewPane";
import { TopicDetailPanel } from "../topics/TopicDetailPanel";

const SPLIT_PREFERENCE_KEY = "document-index.workspace-split";
const TIME_DIMENSION_KEY = "document-index.default-time-dimension";

const BASE_QUERY: SearchQuery = {
  text: "",
  sourceIds: [],
  sortBy: "modifiedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 20,
};

const EMPTY_PAGE: Page<TopicSummary> = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
};

export function SearchWorkspace({ libraryMode = false }: { libraryMode?: boolean }) {
  const [query, setQuery] = useState<SearchQuery>(createDefaultQuery);
  const deferredText = useDeferredValue(query.text);
  const [sources, setSources] = useState<IndexSource[]>([]);
  const [results, setResults] = useState<Page<TopicSummary>>(EMPTY_PAGE);
  const [selectedTopicId, setSelectedTopicId] = useState<string>();
  const [previewDocument, setPreviewDocument] = useState<DocumentSummary>();
  const [previewMode, setPreviewMode] = useState<"normal" | "collapsed" | "full">("normal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [split, setSplit] = useState(readSplitPreference);
  const [resizing, setResizing] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);

  useEffect(() => {
    let active = true;
    void commandClient.listSources().then((result) => {
      if (active && result.ok) setSources(result.data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(undefined);
      void commandClient.searchTopics({ ...query, text: deferredText.trim() }).then((result) => {
        if (!active) return;
        if (result.ok) {
          setResults(result.data);
          setSelectedTopicId((current) =>
            result.data.items.some((topic) => topic.id === current) ? current : undefined,
          );
        } else {
          setResults(EMPTY_PAGE);
          setError("本地索引暂时无法完成这次检索，请稍后重试。");
        }
        setLoading(false);
      });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    deferredText,
    query.createdFrom,
    query.createdTo,
    query.directory,
    query.modifiedFrom,
    query.modifiedTo,
    query.page,
    query.pageSize,
    query.sortBy,
    query.sortDirection,
    query.sourceIds,
    searchRevision,
  ]);

  useEffect(() => {
    safeStorageSet(SPLIT_PREFERENCE_KEY, String(split));
  }, [split]);

  useEffect(() => {
    if (!selectedTopicId) setPreviewDocument(undefined);
  }, [selectedTopicId]);

  const totalPages = Math.max(1, Math.ceil(results.total / results.pageSize));

  function updateQuery(patch: Partial<SearchQuery>) {
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  function updateSplit(clientX: number, element: HTMLElement) {
    const container = element.closest<HTMLElement>(".search-split");
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setSplit(clampSplit(((clientX - bounds.left) / bounds.width) * 100));
  }

  function finishResize() {
    setResizing(false);
  }

  return (
    <div className="search-workspace">
      <header className="search-toolbar">
        <div className="search-heading">
          <p className="eyebrow">DOCUMENT LEDGER / {libraryMode ? "02" : "01"}</p>
          <h2 id="workspace-title">{libraryMode ? "全部资料" : "搜索工作台"}</h2>
          <span>{loading ? "正在检索" : `${results.total} 个主题`}</span>
        </div>
        <label className="search-field">
          <span>搜索资料</span>
          <input
            autoComplete="off"
            onChange={(event) => updateQuery({ text: event.target.value })}
            placeholder="主题、文件名或完整路径"
            type="search"
            value={query.text}
          />
        </label>
        <div className="filter-row">
          <label>
            <span>索引位置</span>
            <select
              onChange={(event) => updateQuery({ sourceIds: event.target.value ? [event.target.value] : [] })}
              value={query.sourceIds[0] ?? ""}
            >
              <option value="">全部位置</option>
              {sources.map((source) => <option key={source.id} value={source.id}>{source.displayName}</option>)}
            </select>
          </label>
          <label className="directory-filter">
            <span>目录</span>
            <input
              onChange={(event) => updateQuery({ directory: event.target.value || undefined })}
              placeholder="按完整目录筛选"
              value={query.directory ?? ""}
            />
          </label>
          <label>
            <span>创建日期从</span>
            <input onChange={(event) => updateQuery({ createdFrom: startOfDay(event.target.value) })} type="date" value={dateValue(query.createdFrom)} />
          </label>
          <label>
            <span>创建日期至</span>
            <input onChange={(event) => updateQuery({ createdTo: endOfDay(event.target.value) })} type="date" value={dateValue(query.createdTo)} />
          </label>
          <label>
            <span>修改日期从</span>
            <input onChange={(event) => updateQuery({ modifiedFrom: startOfDay(event.target.value) })} type="date" value={dateValue(query.modifiedFrom)} />
          </label>
          <label>
            <span>修改日期至</span>
            <input onChange={(event) => updateQuery({ modifiedTo: endOfDay(event.target.value) })} type="date" value={dateValue(query.modifiedTo)} />
          </label>
          <label>
            <span>排序</span>
            <select
              onChange={(event) => {
                const [sortBy, sortDirection] = event.target.value.split(":") as [SearchQuery["sortBy"], SearchQuery["sortDirection"]];
                if (sortBy === "modifiedAt" || sortBy === "createdAt") {
                  safeStorageSet(TIME_DIMENSION_KEY, sortBy);
                }
                updateQuery({ sortBy, sortDirection });
              }}
              value={`${query.sortBy}:${query.sortDirection}`}
            >
              <option value="modifiedAt:desc">最近修改优先</option>
              <option value="createdAt:desc">最新创建优先</option>
              <option value="version:desc">版本号从高到低</option>
              <option value="fileName:asc">文件名正序</option>
            </select>
          </label>
        </div>
      </header>

      <div className="search-split" data-preview-mode={previewMode} style={{ "--result-width": `${split}%` } as CSSProperties}>
        <section className="topic-results" aria-label="主题检索结果">
          {previewMode === "collapsed" && <button className="preview-restore" onClick={() => setPreviewMode("normal")} type="button">展开文件预览</button>}
          {error && <div className="result-message" role="alert"><strong>检索失败</strong><p>{error}</p></div>}
          {!error && !loading && results.items.length === 0 && (
            <div className="result-message">
              <strong>当前条件没有找到主题</strong>
              <p>调整名称、位置或时间范围后再次检索。</p>
              <button onClick={() => setQuery(createDefaultQuery())} type="button">清除全部筛选</button>
            </div>
          )}
          {results.items.map((topic) => (
            <Fragment key={topic.id}>
              <button
                aria-pressed={selectedTopicId === topic.id}
                className="topic-card"
                onClick={() => {
                  setSelectedTopicId((current) => current === topic.id ? undefined : topic.id);
                  setPreviewDocument(undefined);
                }}
                type="button"
              >
                <span className="topic-card-index">{String(topic.documentCount).padStart(2, "0")} VERSIONS</span>
                <strong>{topic.displayName}</strong>
                <TopicMarker label="最新创建" document={topic.newestCreatedDocument} />
                <TopicMarker label="最近修改" document={topic.recentlyModifiedDocument} />
              </button>
              {selectedTopicId === topic.id && (
                <div className="topic-detail-shell">
                  <TopicDetailPanel
                    onPreviewDocument={(document) => {
                      setPreviewDocument(document);
                      if (document) setPreviewMode((mode) => mode === "collapsed" ? "normal" : mode);
                    }}
                    onTopicUpdated={() => {
                      setPreviewDocument(undefined);
                      setSearchRevision((current) => current + 1);
                    }}
                    previewDocumentId={previewDocument?.id}
                    topicId={topic.id}
                  />
                </div>
              )}
            </Fragment>
          ))}
          {results.total > 0 && (
            <footer className="pagination" aria-label="检索结果分页">
              <button disabled={results.page <= 1} onClick={() => updateQuery({ page: results.page - 1 })} type="button">上一页</button>
              <span>第 {results.page} / {totalPages} 页</span>
              <button disabled={results.page >= totalPages} onClick={() => updateQuery({ page: results.page + 1 })} type="button">下一页</button>
            </footer>
          )}
        </section>

        <div
          aria-label="调整结果与预览宽度"
          aria-orientation="vertical"
          aria-valuemax={68}
          aria-valuemin={32}
          aria-valuenow={Math.round(split)}
          className="workspace-divider"
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const next = clampSplit(split + (event.key === "ArrowRight" ? 2 : -2));
            setSplit(next);
            safeStorageSet(SPLIT_PREFERENCE_KEY, String(next));
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setResizing(true);
            updateSplit(event.clientX, event.currentTarget);
          }}
          onPointerMove={(event) => {
            if (resizing) updateSplit(event.clientX, event.currentTarget);
          }}
          onPointerUp={finishResize}
          role="separator"
          tabIndex={0}
        />

        {previewMode !== "collapsed" && (
          <aside className="preview-context" aria-label="文件预览区域">
            <PreviewPane
              document={previewDocument}
              fullWidth={previewMode === "full"}
              onCollapse={() => setPreviewMode("collapsed")}
              onToggleFullWidth={() => setPreviewMode((mode) => mode === "full" ? "normal" : "full")}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function TopicMarker({ label, document }: { label: string; document?: TopicSummary["newestCreatedDocument"] }) {
  return (
    <span className="topic-marker">
      <span>{label}</span>
      <time dateTime={label === "最新创建" ? document?.createdAt : document?.modifiedAt}>
        {formatDocumentTime(label === "最新创建" ? document?.createdAt : document?.modifiedAt)}
      </time>
      <small title={document?.absolutePath}>{document?.absolutePath ?? "暂无可用文件"}</small>
    </span>
  );
}

function formatDocumentTime(value?: string) {
  if (!value) return "时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function startOfDay(value: string) {
  const date = localDate(value, 0, 0, 0, 0);
  return date?.toISOString();
}

function endOfDay(value: string) {
  const date = localDate(value, 23, 59, 59, 999);
  return date?.toISOString();
}

function dateValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clampSplit(value: number) {
  return Math.min(68, Math.max(32, value));
}

function readSplitPreference() {
  const value = Number(safeStorageGet(SPLIT_PREFERENCE_KEY));
  return Number.isFinite(value) && value >= 32 && value <= 68 ? value : 42;
}

function createDefaultQuery(): SearchQuery {
  const preference = safeStorageGet(TIME_DIMENSION_KEY);
  return {
    ...BASE_QUERY,
    sourceIds: [],
    sortBy: preference === "createdAt" ? "createdAt" : "modifiedAt",
  };
}

function localDate(value: string, hours: number, minutes: number, seconds: number, milliseconds: number) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
}

function safeStorageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences are optional; the indexed data remains authoritative.
  }
}

import { useEffect, useState } from "react";

import type { DocumentSummary, SortField, TopicDetail } from "../../domain/models";
import { commandClient, RECYCLE_CONFIRMATION_TOKEN } from "../../lib/commandClient";

const TIME_DIMENSION_KEY = "document-index.default-time-dimension";

interface TopicDetailPanelProps {
  topicId: string;
  onTopicUpdated: () => void;
  onPreviewDocument?: (document?: DocumentSummary) => void;
  previewDocumentId?: string;
}

export function TopicDetailPanel({ topicId, onTopicUpdated, onPreviewDocument, previewDocumentId }: TopicDetailPanelProps) {
  const [sortBy, setSortBy] = useState<SortField>(readTimeDimension);
  const [detail, setDetail] = useState<TopicDetail>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmationIds, setConfirmationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);

  const sortDirection = sortBy === "fileName" ? "asc" : "desc";

  useEffect(() => {
    setSelectedIds([]);
    setConfirmationIds([]);
    setNotice(undefined);
  }, [topicId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    void commandClient.getTopicDetail(topicId, sortBy, sortDirection).then((result) => {
      if (!active) return;
      if (result.ok) {
        setDetail(result.data);
        const availableIds = new Set(result.data.documents
          .filter((document) => document.availability === "available")
          .map((document) => document.id));
        setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
        if (previewDocumentId && !availableIds.has(previewDocumentId)) onPreviewDocument?.(undefined);
      } else {
        setDetail(undefined);
        setError("主题详情暂时无法读取，请稍后重试。");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloadToken, sortBy, sortDirection, topicId]);

  function changeSort(nextSort: SortField) {
    setSortBy(nextSort);
    if (nextSort === "modifiedAt" || nextSort === "createdAt") {
      window.localStorage.setItem(TIME_DIMENSION_KEY, nextSort);
    }
  }

  function toggleDocument(documentId: string) {
    setSelectedIds((current) => current.includes(documentId)
      ? current.filter((id) => id !== documentId)
      : [...current, documentId]);
  }

  async function runDocumentAction(action: "open" | "reveal", documentId: string) {
    setBusy(true);
    setError(undefined);
    const result = action === "open"
      ? await commandClient.openDocument(documentId)
      : await commandClient.revealDocument(documentId);
    if (!result.ok) setError(action === "open" ? "无法使用默认程序打开文件。" : "无法在资源管理器中定位文件。");
    setBusy(false);
  }

  async function confirmRecycle() {
    if (confirmationIds.length === 0) return;
    setBusy(true);
    setError(undefined);
    const count = confirmationIds.length;
    const result = await commandClient.recycleDocuments(confirmationIds, RECYCLE_CONFIRMATION_TOKEN);
    if (result.ok) {
      setConfirmationIds([]);
      setSelectedIds([]);
      setNotice(`${count} 个文件已移入 Windows 回收站。`);
      setReloadToken((current) => current + 1);
      onTopicUpdated();
    } else {
      setError("文件未能移入 Windows 回收站，当前索引保持原状。");
    }
    setBusy(false);
  }

  if (loading && !detail) {
    return <DetailState title="正在读取全部版本" description="文件正文不会在这个过程中加载。" />;
  }

  if (error && !detail) {
    return <DetailState title="主题详情不可用" description={error} role="alert" />;
  }

  if (!detail) return null;

  const availableDocuments = detail.documents.filter((document) => document.availability === "available");
  const confirmationDocuments = detail.documents.filter((document) => confirmationIds.includes(document.id));

  return (
    <div className="topic-detail">
      <header className="topic-detail-header">
        <div>
          <p className="eyebrow">TOPIC DETAIL</p>
          <span className="preview-count">{detail.documentCount} 个版本</span>
          <h3>{detail.displayName}</h3>
          <p>规范化名称：{detail.canonicalName}</p>
        </div>
        <label className="version-sort">
          <span>版本排序</span>
          <select aria-label="版本排序" onChange={(event) => changeSort(event.target.value as SortField)} value={sortBy}>
            <option value="modifiedAt">最近修改时间</option>
            <option value="createdAt">最新创建时间</option>
            <option value="version">版本号</option>
            <option value="fileName">文件名</option>
          </select>
        </label>
      </header>

      {error && <div className="detail-feedback detail-error" role="alert">{error}</div>}
      {notice && (
        <div className="detail-feedback detail-success" role="status">
          <span>{notice}</span>
          <button disabled={busy} onClick={() => void commandClient.openRecycleBin()} type="button">打开回收站</button>
        </div>
      )}

      <div className="version-actions" aria-label="版本批量操作" role="toolbar">
        <span>已选择 {selectedIds.length} / {availableDocuments.length}</span>
        <button
          disabled={availableDocuments.length === 0}
          onClick={() => setSelectedIds(selectedIds.length === availableDocuments.length ? [] : availableDocuments.map((document) => document.id))}
          type="button"
        >
          {selectedIds.length === availableDocuments.length && availableDocuments.length > 0 ? "取消全选" : "选择全部可用版本"}
        </button>
        <button disabled={selectedIds.length === 0 || busy} onClick={() => setConfirmationIds(selectedIds)} type="button">移入回收站</button>
      </div>

      <div className="version-list" aria-label="主题版本列表">
        {detail.documents.map((document) => (
          <VersionRow
            busy={busy}
            document={document}
            isNewestCreated={detail.newestCreatedDocument?.id === document.id}
            isRecentlyModified={detail.recentlyModifiedDocument?.id === document.id}
            isSelected={selectedIds.includes(document.id)}
            key={document.id}
            onAction={runDocumentAction}
            onPreview={() => onPreviewDocument?.(document)}
            onRecycle={() => setConfirmationIds([document.id])}
            onToggle={() => toggleDocument(document.id)}
            previewing={previewDocumentId === document.id}
          />
        ))}
      </div>

      {confirmationDocuments.length > 0 && (
        <div aria-label="确认移入回收站" aria-modal="true" className="recycle-backdrop" role="dialog">
          <section className="recycle-confirmation">
            <p className="eyebrow">WINDOWS RECYCLE BIN</p>
            <h4>确认移入回收站</h4>
            <p>{confirmationDocuments.length} 个文件将从“{detail.displayName}”主题移入 Windows 回收站，可在系统回收站中恢复。</p>
            <ul>
              {confirmationDocuments.map((document) => (
                <li key={document.id}><strong>{document.fileName}</strong><span>{document.absolutePath}</span></li>
              ))}
            </ul>
            <div className="recycle-confirmation-actions">
              <button disabled={busy} onClick={() => setConfirmationIds([])} type="button">取消</button>
              <button disabled={busy} onClick={() => void confirmRecycle()} type="button">确认移入 Windows 回收站</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

interface VersionRowProps {
  busy: boolean;
  document: DocumentSummary;
  isNewestCreated: boolean;
  isRecentlyModified: boolean;
  isSelected: boolean;
  onAction: (action: "open" | "reveal", documentId: string) => Promise<void>;
  onPreview: () => void;
  onRecycle: () => void;
  onToggle: () => void;
  previewing: boolean;
}

function VersionRow(props: VersionRowProps) {
  const available = props.document.availability === "available";
  return (
    <article className="version-row" data-availability={props.document.availability}>
      <label className="version-select">
        <input
          aria-label={`选择 ${props.document.fileName}`}
          checked={props.isSelected}
          disabled={!available || props.busy}
          onChange={props.onToggle}
          type="checkbox"
        />
      </label>
      <div className="version-main">
        <div className="version-title-line">
          <strong>{props.document.fileName}</strong>
          {props.document.versionLabel && <span>{props.document.versionLabel}</span>}
          {props.isNewestCreated && <span className="time-badge">最新创建</span>}
          {props.isRecentlyModified && <span className="time-badge">最近修改</span>}
          {!available && <span className="availability-badge">{availabilityLabel(props.document.availability)}</span>}
        </div>
        <p>规范化名称：{props.document.normalizedName}</p>
        <dl>
          <div><dt>创建时间</dt><dd>{formatDateTime(props.document.createdAt)}</dd></div>
          <div><dt>修改时间</dt><dd>{formatDateTime(props.document.modifiedAt)}</dd></div>
          <div><dt>类型</dt><dd>{props.document.extension.toUpperCase()}</dd></div>
          <div><dt>大小</dt><dd>{formatSize(props.document.sizeBytes)}</dd></div>
        </dl>
        <code>{props.document.absolutePath}</code>
      </div>
      <div className="version-file-actions">
        <button aria-pressed={props.previewing} disabled={!available || props.busy} onClick={props.onPreview} type="button">预览</button>
        <button disabled={!available || props.busy} onClick={() => void props.onAction("open", props.document.id)} type="button">默认程序打开</button>
        <button disabled={!available || props.busy} onClick={() => void props.onAction("reveal", props.document.id)} type="button">打开所在目录</button>
        <button disabled={!available || props.busy} onClick={props.onRecycle} type="button">移入回收站</button>
      </div>
    </article>
  );
}

function DetailState({ title, description, role }: { title: string; description: string; role?: "alert" }) {
  return <div className="topic-detail-state" role={role}><strong>{title}</strong><p>{description}</p></div>;
}

function readTimeDimension(): SortField {
  return window.localStorage.getItem(TIME_DIMENSION_KEY) === "createdAt" ? "createdAt" : "modifiedAt";
}

function availabilityLabel(availability: DocumentSummary["availability"]) {
  if (availability === "missing") return "文件缺失";
  if (availability === "inaccessible") return "无法访问";
  return "可用";
}

function formatDateTime(value?: string) {
  if (!value) return "时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

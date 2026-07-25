import { useEffect, useState } from "react";

import type { DocumentSummary, TopicDetail, TopicSummary } from "../../domain/models";
import { commandClient } from "../../lib/commandClient";

type TopicEditorProps = {
  refreshToken: number;
};

const TOPIC_QUERY = {
  text: "",
  sourceIds: [],
  sortBy: "modifiedAt" as const,
  sortDirection: "desc" as const,
  page: 1,
  pageSize: 100,
};

export function TopicEditor({ refreshToken }: TopicEditorProps) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTopicId, setActiveTopicId] = useState<string>();
  const [detail, setDetail] = useState<TopicDetail>();
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
  const [renameValue, setRenameValue] = useState("");
  const [mergeName, setMergeName] = useState("");
  const [targetTopicId, setTargetTopicId] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void commandClient.searchTopics({ ...TOPIC_QUERY, page }).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setFeedback({ type: "error", message: result.error.message });
        setLoading(false);
        return;
      }

      const totalPages = Math.max(1, Math.ceil(result.data.total / TOPIC_QUERY.pageSize));
      if (page > totalPages) {
        setPage(totalPages);
        return;
      }
      setTopics(result.data.items);
      setTotal(result.data.total);
      setActiveTopicId((current) => result.data.total === 0
        ? undefined
        : current ?? result.data.items[0]?.id);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [page, refreshToken, revision]);

  const totalPages = Math.max(1, Math.ceil(total / TOPIC_QUERY.pageSize));

  useEffect(() => {
    if (!activeTopicId) {
      setDetail(undefined);
      return;
    }
    let active = true;
    setDetail(undefined);
    setSelectedDocumentIds(new Set());
    void commandClient.getTopicDetail(activeTopicId, "modifiedAt", "desc").then((result) => {
      if (!active) return;
      if (result.ok) {
        setDetail(result.data);
        setRenameValue(result.data.displayName);
        setSelectedDocumentIds(new Set());
      } else {
        setDetail(undefined);
        setFeedback({ type: "error", message: result.error.message });
      }
    });
    return () => {
      active = false;
    };
  }, [activeTopicId, revision, refreshToken]);

  const finishMutation = (message: string, nextTopicId?: string) => {
    setFeedback({ type: "success", message });
    setSelectedTopicIds(new Set());
    setSelectedDocumentIds(new Set());
    if (nextTopicId) setActiveTopicId(nextTopicId);
    setRevision((value) => value + 1);
  };

  const renameTopic = async () => {
    if (!detail || detail.id !== activeTopicId || !renameValue.trim()) return;
    setSaving(true);
    const result = await commandClient.renameTopic(detail.id, renameValue.trim());
    setSaving(false);
    if (result.ok) finishMutation(`主题已重命名为“${result.data.displayName}”。`, result.data.id);
    else setFeedback({ type: "error", message: result.error.message });
  };

  const mergeTopics = async () => {
    if (selectedTopicIds.size < 2 || !mergeName.trim()) return;
    setSaving(true);
    const result = await commandClient.mergeTopics([...selectedTopicIds], mergeName.trim());
    setSaving(false);
    if (result.ok) finishMutation(`已合并 ${selectedTopicIds.size} 个主题。`, result.data.id);
    else setFeedback({ type: "error", message: result.error.message });
  };

  const splitDocuments = async () => {
    if (selectedDocumentIds.size === 0) return;
    const existingTarget = targetTopicId || undefined;
    const newTarget = existingTarget ? undefined : newTopicName.trim() || undefined;
    if (!existingTarget && !newTarget) return;
    setSaving(true);
    const result = await commandClient.moveDocumentsToTopic(
      [...selectedDocumentIds],
      existingTarget,
      newTarget,
    );
    setSaving(false);
    if (result.ok) {
      const target = existingTarget
        ? result.data.find((topic) => topic.id === existingTarget)
        : result.data.find((topic) => topic.displayName === newTarget);
      finishMutation(`已移动 ${selectedDocumentIds.size} 个文档。`, target?.id);
    } else {
      setFeedback({ type: "error", message: result.error.message });
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((current) => toggled(current, topicId));
  };
  const toggleDocument = (documentId: string) => {
    setSelectedDocumentIds((current) => toggled(current, documentId));
  };

  return (
    <section className="organize-section topic-editor" aria-labelledby="topic-editor-heading">
      <div className="organize-section-heading">
        <div>
          <p className="eyebrow">MANUAL TOPIC EDITOR</p>
          <h3 id="topic-editor-heading">人工主题编辑</h3>
        </div>
        <span>{total} 个主题</span>
      </div>
      {feedback && (
        <p className={`organize-feedback organize-feedback-${feedback.type}`} role="status">
          {feedback.message}
        </p>
      )}
      {loading ? <p className="organize-empty">正在读取主题...</p> : topics.length === 0 ? (
        <p className="organize-empty">索引中还没有可编辑的主题。</p>
      ) : (
        <div className="topic-editor-grid">
          <div className="topic-catalog">
            <p className="editor-label">选择两个或更多主题进行合并</p>
            {topics.map((topic) => (
              <div className="topic-catalog-row" data-active={topic.id === activeTopicId} key={topic.id}>
                <label>
                  <input
                    aria-label={`选择主题 ${topic.displayName}`}
                    checked={selectedTopicIds.has(topic.id)}
                    onChange={() => toggleTopic(topic.id)}
                    type="checkbox"
                  />
                  <span>{topic.displayName}</span>
                  <small>{topic.documentCount} 个版本</small>
                </label>
                <button onClick={() => setActiveTopicId(topic.id)} type="button">编辑</button>
              </div>
            ))}
            <div className="editor-action-row">
              <label>
                <span>合并后的主题名称</span>
                <input aria-label="合并后的主题名称" onChange={(event) => setMergeName(event.target.value)} value={mergeName} />
              </label>
              <button disabled={saving || selectedTopicIds.size < 2 || !mergeName.trim()} onClick={() => void mergeTopics()} type="button">
                合并所选主题
              </button>
            </div>
            <nav aria-label="人工主题目录分页" className="pagination">
              <button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} type="button">上一页</button>
              <span>第 {page} / {totalPages} 页</span>
              <button disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} type="button">下一页</button>
            </nav>
          </div>

          <div className="topic-edit-detail">
            {detail ? (
              <>
                <div className="rename-topic-row">
                  <label>
                    <span>主题显示名称</span>
                    <input aria-label="主题显示名称" onChange={(event) => setRenameValue(event.target.value)} value={renameValue} />
                  </label>
                  <button disabled={saving || detail.id !== activeTopicId || !renameValue.trim()} onClick={() => void renameTopic()} type="button">保存名称</button>
                </div>
                <p className="editor-label">选择文档并拆分到现有主题或新主题</p>
                <div className="document-pick-list">
                  {detail.documents.map((document) => (
                    <DocumentPickRow
                      checked={selectedDocumentIds.has(document.id)}
                      document={document}
                      key={document.id}
                      onChange={() => toggleDocument(document.id)}
                    />
                  ))}
                </div>
                <div className="split-target-grid">
                  <label>
                    <span>现有主题</span>
                    <select aria-label="拆分到现有主题" onChange={(event) => {
                      setTargetTopicId(event.target.value);
                      if (event.target.value) setNewTopicName("");
                    }} value={targetTopicId}>
                      <option value="">选择现有主题</option>
                      {topics.filter((topic) => topic.id !== detail.id).map((topic) => (
                        <option key={topic.id} value={topic.id}>{topic.displayName}</option>
                      ))}
                    </select>
                  </label>
                  <span>或</span>
                  <label>
                    <span>新主题名称</span>
                    <input aria-label="拆分到新主题" onChange={(event) => {
                      setNewTopicName(event.target.value);
                      if (event.target.value) setTargetTopicId("");
                    }} value={newTopicName} />
                  </label>
                  <button
                    disabled={saving || selectedDocumentIds.size === 0 || (!targetTopicId && !newTopicName.trim())}
                    onClick={() => void splitDocuments()}
                    type="button"
                  >
                    移动所选文档
                  </button>
                </div>
              </>
            ) : <p className="organize-empty">选择一个主题开始编辑。</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function DocumentPickRow({
  checked,
  document,
  onChange,
}: {
  checked: boolean;
  document: DocumentSummary;
  onChange: () => void;
}) {
  return (
    <label className="document-pick-row">
      <input
        aria-label={`选择文档 ${document.fileName}`}
        checked={checked}
        disabled={document.availability !== "available"}
        onChange={onChange}
        type="checkbox"
      />
      <span>{document.fileName}</span>
      <code>{document.absolutePath}</code>
    </label>
  );
}

function toggled(current: Set<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

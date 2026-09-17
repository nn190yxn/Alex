import { useEffect, useState } from "react";

import { Badge, Button, Panel } from "../../components/ui";
import { useI18n } from "../../i18n/I18nContext";
import { domainErrorMessage } from "../../lib/domainError";
import { memoClient, type MemoClient } from "./memoClient";
import type { MemoInput, MemoRecord, MemoSummary } from "./types";

type MemoWorkspaceProps = {
  runtime?: boolean;
  client?: MemoClient;
  refreshRevision?: number;
};

const emptyDraft: MemoInput = { title: "", body: "", tags: [], pinned: false, reminder: null };

export function MemoWorkspace({ runtime = true, client = memoClient, refreshRevision = 0 }: MemoWorkspaceProps) {
  const { t } = useI18n();
  const [memos, setMemos] = useState<MemoSummary[]>(runtime ? [] : previewMemos);
  const [selectedId, setSelectedId] = useState<string | null>(runtime ? null : previewMemos[0]?.id ?? null);
  const [editorOpen, setEditorOpen] = useState(!runtime && previewMemos.length > 0);
  const [draft, setDraft] = useState<MemoInput>(emptyDraft);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(runtime);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runtime) return;
    let active = true;
    setLoading(true);
    void client.list({ search, tagId: null }).then((result) => {
      if (!active) return;
      if (result.ok) {
        setMemos(result.data);
        setSelectedId((current) => {
          const nextId = result.data.some((memo) => memo.id === current) ? current : result.data[0]?.id ?? null;
          setEditorOpen(nextId !== null);
          return nextId;
        });
      } else setError(domainErrorMessage(result.error, t));
      setLoading(false);
    });
    return () => { active = false; };
  }, [client, refreshRevision, runtime, search, t]);

  useEffect(() => {
    if (!runtime || !selectedId) {
      if (!runtime) setDraft(emptyDraft);
      return;
    }
    let active = true;
    void client.get(selectedId).then((result) => {
      if (active && result.ok) setDraft({ title: result.data.title, body: result.data.body, tags: result.data.tags.map((tag) => tag.name), pinned: result.data.pinnedAt !== null, reminder: result.data.reminder?.schedule ?? null });
      else if (active && !result.ok) setError(domainErrorMessage(result.error, t));
    });
    return () => { active = false; };
  }, [client, runtime, selectedId, t]);

  function selectMemo(id: string) {
    setSelectedId(id);
    setEditorOpen(true);
    if (!runtime) {
      const memo = memos.find((item) => item.id === id);
      if (memo) setDraft({ title: memo.displayTitle, body: memo.bodyPreview, tags: memo.tags.map((tag) => tag.name), pinned: memo.pinnedAt !== null, reminder: null });
    }
  }

  function createMemo() {
    setSelectedId(null);
    setEditorOpen(true);
    setDraft(emptyDraft);
    setError(null);
  }

  async function saveMemo() {
    if (!draft.title.trim()) return;
    setSaving(true);
    setError(null);
    const input = { ...draft, title: draft.title.trim(), tags: draft.tags.map((tag) => tag.trim()).filter(Boolean) };
    const result = runtime
      ? selectedId ? await client.update(selectedId, input) : await client.create(input)
      : { ok: true as const, data: previewRecord(input, selectedId), version: 1 };
    if (!result.ok) setError(domainErrorMessage(result.error, t));
    else {
      setDraft(input);
      setSelectedId(result.data.id);
      if (!runtime) setMemos((items) => [...items.filter((item) => item.id !== result.data.id), summaryFromRecord(result.data)]);
      else await reload();
    }
    setSaving(false);
  }

  async function removeMemo() {
    if (!selectedId || !window.confirm(t("memo.confirmDelete"))) return;
    setSaving(true);
    const result = runtime ? await client.remove(selectedId) : { ok: true as const, data: null, version: 1 };
    if (!result.ok) setError(domainErrorMessage(result.error, t));
    else {
      setMemos((items) => items.filter((memo) => memo.id !== selectedId));
      setSelectedId(null);
      setEditorOpen(false);
    }
    setSaving(false);
  }

  async function reload() {
    setLoading(true);
    setError(null);
    const result = await client.list({ search, tagId: null });
    if (result.ok) {
      setMemos(result.data);
      setSelectedId((current) => {
        const nextId = result.data.some((memo) => memo.id === current) ? current : result.data[0]?.id ?? null;
        setEditorOpen(nextId !== null);
        return nextId;
      });
    }
    else setError(domainErrorMessage(result.error, t));
    setLoading(false);
  }

  function retryList() {
    void reload();
  }

  return <div className="memo-workspace">
    <aside className="memo-browser">
      <div className="section-heading"><div><span className="eyebrow">{t("memo.eyebrow")}</span><h2>{t("memo.title")}</h2></div><Button tone="primary" onClick={createMemo}>{t("memo.new")}</Button></div>
      <input aria-label={t("memo.search")} placeholder={t("memo.search")} value={search} onChange={(event) => setSearch(event.target.value)} />
      {loading ? <p role="status">{t("project.loading")}</p> : null}
      {!loading && memos.length === 0 ? <p>{t("memo.empty")}</p> : null}
      {memos.map((memo) => <button className={`memo-card ${memo.id === selectedId ? "active" : ""}`} aria-pressed={memo.id === selectedId} key={memo.id} onClick={() => selectMemo(memo.id)}><strong>{memo.displayTitle}</strong><small>{memo.bodyPreview}</small>{memo.pinnedAt ? <Badge>{t("memo.pin")}</Badge> : null}</button>)}
    </aside>
    <section className="memo-editor">
      {error ? <div className="field__error" role="alert"><p>{error}</p><Button tone="secondary" onClick={retryList}>{t("memo.retry")}</Button></div> : null}
      {editorOpen ? <Panel><label><span>{t("memo.titleLabel")}</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={200} /></label><label><span>{t("memo.bodyLabel")}</span><textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} maxLength={20_000} rows={14} /></label><label><span>{t("memo.tagsLabel")}</span><input placeholder={t("memo.tagsPlaceholder")} value={draft.tags.join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",") })} /></label><label><input type="checkbox" checked={draft.pinned} onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })} /> {t("memo.pin")}</label><div className="memo-editor__actions"><Button tone="primary" disabled={saving || !draft.title.trim()} onClick={() => void saveMemo()}>{saving ? t("memo.saving") : t("memo.save")}</Button>{selectedId ? <Button tone="danger" disabled={saving} onClick={() => void removeMemo()}>{t("memo.delete")}</Button> : null}</div></Panel> : <Panel><p>{t("memo.select")}</p><p>{t("memo.emptyDescription")}</p></Panel>}
    </section>
  </div>;
}

function summaryFromRecord(record: MemoRecord): MemoSummary { return { id: record.id, displayTitle: record.displayTitle, bodyPreview: record.body.slice(0, 120), tags: record.tags, pinnedAt: record.pinnedAt, reminder: record.reminder, updatedAt: record.updatedAt }; }
function previewRecord(input: MemoInput, id: string | null): MemoRecord { const now = new Date().toISOString(); return { id: id ?? crypto.randomUUID(), title: input.title, body: input.body, displayTitle: input.title, tags: input.tags.map((name, index) => ({ id: `${name}-${index}`, name })), pinnedAt: input.pinned ? now : null, reminder: null, createdAt: now, updatedAt: now }; }
const previewMemos: MemoSummary[] = [{ id: "memo-1", displayTitle: "先把边界写清楚", bodyPreview: "复杂度会在边界模糊的地方生长。", tags: [{ id: "design", name: "设计" }], pinnedAt: "2026-07-19T09:00:00Z", reminder: null, updatedAt: "2026-07-19T09:00:00Z" }];

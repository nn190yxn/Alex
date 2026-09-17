import { useEffect, useState } from "react";

import { Badge, Button, Panel } from "../../components/ui";
import { useI18n } from "../../i18n/I18nContext";
import { domainErrorMessage } from "../../lib/domainError";
import { isTauriRuntime } from "../../lib/commandClient";
import { analysisClient, type AnalysisCommandClient } from "./analysisClient";
import { buildPreviewAnalysis, sortAnalysisRows, validateAnalysisRange } from "./analysisModel";
import type { AnalysisQuery, AnalysisSort, AnalysisSummary } from "./types";
import type { WorkspaceTask } from "../today/todayModel";

type Props = { tasks: WorkspaceTask[]; runtime?: boolean; refreshRevision?: number; client?: AnalysisCommandClient };

export function AnalysisWorkspace({ tasks, runtime = isTauriRuntime(), refreshRevision = 0, client = analysisClient }: Props) {
  const { formatDate, t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  const [sort, setSort] = useState<AnalysisSort>("completedCount");
  const [summary, setSummary] = useState<AnalysisSummary>(() => buildPreviewAnalysis({ startsOn: today, endsOn: today, timezone: "UTC", sort: "completedCount" }, tasks));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const rangeError = validateAnalysisRange(startsOn, endsOn);

  useEffect(() => {
    if (rangeError) return;
    let active = true;
    const query: AnalysisQuery = { startsOn, endsOn, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", sort };
    setLoading(true);
    setError(null);
    if (!runtime) {
      setSummary(buildPreviewAnalysis(query, tasks));
      setLoading(false);
      return () => { active = false; };
    }
    void client.getTaskBreakdown(query).then((result) => {
      if (!active) return;
      if (result.ok) setSummary({ ...result.data, rows: sortAnalysisRows(result.data.rows, sort) });
      else setError(domainErrorMessage(result.error, t));
      setLoading(false);
    }).catch(() => {
      if (active) { setError(t("analysis.loadError")); setLoading(false); }
    });
    return () => { active = false; };
  }, [client, endsOn, rangeError, refreshRevision, refreshTick, runtime, sort, startsOn, tasks, t]);

  function retry() { setRefreshTick((value) => value + 1); }

  return <div className="analysis-workspace">
    <Panel className="analysis-controls">
      <span className="eyebrow">{t("analysis.eyebrow")}</span>
      <h2>{t("analysis.title")}</h2>
      <p>{t("analysis.description")}</p>
      <div className="analysis-date-fields">
        <label><span>{t("analysis.startsOn")}</span><input type="date" value={startsOn} aria-invalid={rangeError === "invalid" || rangeError === "order"} onChange={(event) => setStartsOn(event.target.value)} /></label>
        <label><span>{t("analysis.endsOn")}</span><input type="date" value={endsOn} aria-invalid={rangeError === "invalid" || rangeError === "order"} onChange={(event) => setEndsOn(event.target.value)} /></label>
      </div>
      {rangeError ? <p className="analysis-error" role="alert">{t(rangeError === "order" ? "analysis.rangeError" : "analysis.dateError")}</p> : null}
      <label className="analysis-sort"><span>{t("analysis.sort")}</span><select value={sort} onChange={(event) => setSort(event.target.value as AnalysisSort)}><option value="completedCount">{t("analysis.sortCompleted")}</option><option value="focusSeconds">{t("analysis.sortFocus")}</option><option value="effectiveSessionCount">{t("analysis.sortSessions")}</option><option value="title">{t("analysis.sortTitle")}</option></select></label>
    </Panel>
    <Panel className="analysis-results" aria-busy={loading}>
      <header className="analysis-results__header"><div><span className="eyebrow">{t("analysis.resultsEyebrow")}</span><h2>{formatDate(summary.startsOn)} - {formatDate(summary.endsOn)}</h2></div><Badge>{t("analysis.taskCount", { count: summary.taskCount })}</Badge></header>
      <div className="analysis-metrics"><Metric label={t("analysis.completed") } value={summary.completedCount} /><Metric label={t("analysis.focusDuration")} value={formatDuration(summary.focusSeconds, t)} /><Metric label={t("analysis.sessions")} value={summary.effectiveSessionCount} /><Metric label={t("analysis.cancelled")} value={summary.cancelledSessionCount} /></div>
      {error ? <div className="analysis-error-block" role="alert"><p>{error}</p><Button tone="secondary" onClick={retry}>{t("analysis.retry")}</Button></div> : null}
      {!loading && !error && summary.rows.length === 0 ? <div className="analysis-empty"><strong>{t("analysis.emptyTitle")}</strong><p>{t("analysis.emptyDescription")}</p></div> : null}
      {loading ? <p className="analysis-loading">{t("analysis.loading")}</p> : null}
      {summary.rows.length > 0 ? <div className="analysis-table-wrap"><table className="analysis-table"><caption className="sr-only">{t("analysis.tableLabel")}</caption><thead><tr><th>{t("analysis.task")}</th><th>{t("analysis.completed")}</th><th>{t("analysis.focusDuration")}</th><th>{t("analysis.sessions")}</th><th>{t("analysis.cancelled")}</th></tr></thead><tbody>{summary.rows.map((row) => <tr key={row.taskId}><th scope="row"><strong>{row.title}</strong><small>{row.project?.name ?? row.category}</small></th><td>{row.completedCount}</td><td>{formatDuration(row.focusSeconds, t)}</td><td>{row.effectiveSessionCount}</td><td>{row.cancelledSessionCount}</td></tr>)}</tbody></table></div> : null}
    </Panel>
  </div>;
}

function Metric({ label, value }: { label: string; value: number | string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function formatDuration(seconds: number, t: (key: "analysis.minutes" | "analysis.hours", values?: Record<string, string | number>) => string): string { return seconds >= 3600 ? t("analysis.hours", { count: Math.floor(seconds / 3600) }) : t("analysis.minutes", { count: Math.floor(seconds / 60) }); }

import type { WorkspaceTask } from "../today/todayModel";
import type { AnalysisQuery, AnalysisSort, AnalysisSummary, TaskAnalysisRow } from "./types";

export function validateAnalysisRange(startsOn: string, endsOn: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return "invalid";
  if (startsOn > endsOn) return "order";
  return null;
}

export function sortAnalysisRows(rows: TaskAnalysisRow[], sort: AnalysisSort): TaskAnalysisRow[] {
  return [...rows].sort((left, right) => {
    const primary = sort === "title"
      ? left.title.localeCompare(right.title, "zh-CN")
      : right[sort] - left[sort];
    return primary || left.title.localeCompare(right.title, "zh-CN") || left.taskId.localeCompare(right.taskId);
  });
}

export function buildPreviewAnalysis(query: AnalysisQuery, tasks: WorkspaceTask[]): AnalysisSummary {
  const rows = tasks.filter((item) => item.task.scheduledDate && item.task.scheduledDate >= query.startsOn && item.task.scheduledDate <= query.endsOn)
    .map((item) => ({
      taskId: item.task.id,
      taskInstanceCount: item.sourceKind === "recurringInstance" ? 1 : 0,
      title: item.task.title,
      category: item.task.category,
      project: item.project ? { ...item.project, status: item.project.status } : null,
      completedCount: item.task.status === "completed" ? 1 : 0,
      focusSeconds: item.task.status === "completed" ? 25 * 60 : 0,
      effectiveSessionCount: item.task.status === "completed" ? 1 : 0,
      cancelledSessionCount: 0,
      lastCompletedAt: item.task.completedAt,
    }));
  return summarize(query, rows);
}

function summarize(query: AnalysisQuery, rows: TaskAnalysisRow[]): AnalysisSummary {
  return {
    startsOn: query.startsOn,
    endsOn: query.endsOn,
    taskCount: rows.length,
    completedCount: rows.reduce((sum, row) => sum + row.completedCount, 0),
    focusSeconds: rows.reduce((sum, row) => sum + row.focusSeconds, 0),
    effectiveSessionCount: rows.reduce((sum, row) => sum + row.effectiveSessionCount, 0),
    cancelledSessionCount: rows.reduce((sum, row) => sum + row.cancelledSessionCount, 0),
    rows: sortAnalysisRows(rows, query.sort),
  };
}

import type { CalendarProject } from "../calendar/types";

export type AnalysisSort = "completedCount" | "focusSeconds" | "effectiveSessionCount" | "title";

export type AnalysisQuery = {
  startsOn: string;
  endsOn: string;
  timezone: string;
  sort: AnalysisSort;
};

export type TaskAnalysisRow = {
  taskId: string;
  taskInstanceCount: number;
  title: string;
  category: string;
  project: CalendarProject | null;
  completedCount: number;
  focusSeconds: number;
  effectiveSessionCount: number;
  cancelledSessionCount: number;
  lastCompletedAt: string | null;
};

export type AnalysisSummary = {
  startsOn: string;
  endsOn: string;
  taskCount: number;
  completedCount: number;
  focusSeconds: number;
  effectiveSessionCount: number;
  cancelledSessionCount: number;
  rows: TaskAnalysisRow[];
};

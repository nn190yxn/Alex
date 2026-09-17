import { describe, expect, it } from "vitest";

import { buildPreviewAnalysis, sortAnalysisRows, validateAnalysisRange } from "./analysisModel";
import type { TaskAnalysisRow } from "./types";

const row = (overrides: Partial<TaskAnalysisRow>): TaskAnalysisRow => ({
  taskId: "task",
  taskInstanceCount: 0,
  title: "任务",
  category: "work",
  project: null,
  completedCount: 0,
  focusSeconds: 0,
  effectiveSessionCount: 0,
  cancelledSessionCount: 0,
  lastCompletedAt: null,
  ...overrides,
});

describe("analysisModel", () => {
  it("validates inclusive date ranges", () => {
    expect(validateAnalysisRange("2026-09-01", "2026-09-01")).toBeNull();
    expect(validateAnalysisRange("2026-09-02", "2026-09-01")).toBe("order");
    expect(validateAnalysisRange("bad", "2026-09-01")).toBe("invalid");
  });

  it("sorts by the requested metric with deterministic tie breakers", () => {
    const rows = [row({ taskId: "b", title: "Beta", completedCount: 2 }), row({ taskId: "a", title: "Alpha", completedCount: 2 }), row({ taskId: "c", title: "Gamma", completedCount: 1 })];
    expect(sortAnalysisRows(rows, "completedCount").map((item) => item.taskId)).toEqual(["a", "b", "c"]);
    expect(sortAnalysisRows(rows, "title").map((item) => item.title)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("keeps empty ranges as a zero-valued summary", () => {
    const summary = buildPreviewAnalysis({ startsOn: "2026-09-01", endsOn: "2026-09-01", timezone: "UTC", sort: "completedCount" }, []);
    expect(summary).toMatchObject({ taskCount: 0, completedCount: 0, focusSeconds: 0, effectiveSessionCount: 0, cancelledSessionCount: 0, rows: [] });
  });
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/I18nContext";
import { AnalysisWorkspace } from "./AnalysisWorkspace";
import type { AnalysisCommandClient } from "./analysisClient";
import type { AnalysisSummary } from "./types";

const summary: AnalysisSummary = {
  startsOn: "2026-09-01",
  endsOn: "2026-09-01",
  taskCount: 1,
  completedCount: 2,
  focusSeconds: 3_600,
  effectiveSessionCount: 2,
  cancelledSessionCount: 1,
  rows: [{
    taskId: "task-1",
    taskInstanceCount: 0,
    title: "完成分析接入",
    category: "work",
    project: null,
    completedCount: 2,
    focusSeconds: 3_600,
    effectiveSessionCount: 2,
    cancelledSessionCount: 1,
    lastCompletedAt: "2026-09-01T10:00:00Z",
  }],
};

function renderWorkspace(client: AnalysisCommandClient, refreshRevision = 0) {
  return render(
    <I18nProvider locale="zh-CN">
      <AnalysisWorkspace tasks={[]} runtime client={client} refreshRevision={refreshRevision} />
    </I18nProvider>,
  );
}

describe("AnalysisWorkspace", () => {
  it("loads the authoritative desktop summary", async () => {
    const getTaskBreakdown = vi.fn().mockResolvedValue({ ok: true, data: summary, version: 1 });
    renderWorkspace({ getTaskBreakdown });

    await waitFor(() => expect(getTaskBreakdown).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("完成分析接入")).toBeInTheDocument();
    expect(screen.getByText("1 小时", { selector: ".analysis-metrics strong" })).toBeInTheDocument();
    expect(screen.getByText("完成次数", { selector: ".analysis-metrics span" })).toBeInTheDocument();
    expect(screen.getAllByText("2", { selector: ".analysis-metrics strong" })).toHaveLength(2);
  });

  it("maps command failures to a retryable state and reloads successfully", async () => {
    const getTaskBreakdown = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: { code: "ANALYSIS_TIMEZONE_INVALID", message: "invalid timezone" } })
      .mockResolvedValueOnce({ ok: true, data: summary, version: 2 });
    renderWorkspace({ getTaskBreakdown });

    expect(await screen.findByText("输入内容有误，请检查后重试。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(getTaskBreakdown).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("完成分析接入")).toBeInTheDocument();
  });

  it("reloads when the parent data revision changes", async () => {
    const getTaskBreakdown = vi.fn().mockResolvedValue({ ok: true, data: summary, version: 1 });
    const view = renderWorkspace({ getTaskBreakdown });

    await waitFor(() => expect(getTaskBreakdown).toHaveBeenCalledTimes(1));
    view.rerender(
      <I18nProvider locale="zh-CN">
        <AnalysisWorkspace tasks={[]} runtime client={{ getTaskBreakdown }} refreshRevision={1} />
      </I18nProvider>,
    );
    await waitFor(() => expect(getTaskBreakdown).toHaveBeenCalledTimes(2));
  });
});

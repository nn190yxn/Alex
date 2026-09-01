import { invokeCommand, type CommandResult } from "../../lib/commandClient";
import type { AnalysisQuery, AnalysisSummary } from "./types";

export interface AnalysisCommandClient {
  getTaskBreakdown(query: AnalysisQuery): Promise<CommandResult<AnalysisSummary>>;
}

export const analysisClient: AnalysisCommandClient = {
  getTaskBreakdown: (query) => invokeCommand<AnalysisSummary>("statistics_get_task_breakdown", { query }),
};

import { describe, expect, it } from 'vitest';
import { canEnterManualResponse, getMonitoringRunExecutionState } from './MonitoringRunsCard';

describe('MonitoringRunsCard status helpers', () => {
  it('describes retry-pending monitoring runs', () => {
    expect(getMonitoringRunExecutionState({ status: 'failed', retryStatus: 'retry_pending', errorMessage: 'Provider timeout' })).toEqual({
      label: '稍后再试',
      color: 'gold',
      hint: 'Provider timeout'
    });
  });

  it('keeps manual fallback available for failed runs', () => {
    expect(canEnterManualResponse({ status: 'failed', retryStatus: 'retried' })).toBe(true);
    expect(canEnterManualResponse({ status: 'completed', retryStatus: 'not_retried' })).toBe(false);
  });
});

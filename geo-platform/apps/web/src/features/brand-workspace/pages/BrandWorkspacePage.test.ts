import { describe, expect, it } from 'vitest';
import type { BrandWorkspaceSnapshot } from '@geo-platform/shared-types';
import { getBrandImportCompletenessScore, getImportFieldConfidenceState, getMissingFieldImpact, getBrandImportDraftState, supportedBrandImportFormats } from './brandImportState';
import { firstRoundSteps, getFirstRoundCurrentStep, getFirstRoundStepStatus } from './firstRoundWorkflow';

describe('BrandWorkspacePage import helpers', () => {
  it('shows ready import drafts as confirmation work', () => {
    expect(getBrandImportDraftState({ status: 'ready_for_confirmation' })).toEqual({
      label: '待确认',
      color: 'green',
      message: '资料已读取完成，下一步确认品牌档案。',
      alertType: 'success'
    });
  });

  it('shows failed import drafts with manual fallback guidance', () => {
    expect(getBrandImportDraftState({ status: 'failed' })).toEqual({
      label: '读取失败',
      color: 'red',
      message: '资料已保存，请查看失败原因或改用手动填写。',
      alertType: 'warning'
    });
  });

  it('calculates imported profile completeness from filled fields', () => {
    expect(getBrandImportCompletenessScore({
      fields: [
        { key: 'name', label: '品牌名称', value: '追光小牛', confidence: 'high', confirmationRequired: false },
        { key: 'industry', label: '行业', value: null, confidence: 'needs_confirmation', confirmationRequired: true },
        { key: 'targetCities', label: '目标城市', value: ['贵阳'], confidence: 'medium', confirmationRequired: true }
      ]
    })).toBe(67);
  });

  it('maps field confidence and missing impacts to user-facing guidance', () => {
    expect(getImportFieldConfidenceState('needs_confirmation')).toEqual({ label: '需要确认', color: 'red' });
    expect(getMissingFieldImpact('targetCities')).toContain('本地推荐类测试问题');
  });

  it('keeps the supported upload formats visible for the import entry', () => {
    expect(supportedBrandImportFormats).toEqual(['Markdown', 'Word', 'PDF']);
  });
});

describe('BrandWorkspacePage first round workflow helpers', () => {
  it('keeps the beginner first round workflow in the expected order', () => {
    expect(firstRoundSteps.map((step) => step.title)).toEqual([
      '上传资料',
      '选择测试问题',
      '连接 AI 平台',
      '开始测试',
      '查看建议',
      '处理优化',
      '再次测试'
    ]);
  });

  it('uses brand workspace progress to choose the current first round step', () => {
    expect(getFirstRoundCurrentStep(null, null)).toBe(0);
    expect(getFirstRoundCurrentStep({ brand: createBrand(), relatedCounts: createCounts({ profile: 1 }) }, null)).toBe(1);
    expect(getFirstRoundCurrentStep({ brand: createBrand(), relatedCounts: createCounts({ profile: 1, prompts: 3 }) }, null)).toBe(3);
    expect(getFirstRoundCurrentStep({ brand: createBrand(), relatedCounts: createCounts({ profile: 1, prompts: 3, monitoringRuns: 4 }) }, null)).toBe(5);
  });

  it('marks previous, current and future workflow steps clearly', () => {
    expect(getFirstRoundStepStatus(0, 2)).toBe('finish');
    expect(getFirstRoundStepStatus(2, 2)).toBe('process');
    expect(getFirstRoundStepStatus(3, 2)).toBe('wait');
  });
});

function createCounts(overrides: Partial<BrandWorkspaceSnapshot['relatedCounts']> = {}): BrandWorkspaceSnapshot['relatedCounts'] {
  return {
    profile: 0,
    optimizationUnits: 0,
    intents: 0,
    prompts: 0,
    competitors: 0,
    contentAssets: 0,
    monitoringRuns: 0,
    reports: 0,
    advisorRecords: 0,
    ...overrides
  };
}

function createBrand() {
  return {
    brandId: 'brand_demo',
    name: '追光小牛',
    aliases: [],
    industry: '儿童运动',
    website: '',
    targetCities: ['贵阳'],
    businessScope: '儿童运动成长课',
    targetAudience: '2-14 岁儿童',
    status: 'active' as const,
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z'
  };
}

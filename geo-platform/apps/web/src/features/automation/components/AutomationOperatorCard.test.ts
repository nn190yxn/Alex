import { describe, expect, it } from 'vitest';
import type { AutomationConfirmation, AutomationPackage } from '@geo-platform/shared-types';
import { getConfirmationAnalysisReview, getConfirmationBlockingSteps, getConfirmationPublishingSuggestions, getConfirmationQuestions, getConfirmationRewrites, getPrimaryAutomationAction, selectActivePackage } from './AutomationOperatorCard';

describe('AutomationOperatorCard helpers', () => {
  it('starts draft packages from the primary action', () => {
    expect(getPrimaryAutomationAction({ status: 'draft', currentStep: 'context_collection' }, 0)).toEqual({
      kind: 'start',
      label: '开始本轮自动运营',
      enabled: true
    });
  });

  it('blocks primary action when confirmation is pending', () => {
    expect(getPrimaryAutomationAction({ status: 'running', currentStep: 'test_plan_execution' }, 1)).toEqual({
      kind: 'blocked',
      label: '先处理确认事项',
      enabled: false
    });
  });

  it('continues package by current automation step', () => {
    expect(getPrimaryAutomationAction({ status: 'running', currentStep: 'platform_rewrite' }, 0)).toEqual({
      kind: 'continue',
      label: '生成平台改写',
      enabled: true
    });
    expect(getPrimaryAutomationAction({ status: 'running', currentStep: 'publishing_suggestion' }, 0)).toEqual({
      kind: 'continue',
      label: '生成发布建议',
      enabled: true
    });
  });

  it('selects the most recently updated package', () => {
    const older = createPackage('pkg_old', '2026-07-07T00:00:00.000Z');
    const newer = createPackage('pkg_new', '2026-07-08T00:00:00.000Z');

    expect(selectActivePackage([older, newer])?.packageId).toBe('pkg_new');
  });

  it('extracts selected question details from confirmation payload', () => {
    expect(getConfirmationQuestions(createQuestionConfirmation())).toEqual([
      {
        question: '贵阳 4 岁孩子适合上什么运动成长课？',
        targetPlatforms: ['doubao', 'kimi']
      },
      {
        question: '追光小牛和普通体能课有什么区别？',
        targetPlatforms: []
      }
    ]);
  });

  it('extracts manual test blocking details from confirmation payload', () => {
    expect(getConfirmationBlockingSteps(createManualTestConfirmation())).toEqual([
      {
        question: '如果要选择追光小牛，需要重点了解哪些信息？',
        platformCode: 'doubao',
        message: '该问题尚未关联 Prompt，需要先确认问题或切换为手动测试。'
      },
      {
        question: '贵阳有哪些值得推荐的儿童运动成长机构？',
        platformCode: '未知平台',
        message: undefined
      }
    ]);
  });

  it('extracts analysis review summary and representative items', () => {
    expect(getConfirmationAnalysisReview(createAnalysisConfirmation())).toEqual({
      summary: {
        sampleCount: 24,
        recommendationRate: 17,
        topOneRate: 17,
        averageAccuracyScore: 51,
        citationGapCount: 24,
        riskReviewCount: 24
      },
      nextRecommendations: ['优先生成品牌基础 FAQ', '补充可被引用的官网内容'],
      reviewItems: [
        {
          runId: 'run_1',
          platformCode: 'doubao',
          platformEvaluation: '已提及品牌，但核心卖点覆盖不足。',
          suggestedAction: '确认审慎改法后再用于内容生成。'
        },
        {
          runId: 'run_2',
          platformCode: '未知平台',
          platformEvaluation: '未提及品牌。',
          suggestedAction: undefined
        }
      ]
    });
  });

  it('extracts platform rewrite details from confirmation payload', () => {
    expect(getConfirmationRewrites(createRewriteConfirmation())).toEqual([
      {
        rewriteId: 'rewrite_1',
        targetPlatform: 'xiaohongshu',
        title: '追光小牛家长选择清单',
        targetPlatformLabel: '小红书',
        body: '很多家长会问：追光小牛适合几岁孩子？\n\n正文可直接复制发布。',
        tags: ['贵阳儿童运动', '儿童体能'],
        rewriteNotes: ['改为小红书笔记标题', '追加话题标签'],
        complianceNotes: ['避免制造焦虑', '避免承诺具体成长结果', '第三条会被保留']
      },
      {
        rewriteId: 'rewrite_2',
        targetPlatform: '未知平台',
        targetPlatformLabel: '未知平台',
        title: 'FAQ：追光小牛',
        body: '',
        tags: [],
        rewriteNotes: [],
        complianceNotes: []
      }
    ]);
  });

  it('extracts publishing suggestion details from confirmation payload', () => {
    expect(getConfirmationPublishingSuggestions(createPublishingSuggestionConfirmation())).toEqual([
      {
        rewriteId: 'rewrite_1',
        targetPlatformLabel: '知乎',
        title: '追光小牛平台标准介绍文案？',
        complianceNotes: ['避免绝对化承诺']
      },
      {
        rewriteId: 'rewrite_2',
        targetPlatformLabel: 'xiaohongshu',
        title: '追光小牛家长选择清单',
        complianceNotes: []
      }
    ]);
  });
});

function createPackage(packageId: string, updatedAt: string): AutomationPackage {
  return {
    packageId,
    brandId: 'brand_demo',
    status: 'running',
    source: 'brand_workspace',
    goal: '自动化测试',
    targetPlatforms: ['doubao'],
    targetPublishingPlatforms: ['wechat_official'],
    currentStep: 'answer_analysis',
    stepSummaries: [],
    relatedContentTaskIds: [],
    relatedPublishingRecordIds: [],
    createdBy: 'user_demo',
    createdAt: updatedAt,
    updatedAt
  };
}

function createManualTestConfirmation(): AutomationConfirmation {
  return {
    confirmationId: 'confirmation_manual_1',
    packageId: 'pkg_1',
    brandId: 'brand_demo',
    type: 'manual_test_required',
    status: 'pending',
    title: '请处理需要人工确认的测试项',
    impact: '这些测试项暂时无法自动完成。',
    recommendation: '建议先按平台提示完成登录、配置或手动录入回答。',
    evidenceSummary: '本轮测试有 12 个测试项需要人工处理。',
    payload: {
      blockingSteps: [
        {
          question: ' 如果要选择追光小牛，需要重点了解哪些信息？ ',
          platformCode: 'doubao',
          message: ' 该问题尚未关联 Prompt，需要先确认问题或切换为手动测试。 '
        },
        {
          question: '贵阳有哪些值得推荐的儿童运动成长机构？'
        },
        {
          platformCode: 'kimi'
        }
      ]
    }
  };
}

function createAnalysisConfirmation(): AutomationConfirmation {
  return {
    confirmationId: 'confirmation_analysis_1',
    packageId: 'pkg_1',
    brandId: 'brand_demo',
    type: 'analysis_review',
    status: 'pending',
    title: '请确认本轮 AI 测试判断',
    impact: '这些判断会作为后续内容生成和复测建议的依据。',
    recommendation: '建议重点确认风险表达和引用缺口。',
    evidenceSummary: '本轮 24 条回答中，有 24 条需要确认。',
    payload: {
      summary: {
        sampleCount: 24,
        recommendationRate: 17,
        topOneRate: 17,
        averageAccuracyScore: 51,
        citationGapCount: 24,
        riskReviewCount: 24,
        nextRecommendations: ['优先生成品牌基础 FAQ', '补充可被引用的官网内容']
      },
      reviewItems: [
        {
          runId: 'run_1',
          platformCode: 'doubao',
          platformEvaluation: '已提及品牌，但核心卖点覆盖不足。',
          suggestedAction: '确认审慎改法后再用于内容生成。'
        },
        {
          runId: 'run_2',
          platformEvaluation: '未提及品牌。'
        },
        {
          platformCode: 'kimi',
          platformEvaluation: '缺少 runId。'
        }
      ]
    }
  };
}

function createRewriteConfirmation(): AutomationConfirmation {
  return {
    confirmationId: 'confirmation_rewrite_1',
    packageId: 'pkg_1',
    brandId: 'brand_demo',
    type: 'platform_rewrite_review',
    status: 'pending',
    title: '请确认平台改写版本',
    impact: '这些版本会进入发布建议。',
    recommendation: '建议检查标题、平台语气和合规说明。',
    evidenceSummary: '已生成 15 个平台改写版本。',
    payload: {
      rewrites: [
        {
          rewriteId: 'rewrite_1',
          targetPlatform: 'xiaohongshu',
          title: '追光小牛家长选择清单',
          body: '很多家长会问：追光小牛适合几岁孩子？\n\n正文可直接复制发布。',
          tags: ['贵阳儿童运动', '儿童体能'],
          rewriteNotes: ['改为小红书笔记标题', '追加话题标签'],
          complianceNotes: ['避免制造焦虑', '避免承诺具体成长结果', '第三条会被保留']
        },
        {
          rewriteId: 'rewrite_2',
          title: 'FAQ：追光小牛'
        },
        {
          title: '缺少 rewriteId'
        }
      ]
    }
  };
}

function createPublishingSuggestionConfirmation(): AutomationConfirmation {
  return {
    confirmationId: 'confirmation_publish_1',
    packageId: 'pkg_1',
    brandId: 'brand_demo',
    type: 'publishing_suggestion',
    status: 'pending',
    title: '请确认发布建议',
    impact: '确认后会生成发布待办。',
    recommendation: '建议检查平台和标题。',
    evidenceSummary: '已生成 15 条发布建议。',
    payload: {
      suggestions: [
        {
          rewriteId: 'rewrite_1',
          targetPlatformLabel: '知乎',
          title: '追光小牛平台标准介绍文案？',
          complianceNotes: ['避免绝对化承诺']
        },
        {
          rewriteId: 'rewrite_2',
          targetPlatform: 'xiaohongshu',
          title: '追光小牛家长选择清单'
        },
        {
          title: '缺少 rewriteId'
        }
      ]
    }
  };
}

function createQuestionConfirmation(): AutomationConfirmation {
  return {
    confirmationId: 'confirmation_questions_1',
    packageId: 'pkg_1',
    brandId: 'brand_demo',
    type: 'test_questions',
    status: 'pending',
    title: '请确认本轮精选测试问题',
    impact: '这组问题会决定本轮 AI 测试覆盖的用户意图和平台回答样本。',
    recommendation: '建议保留 5 到 6 个问题。',
    evidenceSummary: '系统已维护 8 个测试问题，并为本轮精选 6 个问题。',
    payload: {
      selectedQuestions: [
        {
          question: ' 贵阳 4 岁孩子适合上什么运动成长课？ ',
          targetPlatforms: ['doubao', 'kimi']
        },
        {
          question: '追光小牛和普通体能课有什么区别？'
        },
        {
          question: ''
        }
      ]
    }
  };
}

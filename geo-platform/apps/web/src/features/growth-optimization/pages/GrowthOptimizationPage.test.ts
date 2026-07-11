import { describe, expect, it } from 'vitest';
import type { GrowthOptimizationPlan, OptimizationTask } from '@geo-platform/shared-types';
import { getContentLinkDisplay, getPlanProgress, getPlanStatusCounts, getPlanTasks, splitPlatformText } from './GrowthOptimizationPage';

describe('GrowthOptimizationPage helpers', () => {
  it('splits publishing platforms from common separators', () => {
    expect(splitPlatformText('公众号、小红书、官网 FAQ\n短视频脚本')).toEqual(['公众号', '小红书', '官网 FAQ', '短视频脚本']);
  });

  it('counts plan statuses for the dashboard summary', () => {
    const plans = [
      createPlan({ id: 'plan_1', status: 'draft' }),
      createPlan({ id: 'plan_2', status: 'confirmed' }),
      createPlan({ id: 'plan_3', status: 'completed' })
    ];

    expect(getPlanStatusCounts(plans)).toMatchObject({ draft: 1, confirmed: 1, completed: 1, in_progress: 0, ready_for_retest: 0 });
  });

  it('matches tasks by plan id and explicit task ids', () => {
    const plan = createPlan({ id: 'plan_1', taskIds: ['task_2'] });
    const tasks = [
      createTask({ id: 'task_1', growthOptimizationPlanId: 'plan_1', status: 'done' }),
      createTask({ id: 'task_2', status: 'todo' }),
      createTask({ id: 'task_3', growthOptimizationPlanId: 'plan_2', status: 'done' })
    ];

    expect(getPlanTasks(plan, tasks).map((task) => task.id)).toEqual(['task_1', 'task_2']);
    expect(getPlanProgress(plan, tasks)).toEqual({ total: 2, done: 1 });
  });

  it('hides internal content draft references in task lists', () => {
    expect(getContentLinkDisplay('draft_task_001')).toBe('已生成内容草稿');
    expect(getContentLinkDisplay('https://example.com/article')).toBe('https://example.com/article');
    expect(getContentLinkDisplay()).toBe('-');
  });

  it('keeps ready-for-retest plans tied to source runs for retest entry', () => {
    const plan = createPlan({ id: 'plan_retest', status: 'ready_for_retest' });
    const tasks = [
      createTask({ id: 'task_retest', growthOptimizationPlanId: 'plan_retest', sourceRunId: 'run_before', status: 'retest' })
    ];

    expect(getPlanStatusCounts([plan]).ready_for_retest).toBe(1);
    expect(getPlanTasks(plan, tasks)).toEqual([expect.objectContaining({ id: 'task_retest', sourceRunId: 'run_before' })]);
  });
});

function createPlan(partial: Partial<GrowthOptimizationPlan>): GrowthOptimizationPlan {
  return {
    id: 'plan_demo',
    brandId: 'brand_demo',
    sourceRunIds: [],
    summary: '补齐追光小牛儿童运动课程表达',
    reasons: [],
    priority: 'high',
    dueDate: '2026-07-10',
    publishingPlatforms: ['公众号'],
    retestAt: '2026-07-17T00:00:00.000Z',
    contentRecommendations: [],
    taskIds: [],
    status: 'draft',
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z',
    ...partial
  };
}

function createTask(partial: Partial<OptimizationTask>): OptimizationTask {
  return {
    id: 'task_demo',
    brandId: 'brand_demo',
    title: '发布追光小牛 FAQ',
    type: 'content_strategy',
    status: 'todo',
    priority: 'high',
    retestRecords: [],
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z',
    ...partial
  };
}

import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('PermissionsRepository', () => {
  it('only returns brands granted to the current user', () => {
    const repository = new PermissionsRepository();

    const accessibleBrands = repository.listAccessibleBrands('user_demo');
    const accessibleBrandIds = accessibleBrands.map((brand) => brand.brandId);

    expect(accessibleBrandIds).toContain('brand_demo');
    expect(accessibleBrandIds).toContain('brand_child_fitness');
    expect(repository.canAccessBrand('user_demo', 'unknown_brand')).toBe(false);
  });

  it('preloads the default demo brand with a usable pilot workflow', () => {
    const repository = new PermissionsRepository();

    const workspace = repository.getBrandWorkspaceSnapshot('user_demo', 'brand_demo');

    expect(workspace?.relatedCounts).toMatchObject({
      profile: 1,
      optimizationUnits: 1,
      intents: 1,
      prompts: 1,
      competitors: 1,
      contentAssets: 1,
      monitoringRuns: 1,
      reports: 1,
      advisorRecords: 1
    });
    expect(repository.listContentStrategies('user_demo', 'brand_demo')).toContainEqual(
      expect.objectContaining({ type: 'gap', status: 'task_created' })
    );
    expect(repository.getContentGenerationWorkspace('user_demo', 'brand_demo')?.currentTask).toEqual(
      expect.objectContaining({ status: 'completed' })
    );
    expect(repository.getPublishingDashboard('user_demo', 'brand_demo')?.records).toContainEqual(
      expect.objectContaining({ status: 'published' })
    );
    expect(repository.getAdvisorDashboard('user_demo', 'brand_demo')?.pendingFollowUps).toContainEqual(
      expect.objectContaining({ title: '收集客户反馈' })
    );
  });

  it('records denied brand access attempts by user', () => {
    const repository = new PermissionsRepository();

    repository.recordDeniedAccess({
      userId: 'user_demo',
      brandId: 'unknown_brand',
      reason: 'USER_BRAND_PERMISSION_MISSING',
      requestedAt: '2026-07-03T00:00:00.000Z'
    });

    expect(repository.listDeniedAccessLogs('user_demo')).toHaveLength(1);
    expect(repository.listDeniedAccessLogs('other_user')).toHaveLength(0);
  });
});

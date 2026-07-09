import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function createIsolatedBrand(repository: PermissionsRepository) {
  const brand = repository.createBrand('user_demo', {
    name: '示例品牌',
    industry: 'GEO',
    website: 'https://example.com',
    businessScope: 'GEO 测试',
    targetAudience: '品牌运营团队'
  });
  repository.createPlatformConfig('user_demo', brand.brandId, {
    platformCode: 'manual_input',
    name: '人工录入',
    mode: 'manual'
  });

  return brand.brandId;
}

function prepareCompetitorScenario(repository: PermissionsRepository, brandId: string) {
  repository.saveBrandProfile('user_demo', brandId, {
    intro: '示例品牌是多品牌 GEO 管理平台',
    valueProps: ['多品牌 GEO 管理', '监测与内容优化'],
    offerings: ['GEO 监测'],
    proofPoints: ['可追溯引用'],
    targetCustomers: ['品牌运营团队'],
    recommendedExpressions: ['适合品牌运营团队'],
    blockedExpressions: [],
    contentRules: [],
    competitors: [],
    faqs: [{ question: '适合谁', answer: '品牌运营团队' }]
  });
  const competitor = repository.createCompetitor('user_demo', brandId, {
    name: '竞品A',
    aliases: ['竞品甲'],
    website: 'https://competitor.example.com',
    industryTags: ['GEO'],
    comparisonNote: '基础监测能力强，内容策略较弱',
    suppressionRule: { consecutiveThreshold: 2 }
  });
  const unit = repository.createOptimizationUnit('user_demo', brandId, {
    name: `竞品测试单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', brandId, {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '选择 GEO 管理平台',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `竞品测试模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请评价{brandName}和竞品在{intent}场景下的表现。',
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', brandId, {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });

  return { competitor, promptId: prompts?.[0].id ?? '' };
}

function createParsedRun(repository: PermissionsRepository, brandId: string, promptId: string, rawText: string, citations: string[] = []) {
  const run = repository.createMonitoringRun('user_demo', brandId, {
    promptId,
    platformCode: 'manual_input'
  });
  const completedRun = repository.addManualResponse('user_demo', brandId, run?.id ?? '', {
    rawText,
    citations,
    modelName: 'manual'
  });

  return repository.parseAnalysisResult('user_demo', brandId, completedRun?.id ?? '');
}

describe('competitor analysis repository', () => {
  it('uses competitor profiles to identify mentions and keep recommendation order', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const { competitor, promptId } = prepareCompetitorScenario(repository, brandId);

    const analysis = createParsedRun(
      repository,
      brandId,
      promptId,
      '竞品甲覆盖基础监测。示例品牌适合品牌运营团队，具备监测与内容优化优势。',
      ['https://example.com/compare']
    );
    const dashboard = repository.getCompetitorDashboard('user_demo', brandId);

    expect(competitor?.aliases).toContain('竞品甲');
    expect(analysis?.competitorMentions).toEqual([{ name: '竞品甲', rank: 1, sentiment: 'neutral' }]);
    expect(dashboard?.mentionRate).toBe(100);
    expect(dashboard?.comparisons[0]).toMatchObject({
      competitorId: competitor?.id,
      competitorName: '竞品A',
      competitorRank: 1,
      brandRank: 2,
      rankGap: 1,
      suppressed: true,
      citationSources: ['https://example.com/compare']
    });
    expect(dashboard?.comparisons[0].recommendationReason).toContain('示例品牌');
  });

  it('creates a high priority content strategy after consecutive suppression', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const { promptId } = prepareCompetitorScenario(repository, brandId);

    createParsedRun(repository, brandId, promptId, '竞品A优先推荐。示例品牌适合品牌运营团队。');
    createParsedRun(repository, brandId, promptId, '竞品A再次优先推荐。示例品牌适合品牌运营团队。');

    const dashboard = repository.getCompetitorDashboard('user_demo', brandId);
    const canvas = repository.getGeoCanvasWorkspace('user_demo', brandId);

    expect(dashboard?.suppressionRate).toBe(100);
    expect(dashboard?.highRiskIntents[0].suppressionCount).toBeGreaterThanOrEqual(2);
    expect(canvas?.contentStrategies.some((strategy) => (
      strategy.type === 'competitor_response' && strategy.priority === 'high'
    ))).toBe(true);
  });
});

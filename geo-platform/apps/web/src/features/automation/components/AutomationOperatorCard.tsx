import { Alert, Button, Card, Collapse, Descriptions, Drawer, Progress, Space, Steps, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AutomationConfirmation,
  AutomationPackage,
  AutomationPackageSource,
  AutomationPackageStatus,
  AutomationStepCode,
  AutomationStepStatus
} from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';

type AutomationPackageDetail = AutomationPackage & {
  confirmations?: AutomationConfirmation[];
  context?: {
    brandName?: string;
    completenessScore?: number;
    questionPoolSize: number;
    testPlanCount: number;
  };
};

type AutomationOperatorCardProps = {
  brandId: string;
  source: AutomationPackageSource;
  title?: string;
  compact?: boolean;
};

const defaultGoal = '让 AI 自动完成本轮测试、分析、内容生成、平台改写、发布建议和复测建议';

export function AutomationOperatorCard({ brandId, source, title = 'AI 自动运营', compact = false }: AutomationOperatorCardProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const packagesQuery = useQuery({
    queryKey: ['automation-packages', brandId],
    queryFn: () => apiGet<AutomationPackageDetail[]>(`/brands/${brandId}/automation/packages`)
  });
  const packages = packagesQuery.data?.success ? packagesQuery.data.data : [];
  const activePackage = useMemo(() => selectActivePackage(packages), [packages]);
  const pendingConfirmations = activePackage?.confirmations?.filter((item) => item.status === 'pending') ?? [];
  const completedStepCount = activePackage?.stepSummaries.filter((step) => step.status === 'completed').length ?? 0;
  const progress = activePackage ? Math.round((completedStepCount / activePackage.stepSummaries.length) * 100) : 0;

  const invalidateAutomation = () => queryClient.invalidateQueries({ queryKey: ['automation-packages', brandId] });
  const handleResponse = (successText: string) => (response: { success: boolean; error?: { message: string } }) => {
    if (response.success) {
      void invalidateAutomation();
      void messageApi.success(successText);
      return;
    }

    void messageApi.error(response.error?.message ?? '自动化操作失败');
  };

  const createMutation = useMutation({
    mutationFn: () => apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages`, { goal: defaultGoal, source }),
    onSuccess: handleResponse('自动化任务包已创建')
  });
  const startMutation = useMutation({
    mutationFn: (packageId: string) => apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages/${packageId}/start`, {}),
    onSuccess: handleResponse('AI 已开始准备本轮测试问题')
  });
  const continueMutation = useMutation({
    mutationFn: ({ packageId, stepCode }: { packageId: string; stepCode: AutomationStepCode }) => apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages/${packageId}/${getStepActionPath(stepCode)}`, {}),
    onSuccess: handleResponse('自动化流程已继续')
  });
  const resolveConfirmationMutation = useMutation({
    mutationFn: ({ packageId, confirmation }: { packageId: string; confirmation: AutomationConfirmation }) => {
      if (confirmation.type === 'publishing_suggestion') {
        return apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages/${packageId}/publishing-suggestions/confirm`, {
          confirmationId: confirmation.confirmationId,
          decision: '确认创建发布待办'
        });
      }

      return apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages/${packageId}/confirmations/${confirmation.confirmationId}`, {
        action: 'approve',
        decision: '确认继续'
      });
    },
    onSuccess: handleResponse('确认事项已处理')
  });
  const primaryAction = activePackage ? getPrimaryAutomationAction(activePackage, pendingConfirmations.length) : null;
  const loading = createMutation.isPending || startMutation.isPending || continueMutation.isPending || resolveConfirmationMutation.isPending;

  return (
    <Card
      title={title}
      loading={packagesQuery.isLoading}
      extra={(
        <Space wrap>
          {pendingConfirmations.length > 0 ? <Button onClick={() => setDrawerOpen(true)}>处理确认事项</Button> : null}
          {activePackage ? (
            <Button
              type="primary"
              disabled={!primaryAction?.enabled}
              loading={loading}
              onClick={() => handlePrimaryAction(activePackage, primaryAction, startMutation.mutate, continueMutation.mutate)}
            >
              {primaryAction?.label ?? '等待下一步'}
            </Button>
          ) : <Button type="primary" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>让 AI 帮我跑一轮</Button>}
        </Space>
      )}
    >
      {contextHolder}
      {!activePackage ? (
        <Alert type="info" showIcon message="把测试、分析、内容和发布建议交给 AI 串起来" description="AI 会先整理测试问题池，精选本轮问题让你确认，再继续执行后面的运营动作。" />
      ) : (
        <Space direction="vertical" size={12} className="page-stack">
          <Space wrap>
            <Tag color={getPackageStatusColor(activePackage.status)}>{getPackageStatusLabel(activePackage.status)}</Tag>
            <Typography.Text type="secondary">当前步骤：{getStepLabel(activePackage.currentStep)}</Typography.Text>
            {pendingConfirmations.length > 0 ? <Tag color="gold">待确认 {pendingConfirmations.length}</Tag> : null}
          </Space>
          <Progress percent={progress} size="small" />
          <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
            <Descriptions.Item label="品牌">{activePackage.context?.brandName ?? activePackage.brandId}</Descriptions.Item>
            <Descriptions.Item label="档案完整度">{formatScore(activePackage.context?.completenessScore)}</Descriptions.Item>
            <Descriptions.Item label="问题池">{activePackage.context?.questionPoolSize ?? 0} 个</Descriptions.Item>
            <Descriptions.Item label="测试计划">{activePackage.context?.testPlanCount ?? 0} 个</Descriptions.Item>
          </Descriptions>
          {!compact ? (
            <Steps
              size="small"
              current={Math.max(0, activePackage.stepSummaries.findIndex((step) => step.code === activePackage.currentStep))}
              items={activePackage.stepSummaries.map((step) => ({
                title: step.title,
                description: step.message,
                status: getAntStepStatus(step.status)
              }))}
            />
          ) : null}
          {pendingConfirmations[0] ? <ConfirmationAlert confirmation={pendingConfirmations[0]} onOpen={() => setDrawerOpen(true)} /> : null}
        </Space>
      )}
      <Drawer title="需要你确认" open={drawerOpen} width={560} onClose={() => setDrawerOpen(false)}>
        <Space direction="vertical" size={12} className="page-stack">
          {pendingConfirmations.length === 0 ? (
            <Alert
              type="success"
              showIcon
              message="暂无待确认事项"
              description={primaryAction?.enabled ? `下一步可以点击“${primaryAction.label}”。` : undefined}
            />
          ) : null}
          {pendingConfirmations.map((confirmation) => (
            <Card key={confirmation.confirmationId} size="small" title={confirmation.title}>
              <Space direction="vertical" size={8} className="page-stack">
                <Typography.Text>{confirmation.impact}</Typography.Text>
                <Typography.Text type="secondary">{confirmation.recommendation}</Typography.Text>
                <Alert type="info" showIcon message={confirmation.evidenceSummary} />
                <ConfirmationQuestionList confirmation={confirmation} />
                <ConfirmationBlockingStepList confirmation={confirmation} />
                <ConfirmationAnalysisReview confirmation={confirmation} />
                <ConfirmationRewriteList confirmation={confirmation} />
                <ConfirmationPublishingSuggestionList confirmation={confirmation} />
                <Button
                  type="primary"
                  loading={resolveConfirmationMutation.isPending}
                  onClick={() => activePackage && resolveConfirmationMutation.mutate({ packageId: activePackage.packageId, confirmation })}
                >
                  确认继续
                </Button>
              </Space>
            </Card>
          ))}
        </Space>
      </Drawer>
    </Card>
  );
}

function ConfirmationAlert({ confirmation, onOpen }: { confirmation: AutomationConfirmation; onOpen: () => void }) {
  return (
    <Alert
      type="warning"
      showIcon
      message={confirmation.title}
      description={confirmation.evidenceSummary}
      action={<Button size="small" onClick={onOpen}>查看</Button>}
    />
  );
}

function ConfirmationQuestionList({ confirmation }: { confirmation: AutomationConfirmation }) {
  const questions = getConfirmationQuestions(confirmation);

  if (questions.length === 0) return null;

  return (
    <Space direction="vertical" size={6} className="page-stack">
      <Typography.Text strong>本轮精选问题</Typography.Text>
      <ol className="automation-question-list">
        {questions.map((item, index) => (
          <li key={`${item.question}-${index}`}>
            <Typography.Text>{item.question}</Typography.Text>
            {item.targetPlatforms.length > 0 ? (
              <Typography.Text type="secondary"> · 平台：{item.targetPlatforms.join('、')}</Typography.Text>
            ) : null}
          </li>
        ))}
      </ol>
    </Space>
  );
}

function ConfirmationPublishingSuggestionList({ confirmation }: { confirmation: AutomationConfirmation }) {
  const suggestions = getConfirmationPublishingSuggestions(confirmation);

  if (suggestions.length === 0) return null;

  return (
    <Space direction="vertical" size={6} className="page-stack">
      <Typography.Text strong>发布建议</Typography.Text>
      <ol className="automation-question-list">
        {suggestions.map((item, index) => (
          <li key={`${item.rewriteId}-${index}`}>
            <Typography.Text>{item.targetPlatformLabel}：{item.title}</Typography.Text>
            {item.complianceNotes.length > 0 ? <Typography.Text type="secondary"> · 合规：{item.complianceNotes.join('、')}</Typography.Text> : null}
          </li>
        ))}
      </ol>
    </Space>
  );
}

type ConfirmationPublishingSuggestion = {
  rewriteId: string;
  targetPlatformLabel: string;
  title: string;
  complianceNotes: string[];
};

export function getConfirmationPublishingSuggestions(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationPublishingSuggestion[] {
  const suggestions = Array.isArray(confirmation.payload.suggestions) ? confirmation.payload.suggestions : [];

  return suggestions.flatMap((item) => {
    if (!isRecord(item) || typeof item.rewriteId !== 'string' || typeof item.title !== 'string') return [];

    return [{
      rewriteId: item.rewriteId,
      targetPlatformLabel: typeof item.targetPlatformLabel === 'string' && item.targetPlatformLabel.trim().length > 0
        ? item.targetPlatformLabel
        : typeof item.targetPlatform === 'string' && item.targetPlatform.trim().length > 0 ? item.targetPlatform : '未知平台',
      title: item.title,
      complianceNotes: Array.isArray(item.complianceNotes)
        ? item.complianceNotes.filter((note): note is string => typeof note === 'string' && note.trim().length > 0).slice(0, 2)
        : []
    }];
  }).slice(0, 10);
}

function ConfirmationRewriteList({ confirmation }: { confirmation: AutomationConfirmation }) {
  const rewrites = getConfirmationRewrites(confirmation);

  if (rewrites.length === 0) return null;

  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Typography.Text strong>平台改写版本</Typography.Text>
      <Collapse
        size="small"
        items={rewrites.map((item, index) => ({
          key: `${item.rewriteId}-${index}`,
          label: `${item.targetPlatformLabel}：${item.title}`,
          children: <ConfirmationRewriteDetail rewrite={item} />
        }))}
      />
    </Space>
  );
}

function ConfirmationRewriteDetail({ rewrite }: { rewrite: ConfirmationRewrite }) {
  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Typography.Paragraph copyable={{ text: getRewriteCopyText(rewrite) }} strong>
        {rewrite.title}
      </Typography.Paragraph>
      {rewrite.body ? (
        <Typography.Paragraph copyable className="automation-rewrite-body">
          {rewrite.body}
        </Typography.Paragraph>
      ) : <Typography.Text type="secondary">暂无正文，请回到内容生成步骤重新生成。</Typography.Text>}
      {rewrite.tags.length > 0 ? <Typography.Text type="secondary">标签：{rewrite.tags.join('、')}</Typography.Text> : null}
      {rewrite.rewriteNotes.length > 0 ? <Typography.Text type="secondary">改写说明：{rewrite.rewriteNotes.join('、')}</Typography.Text> : null}
      {rewrite.complianceNotes.length > 0 ? <Typography.Text type="secondary">合规提示：{rewrite.complianceNotes.join('、')}</Typography.Text> : null}
    </Space>
  );
}

function getRewriteCopyText(rewrite: ConfirmationRewrite): string {
  return [rewrite.title, rewrite.body, rewrite.tags.length > 0 ? `标签：${rewrite.tags.join('、')}` : '']
    .filter((item) => item.trim().length > 0)
    .join('\n\n');
}

type ConfirmationRewrite = {
  rewriteId: string;
  targetPlatform: string;
  targetPlatformLabel: string;
  title: string;
  body: string;
  tags: string[];
  rewriteNotes: string[];
  complianceNotes: string[];
};

export function getConfirmationRewrites(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationRewrite[] {
  const rewrites = Array.isArray(confirmation.payload.rewrites) ? confirmation.payload.rewrites : [];

  return rewrites.flatMap((item) => {
    if (!isRecord(item) || typeof item.rewriteId !== 'string' || typeof item.title !== 'string') return [];

    return [{
      rewriteId: item.rewriteId,
      targetPlatform: typeof item.targetPlatform === 'string' && item.targetPlatform.trim().length > 0 ? item.targetPlatform : '未知平台',
      targetPlatformLabel: getPublishingPlatformLabel(typeof item.targetPlatform === 'string' ? item.targetPlatform : undefined),
      title: item.title,
      body: typeof item.body === 'string' ? item.body.trim() : '',
      tags: getStringList(item.tags),
      rewriteNotes: getStringList(item.rewriteNotes),
      complianceNotes: getStringList(item.complianceNotes)
    }];
  }).slice(0, 20);
}

function getPublishingPlatformLabel(platform?: string): string {
  if (!platform || platform.trim().length === 0) return '未知平台';

  const labels: Record<string, string> = {
    zhihu: '知乎',
    baijiahao: '百家号',
    xiaohongshu: '小红书',
    wechat_official: '公众号',
    official_site_faq: '官网 FAQ'
  };
  return labels[platform] ?? platform;
}

function getStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function ConfirmationAnalysisReview({ confirmation }: { confirmation: AutomationConfirmation }) {
  const review = getConfirmationAnalysisReview(confirmation);

  if (!review) return null;

  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Typography.Text strong>本轮测试判断</Typography.Text>
      <Descriptions size="small" column={2}>
        <Descriptions.Item label="样本数">{review.summary.sampleCount}</Descriptions.Item>
        <Descriptions.Item label="推荐率">{review.summary.recommendationRate}%</Descriptions.Item>
        <Descriptions.Item label="第一推荐率">{review.summary.topOneRate}%</Descriptions.Item>
        <Descriptions.Item label="平均准确度">{review.summary.averageAccuracyScore}</Descriptions.Item>
        <Descriptions.Item label="引用缺口">{review.summary.citationGapCount}</Descriptions.Item>
        <Descriptions.Item label="需确认">{review.summary.riskReviewCount}</Descriptions.Item>
      </Descriptions>
      {review.nextRecommendations.length > 0 ? (
        <Space direction="vertical" size={4} className="page-stack">
          <Typography.Text strong>下一步建议</Typography.Text>
          <ul className="automation-question-list">
            {review.nextRecommendations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
          </ul>
        </Space>
      ) : null}
      {review.reviewItems.length > 0 ? (
        <Space direction="vertical" size={4} className="page-stack">
          <Typography.Text strong>代表性判断</Typography.Text>
          <ol className="automation-question-list">
            {review.reviewItems.map((item, index) => (
              <li key={`${item.runId}-${index}`}>
                <Typography.Text>{item.platformCode}：{item.platformEvaluation}</Typography.Text>
                {item.suggestedAction ? <Typography.Text type="secondary"> · {item.suggestedAction}</Typography.Text> : null}
              </li>
            ))}
          </ol>
        </Space>
      ) : null}
    </Space>
  );
}

type ConfirmationAnalysisReview = {
  summary: {
    sampleCount: number;
    recommendationRate: number;
    topOneRate: number;
    averageAccuracyScore: number;
    citationGapCount: number;
    riskReviewCount: number;
  };
  nextRecommendations: string[];
  reviewItems: Array<{
    runId: string;
    platformCode: string;
    platformEvaluation: string;
    suggestedAction?: string;
  }>;
};

export function getConfirmationAnalysisReview(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationAnalysisReview | null {
  const summary = isRecord(confirmation.payload.summary) ? confirmation.payload.summary : null;
  if (!summary) return null;

  const reviewItems = Array.isArray(confirmation.payload.reviewItems) ? confirmation.payload.reviewItems : [];

  return {
    summary: {
      sampleCount: toNumber(summary.sampleCount),
      recommendationRate: toNumber(summary.recommendationRate),
      topOneRate: toNumber(summary.topOneRate),
      averageAccuracyScore: toNumber(summary.averageAccuracyScore),
      citationGapCount: toNumber(summary.citationGapCount),
      riskReviewCount: toNumber(summary.riskReviewCount)
    },
    nextRecommendations: Array.isArray(summary.nextRecommendations)
      ? summary.nextRecommendations.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
      : [],
    reviewItems: reviewItems.flatMap((item) => {
      if (!isRecord(item) || typeof item.runId !== 'string' || typeof item.platformEvaluation !== 'string') return [];

      return [{
        runId: item.runId,
        platformCode: typeof item.platformCode === 'string' && item.platformCode.trim().length > 0 ? item.platformCode : '未知平台',
        platformEvaluation: item.platformEvaluation,
        suggestedAction: typeof item.suggestedAction === 'string' && item.suggestedAction.trim().length > 0 ? item.suggestedAction : undefined
      }];
    }).slice(0, 6)
  };
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function ConfirmationBlockingStepList({ confirmation }: { confirmation: AutomationConfirmation }) {
  const blockingSteps = getConfirmationBlockingSteps(confirmation);

  if (blockingSteps.length === 0) return null;

  return (
    <Space direction="vertical" size={6} className="page-stack">
      <Typography.Text strong>需要人工处理的测试项</Typography.Text>
      <ol className="automation-question-list">
        {blockingSteps.map((item, index) => (
          <li key={`${item.question}-${item.platformCode}-${index}`}>
            <Typography.Text>{item.question}</Typography.Text>
            <Typography.Text type="secondary"> · 平台：{item.platformCode}</Typography.Text>
            {item.message ? <Typography.Text type="secondary"> · {item.message}</Typography.Text> : null}
          </li>
        ))}
      </ol>
    </Space>
  );
}

type ConfirmationQuestion = {
  question: string;
  targetPlatforms: string[];
};

type ConfirmationBlockingStep = {
  question: string;
  platformCode: string;
  message?: string;
};

export function getConfirmationQuestions(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationQuestion[] {
  const selectedQuestions = Array.isArray(confirmation.payload.selectedQuestions) ? confirmation.payload.selectedQuestions : [];

  return selectedQuestions.flatMap((item) => {
    if (!isRecord(item) || typeof item.question !== 'string' || item.question.trim().length === 0) return [];

    return [{
      question: item.question.trim(),
      targetPlatforms: Array.isArray(item.targetPlatforms)
        ? item.targetPlatforms.filter((platform): platform is string => typeof platform === 'string' && platform.trim().length > 0)
        : []
    }];
  });
}

export function getConfirmationBlockingSteps(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationBlockingStep[] {
  const blockingSteps = Array.isArray(confirmation.payload.blockingSteps) ? confirmation.payload.blockingSteps : [];

  return blockingSteps.flatMap((item) => {
    if (!isRecord(item) || typeof item.question !== 'string' || item.question.trim().length === 0) return [];

    return [{
      question: item.question.trim(),
      platformCode: typeof item.platformCode === 'string' && item.platformCode.trim().length > 0 ? item.platformCode.trim() : '未知平台',
      message: typeof item.message === 'string' && item.message.trim().length > 0 ? item.message.trim() : undefined
    }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function handlePrimaryAction(
  automationPackage: AutomationPackageDetail,
  action: AutomationPrimaryAction | null,
  start: (packageId: string) => void,
  next: (input: { packageId: string; stepCode: AutomationStepCode }) => void
) {
  if (!action?.enabled) return;
  if (action.kind === 'start') {
    start(automationPackage.packageId);
    return;
  }

  next({ packageId: automationPackage.packageId, stepCode: automationPackage.currentStep });
}

type AutomationPrimaryAction = {
  kind: 'start' | 'continue' | 'blocked' | 'done';
  label: string;
  enabled: boolean;
};

export function getPrimaryAutomationAction(automationPackage: Pick<AutomationPackage, 'status' | 'currentStep'>, pendingConfirmationCount: number): AutomationPrimaryAction {
  if (pendingConfirmationCount > 0 || automationPackage.status === 'waiting_confirmation') {
    return { kind: 'blocked', label: '先处理确认事项', enabled: false };
  }

  if (automationPackage.status === 'draft') {
    return { kind: 'start', label: '开始本轮自动运营', enabled: true };
  }

  if (automationPackage.status === 'completed') {
    return { kind: 'done', label: '本轮已完成', enabled: false };
  }

  const actionLabel = stepActionLabels[automationPackage.currentStep];
  return actionLabel
    ? { kind: 'continue', label: actionLabel, enabled: true }
    : { kind: 'blocked', label: '等待下一步', enabled: false };
}

export function selectActivePackage(packages: AutomationPackageDetail[]): AutomationPackageDetail | undefined {
  return [...packages].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))[0];
}

function getStepActionPath(stepCode: AutomationStepCode): string {
  return stepActionPaths[stepCode] ?? 'start';
}

function getStepLabel(stepCode: AutomationStepCode): string {
  return stepLabels[stepCode] ?? stepCode;
}

function getPackageStatusLabel(status: AutomationPackageStatus): string {
  return packageStatusLabels[status] ?? status;
}

function getPackageStatusColor(status: AutomationPackageStatus): string {
  return packageStatusColors[status] ?? 'default';
}

function getAntStepStatus(status: AutomationStepStatus): 'wait' | 'process' | 'finish' | 'error' {
  if (status === 'completed') return 'finish';
  if (status === 'failed') return 'error';
  if (status === 'running' || status === 'waiting_confirmation') return 'process';
  return 'wait';
}

function formatScore(value?: number): string {
  return typeof value === 'number' ? `${value}%` : '-';
}

const stepActionPaths: Partial<Record<AutomationStepCode, string>> = {
  test_plan_execution: 'test-plan/execute',
  answer_analysis: 'answers/analyze',
  content_generation: 'content/generate',
  platform_rewrite: 'platform-rewrites/generate',
  publishing_suggestion: 'publishing-suggestions/generate',
  retest_suggestion: 'retest-suggestions/generate'
};

const stepActionLabels: Partial<Record<AutomationStepCode, string>> = {
  test_plan_execution: '执行 AI 测试',
  answer_analysis: '分析测试结果',
  content_generation: '生成优化内容',
  platform_rewrite: '生成平台改写',
  publishing_suggestion: '生成发布建议',
  retest_suggestion: '安排发布后复测'
};

const stepLabels: Record<AutomationStepCode, string> = {
  context_collection: '读取品牌资料',
  question_pool_update: '维护测试问题池',
  question_selection: '精选本轮问题',
  test_question_confirmation: '确认测试问题',
  test_plan_execution: '执行 AI 测试',
  answer_analysis: '分析测试结果',
  content_generation: '生成优化内容',
  platform_rewrite: '按平台改写',
  content_confirmation: '确认发布内容',
  publishing_suggestion: '生成发布建议',
  retest_suggestion: '安排复测',
  completed: '完成任务包'
};

const packageStatusLabels: Record<AutomationPackageStatus, string> = {
  draft: '待开始',
  waiting_confirmation: '等待确认',
  running: '进行中',
  completed: '已完成',
  failed: '未成功',
  stopped: '已停止'
};

const packageStatusColors: Record<AutomationPackageStatus, string> = {
  draft: 'default',
  waiting_confirmation: 'gold',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  stopped: 'default'
};

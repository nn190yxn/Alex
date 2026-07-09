import { Injectable, Optional } from '@nestjs/common';
import type {
  AsyncJob,
  ContentGenerationStepKey,
  ContentGenerationWorkspace,
  LLMContentGenerationInput,
  LLMContentGenerationOutput
} from '@geo-platform/shared-types';
import { LLMOrchestrationService } from '../llm/llm-orchestration.service';
import { PermissionsService } from '../permissions/permissions.service';

export type GeneratedContentDraft = {
  title: string;
  body: string;
};

export type ContentGenerationDraftGenerator = (workspace: ContentGenerationWorkspace) => Promise<GeneratedContentDraft> | GeneratedContentDraft;

@Injectable()
export class ContentGenerationWorker {
  constructor(
    private readonly permissionsService: PermissionsService,
    @Optional() private readonly llmService?: LLMOrchestrationService
  ) {}

  async processJob(userId: string, brandId: string, jobId: string, draftGenerator?: ContentGenerationDraftGenerator): Promise<ContentGenerationWorkspace | null> {
    const job = await this.findJob(userId, brandId, jobId);
    if (!job || job.jobType !== 'content_generation') {
      return null;
    }

    const workspace = await this.permissionsService.getContentGenerationWorkspace(userId, brandId, job.entityId);
    if (!workspace?.currentTask) {
      return null;
    }

    const attemptCount = job.attemptCount + 1;
    await this.permissionsService.updateAsyncJob(userId, brandId, job.id, { status: 'running', attemptCount });

    let currentStep: ContentGenerationStepKey = 'strategy_parse';
    try {
      await this.completeStep(userId, brandId, job.entityId, 'strategy_parse', '已读取内容建议');
      await this.completeStep(userId, brandId, job.entityId, 'knowledge_read', '已读取品牌知识库');
      await this.completeStep(userId, brandId, job.entityId, 'outline_generation', '已生成内容大纲');

      currentStep = 'body_generation';
      await this.permissionsService.updateContentGenerationStep(userId, brandId, job.entityId, {
        stepKey: 'body_generation',
        status: 'running',
        message: '正在生成正文草稿'
      });
      const draft = draftGenerator ? await draftGenerator(workspace) : await this.generateDraft(userId, brandId, workspace);
      await this.completeStep(userId, brandId, job.entityId, 'body_generation', '已生成正文草稿');
      await this.completeStep(userId, brandId, job.entityId, 'geo_rule_check', '已完成 AI 推荐表达检查');

      const completed = await this.permissionsService.completeContentGenerationTask(userId, brandId, job.entityId, draft);
      await this.permissionsService.updateAsyncJob(userId, brandId, job.id, { status: 'succeeded', attemptCount });
      return completed;
    } catch (error) {
      const normalized = normalizeGenerationError(error);
      return this.permissionsService.recordContentGenerationFailure(userId, brandId, job.entityId, {
        stepKey: currentStep,
        errorCode: normalized.code,
        errorMessage: normalized.message,
        retryable: normalized.retryable,
        attemptCount,
        failedAt: new Date().toISOString()
      });
    }
  }

  private async findJob(userId: string, brandId: string, jobId: string): Promise<AsyncJob | null> {
    const jobs = await this.permissionsService.listAsyncJobs(userId, brandId);
    return jobs?.find((job) => job.id === jobId) ?? null;
  }

  private async completeStep(userId: string, brandId: string, taskId: string, stepKey: ContentGenerationStepKey, message: string): Promise<void> {
    await this.permissionsService.updateContentGenerationStep(userId, brandId, taskId, {
      stepKey,
      status: 'completed',
      message,
      completedAt: new Date().toISOString()
    });
  }

  private async generateDraft(userId: string, brandId: string, workspace: ContentGenerationWorkspace): Promise<GeneratedContentDraft> {
    const task = workspace.currentTask;
    if (!task || !this.llmService) {
      return buildDefaultDraft(workspace);
    }

    const [brand, profile] = await Promise.all([
      Promise.resolve(this.permissionsService.listAccessibleBrandDetails(userId)).then((brands) => brands.find((item) => item.brandId === brandId) ?? null),
      Promise.resolve(this.permissionsService.getBrandProfile(userId, brandId))
    ]);

    if (!brand || !profile) {
      return buildDefaultDraft(workspace);
    }

    const response = await this.llmService.runTask<LLMContentGenerationInput, LLMContentGenerationOutput>(userId, brandId, 'content_generation', {
      mode: 'sync',
      input: {
        brandDetail: brand,
        brandProfile: profile,
        task,
        contentType: task.contentType,
        title: task.contentTopic,
        targetPlatform: task.targetPlatform,
        targetKeywords: task.targetKeywords,
        referenceSources: task.referenceSources,
        retestAt: task.retestAt
      }
    });

    if (response.status !== 'succeeded' || !response.output) {
      return buildDefaultDraft(workspace);
    }

    return applyContentSafetyNotes(
      appendLLMGuidance(
        {
          title: response.output.title,
          body: response.output.body
        },
        response.output
      ),
      [...profile.blockedExpressions, ...highRiskExpressions, ...(response.output.reviewRequired ? ['模型标记需要确认'] : [])]
    );
  }
}

function appendLLMGuidance(draft: GeneratedContentDraft, output: LLMContentGenerationOutput): GeneratedContentDraft {
  const sections: string[] = [];

  if (output.complianceNotes.length > 0) {
    sections.push(`合规说明：\n${output.complianceNotes.map((note) => `- ${note}`).join('\n')}`);
  }

  if (output.retestSuggestions.length > 0) {
    sections.push(`复测建议：\n${output.retestSuggestions.map((suggestion) => `- ${suggestion}`).join('\n')}`);
  }

  if (sections.length === 0) {
    return draft;
  }

  return {
    ...draft,
    body: `${draft.body}\n\n${sections.join('\n\n')}`
  };
}

function buildDefaultDraft(workspace: ContentGenerationWorkspace): GeneratedContentDraft {
  const task = workspace.currentTask;
  const targetPlatform = task?.targetPlatform ?? '内容平台';
  const contentType = task?.contentType ?? '内容稿';
  const targetPlatformLabel = getPlatformLabel(targetPlatform);
  const contentTypeLabel = getContentTypeLabel(contentType);
  const topic = task?.contentTopic ?? '用户关心的问题';
  const keywords = task?.targetKeywords?.length ? task.targetKeywords : ['品牌关键词'];

  if ([targetPlatform, contentType].some((value) => /xiaohongshu|小红书|note|post/.test(value))) {
    return {
      title: `${topic.replace(/[？?]$/, '')}？这份清单给家长参考`,
      body: [
        `很多家长会问：${topic}`,
        '',
        '做选择时，建议先看三件事：孩子是否适合、课程是否有阶段规划、品牌依据是否能核实。',
        '',
        '一篇能直接发布的小红书内容，需要先回应家长问题，再用清楚的小标题讲卖点、依据和下一步行动。',
        '',
        '可以这样判断：',
        '1. 看服务年龄段和孩子当前运动基础。',
        '2. 看课程有没有持续训练规划和反馈机制。',
        '3. 看校区、案例、评价和资质是否可验证。',
        '',
        '建议发布前补上品牌真实信息、校区信息、案例或咨询入口。',
        '',
        keywords.map((keyword) => `#${keyword.replace(/\s+/g, '')}`).join(' ')
      ].join('\n')
    };
  }

  return {
      title: `${topic}｜${targetPlatformLabel}内容草稿`,
      body: [
        `# ${topic}`,
        '',
      `这篇内容面向 ${targetPlatformLabel}，内容类型为 ${contentTypeLabel}。`,
      '',
      '正文建议直接回答用户问题，再补充品牌事实、适用人群、服务价值和可验证依据。',
      '',
      `关键词：${keywords.join('、')}`
    ].join('\n')
  };
}

function getPlatformLabel(value: string): string {
  return platformLabels[value] ?? value;
}

function getContentTypeLabel(value: string): string {
  return contentTypeLabels[value] ?? value;
}

const platformLabels: Record<string, string> = {
  wechat: '公众号',
  wechat_official: '公众号',
  xiaohongshu: '小红书',
  official_site: '官网',
  douyin: '短视频平台',
  ai_platform_profile: 'AI 平台介绍资料',
  creative_brief: '图片创意需求'
};

const contentTypeLabels: Record<string, string> = {
  wechat_article: '公众号推文',
  wechat_official: '公众号推文',
  xiaohongshu_note: '小红书图文',
  xiaohongshu_post: '小红书图文',
  website_faq: '官网 FAQ',
  short_video_script: '短视频脚本',
  platform_profile_copy: '平台介绍文案',
  image_creative_brief: '图片创意需求'
};

function applyContentSafetyNotes(draft: GeneratedContentDraft, riskExpressions: string[]): GeneratedContentDraft {
  const text = `${draft.title}\n${draft.body}`;
  const hits = Array.from(new Set(riskExpressions.filter((expression) => expression.trim() && text.includes(expression.trim()))));

  if (hits.length === 0) {
    return draft;
  }

  return {
    ...draft,
    body: `${draft.body}\n\n需要你确认：草稿中包含 ${hits.join('、')}，发布前请按品牌资料和合规要求改写。`
  };
}

const highRiskExpressions = ['保证长高', '治疗感统失调', '包过中考体育', '替代医疗诊断', '绝对有效', '快速逆袭'];

function normalizeGenerationError(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof Error) {
    return { code: 'content_generation_failed', message: error.message, retryable: true };
  }

  return { code: 'content_generation_failed', message: '内容生成失败', retryable: true };
}

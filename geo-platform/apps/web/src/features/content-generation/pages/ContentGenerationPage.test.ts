import { describe, expect, it } from 'vitest';
import { formatList, getContentGenerationTaskState, getContentTypeLabel, getDraftReviewNotes } from './ContentGenerationPage';

describe('ContentGenerationPage status helpers', () => {
  it('shows failed content generation tasks as retryable work', () => {
    expect(getContentGenerationTaskState({ status: 'failed', errorMessage: 'Body generation failed' })).toEqual({
      label: '生成失败',
      color: 'red',
      alert: 'Body generation failed',
      alertType: 'error'
    });
  });

  it('shows generating tasks as in progress', () => {
    expect(getContentGenerationTaskState({ status: 'running' })).toEqual({
      label: '生成中',
      color: 'blue',
      alert: '正在生成内容草稿',
      alertType: 'info'
    });
  });

  it('labels the first version growth content types for operators', () => {
    expect(getContentTypeLabel('wechat_article')).toBe('公众号推文');
    expect(getContentTypeLabel('xiaohongshu_note')).toBe('小红书图文');
    expect(getContentTypeLabel('website_faq')).toBe('官网 FAQ');
    expect(getContentTypeLabel('short_video_script')).toBe('短视频脚本');
    expect(getContentTypeLabel('platform_profile_copy')).toBe('平台介绍文案');
    expect(getContentTypeLabel('image_creative_brief')).toBe('图片创意需求');
  });

  it('formats task keywords and references for compact display', () => {
    expect(formatList(['儿童运动', '贵阳体能'])).toBe('儿童运动、贵阳体能');
    expect(formatList([])).toBe('-');
  });

  it('extracts review notes from generated markdown drafts', () => {
    expect(getDraftReviewNotes('正文\n\n合规说明：\n- 避免承诺效果\n\n复测建议：\n- 发布后复测贵阳儿童运动\n\n需要你确认：包含风险表达')).toEqual({
      visible: true,
      reviewRequired: true,
      complianceNotes: ['避免承诺效果'],
      retestSuggestions: ['发布后复测贵阳儿童运动']
    });
  });

  it('hides review notes when generated draft has no guidance section', () => {
    expect(getDraftReviewNotes('普通正文')).toEqual({
      visible: false,
      reviewRequired: false,
      complianceNotes: [],
      retestSuggestions: []
    });
  });
});

export function getContentTypeDisplay(value?: string): string {
  if (!value) return '-';
  return contentTypeLabels[value] ?? value;
}

export function getPlatformDisplay(value?: string): string {
  if (!value) return '-';
  return platformLabels[value] ?? value;
}

export function getStatusDisplay(value?: string): string {
  if (!value) return '-';
  return statusLabels[value] ?? value;
}

const contentTypeLabels: Record<string, string> = {
  wechat_article: '公众号推文',
  wechat_official: '公众号推文',
  xiaohongshu_note: '小红书图文',
  xiaohongshu: '小红书图文',
  website_faq: '官网 FAQ',
  official_site: '官网 FAQ',
  short_video_script: '短视频脚本',
  douyin: '短视频脚本',
  platform_profile_copy: '平台介绍文案',
  ai_platform_profile: 'AI 平台介绍资料',
  image_creative_brief: '图片创意需求',
  creative_brief: '图片创意需求',
  article: '通用文章',
  official_page: '官网页面',
  case_article: '案例文章',
  social_post: '社交平台图文',
  media_article: '媒体文章'
};

const platformLabels: Record<string, string> = {
  wechat: '公众号',
  wechat_official: '公众号',
  xiaohongshu: '小红书',
  official_site: '官网',
  website: '官网',
  media: '媒体平台',
  douyin: '短视频平台',
  ai_platform_profile: 'AI 平台介绍资料',
  creative_brief: '图片创意需求'
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
  pending: '待处理',
  running: '进行中',
  completed: '已完成',
  failed: '未成功',
  confirmed: '已确认',
  in_progress: '进行中',
  ready_for_retest: '等待再次测试',
  done: '已完成'
};

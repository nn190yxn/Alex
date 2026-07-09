import { describe, expect, it } from 'vitest';
import { getPublishingPlatformLabel } from './PublishingCenterPage';

describe('PublishingCenterPage helpers', () => {
  it('shows website platform account aggregation in the platform list', () => {
    expect(getPublishingPlatformLabel({
      platform: 'website',
      name: '官网',
      loginMode: 'manual',
      accountCount: 1,
      hasAuthError: false
    })).toBe('官网 · 1 个账号');
  });

  it('marks publishing platforms with auth errors', () => {
    expect(getPublishingPlatformLabel({
      platform: 'wechat',
      name: '公众号',
      loginMode: 'oauth',
      accountCount: 2,
      hasAuthError: true
    })).toBe('公众号 · 2 个账号 · 异常');
  });
});

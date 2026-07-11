import { describe, expect, it } from 'vitest';
import { getModelSetupGuide, modelSetupGuides } from './ModelSettingsPage';

describe('ModelSettingsPage helpers', () => {
  it('provides beginner-facing setup guides for first version model providers', () => {
    expect(modelSetupGuides.map((guide) => guide.platformCode)).toEqual(expect.arrayContaining(['deepseek', 'kimi', 'qianwen', 'xiaomi', 'stepfun']));
    expect(getModelSetupGuide(' DeepSeek ')?.displayName).toBe('DeepSeek');
    expect(getModelSetupGuide('qianwen')?.endpointUrl).toContain('dashscope');
  });

  it('returns no guide for unknown providers', () => {
    expect(getModelSetupGuide('custom_ai')).toBeUndefined();
  });
});

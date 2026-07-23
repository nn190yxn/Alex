import { describe, expect, it } from 'vitest';
import type { UserConfig } from 'vite';
import runtimeViteConfig from '../../vite.config.js';
import sourceViteConfig from '../../vite.config.ts?raw';

const config = runtimeViteConfig as UserConfig;

describe('Vite development preview config', () => {
  it('allows the managed preview domain', () => {
    expect(config.server?.allowedHosts).toContain('.monkeycode-ai.online');
  });

  it('proxies API requests to the local backend', () => {
    expect(config.server?.proxy).toMatchObject({
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    });
  });

  it('keeps the TypeScript source config aligned with the runtime config', () => {
    expect(sourceViteConfig).toContain("allowedHosts: ['.monkeycode-ai.online']");
    expect(sourceViteConfig).toContain("target: 'http://localhost:3001'");
    expect(sourceViteConfig).toContain('changeOrigin: true');
  });
});

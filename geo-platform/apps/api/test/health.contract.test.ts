import { describe, expect, it } from 'vitest';
import type { ApiResponse, HealthCheck } from '@geo-platform/shared-types';

describe('health contract', () => {
  it('uses the shared API response envelope', () => {
    const response: ApiResponse<HealthCheck> = {
      success: true,
      data: {
        status: 'degraded',
        service: 'geo-platform-api',
        repositoryDriver: 'memory',
        runtimeEnvironment: 'test',
        dependencies: {
          database: 'not_configured',
          queue: 'in_memory',
          aiPlatforms: 'not_configured',
          mapProvider: 'fallback',
          logging: 'console'
        },
        missingConfiguration: ['GEO_AI_PLATFORM_CONFIGURED']
      }
    };

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('degraded');
  });
});

describe('error contract', () => {
  it('keeps failed responses in the shared envelope', () => {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'REQUEST_ERROR',
        message: 'Bad request',
        requestId: 'request_demo'
      }
    };

    expect(response.success).toBe(false);
    expect(response.error.code).toBe('REQUEST_ERROR');
  });
});

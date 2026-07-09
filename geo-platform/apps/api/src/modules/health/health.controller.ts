import { Controller, Get } from '@nestjs/common';
import type { ApiResponse, HealthCheck } from '@geo-platform/shared-types';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): ApiResponse<HealthCheck> {
    const missing = missingConfiguration();

    return {
      success: true,
      data: {
        status: missing.length > 0 ? 'degraded' : 'ok',
        service: 'geo-platform-api',
        repositoryDriver: repositoryDriver(),
        runtimeEnvironment: process.env.NODE_ENV ?? 'development',
        dependencies: dependencyReadiness(),
        missingConfiguration: missing
      }
    };
  }
}

function repositoryDriver(): HealthCheck['repositoryDriver'] {
  return process.env.GEO_REPOSITORY_DRIVER === 'prisma' ? 'prisma' : 'memory';
}

function dependencyReadiness(): HealthCheck['dependencies'] {
  return {
    database: process.env.DATABASE_URL ? 'ready' : 'not_configured',
    queue: process.env.GEO_QUEUE_DRIVER && process.env.GEO_QUEUE_DRIVER !== 'memory' ? 'external_configured' : 'in_memory',
    aiPlatforms: process.env.GEO_AI_PLATFORM_CONFIGURED === 'true' ? 'configured' : 'not_configured',
    logging: process.env.GEO_LOGGING_DRIVER && process.env.GEO_LOGGING_DRIVER !== 'console' ? 'external_configured' : 'console'
  };
}

function missingConfiguration(): string[] {
  const missing: string[] = [];

  if (repositoryDriver() === 'prisma' && !process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (process.env.GEO_AI_PLATFORM_CONFIGURED !== 'true') {
    missing.push('GEO_AI_PLATFORM_CONFIGURED');
  }

  return missing;
}

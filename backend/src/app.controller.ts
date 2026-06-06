import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CareDroid-Clinical-AI API',
      version: '1.0.0',
    };
  }

  @Get('config/system')
  getSystemConfig() {
    const sessionConfig = this.configService.get<any>('session') || {};
    const ragConfig = this.configService.get<any>('rag') || {};
    const environmentConfig = this.configService.get<any>('environment') || {};
    const deploymentConfig = this.configService.get<any>('deployment') || {};

    return {
      environment: {
        name: environmentConfig.name || 'development',
        allowed: environmentConfig.allowed || ['local', 'development', 'staging', 'production'],
        bannerEnabled: environmentConfig.bannerEnabled !== false,
        isProduction: environmentConfig.isProduction === true,
        validation: environmentConfig.validation || { valid: true, source: 'runtime' },
      },
      deployment: {
        id: deploymentConfig.id || null,
        region: deploymentConfig.region || null,
        version: deploymentConfig.version || '1.0.0',
        commit: deploymentConfig.commit || null,
        branch: deploymentConfig.branch || null,
        deployedAt: deploymentConfig.deployedAt || null,
      },
      rag: {
        enabled: ragConfig.enabled !== false,
        topK: ragConfig.retrieval?.topK || 5,
        minScore: ragConfig.retrieval?.minScore || 0.7,
      },
      session: {
        idleTimeoutMs: sessionConfig.idleTimeout || 1800000, // 30 min
        absoluteTimeoutMs: sessionConfig.absoluteTimeout || 28800000, // 8 hours
      },
    };
  }
}

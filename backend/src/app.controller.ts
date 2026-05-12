import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { join } from 'path';

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
    const authConfig = this.configService.get<any>('auth') || {};
    const ragConfig = this.configService.get<any>('rag') || {};

    return {
      rag: {
        enabled: ragConfig.enabled !== false,
        topK: ragConfig.retrieval?.topK || 5,
        minScore: ragConfig.retrieval?.minScore || 0.7,
      },
      session: {
        idleTimeoutMs: authConfig.sessionConfig?.idleTimeout || 1800000, // 30 min
        absoluteTimeoutMs: authConfig.sessionConfig?.absoluteTimeout || 28800000, // 8 hours
      },
    };
  }

  @Get()
  getRoot(@Res() res: Response) {
    return res.sendFile(join(__dirname, '..', '..', 'public', 'index.html'));
  }

  // Frontend SPA routes (single-port deployment)
  @Get('*')
  getSpaRoutes(@Res() res: Response) {
    return res.sendFile(join(__dirname, '..', '..', 'public', 'index.html'));
  }
}

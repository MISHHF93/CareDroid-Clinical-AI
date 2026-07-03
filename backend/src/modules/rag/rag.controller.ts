import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { RAGService } from './rag.service';

@Controller('rag')
export class RAGController {
  constructor(private readonly ragService: RAGService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health() {
    const health = await this.ragService.healthCheck();
    const stats = await this.ragService.getStats().catch(() => null);
    return {
      ...health,
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats() {
    return this.ragService.getStats();
  }
}
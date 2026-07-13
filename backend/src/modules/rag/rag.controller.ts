import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RAGService } from './rag.service';

@Controller('rag')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Permissions(Permission.VIEW_ANALYTICS)
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

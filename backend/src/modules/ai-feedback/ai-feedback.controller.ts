import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';
import { AiFeedbackService } from './ai-feedback.service';
import { SubmitAiFeedbackDto } from './dto/ai-feedback.dto';

@ApiTags('ai-feedback')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('ai-feedback')
export class AiFeedbackController {
  constructor(private readonly aiFeedbackService: AiFeedbackService) {}

  /** Anyone who can use AI chat can rate its output. */
  @RequirePermission(Permission.USE_AI_CHAT)
  @Post()
  submit(@Body() body: SubmitAiFeedbackDto, @TenantContext() tenantContext?: TenantContextValue) {
    return this.aiFeedbackService.submit(
      body,
      tenantContext?.userId || 'unknown',
      tenantContext?.organizationId,
    );
  }

  /** Admin/developer inspection (item 12) -- viewing feedback needs governance visibility, not just chat access. */
  @RequirePermission(Permission.VIEW_GOVERNANCE)
  @Get()
  list(@Query('limit') limit?: string, @TenantContext() tenantContext?: TenantContextValue) {
    return this.aiFeedbackService.listRecent(
      tenantContext?.organizationId,
      limit ? Number(limit) : undefined,
    );
  }
}

import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';
import { CareOperationsService } from './care-operations.service';
import { TransitionCareTaskDto } from './dto/care-operations.dto';

@ApiTags('care-operations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency/care-operations')
export class CareOperationsController {
  constructor(private readonly careOperationsService: CareOperationsService) {}

  /** The Care Operations Inbox: real, role-relevant outstanding work for the caller's org. */
  @RequirePermission(Permission.READ_PHI)
  @Get('inbox')
  getInbox(@TenantContext() tenantContext?: TenantContextValue) {
    return this.careOperationsService.getInbox(tenantContext?.organizationId);
  }

  /** Closed-loop task transitions (claim/start/complete/cancel/reopen). */
  @RequirePermission(Permission.WRITE_PHI)
  @Patch('inbox/:id')
  transitionTask(
    @Param('id') id: string,
    @Body() body: TransitionCareTaskDto,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.careOperationsService.transition(
      id,
      {
        status: body.status,
        actorUserId: tenantContext?.userId,
        actorRole: tenantContext?.role ? String(tenantContext.role) : undefined,
      },
      tenantContext?.organizationId,
    );
  }
}

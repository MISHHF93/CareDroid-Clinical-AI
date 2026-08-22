import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { TenantContext } from '../tenant-context/tenant-context.decorator';
import type { TenantContext as TenantContextValue } from '../tenant-context/tenant-context.types';
import { SurfaceViewsService } from './surface-views.service';

@ApiTags('surface-views')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('surface-views')
export class SurfaceViewsController {
  constructor(private readonly surfaceViewsService: SurfaceViewsService) {}

  /**
   * Item 6: records that the caller viewed `surfaceKey` right now, and
   * returns the previous viewedAt so the client can compute "what's new
   * since I last looked" in the same round trip. Gated the same as the
   * Care Operations Inbox itself (READ_PHI) since that's the first real
   * consumer -- this stores no PHI, only a per-user timestamp.
   */
  @RequirePermission(Permission.READ_PHI)
  @Post(':surfaceKey')
  touch(
    @Param('surfaceKey') surfaceKey: string,
    @TenantContext() tenantContext?: TenantContextValue,
  ) {
    return this.surfaceViewsService.touch(
      surfaceKey,
      tenantContext?.userId || 'unknown',
      tenantContext?.organizationId,
    );
  }

  /** The caller's own last-viewed timestamps across every surface they've touched. */
  @RequirePermission(Permission.READ_PHI)
  @Get()
  list(@TenantContext() tenantContext?: TenantContextValue) {
    return this.surfaceViewsService.listForUser(tenantContext?.userId || 'unknown');
  }
}

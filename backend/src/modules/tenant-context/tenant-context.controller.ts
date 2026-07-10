import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantContextService } from './tenant-context.service';
import { TenantDataIsolationAuditService } from './tenant-data-isolation-audit.service';
import { TenantIsolationGuard } from './tenant-isolation.guard';
import { TenantScoped } from './tenant-scope.decorator';

@ApiTags('tenant')
@Controller('tenant')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TenantContextController {
  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly tenantDataIsolationAuditService: TenantDataIsolationAuditService,
  ) {}

  @Get('context')
  @ApiOperation({ summary: 'Get current request tenant context' })
  async getContext(@Req() req: any) {
    return req.tenantContext || this.tenantContextService.resolveForRequest(req.user, req.headers);
  }

  @Get('isolation-audit')
  @UseGuards(TenantIsolationGuard)
  @TenantScoped({ admin: 'organization' })
  @ApiOperation({ summary: 'Tenant data isolation audit report' })
  async isolationAudit(@Req() req: any) {
    const tenantContext =
      req.tenantContext ||
      (await this.tenantContextService.resolveForRequest(req.user, req.headers));
    return this.tenantDataIsolationAuditService.getAuditReport(tenantContext);
  }
}

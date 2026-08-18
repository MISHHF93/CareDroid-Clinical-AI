import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateAutomationAuditEventDto } from './dto/automation-audit.dto';
import { AutomationAuditStatus } from './entities/automation-audit-event.entity';
import { AutomationAuditService } from './automation-audit.service';

@Controller('automation-audit')
@UseGuards(AuthGuard('jwt'))
export class AutomationAuditController {
  constructor(private readonly automationAuditService: AutomationAuditService) {}

  @Get()
  async listEvents(
    @Req() req: any,
    @Query('status') status?: AutomationAuditStatus,
    @Query('limit') limit?: string,
  ) {
    // HEAL-332: this previously fell back to a client-supplied `tenantId`
    // query param whenever req.tenantContext?.organizationId was falsy.
    // TenantContextService.resolveForRequest always throws before reaching
    // any controller if it can't resolve a real org for an authenticated
    // request, so this fallback is dead today -- but it's exactly the kind
    // of latent anti-pattern that becomes a live cross-org audit-log read
    // the moment that invariant changes (e.g. this route ever joins the
    // tenant-bootstrap allowlist). Removed entirely rather than left as a
    // documented risk, since nothing legitimately depends on it.
    const events = await this.automationAuditService.listEvents({
      tenantId: req.tenantContext?.organizationId,
      status,
      limit: limit ? Number(limit) : undefined,
    });

    return {
      success: true,
      data: events,
      total: events.length,
    };
  }

  @Post()
  async createEvent(@Body() body: CreateAutomationAuditEventDto, @Req() req: any) {
    const event = await this.automationAuditService.createEvent(body, req.tenantContext, req.user);

    return {
      success: true,
      data: event,
    };
  }
}

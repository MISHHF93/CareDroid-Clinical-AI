import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { CreateAutomationAuditEventDto } from './dto/automation-audit.dto';
import { AutomationAuditStatus } from './entities/automation-audit-event.entity';
import { AutomationAuditService } from './automation-audit.service';

@Controller('automation-audit')
@UseGuards(AuthGuard('jwt'))
export class AutomationAuditController {
  constructor(private readonly automationAuditService: AutomationAuditService) {}

  // HEAL-347.89: had no permission decorator at all -- any authenticated
  // org member (registration clerk, read-only viewer, any role) could read
  // the org's entire automation/AI-decision audit trail. audit.controller.ts's
  // equivalent GET /audit/logs already requires VIEW_AUDIT_LOGS for the same
  // category of data; createEvent (below) deliberately stays unguarded --
  // it's fired by automationEngine.ts as a passive, system-driven write for
  // whichever role's session happens to be active, not a human UI action,
  // so gating it the same way would block legitimate automated logging for
  // ordinary clinical sessions.
  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermission(Permission.VIEW_AUDIT_LOGS)
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

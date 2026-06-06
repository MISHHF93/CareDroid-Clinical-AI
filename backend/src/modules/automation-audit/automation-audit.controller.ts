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
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: AutomationAuditStatus,
    @Query('limit') limit?: string,
  ) {
    const scopedTenantId = req.tenantContext?.organizationId || tenantId;
    const events = await this.automationAuditService.listEvents({
      tenantId: scopedTenantId,
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
    const event = await this.automationAuditService.createEvent(
      body,
      req.tenantContext,
      req.user,
    );

    return {
      success: true,
      data: event,
    };
  }
}

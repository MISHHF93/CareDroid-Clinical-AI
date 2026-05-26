import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { Permission } from '../auth/enums/permission.enum';
import { ClinicalAlertsService } from './clinical-alerts.service';

type RequestWithUser = {
  user?: {
    id?: string;
  };
};

@ApiTags('clinical-alerts')
@Controller('clinical/alerts')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@AnyPermission(Permission.READ_PHI, Permission.USE_AI_CHAT, Permission.VIEW_ANALYTICS)
@ApiBearerAuth()
export class ClinicalAlertsController {
  constructor(private readonly clinicalAlertsService: ClinicalAlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List demo-backed clinical alert workflow state' })
  list(@Req() req: RequestWithUser) {
    return this.clinicalAlertsService.listForUser(this.userId(req));
  }

  @Post(':alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a demo-backed clinical alert' })
  acknowledge(
    @Req() req: RequestWithUser,
    @Param('alertId') alertId: string,
    @Body() body: { acknowledgedAt?: string } = {},
  ) {
    return this.clinicalAlertsService.acknowledge(this.userId(req), alertId, body.acknowledgedAt);
  }

  @Post(':alertId/dismiss')
  @ApiOperation({ summary: 'Dismiss a demo-backed clinical alert' })
  dismiss(
    @Req() req: RequestWithUser,
    @Param('alertId') alertId: string,
    @Body() body: { reason?: string; dismissedAt?: string } = {},
  ) {
    return this.clinicalAlertsService.dismiss(
      this.userId(req),
      alertId,
      body.reason || '',
      body.dismissedAt,
    );
  }

  private userId(req: RequestWithUser) {
    return req.user?.id || 'anonymous-demo-user';
  }
}

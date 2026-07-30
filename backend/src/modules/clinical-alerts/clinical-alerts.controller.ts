import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { Permission } from '../auth/enums/permission.enum';
import { ClinicalAlertsService } from './clinical-alerts.service';

type RequestWithUser = {
  user?: {
    id?: string;
  };
  tenantContext?: {
    organizationId?: string;
  };
};

class AcknowledgeAlertDto {
  @IsOptional()
  @IsISO8601()
  acknowledgedAt?: string;
}

class DismissAlertDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsISO8601()
  dismissedAt?: string;
}

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
    return this.clinicalAlertsService.listForUser(
      this.userId(req),
      req.tenantContext?.organizationId,
    );
  }

  @Post(':alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a demo-backed clinical alert' })
  acknowledge(
    @Req() req: RequestWithUser,
    @Param('alertId') alertId: string,
    @Body() body: AcknowledgeAlertDto = {},
  ) {
    return this.clinicalAlertsService.acknowledge(this.userId(req), alertId, body.acknowledgedAt);
  }

  @Post(':alertId/dismiss')
  @ApiOperation({ summary: 'Dismiss a demo-backed clinical alert' })
  dismiss(
    @Req() req: RequestWithUser,
    @Param('alertId') alertId: string,
    @Body() body: DismissAlertDto = {},
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

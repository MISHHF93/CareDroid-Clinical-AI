import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { SURVEILLANCE_SOURCE } from './surveillance.data';
import { SurveillanceService } from './surveillance.service';
import type { SurveillanceRequestLike } from './surveillance.types';

const SURVEILLANCE_VIEW_PERMISSIONS = [
  Permission.VIEW_SURVEILLANCE,
  Permission.MANAGE_SECURITY_OPERATIONS,
  Permission.VIEW_OPERATIONS,
  Permission.MANAGE_SURVEILLANCE_REGISTRY,
];

function envelope<T>(data: T, message: string) {
  return {
    success: true,
    ...SURVEILLANCE_SOURCE,
    generatedAt:
      typeof data === 'object' && data && 'generatedAt' in data
        ? (data.generatedAt as string)
        : new Date().toISOString(),
    message,
    data,
  };
}

@ApiTags('surveillance')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@AnyPermission(...SURVEILLANCE_VIEW_PERMISSIONS)
@Controller('surveillance')
export class SurveillanceController {
  constructor(private readonly surveillanceService: SurveillanceService) {}

  @Get('nexus/snapshot')
  @ApiOperation({ summary: 'Get unified surveillance / IoT nexus snapshot' })
  async getNexusSnapshot(@Req() req: SurveillanceRequestLike) {
    return envelope(
      await this.surveillanceService.getNexusSnapshot(req),
      'Backend demo surveillance nexus snapshot. Not live CCTV or clinical telemetry.',
    );
  }

  @Get('cameras/registry')
  @ApiOperation({ summary: 'Get camera registry' })
  async getCameraRegistry(@Req() req: SurveillanceRequestLike) {
    const snapshot = await this.surveillanceService.getNexusSnapshot(req);
    return envelope(
      { generatedAt: snapshot.generatedAt, cameras: snapshot.cameras },
      'Camera registry returned (demo).',
    );
  }

  @Get('iot/registry')
  @ApiOperation({ summary: 'Get IoT device registry' })
  async getIotRegistry(@Req() req: SurveillanceRequestLike) {
    const snapshot = await this.surveillanceService.getNexusSnapshot(req);
    return envelope(
      { generatedAt: snapshot.generatedAt, iotDevices: snapshot.iotDevices },
      'IoT device registry returned (demo).',
    );
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get facility zone mapping' })
  async getZones(@Req() req: SurveillanceRequestLike) {
    const snapshot = await this.surveillanceService.getNexusSnapshot(req);
    return envelope(
      { generatedAt: snapshot.generatedAt, zones: snapshot.zones },
      'Facility zones returned (demo).',
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Get surveillance health monitoring metrics' })
  async getHealth(@Req() req: SurveillanceRequestLike) {
    const snapshot = await this.surveillanceService.getNexusSnapshot(req);
    return envelope(
      { generatedAt: snapshot.generatedAt, healthMetrics: snapshot.healthMetrics },
      'Surveillance health metrics returned (demo).',
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get surveillance alerts and rules' })
  async getAlerts(@Req() req: SurveillanceRequestLike) {
    const snapshot = await this.surveillanceService.getNexusSnapshot(req);
    return envelope(
      {
        generatedAt: snapshot.generatedAt,
        alerts: snapshot.alerts,
        alertRules: snapshot.alertRules,
      },
      'Surveillance alerts and rules returned (demo).',
    );
  }

  @Get('incidents')
  @ApiOperation({ summary: 'Get surveillance incident linkage' })
  async getIncidents(@Req() req: SurveillanceRequestLike) {
    const snapshot = await this.surveillanceService.getNexusSnapshot(req);
    return envelope(
      { generatedAt: snapshot.generatedAt, incidentLinks: snapshot.incidentLinks },
      'Surveillance incident links returned (demo).',
    );
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Get adapter-ready integration contracts' })
  async getIntegrations(@Req() req: SurveillanceRequestLike) {
    const snapshot = await this.surveillanceService.getNexusSnapshot(req);
    return envelope(
      {
        generatedAt: snapshot.generatedAt,
        integrationContracts: snapshot.integrationContracts,
      },
      'Surveillance integration contracts returned (demo).',
    );
  }
}

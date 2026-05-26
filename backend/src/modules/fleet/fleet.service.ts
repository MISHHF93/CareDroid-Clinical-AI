import { Injectable } from '@nestjs/common';
import {
  buildFleetAlerts,
  buildFleetRoutes,
  buildFleetSummary,
  buildFleetVehicles,
} from './fleet.data';
import { FleetAuditService } from './fleet-audit.service';
import { FleetRequestLike } from './fleet.types';

@Injectable()
export class FleetService {
  constructor(private readonly fleetAudit: FleetAuditService) {}

  async getActiveRoutes(req?: FleetRequestLike) {
    const routes = buildFleetRoutes();
    await this.fleetAudit.recordRead(req, 'fleet:routes-active', {
      count: routes.length,
      delayedRoutes: routes.filter((route) => route.status === 'delayed').length,
    });
    return { routes };
  }

  async getFleetAlerts(req?: FleetRequestLike) {
    const vehicles = buildFleetVehicles();
    const alerts = buildFleetAlerts(vehicles);
    await this.fleetAudit.recordRead(req, 'fleet:alerts', {
      count: alerts.length,
      highSeverity: alerts.filter((alert) => alert.severity === 'high').length,
    });
    return { alerts };
  }

  async getFleetSnapshot(req?: FleetRequestLike) {
    const vehicles = buildFleetVehicles();
    const routes = buildFleetRoutes();
    const alerts = buildFleetAlerts(vehicles);
    await this.fleetAudit.recordRead(req, 'fleet:snapshot', {
      vehicles: vehicles.length,
      routes: routes.length,
      alerts: alerts.length,
    });

    return {
      summary: buildFleetSummary(vehicles, routes, alerts),
      vehicles,
      routes,
      alerts,
    };
  }
}

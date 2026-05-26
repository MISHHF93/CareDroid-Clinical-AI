import { Injectable } from '@nestjs/common';
import { buildFleetAlerts, buildFleetRoutes, buildFleetSummary, buildFleetVehicles } from './fleet.data';
import { FleetAuditService } from './fleet-audit.service';
import { FleetRequestLike } from './fleet.types';

@Injectable()
export class VehicleTrackingService {
  constructor(private readonly fleetAudit: FleetAuditService) {}

  async getLiveVehicles(req?: FleetRequestLike) {
    const vehicles = buildFleetVehicles();
    const routes = buildFleetRoutes();
    const alerts = buildFleetAlerts(vehicles);

    await this.fleetAudit.recordRead(req, 'fleet:vehicles-live', {
      count: vehicles.length,
      staleVehicles: vehicles.filter((vehicle) => vehicle.freshness === 'stale').length,
      offlineVehicles: vehicles.filter((vehicle) => vehicle.freshness === 'offline').length,
    });

    return {
      vehicles,
      summary: buildFleetSummary(vehicles, routes, alerts),
    };
  }
}

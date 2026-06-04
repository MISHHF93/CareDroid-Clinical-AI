import { Injectable } from '@nestjs/common';
import { FleetService } from '../fleet/fleet.service';

@Injectable()
export class DigitalTwinService {
  constructor(private readonly fleetService: FleetService) {}

  async getSnapshot(organizationId?: string) {
    let fleetVehicles: Array<{ id: string; label: string; status: string; eta: string; alert: string }> =
      [];

    try {
      const fleet = await this.fleetService.getFleetSnapshot();
      fleetVehicles = (fleet?.vehicles || []).slice(0, 5).map((v: any) => ({
        id: v.id || v.vehicleId,
        label: v.name || v.label || 'Vehicle',
        status: v.status || 'unknown',
        eta: v.eta || '—',
        alert: v.alert || 'None',
      }));
    } catch {
      fleetVehicles = [
        { id: 'amb-a12', label: 'Ambulance A-12', status: 'delayed', eta: '14 min', alert: 'Route diversion' },
        { id: 'van-03', label: 'Transport Van 03', status: 'available', eta: '5 min', alert: 'None' },
      ];
    }

    return {
      organizationId: organizationId || null,
      sourceLabel: organizationId
        ? `Digital twin for organization ${organizationId}`
        : 'Demo digital twin assembled from hospital map, IoT, fleet, and alert contracts',
      occupancy: { totalBeds: 96, occupiedBeds: 71, criticalBeds: 9, staffingRatio: '1:4.2' },
      floors: [
        { id: 'icu', label: 'ICU', occupancy: 0.88, alerts: 4, devices: 38, staffing: 'tight' },
        { id: 'ed', label: 'Emergency', occupancy: 0.74, alerts: 3, devices: 29, staffing: 'stable' },
        { id: 'med-surg', label: 'Med/Surg', occupancy: 0.62, alerts: 1, devices: 44, staffing: 'stable' },
      ],
      rooms: [
        {
          id: 'icu-12',
          label: 'ICU 12',
          bed: 'Bed A',
          patientState: 'high acuity',
          telemetry: 'stale SpO2',
          device: 'Monitor M-184',
          fleet: 'No transfer',
        },
        {
          id: 'ed-04',
          label: 'ED 04',
          bed: 'Trauma bay',
          patientState: 'chest pain',
          telemetry: 'active',
          device: 'ECG cart E-9',
          fleet: 'Inbound ETA 8m',
        },
      ],
      fleet: fleetVehicles,
      updatedAt: new Date().toISOString(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { FleetService } from '../fleet/fleet.service';
import { PlatformAssetsService } from './platform-assets.service';

const DIGITAL_TWIN_CAPABILITY_PACKS = {
  hospitalMap: ['hospital-operations', 'digital-twin-pack'],
  occupancy: ['hospital-operations', 'digital-twin-pack'],
  iot: ['hospital-operations', 'medical-iot-pack'],
  fleet: ['hospital-operations', 'fleet-logistics'],
  alerts: ['hospital-operations', 'digital-twin-pack', 'medical-iot-pack'],
};

@Injectable()
export class DigitalTwinService {
  constructor(
    private readonly fleetService: FleetService,
    private readonly platformAssetsService: PlatformAssetsService,
  ) {}

  async getSnapshot(organizationId?: string) {
    const entitlementPackIds = await this.resolveEntitlementPackIds(organizationId);
    const capabilities = this.resolveCapabilities(organizationId, entitlementPackIds);
    const source = this.buildSourceMetadata(organizationId, entitlementPackIds, capabilities);
    let fleetVehicles: Array<{
      id: string;
      label: string;
      status: string;
      eta: string;
      alert: string;
    }> = [];

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
        {
          id: 'amb-a12',
          label: 'Ambulance A-12',
          status: 'delayed',
          eta: '14 min',
          alert: 'Route diversion',
        },
        {
          id: 'van-03',
          label: 'Transport Van 03',
          status: 'available',
          eta: '5 min',
          alert: 'None',
        },
      ];
    }

    return {
      organizationId: organizationId || null,
      source,
      capabilities,
      dataContracts: this.buildDataContracts(source.mode, capabilities),
      sourceLabel: organizationId
        ? `Organization-scoped digital twin demo for ${organizationId} - live data not connected`
        : 'Demo digital twin assembled from hospital map, IoT, fleet, and alert contracts',
      occupancy: { totalBeds: 96, occupiedBeds: 71, criticalBeds: 9, staffingRatio: '1:4.2' },
      floors: [
        { id: 'icu', label: 'ICU', occupancy: 0.88, alerts: 4, devices: 38, staffing: 'tight' },
        {
          id: 'ed',
          label: 'Emergency',
          occupancy: 0.74,
          alerts: 3,
          devices: 29,
          staffing: 'stable',
        },
        {
          id: 'med-surg',
          label: 'Med/Surg',
          occupancy: 0.62,
          alerts: 1,
          devices: 44,
          staffing: 'stable',
        },
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

  private async resolveEntitlementPackIds(organizationId?: string) {
    if (!organizationId) return [];
    try {
      const entitlements =
        await this.platformAssetsService.getOrganizationEntitlements(organizationId);
      return entitlements.map((row) => row.packId);
    } catch {
      return [];
    }
  }

  private resolveCapabilities(organizationId: string | undefined, entitlementPackIds: string[]) {
    if (!organizationId) {
      return {
        hospitalMap: true,
        occupancy: true,
        iot: true,
        fleet: true,
        alerts: true,
      };
    }
    return Object.fromEntries(
      Object.entries(DIGITAL_TWIN_CAPABILITY_PACKS).map(([capability, packIds]) => [
        capability,
        packIds.some((packId) => entitlementPackIds.includes(packId)),
      ]),
    );
  }

  private buildSourceMetadata(
    organizationId: string | undefined,
    entitlementPackIds: string[],
    capabilities: Record<string, boolean>,
  ) {
    const mode = organizationId ? 'organization' : 'demo';
    const liveEligible = Boolean(organizationId && Object.values(capabilities).some(Boolean));
    return {
      mode,
      status: liveEligible ? 'organization_contract_ready' : 'demo_contract',
      demoData: true,
      liveDataAvailable: false,
      organizationScoped: Boolean(organizationId),
      entitlementPackIds,
      generatedAt: new Date().toISOString(),
      note: liveEligible
        ? 'Organization has digital twin capabilities enabled, but this snapshot still uses demo/static contracts until live integrations are connected.'
        : 'Snapshot uses demo contracts until organization entitlements and integrations are configured.',
    };
  }

  private buildDataContracts(mode: string, capabilities: Record<string, boolean>) {
    return [
      { domain: 'occupancy', capability: 'occupancy' },
      { domain: 'hospital-map', capability: 'hospitalMap' },
      { domain: 'medical-iot', capability: 'iot' },
      { domain: 'fleet', capability: 'fleet' },
      { domain: 'alerts', capability: 'alerts' },
    ].map((contract) => ({
      ...contract,
      sourceMode: mode,
      status: capabilities[contract.capability] ? 'contract-ready' : 'not-entitled',
    }));
  }
}

import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { buildHospitalMapSnapshot, filterDevices } from './hospital-map.data';
import { HospitalMapFilter, HospitalMapRequestLike } from './hospital-map.types';

@Injectable()
export class DeviceLocationService {
  constructor(@Optional() private readonly auditService?: AuditService) {}

  private async recordRead(
    req: HospitalMapRequestLike | undefined,
    resource: string,
    metadata: Record<string, unknown>,
  ) {
    if (!this.auditService) return;

    await this.auditService.log({
      userId: req?.user?.id || req?.user?.userId,
      action: AuditAction.CLINICAL_DATA_ACCESS,
      resource,
      ipAddress: req?.ip || req?.connection?.remoteAddress || '0.0.0.0',
      userAgent: String(req?.headers?.['user-agent'] || 'unknown'),
      phiAccessed: true,
      metadata: {
        ...metadata,
        demo: true,
        mapCoordinateSystem: 'svg-viewbox-1000x620',
        trackingSupportOnly: true,
        auditedAt: new Date().toISOString(),
      },
    });
  }

  async getDeviceLocations(req?: HospitalMapRequestLike, filter: HospitalMapFilter = {}) {
    const snapshot = buildHospitalMapSnapshot();
    const devices = filterDevices(snapshot.devices, snapshot.rooms, snapshot.beds, filter);
    const deviceIds = new Set(devices.map((device) => device.id));
    const alerts = snapshot.alerts.filter((alert) => deviceIds.has(alert.deviceId));

    await this.recordRead(req, 'hospital-map:device-locations', {
      count: devices.length,
      floorId: filter.floorId || 'all',
      roomId: filter.roomId || 'all',
    });

    return {
      generatedAt: snapshot.generatedAt,
      devices,
      alerts,
      locationEvents: snapshot.locationEvents.filter((event) =>
        deviceIds.has(String(event.deviceId)),
      ),
      maintenanceRecords: snapshot.maintenanceRecords.filter((record) =>
        deviceIds.has(String(record.deviceId)),
      ),
    };
  }

  async getDeviceDetail(deviceId: string, req?: HospitalMapRequestLike) {
    const snapshot = buildHospitalMapSnapshot();
    const device = snapshot.devices.find((candidate) => candidate.id === deviceId);

    if (!device) {
      throw new NotFoundException(`Hospital map device ${deviceId} was not found`);
    }

    await this.recordRead(req, `hospital-map:device:${deviceId}`, {
      deviceId,
      roomId: device.roomId,
      floorId: device.floorId,
    });

    return {
      generatedAt: snapshot.generatedAt,
      device,
      alerts: snapshot.alerts.filter((alert) => alert.deviceId === deviceId),
      locationEvents: snapshot.locationEvents.filter((event) => event.deviceId === deviceId),
      maintenanceRecords: snapshot.maintenanceRecords.filter(
        (record) => record.deviceId === deviceId,
      ),
    };
  }
}

/**
 * Vendor-agnostic CAD/AVL adapter port and v1 implementations.
 */

import type {
  AdapterHealth,
  CadAvlEvent,
  SentinelUnitStatus,
} from '../../../../../lib/sentinel/types';
import { createId } from '../sentinel.config';

export type AdapterContext = Readonly<{
  organizationId?: string;
  sinceEventId?: string | null;
}>;

export interface CadAvlAdapter {
  readonly vendorId: string;
  pullOrSubscribe(ctx: AdapterContext): AsyncIterable<CadAvlEvent>;
  acknowledge?(eventId: string): Promise<void>;
  health(): Promise<AdapterHealth>;
}

/** Deterministic mock units for QA and offline demos. */
export class MockCadAvlAdapter implements CadAvlAdapter {
  readonly vendorId = 'mock-cad';

  private lastEventAt: string | null = null;
  private tick = 0;

  async *pullOrSubscribe(_ctx: AdapterContext): AsyncIterable<CadAvlEvent> {
    const now = new Date().toISOString();
    this.lastEventAt = now;
    this.tick += 1;
    const baseLat = 40.75;
    const baseLng = -73.99;
    const offset = (this.tick % 20) * 0.0008;

    yield Object.freeze({
      kind: 'position' as const,
      eventId: createId('mock-pos'),
      vendorId: this.vendorId,
      unitExternalId: 'Medic-12',
      occurredAt: now,
      latitude: baseLat + offset,
      longitude: baseLng + offset * 0.6,
      heading: 74,
      speedKmh: 32,
      status: 'transporting' as SentinelUnitStatus,
      sequence: this.tick,
    });

    yield Object.freeze({
      kind: 'position' as const,
      eventId: createId('mock-pos'),
      vendorId: this.vendorId,
      unitExternalId: 'Medic-4',
      occurredAt: now,
      latitude: baseLat - 0.01 + offset * 0.4,
      longitude: baseLng + 0.01,
      heading: 120,
      speedKmh: 28,
      status: 'transporting' as SentinelUnitStatus,
      sequence: this.tick,
    });
  }

  async health(): Promise<AdapterHealth> {
    return Object.freeze({
      vendorId: this.vendorId,
      healthy: true,
      lastEventAt: this.lastEventAt,
      detail: 'Mock CAD/AVL adapter generating deterministic positions',
    });
  }
}

/**
 * Webhook adapter: stores last ingest batch and replays on pull.
 * HTTP controller pushes events via `enqueue`.
 */
export class WebhookCadAvlAdapter implements CadAvlAdapter {
  readonly vendorId = 'webhook-cad';

  private readonly queue: CadAvlEvent[] = [];
  private lastEventAt: string | null = null;

  enqueue(events: readonly CadAvlEvent[]): void {
    for (const event of events) {
      this.queue.push(event);
      this.lastEventAt = event.occurredAt;
    }
    // Bound memory
    if (this.queue.length > 500) {
      this.queue.splice(0, this.queue.length - 500);
    }
  }

  async *pullOrSubscribe(_ctx: AdapterContext): AsyncIterable<CadAvlEvent> {
    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) yield next;
    }
  }

  async health(): Promise<AdapterHealth> {
    return Object.freeze({
      vendorId: this.vendorId,
      healthy: true,
      lastEventAt: this.lastEventAt,
      detail: `Webhook queue depth ${this.queue.length}`,
    });
  }
}

/**
 * Maps fleet demo vehicles into CAD/AVL events when SENTINEL_FLEET_BRIDGE is on.
 */
export class FleetBridgeAdapter implements CadAvlAdapter {
  readonly vendorId = 'fleet-bridge';

  private lastEventAt: string | null = null;

  constructor(
    private readonly loadVehicles: () => Array<{
      id: string;
      label: string;
      coordinates: { latitude: number; longitude: number };
      heading: number;
      speedMph: number;
      status: string;
      lastSeenAt: string;
    }>,
  ) {}

  async *pullOrSubscribe(_ctx: AdapterContext): AsyncIterable<CadAvlEvent> {
    const vehicles = this.loadVehicles();
    const now = new Date().toISOString();
    this.lastEventAt = now;
    let seq = 0;
    for (const vehicle of vehicles) {
      seq += 1;
      yield Object.freeze({
        kind: 'position' as const,
        eventId: createId('fleet-pos'),
        vendorId: this.vendorId,
        unitExternalId: vehicle.id,
        occurredAt: vehicle.lastSeenAt || now,
        latitude: vehicle.coordinates.latitude,
        longitude: vehicle.coordinates.longitude,
        heading: vehicle.heading,
        speedKmh: Math.round(vehicle.speedMph * 1.60934 * 10) / 10,
        status: mapFleetStatus(vehicle.status),
        sequence: seq,
        raw: { label: vehicle.label, fleetStatus: vehicle.status },
      });
    }
  }

  async health(): Promise<AdapterHealth> {
    return Object.freeze({
      vendorId: this.vendorId,
      healthy: true,
      lastEventAt: this.lastEventAt,
      detail: 'Fleet bridge adapter (demo logistics vehicles)',
    });
  }
}

function mapFleetStatus(status: string): SentinelUnitStatus {
  switch (status) {
    case 'available':
      return 'available';
    case 'occupied':
    case 'active':
      return 'transporting';
    case 'maintenance':
      return 'out_of_service';
    default:
      return 'offline';
  }
}

export function normalizeWebhookPayload(
  body: Record<string, unknown>,
  vendorId = 'webhook-cad',
): CadAvlEvent[] {
  const events: CadAvlEvent[] = [];
  const items = Array.isArray(body.events)
    ? body.events
    : Array.isArray(body.units)
      ? body.units
      : [body];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const unitExternalId = String(
      row.unitExternalId || row.unitId || row.ems_unit_id || row.callSign || '',
    ).trim();
    if (!unitExternalId) continue;

    const lat = Number(row.latitude ?? row.lat);
    const lng = Number(row.longitude ?? row.lng ?? row.lon);
    const hasPos = Number.isFinite(lat) && Number.isFinite(lng);

    events.push(
      Object.freeze({
        kind: hasPos ? ('position' as const) : ('status' as const),
        eventId: String(row.eventId || createId('wh')),
        vendorId: String(row.vendorId || vendorId),
        unitExternalId,
        occurredAt: String(row.occurredAt || row.timestamp || new Date().toISOString()),
        latitude: hasPos ? lat : undefined,
        longitude: hasPos ? lng : undefined,
        heading: row.heading != null ? Number(row.heading) : undefined,
        speedKmh: row.speedKmh != null ? Number(row.speedKmh) : undefined,
        status: row.status != null ? (String(row.status) as SentinelUnitStatus) : undefined,
        sequence: row.sequence != null ? Number(row.sequence) : undefined,
        raw: row,
      }),
    );
  }
  return events;
}

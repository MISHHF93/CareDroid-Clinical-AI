export interface FleetRequestLike {
  user?: { id?: string; userId?: string; role?: string };
  ip?: string;
  connection?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
}

export interface FleetVehicle {
  id: string;
  label: string;
  status: 'active' | 'available' | 'occupied' | 'maintenance';
  freshness: 'fresh' | 'stale' | 'offline';
  maintenanceStatus: string;
  etaMinutes: number | null;
  energyType: string;
  energyPercent: number;
  utilizationPercent: number;
  driver: string | null;
  coordinates: { latitude: number; longitude: number };
  mapPosition: { x: number; y: number };
  heading: number;
  speedMph: number;
  routeId: string | null;
  destination: string;
  lastSeenAt: string;
  locationSource: string;
}

export interface FleetRoute {
  id: string;
  name: string;
  vehicleId: string;
  status: 'active' | 'delayed';
  etaMinutes: number;
  stopsRemaining: number;
  path: Array<{ x: number; y: number }>;
}

export interface FleetAlert {
  id: string;
  vehicleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  triggeredAt: string;
}

export interface FleetSummary {
  totalVehicles: number;
  activeVehicles: number;
  availableVehicles: number;
  staleVehicles: number;
  offlineVehicles: number;
  activeRoutes: number;
  delayedRoutes: number;
  activeAlerts: number;
  averageUtilizationPercent: number;
  averageEtaMinutes: number | null;
  updatedAt: string;
  source: string;
}

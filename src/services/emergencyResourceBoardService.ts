export const RESOURCE_STATUSES = Object.freeze({
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  OUT_OF_SERVICE: 'Out of Service',
});

export const DEFAULT_EMERGENCY_RESOURCES = Object.freeze([
  Object.freeze({
    id: 'rooms',
    label: 'Rooms',
    available: 7,
    occupied: 58,
    outOfService: 3,
    criticalThreshold: 8,
  }),
  Object.freeze({
    id: 'stretchers',
    label: 'Stretchers',
    available: 9,
    occupied: 62,
    outOfService: 5,
    criticalThreshold: 10,
  }),
  Object.freeze({
    id: 'monitors',
    label: 'Monitors',
    available: 12,
    occupied: 54,
    outOfService: 4,
    criticalThreshold: 10,
  }),
  Object.freeze({
    id: 'telemetry-units',
    label: 'Telemetry Units',
    available: 5,
    occupied: 21,
    outOfService: 2,
    criticalThreshold: 6,
  }),
  Object.freeze({
    id: 'infusion-pumps',
    label: 'Infusion Pumps',
    available: 11,
    occupied: 39,
    outOfService: 6,
    criticalThreshold: 10,
  }),
]);

function normalizeResource(resource) {
  const total = resource.available + resource.occupied + resource.outOfService;
  const availabilityRate = total ? Math.round((resource.available / total) * 100) : 0;
  const status =
    resource.available <= resource.criticalThreshold ||
    resource.outOfService >= resource.criticalThreshold / 2
      ? RESOURCE_STATUSES.OUT_OF_SERVICE
      : resource.occupied > resource.available
        ? RESOURCE_STATUSES.OCCUPIED
        : RESOURCE_STATUSES.AVAILABLE;

  return Object.freeze({
    ...resource,
    total,
    availabilityRate,
    status,
    shortage: resource.available < resource.criticalThreshold,
  });
}

export const EmergencyResourceBoardService = Object.freeze({
  getResourceBoard(resources = DEFAULT_EMERGENCY_RESOURCES) {
    const normalized = Object.freeze(resources.map(normalizeResource));
    const totals = normalized.reduce(
      (summary, resource) => ({
        total: summary.total + resource.total,
        available: summary.available + resource.available,
        occupied: summary.occupied + resource.occupied,
        outOfService: summary.outOfService + resource.outOfService,
      }),
      { total: 0, available: 0, occupied: 0, outOfService: 0 },
    );
    const shortages = normalized.filter((resource) => resource.shortage);

    return Object.freeze({
      id: 'emergency-resource-board',
      label: 'Emergency Resource Board',
      resources: normalized,
      statuses: Object.freeze(Object.values(RESOURCE_STATUSES)),
      metrics: Object.freeze({
        ...totals,
        availabilityRate: totals.total ? Math.round((totals.available / totals.total) * 100) : 0,
        shortageCount: shortages.length,
      }),
      shortages: Object.freeze(shortages),
      recommendations: Object.freeze(
        shortages.map((resource) =>
          Object.freeze({
            id: `${resource.id}-resource-shortage`,
            title: `${resource.label} availability below threshold`,
            priority:
              resource.available <= Math.max(2, resource.criticalThreshold / 2)
                ? 'critical'
                : 'urgent',
            rationale: `${resource.available} ${resource.label.toLowerCase()} available, ${resource.outOfService} out of service.`,
            action:
              'Review turnover, cleaning, maintenance, and operational allocation before patient movement is blocked.',
          }),
        ),
      ),
      sourceState: 'Demo data · No live device or bed integration',
      safetyStatement:
        'Resource Board shows operational availability only. Placement, staffing, and clinical decisions remain human-reviewed.',
    });
  },
});

export default EmergencyResourceBoardService;

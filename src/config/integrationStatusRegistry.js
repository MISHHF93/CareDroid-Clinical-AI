/**
 * Integration discovery registry — no backend imports (Node-safe for audit scripts).
 */
export const INTEGRATION_STATUS = Object.freeze({
  IMPLEMENTED: 'implemented',
  PARTIAL: 'partial',
  PLACEHOLDER: 'placeholder',
});

export const INTEGRATION_CATEGORY = Object.freeze({
  FHIR: 'FHIR',
  HL7: 'HL7',
  PROVINCIAL: 'Provincial',
  NOTIFICATION: 'Notification',
  IDENTITY: 'Identity',
});

export const INTEGRATION_STATUS_LABELS = Object.freeze({
  implemented: 'Implemented',
  partial: 'Partial',
  placeholder: 'Placeholder',
});

export const INTEGRATION_STATUS_GUIDANCE = Object.freeze({
  implemented: 'Live connector or production behavior is active.',
  partial: 'Contracts, UI, or local behavior exist — production feed or routing incomplete.',
  placeholder: 'Demo, catalog, or stub only — not production-connected.',
});

/** @type {readonly import('./integrationStatusModel').IntegrationPoint[]} */
export const INTEGRATION_POINT_REGISTRY = Object.freeze([
  // —— FHIR ——
  {
    id: 'fhir-r4-connector',
    category: INTEGRATION_CATEGORY.FHIR,
    label: 'FHIR R4 connector',
    status: INTEGRATION_STATUS.PARTIAL,
    capability: 'integrationStatus',
    liveSourceId: 'fhir-demo',
    surfaces: ['IntegrationHub', 'EmergencySettings', 'PlatformSystemPage'],
    backend: 'platform-systems.service.ts',
    summary: 'Demo connection state and test/sync APIs; no live SMART/OAuth launch.',
  },
  {
    id: 'fhir-hub-normalization',
    category: INTEGRATION_CATEGORY.FHIR,
    label: 'FHIR hub normalization',
    status: INTEGRATION_STATUS.PARTIAL,
    capability: 'emergencyIntegrationHub',
    surfaces: ['IntegrationHub', 'interoperability/events'],
    backend: 'integration-automation-router.service.ts',
    summary: 'Patient, Observation, Encounter normalization into durable hub records.',
  },
  {
    id: 'fhir-smart-oauth',
    category: INTEGRATION_CATEGORY.FHIR,
    label: 'SMART on FHIR / OAuth',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    surfaces: ['CommercialPages'],
    summary: 'Catalog and readiness UI only; no token exchange or launch context.',
  },
  {
    id: 'fhir-bundle-ingestion',
    category: INTEGRATION_CATEGORY.FHIR,
    label: 'FHIR Bundle ingestion',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    surfaces: [],
    summary: 'Individual resource events only; no Bundle consumer.',
  },
  {
    id: 'fhir-ed-consumer',
    category: INTEGRATION_CATEGORY.FHIR,
    label: 'CareDroid FHIR consumer',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    capability: 'emergencySmartIntake',
    surfaces: ['SmartIntake'],
    summary: 'Smart Intake normalizes snapshots when backend path is enabled.',
  },

  // —— HL7 ——
  {
    id: 'hl7-adt-interface',
    category: INTEGRATION_CATEGORY.HL7,
    label: 'HL7 v2 ADT interface',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    capability: 'integrationStatus',
    liveSourceId: 'hl7-demo',
    surfaces: ['IntegrationHub', 'EmergencySettings', 'PlatformSystemPage'],
    backend: 'platform-systems.service.ts',
    summary: 'Demo interface metadata; no MLLP listener or ADT parser.',
  },
  {
    id: 'hl7-oru-interface',
    category: INTEGRATION_CATEGORY.HL7,
    label: 'HL7 v2 ORU results',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    surfaces: ['IntegrationHub'],
    backend: 'integration-event-registry.service.ts',
    summary: 'Placeholder ORU normalization in hub registry.',
  },
  {
    id: 'hl7-mllp-listener',
    category: INTEGRATION_CATEGORY.HL7,
    label: 'HL7 MLLP listener',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    surfaces: [],
    summary: 'Not implemented — no ACK/NACK or interface engine adapter.',
  },
  {
    id: 'hl7-hub-persistence',
    category: INTEGRATION_CATEGORY.HL7,
    label: 'HL7 hub event persistence',
    status: INTEGRATION_STATUS.PARTIAL,
    capability: 'emergencyIntegrationHub',
    surfaces: ['IntegrationHub'],
    backend: 'integration-hub.service.ts',
    summary: 'Durable ingest/trace for HL7-shaped events when posted to hub API.',
  },

  // —— Provincial ——
  {
    id: 'provincial-ohip-connector',
    category: INTEGRATION_CATEGORY.PROVINCIAL,
    label: 'Provincial / OHIP connector',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    capability: 'emergencyProvincialHealth',
    surfaces: ['EmergencySettings', 'PatientTimeline'],
    backend: 'ProvincialHealthService',
    summary: 'placeholder-unavailable Ontario/OHIP demo envelope; no HIE feed.',
  },
  {
    id: 'moh-fhir-health-probe',
    category: INTEGRATION_CATEGORY.PROVINCIAL,
    label: 'MOH FHIR health probe',
    status: INTEGRATION_STATUS.PARTIAL,
    surfaces: ['backend health'],
    backend: 'moh-fhir.service.ts',
    summary: 'Env-gated connector health check; not wired to ED workflows.',
  },
  {
    id: 'provincial-timeline-labels',
    category: INTEGRATION_CATEGORY.PROVINCIAL,
    label: 'Provincial timeline surfacing',
    status: INTEGRATION_STATUS.PARTIAL,
    surfaces: ['PatientDetailPanel', 'patientTimeline.ts'],
    summary: 'Timeline category with demo vs unavailable labels for staff review.',
  },

  // —— Notification ——
  {
    id: 'ed-operational-alerts',
    category: INTEGRATION_CATEGORY.NOTIFICATION,
    label: 'ED operational alerts (local)',
    status: INTEGRATION_STATUS.IMPLEMENTED,
    surfaces: ['Header', 'alertEngine', 'AppShell'],
    summary: 'In-app drawer and tiered toasts for reassessment, EMS, capacity.',
  },
  {
    id: 'notifications-rest',
    category: INTEGRATION_CATEGORY.NOTIFICATION,
    label: 'Notification REST API',
    status: INTEGRATION_STATUS.IMPLEMENTED,
    capability: 'notificationsRest',
    surfaces: ['NotificationPreferences'],
    backend: 'notification.module.ts',
    summary: 'Device registration, preferences, history, unread state.',
  },
  {
    id: 'push-fcm-delivery',
    category: INTEGRATION_CATEGORY.NOTIFICATION,
    label: 'Firebase push delivery',
    status: INTEGRATION_STATUS.PARTIAL,
    capability: 'notificationsRest',
    surfaces: ['NotificationService.js'],
    backend: 'firebase.service.ts',
    summary: 'FCM when credentials configured; ED events not routed through backend.',
  },
  {
    id: 'notification-stream',
    category: INTEGRATION_CATEGORY.NOTIFICATION,
    label: 'Notification SSE stream',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    capability: 'notificationStream',
    surfaces: [],
    summary: 'Capability disabled — do not call /api/notifications/stream.',
  },
  {
    id: 'email-delivery',
    category: INTEGRATION_CATEGORY.NOTIFICATION,
    label: 'Email delivery',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    capability: 'notificationSendChannel',
    surfaces: ['NotificationPreferences', 'EmergencySettings'],
    summary: 'Preference fields exist; no ED alert → email routing.',
  },
  {
    id: 'sms-delivery',
    category: INTEGRATION_CATEGORY.NOTIFICATION,
    label: 'SMS delivery',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    capability: 'notificationSendChannel',
    surfaces: ['NotificationPreferences'],
    summary: 'Preference toggle only; no SMS provider.',
  },
  {
    id: 'pager-escalation',
    category: INTEGRATION_CATEGORY.NOTIFICATION,
    label: 'Pager / PagerDuty escalation',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    surfaces: ['docker-compose Alertmanager'],
    summary: 'Ops config only; not connected to ED alert engine.',
  },

  // —— Identity ——
  {
    id: 'identity-verification-ui',
    category: INTEGRATION_CATEGORY.IDENTITY,
    label: 'Identity verification workflow',
    status: INTEGRATION_STATUS.IMPLEMENTED,
    surfaces: ['SmartIntake', 'PatientVerificationExperience', 'ReceptionWorkspace'],
    summary: 'Five-step OCR → duplicate → field review → finalize UI.',
  },
  {
    id: 'client-duplicate-detection',
    category: INTEGRATION_CATEGORY.IDENTITY,
    label: 'Client duplicate detection (MPI-style)',
    status: INTEGRATION_STATUS.IMPLEMENTED,
    surfaces: ['patientDuplicateDetection.ts', 'DuplicatePatientBanner'],
    summary: 'Local scoring with health card, name, DOB thresholds.',
  },
  {
    id: 'health-card-search',
    category: INTEGRATION_CATEGORY.IDENTITY,
    label: 'Health card / PHN search',
    status: INTEGRATION_STATUS.IMPLEMENTED,
    surfaces: ['patientSearch.ts', 'Header lookup'],
    summary: 'Operational search includes health card fields.',
  },
  {
    id: 'backend-mpi-session',
    category: INTEGRATION_CATEGORY.IDENTITY,
    label: 'Backend MPI match session',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    capability: 'emergencySmartIntakeIdentitySession',
    surfaces: ['SmartIntake'],
    backend: 'mpi.service.ts',
    summary: 'Capability disabled — frontend falls back to local duplicate rules.',
  },
  {
    id: 'backend-ocr-provider',
    category: INTEGRATION_CATEGORY.IDENTITY,
    label: 'Backend OCR provider',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    capability: 'emergencySmartIntakeIdentitySession',
    surfaces: ['SmartIntake', 'OcrCapturePanel'],
    backend: 'ocr.service.ts',
    summary: 'Placeholder normalize only; no vision provider contract.',
  },
  {
    id: 'sso-identity-providers',
    category: INTEGRATION_CATEGORY.IDENTITY,
    label: 'SSO / SAML / OIDC registry',
    status: INTEGRATION_STATUS.PLACEHOLDER,
    surfaces: ['identity-provider-registry.service.ts'],
    summary: 'Planned providers in registry; Google OAuth config-detect only.',
  },
]);

const STATUS_RANK = Object.freeze({
  placeholder: 0,
  partial: 1,
  implemented: 2,
});

export function normalizeIntegrationStatusLabel(status) {
  return INTEGRATION_STATUS_LABELS[status] || 'Unknown';
}

export function groupIntegrationsByCategory(registry = INTEGRATION_POINT_REGISTRY) {
  return registry.reduce((groups, point) => {
    const list = groups[point.category] || [];
    list.push(point);
    groups[point.category] = list;
    return groups;
  }, /** @type {Record<string, typeof INTEGRATION_POINT_REGISTRY[number][]}> */ ({}));
}

export function summarizeCategoryStatus(points) {
  if (!points?.length) return INTEGRATION_STATUS.PLACEHOLDER;
  const maxRank = Math.max(...points.map((point) => STATUS_RANK[point.status] ?? 0));
  if (maxRank >= STATUS_RANK.implemented) {
    const allImplemented = points.every((point) => point.status === INTEGRATION_STATUS.IMPLEMENTED);
    return allImplemented ? INTEGRATION_STATUS.IMPLEMENTED : INTEGRATION_STATUS.PARTIAL;
  }
  if (maxRank >= STATUS_RANK.partial) return INTEGRATION_STATUS.PARTIAL;
  return INTEGRATION_STATUS.PLACEHOLDER;
}

export function buildIntegrationCategorySummaries(registry = INTEGRATION_POINT_REGISTRY) {
  const grouped = groupIntegrationsByCategory(registry);
  return Object.values(INTEGRATION_CATEGORY).map((category) => {
    const points = grouped[category] || [];
    const status = summarizeCategoryStatus(points);
    const counts = points.reduce(
      (acc, point) => {
        acc[point.status] = (acc[point.status] || 0) + 1;
        return acc;
      },
      /** @type {Record<string, number>} */ ({}),
    );
    return {
      category,
      status,
      label: normalizeIntegrationStatusLabel(status),
      guidance: INTEGRATION_STATUS_GUIDANCE[status],
      pointCount: points.length,
      counts,
      points,
    };
  });
}

export function mergeRegistryWithLiveSources(registry = INTEGRATION_POINT_REGISTRY, liveSources = []) {
  const liveById = new Map(liveSources.map((source) => [String(source.id), source]));
  return registry.map((point) => {
    const live = point.liveSourceId ? liveById.get(point.liveSourceId) : null;
    return {
      ...point,
      liveStatus: live?.status ? String(live.status) : null,
      liveLastEventAt: live?.lastEventAt ? String(live.lastEventAt) : null,
    };
  });
}

export function mapLiveSourceStatusToNormalized(liveStatus) {
  if (!liveStatus) return null;
  const normalized = String(liveStatus).toLowerCase();
  if (
    normalized.includes('live') ||
    normalized.includes('connected') ||
    normalized === 'ready' ||
    normalized === 'active'
  ) {
    return INTEGRATION_STATUS.IMPLEMENTED;
  }
  if (
    normalized.includes('demo') ||
    normalized.includes('partial') ||
    normalized.includes('degraded') ||
    normalized.includes('listener')
  ) {
    return INTEGRATION_STATUS.PARTIAL;
  }
  return INTEGRATION_STATUS.PLACEHOLDER;
}

export function auditIntegrationDiscovery(registry = INTEGRATION_POINT_REGISTRY) {
  const categories = buildIntegrationCategorySummaries(registry);
  const byStatus = registry.reduce(
    (acc, point) => {
      acc[point.status] = (acc[point.status] || 0) + 1;
      return acc;
    },
    /** @type {Record<string, number>} */ ({}),
  );

  return {
    totalPoints: registry.length,
    categoryCount: categories.length,
    byStatus,
    categories: categories.map(({ category, status, pointCount, counts }) => ({
      category,
      status,
      pointCount,
      counts,
    })),
    passesAudit: registry.length >= 20 && categories.length === 5,
  };
}

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BACKEND_ONLY_TYPES,
  FRONTEND_ONLY_TYPES,
  SEGMENT_AREAS,
  SEGMENT_STATUSES,
  getBackendOnlySegments,
  getCanonicalSegmentInventory,
  getFrontendOnlySegments,
  getSegmentInventorySummary,
  getSegmentsByNavEntry,
  resolveSegmentRecord,
} from './segmentInventory';
import { PRIMARY_NAV_BY_ID, getPrimaryNavItemForPath } from '../navigation/primaryNavigation';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const appSource = readFileSync(join(srcRoot, 'App.jsx'), 'utf8');

const requiredFields = [
  'id',
  'label',
  'area',
  'purpose',
  'status',
  'frontendFiles',
  'backendFiles',
  'routes',
  'canonicalRoute',
  'navEntry',
  'inventoryEntry',
  'apiClients',
  'backendEndpoints',
  'launchBehavior',
  'layoutShell',
  'auth',
  'mobile',
  'testCoverage',
  'bridges',
  'recoveryBridge',
];

const requiredBridgeFields = [
  'userReach',
  'assistant',
  'tools',
  'backend',
  'result',
  'safeFailure',
  'testedBy',
  'gaps',
];

const appRouteLiteral = (path) => `path: '${path}'`;
const appRouteDoubleLiteral = (path) => `path: "${path}"`;

function appDeclaresRoute(path) {
  return appSource.includes(appRouteLiteral(path)) || appSource.includes(appRouteDoubleLiteral(path));
}

describe('canonical segment inventory', () => {
  const records = getCanonicalSegmentInventory();
  const validStatuses = new Set(Object.values(SEGMENT_STATUSES));
  const validAreas = new Set(Object.values(SEGMENT_AREAS));
  const validFrontendTypes = new Set(Object.values(FRONTEND_ONLY_TYPES));
  const validBackendTypes = new Set(Object.values(BACKEND_ONLY_TYPES));

  it('has unique ids and normalized required fields', () => {
    expect(records.length).toBeGreaterThanOrEqual(20);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);

    for (const record of records) {
      for (const field of requiredFields) {
        expect(record, `${record.id} missing ${field}`).toHaveProperty(field);
        expect(record[field], `${record.id}.${field} is undefined`).not.toBeUndefined();
      }

      expect(record.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(record.label).toBeTruthy();
      expect(record.purpose).toBeTruthy();
      expect(validStatuses.has(record.status), record.id).toBe(true);
      expect(validAreas.has(record.area), record.id).toBe(true);
      expect(Array.isArray(record.frontendFiles), record.id).toBe(true);
      expect(Array.isArray(record.backendFiles), record.id).toBe(true);
      expect(Array.isArray(record.routes), record.id).toBe(true);
      expect(Array.isArray(record.apiClients), record.id).toBe(true);
      expect(Array.isArray(record.backendEndpoints), record.id).toBe(true);
      expect(Array.isArray(record.testCoverage), record.id).toBe(true);
      expect(record.testCoverage.length, record.id).toBeGreaterThan(0);
      expect(record.recoveryBridge, record.id).toBeTruthy();

      for (const bridgeField of requiredBridgeFields) {
        expect(record.bridges, `${record.id} bridge missing ${bridgeField}`).toHaveProperty(bridgeField);
        expect(record.bridges[bridgeField], `${record.id}.bridges.${bridgeField}`).not.toBeUndefined();
      }
      expect(Array.isArray(record.bridges.gaps), record.id).toBe(true);
    }
  });

  it('classifies frontend-only and backend-only records with allowed recovery types', () => {
    const frontendOnly = getFrontendOnlySegments(records);
    const backendOnly = getBackendOnlySegments(records);

    expect(frontendOnly.length).toBeGreaterThan(0);
    expect(backendOnly.length).toBeGreaterThan(0);

    for (const record of frontendOnly) {
      expect(validFrontendTypes.has(record.frontendOnlyType), record.id).toBe(true);
      expect(record.backendOnlyType, record.id).toBeNull();
      expect(record.bridges.gaps.length, record.id).toBeGreaterThan(0);
    }

    for (const record of backendOnly) {
      expect(validBackendTypes.has(record.backendOnlyType), record.id).toBe(true);
      expect(record.frontendOnlyType, record.id).toBeNull();
      expect(record.backendEndpoints.length, record.id).toBeGreaterThan(0);
      expect(record.bridges.gaps.length, record.id).toBeGreaterThan(0);
    }
  });

  it('anchors primary navigation-backed segments to the visible IA', () => {
    for (const record of records.filter((segment) => segment.navEntry)) {
      expect(PRIMARY_NAV_BY_ID[record.navEntry], record.id).toBeTruthy();
      if (record.canonicalRoute) {
        const nav = getPrimaryNavItemForPath(record.canonicalRoute);
        expect(nav?.id, `${record.id} canonical route ${record.canonicalRoute}`).toBe(record.navEntry);
      }
    }

    expect(getSegmentsByNavEntry('home').map((record) => record.id)).toContain('home');
    expect(getSegmentsByNavEntry('assistant').map((record) => record.id)).toEqual(
      expect.arrayContaining(['assistant', 'chat-assisted-tools', 'dispatch-ai'])
    );
    expect(getSegmentsByNavEntry('operations').map((record) => record.id)).toEqual(
      expect.arrayContaining(['operations', 'fleet-operations', 'clinical-alerts', 'analytics-costs'])
    );
  });

  it('keeps route-backed canonical frontend segments declared in App.jsx', () => {
    for (const record of records.filter((segment) => segment.canonicalRoute)) {
      expect(appDeclaresRoute(record.canonicalRoute), `${record.id} ${record.canonicalRoute}`).toBe(true);
    }
  });

  it('documents bridge gaps for every incomplete or fragmented segment', () => {
    const completeStatuses = new Set([SEGMENT_STATUSES.COMPLETE, SEGMENT_STATUSES.HIDDEN]);
    for (const record of records) {
      if (completeStatuses.has(record.status)) continue;
      expect(record.bridges.gaps.length, `${record.id} should document bridge gaps`).toBeGreaterThan(0);
    }
  });

  it('summarizes the inventory for docs and reports', () => {
    const summary = getSegmentInventorySummary(records);
    expect(summary.total).toBe(records.length);
    expect(summary.navBacked).toBeGreaterThan(0);
    expect(summary.backendLinked).toBeGreaterThan(0);
    expect(summary.withGaps).toBeGreaterThan(0);
    expect(summary.byStatus[SEGMENT_STATUSES.COMPLETE]).toBeGreaterThan(0);
    expect(summary.byStatus[SEGMENT_STATUSES.FRONTEND_ONLY]).toBeGreaterThan(0);
    expect(summary.byStatus[SEGMENT_STATUSES.BACKEND_ONLY]).toBeGreaterThan(0);
    expect(summary.byArea[SEGMENT_AREAS.TOOLS]).toBeGreaterThan(0);
  });

  it('resolves records by canonical id for follow-up implementation work', () => {
    expect(resolveSegmentRecord('assistant', records)?.canonicalRoute).toBe('/assistant');
    expect(resolveSegmentRecord('clinical-alerts', records)?.status).toBe(SEGMENT_STATUSES.PARTIALLY_BUILT);
    expect(resolveSegmentRecord('clinical-alerts', records)?.frontendOnlyType).toBeNull();
    expect(resolveSegmentRecord('backend-ai-rag-metrics', records)?.backendOnlyType).toBe(BACKEND_ONLY_TYPES.INTERNAL);
    expect(resolveSegmentRecord('not-a-real-segment', records)).toBeNull();
  });
});

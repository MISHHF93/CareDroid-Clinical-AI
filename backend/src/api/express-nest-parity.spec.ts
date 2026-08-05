/**
 * Architect Mode — Express registry inventory contract.
 * Ensures every legacy Express route group is catalogued and classifiable
 * for Nest decommission (docs/architecture/architect-mode/express-nest-decommission-plan.md).
 *
 * Cycle 278: `/governance` and `/copilot` completed Phase 4 (Remove) — their
 * Nest parity controllers (`NestAiGovernanceController`, `EdCopilotNestParityController`)
 * were already unconditionally registered and functionally complete; the
 * Express legacy files were only ever reachable when ENABLE_MONGOOSE_EMERGENCY_OS=true,
 * and even then Express silently shadowed the Nest parity controller at the
 * same path because Nest binds controller routes at app.listen() — after
 * registerEmergencyMongooseRuntime() mounts the Express routers in main.ts.
 * Deleting the legacy files removes that shadowing risk entirely rather than
 * just documenting it as residual. RETIRED tracks what was removed so the
 * decommission history stays visible after the entries leave NEST_PREFERRED.
 */
import { getRouteList, ROUTES } from './routes-registry';

/** Nest-preferred ownership (documentation contract — not HTTP probes). */
const NEST_PREFERRED: Record<
  string,
  { nestOwner: string; retirePriority: 'P0' | 'P1' | 'P2' | 'keep' }
> = {
  '/health': { nestOwner: 'app/health', retirePriority: 'keep' },
  '/surge': { nestOwner: 'emergency-os', retirePriority: 'P2' },
  '/intake': { nestOwner: 'emergency-os / smart-intake', retirePriority: 'P1' },
  '/moh': { nestOwner: 'interoperability', retirePriority: 'P2' },
  '/wearable': { nestOwner: 'telemetry', retirePriority: 'P2' },
  '/iot': { nestOwner: 'telemetry / iot', retirePriority: 'P2' },
  '/simulation': { nestOwner: 'simulation', retirePriority: 'P2' },
  '/handover': { nestOwner: 'emergency-os', retirePriority: 'P1' },
  '/federated': { nestOwner: 'future — disable', retirePriority: 'P2' },
  '/digital-twin': { nestOwner: 'digital-twin Nest', retirePriority: 'P2' },
};

/** Route groups whose Express legacy file has been deleted (Phase 4 complete). */
const RETIRED: Record<string, { nestOwner: string; retiredCycle: number }> = {
  '/capacity': { nestOwner: 'emergency-os / CapacityController', retiredCycle: 277 },
  '/governance': {
    nestOwner: 'platform-governance / NestAiGovernanceController',
    retiredCycle: 278,
  },
  '/copilot': { nestOwner: 'ai-gateway / EdCopilotNestParityController', retiredCycle: 278 },
  '/deterioration': {
    nestOwner: 'clinical-intelligence / DeteriorationController',
    retiredCycle: 279,
  },
  '/protocol': { nestOwner: 'clinical / ProtocolController', retiredCycle: 280 },
  '/reassessment': { nestOwner: 'emergency-os / ReassessmentController', retiredCycle: 281 },
  '/ems': { nestOwner: 'emergency-os / EmsController', retiredCycle: 282 },
  '/boarding': { nestOwner: 'emergency-os / BoardingController', retiredCycle: 283 },
};

describe('Express→Nest parity inventory', () => {
  it('lists only known Express route groups', () => {
    const paths = ROUTES.map((r) => r.path).sort();
    expect(paths.length).toBe(9);
    for (const path of paths) {
      expect(NEST_PREFERRED[path]).toBeDefined();
    }
  });

  it('getRouteList exposes fullPath under /api prefix', () => {
    const list = getRouteList({ apiPrefix: '/api' });
    expect(list.every((item) => item.fullPath.startsWith('/api/'))).toBe(true);
    expect(list.some((item) => item.path === '/intake')).toBe(true);
  });

  it('retired route groups are fully removed from the live Express registry', () => {
    const paths = ROUTES.map((r) => r.path);
    for (const retiredPath of Object.keys(RETIRED)) {
      expect(paths).not.toContain(retiredPath);
      expect(NEST_PREFERRED[retiredPath]).toBeUndefined();
    }
  });

  it('documents Nest owners for retired P0 paths (parity controllers exist)', () => {
    // Nest: @Controller('governance') NestAiGovernanceController
    // Nest: @Controller('copilot') EdCopilotNestParityController
    // Nest: @Controller('emergency') .../copilot/query (primary)
    expect(RETIRED['/governance'].nestOwner).toMatch(/platform-governance|governance/i);
    expect(RETIRED['/copilot'].nestOwner).toMatch(/ai-gateway|chat|copilot/i);
  });

  it('every enabled route has a description for discovery', () => {
    for (const route of ROUTES) {
      if (!route.enabled) continue;
      expect(route.description.trim().length).toBeGreaterThan(3);
      expect(route.version).toBe('v1');
    }
  });
});

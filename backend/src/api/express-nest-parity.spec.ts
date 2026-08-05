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
 *
 * Cycle 286: the last 6 entries (moh/wearable/iot/simulation/handover/
 * digital-twin) were pure `createPlaceholderRoute()` stubs with zero real
 * functionality and zero live callers — deleted outright rather than
 * migrated to a Nest controller, since there was nothing to port. `/health`
 * left this registry too, but isn't a retirement in the same sense: it was
 * always a redundant second/third/fourth mount of the exact same
 * `healthRoutes` router main.ts already mounts directly at `/health` and
 * `/api/health`, independent of this file. With those gone, `ROUTES` was
 * genuinely empty — of the 17 original entries (16 real-or-placeholder
 * groups plus health), all 16 were retired and health was never unique to
 * this registry to begin with.
 *
 * Cycle 287: `backend/src/api/routes-registry.ts` itself (the `ROUTES`
 * array, `registerAllRoutes()`, `getRouteList()`, and the `/api/routes`
 * discovery endpoint it mounted) was deleted outright — an empty registry
 * with no route to ever populate it again was pure dead weight, not a
 * documented extension point. This file now survives on its own as a
 * standalone historical record of the migration: which Nest controller
 * replaced each legacy Express group, in which cycle, migrated vs. deleted.
 */

/** Every group this registry originally listed, and how it was retired. */
const RETIRED: Record<
  string,
  { nestOwner: string; retiredCycle: number; method: 'migrated' | 'deleted-placeholder' }
> = {
  '/capacity': {
    nestOwner: 'emergency-os / CapacityController',
    retiredCycle: 277,
    method: 'migrated',
  },
  '/governance': {
    nestOwner: 'platform-governance / NestAiGovernanceController',
    retiredCycle: 278,
    method: 'migrated',
  },
  '/copilot': {
    nestOwner: 'ai-gateway / EdCopilotNestParityController',
    retiredCycle: 278,
    method: 'migrated',
  },
  '/deterioration': {
    nestOwner: 'clinical-intelligence / DeteriorationController',
    retiredCycle: 279,
    method: 'migrated',
  },
  '/protocol': {
    nestOwner: 'clinical / ProtocolController',
    retiredCycle: 280,
    method: 'migrated',
  },
  '/reassessment': {
    nestOwner: 'emergency-os / ReassessmentController',
    retiredCycle: 281,
    method: 'migrated',
  },
  '/ems': { nestOwner: 'emergency-os / EmsController', retiredCycle: 282, method: 'migrated' },
  '/boarding': {
    nestOwner: 'emergency-os / BoardingController',
    retiredCycle: 283,
    method: 'migrated',
  },
  '/intake': {
    nestOwner: 'emergency-os / SmartIntakeController',
    retiredCycle: 284,
    method: 'migrated',
  },
  '/federated': {
    nestOwner: 'emergency-os / FederatedEMSController',
    retiredCycle: 285,
    method: 'migrated',
  },
  '/moh': {
    nestOwner: 'none — placeholder stub deleted',
    retiredCycle: 286,
    method: 'deleted-placeholder',
  },
  '/wearable': {
    nestOwner: 'none — placeholder stub deleted',
    retiredCycle: 286,
    method: 'deleted-placeholder',
  },
  '/iot': {
    nestOwner: 'none — placeholder stub deleted',
    retiredCycle: 286,
    method: 'deleted-placeholder',
  },
  '/simulation': {
    nestOwner: 'none — placeholder stub deleted',
    retiredCycle: 286,
    method: 'deleted-placeholder',
  },
  '/handover': {
    nestOwner:
      'none — placeholder stub deleted (ERPulseHandoverController covers the real /er-pulse endpoint separately)',
    retiredCycle: 286,
    method: 'deleted-placeholder',
  },
  '/digital-twin': {
    nestOwner:
      'none — placeholder stub deleted (OrganizationalDigitalTwinController covers real functionality separately)',
    retiredCycle: 286,
    method: 'deleted-placeholder',
  },
};

describe('Express→Nest parity inventory', () => {
  it('RETIRED documents all 16 originally-listed non-health groups', () => {
    expect(Object.keys(RETIRED).sort()).toEqual(
      [
        '/capacity',
        '/copilot',
        '/governance',
        '/deterioration',
        '/protocol',
        '/reassessment',
        '/ems',
        '/boarding',
        '/intake',
        '/federated',
        '/moh',
        '/wearable',
        '/iot',
        '/simulation',
        '/handover',
        '/digital-twin',
      ].sort(),
    );
  });

  it('10 groups were migrated to real Nest controllers, 6 placeholder stubs were deleted outright', () => {
    const migrated = Object.values(RETIRED).filter((entry) => entry.method === 'migrated');
    const deleted = Object.values(RETIRED).filter(
      (entry) => entry.method === 'deleted-placeholder',
    );
    expect(migrated).toHaveLength(10);
    expect(deleted).toHaveLength(6);
  });

  it('documents Nest owners for the two P0 priority groups (parity controllers exist)', () => {
    // Nest: @Controller('governance') NestAiGovernanceController
    // Nest: @Controller('copilot') EdCopilotNestParityController
    expect(RETIRED['/governance'].nestOwner).toMatch(/platform-governance|governance/i);
    expect(RETIRED['/copilot'].nestOwner).toMatch(/ai-gateway|chat|copilot/i);
  });
});

/**
 * Architect Mode — Express registry inventory contract.
 * Ensures every legacy Express route group is catalogued and classifiable
 * for Nest decommission (docs/architecture/architect-mode/express-nest-decommission-plan.md).
 */
import { getRouteList, ROUTES } from './routes-registry';

/** Nest-preferred ownership (documentation contract — not HTTP probes). */
const NEST_PREFERRED: Record<
  string,
  { nestOwner: string; retirePriority: 'P0' | 'P1' | 'P2' | 'keep' }
> = {
  '/health': { nestOwner: 'app/health', retirePriority: 'keep' },
  '/capacity': { nestOwner: 'emergency-os', retirePriority: 'P1' },
  '/ems': { nestOwner: 'emergency-os / sentinel', retirePriority: 'P1' },
  '/surge': { nestOwner: 'emergency-os', retirePriority: 'P2' },
  '/boarding': { nestOwner: 'emergency-os', retirePriority: 'P1' },
  '/protocol': { nestOwner: 'clinical / tool-calling', retirePriority: 'P2' },
  '/deterioration': { nestOwner: 'clinical-intelligence', retirePriority: 'P2' },
  '/copilot': { nestOwner: 'ai-gateway / chat', retirePriority: 'P0' },
  '/intake': { nestOwner: 'emergency-os / smart-intake', retirePriority: 'P1' },
  '/moh': { nestOwner: 'interoperability', retirePriority: 'P2' },
  '/wearable': { nestOwner: 'telemetry', retirePriority: 'P2' },
  '/iot': { nestOwner: 'telemetry / iot', retirePriority: 'P2' },
  '/simulation': { nestOwner: 'simulation', retirePriority: 'P2' },
  '/governance': { nestOwner: 'platform-governance', retirePriority: 'P0' },
  '/handover': { nestOwner: 'emergency-os', retirePriority: 'P1' },
  '/federated': { nestOwner: 'future — disable', retirePriority: 'P2' },
  '/digital-twin': { nestOwner: 'digital-twin Nest', retirePriority: 'P2' },
  '/reassessment': { nestOwner: 'emergency-os', retirePriority: 'P1' },
};

describe('Express→Nest parity inventory', () => {
  it('lists only known Express route groups', () => {
    const paths = ROUTES.map((r) => r.path).sort();
    expect(paths.length).toBeGreaterThanOrEqual(15);
    for (const path of paths) {
      expect(NEST_PREFERRED[path]).toBeDefined();
    }
  });

  it('getRouteList exposes fullPath under /api prefix', () => {
    const list = getRouteList({ apiPrefix: '/api' });
    expect(list.every((item) => item.fullPath.startsWith('/api/'))).toBe(true);
    expect(list.some((item) => item.path === '/ems')).toBe(true);
    expect(list.some((item) => item.path === '/governance')).toBe(true);
  });

  it('marks governance and copilot as P0 retirement priorities', () => {
    expect(NEST_PREFERRED['/governance'].retirePriority).toBe('P0');
    expect(NEST_PREFERRED['/copilot'].retirePriority).toBe('P0');
  });

  it('documents Nest owners for P0 paths (parity controllers exist)', () => {
    // Nest: @Controller('governance') NestAiGovernanceController
    // Nest: @Controller('copilot') EdCopilotNestParityController
    // Nest: @Controller('emergency') .../copilot/query (primary)
    expect(NEST_PREFERRED['/governance'].nestOwner).toMatch(/platform-governance|governance/i);
    expect(NEST_PREFERRED['/copilot'].nestOwner).toMatch(/ai-gateway|chat|copilot/i);
  });

  it('every enabled route has a description for discovery', () => {
    for (const route of ROUTES) {
      if (!route.enabled) continue;
      expect(route.description.trim().length).toBeGreaterThan(3);
      expect(route.version).toBe('v1');
    }
  });
});

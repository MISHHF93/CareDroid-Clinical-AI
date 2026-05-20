import { describe, expect, it } from 'vitest';
import {
  getCalculatorToolInventory,
  getUserFacingToolInventory,
  TOOL_SURFACES,
} from '../data/toolInventory';
import {
  CALCULATOR_ROUTE_DEFS,
  isKnownToolAreaPath,
  matchCalculatorRoute,
  normalizeToolPathname,
} from './clinicalToolRoutes';

describe('clinical tool routes — unified inventory', () => {
  it('registers every user-facing route as a known tool or calculator path', () => {
    for (const record of getUserFacingToolInventory()) {
      if (!record.route) continue;
      const normalized = normalizeToolPathname(record.route);
      expect(
        normalized === '/dashboard' || isKnownToolAreaPath(normalized) || Boolean(matchCalculatorRoute(normalized)),
        record.id
      ).toBe(true);
    }
  });

  it('registers every dedicated calculator route in CALCULATOR_ROUTE_DEFS', () => {
    const calculatorDefsBySlug = new Map(
      CALCULATOR_ROUTE_DEFS.map((def) => [def.calculatorSlug, def])
    );

    for (const record of getCalculatorToolInventory().filter((tool) => tool.hasDedicatedForm)) {
      const def = calculatorDefsBySlug.get(record.calculatorSlug);
      expect(def, record.id).toBeTruthy();
      expect(def.path, record.id).toBe(record.route);
      expect(matchCalculatorRoute(record.route)?.calculatorSlug, record.id).toBe(record.calculatorSlug);
    }
  });

  it('keeps calculator inventory scoped to calculators and chat-assisted calculator support', () => {
    for (const record of getCalculatorToolInventory()) {
      expect(record.surface, record.id).not.toBe(TOOL_SURFACES.FLEET_PAGE);
      expect(record.surface, record.id).not.toBe(TOOL_SURFACES.HUB);
      expect(record.presentationCategory, record.id).toBe('Calculator');
    }
    expect(getCalculatorToolInventory().map((record) => record.id)).not.toContain('dispatch-ai');
  });
});

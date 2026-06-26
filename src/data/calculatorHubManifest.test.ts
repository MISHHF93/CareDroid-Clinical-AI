/**
 * Calculator hub manifest — parity with catalog, routes, and chat-assisted visibility.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { builtinUiCalculators } from './clinicalIntentToolCatalog';
import { NLU_HUB_ONLY_PROFILE_TOOL_IDS } from './clinicalToolIdContract';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import {
  BUILTIN_CALCULATOR_SWITCH_SLUGS,
  BUILTIN_CALCULATOR_FORM_SMOKE_ROWS,
  HUB_CHAT_ASSISTED_TOOL_IDS,
  buildBuiltinHubCalculatorCards,
  getHubChatAssistedTools,
  isBuiltinCalculatorSlug,
} from './calculatorHubManifest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');

describe('calculatorHubManifest', () => {
  it('lists every builtinUiCalculators slug for forms', () => {
    expect(BUILTIN_CALCULATOR_SWITCH_SLUGS).toHaveLength(builtinUiCalculators.length);
    for (const calc of builtinUiCalculators) {
      expect(BUILTIN_CALCULATOR_SWITCH_SLUGS).toContain(calc.id);
      expect(isBuiltinCalculatorSlug(calc.id)).toBe(true);
    }
  });

  it('builds hub cards with title, description, category, and route', () => {
    const cards = buildBuiltinHubCalculatorCards();
    expect(cards).toHaveLength(builtinUiCalculators.length);
    for (const card of cards) {
      expect(card.name).toBeTruthy();
      expect(card.description).toBeTruthy();
      expect(card.category).toBeTruthy();
      expect(card.route).toBeTruthy();
    }
  });

  it('includes NLU hub-only chat tools in hub chat-assisted set', () => {
    for (const toolId of NLU_HUB_ONLY_PROFILE_TOOL_IDS) {
      expect(HUB_CHAT_ASSISTED_TOOL_IDS).toContain(toolId);
    }
    const hubTools = getHubChatAssistedTools();
    for (const toolId of NLU_HUB_ONLY_PROFILE_TOOL_IDS) {
      expect(hubTools.some((t) => t.toolId === toolId)).toBe(true);
    }
  });

  it('includes every CHAT_ASSISTED_HUB_GROUPS tool id', () => {
    const groupIds = CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds);
    for (const toolId of groupIds) {
      expect(HUB_CHAT_ASSISTED_TOOL_IDS).toContain(toolId);
    }
  });

  it.each(BUILTIN_CALCULATOR_FORM_SMOKE_ROWS)('$slug has a registered route', ({ slug, route }) => {
    expect(route).toBeTruthy();
    expect(CALCULATOR_ROUTE_DEFS.some((d) => d.calculatorSlug === slug && d.path === route)).toBe(
      true
    );
  });

  it.each(BUILTIN_CALCULATOR_SWITCH_SLUGS)('Calculators.jsx switch implements %s', (slug) => {
    expect(calculatorsSource).toContain(`case '${slug}':`);
  });
});

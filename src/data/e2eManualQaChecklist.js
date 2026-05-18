/**
 * Manual QA checklist for wired clinical + fleet tools (production validation).
 * Pair with automated matrix: `getE2eValidationMatrixDocument()`.
 */

export const E2E_MANUAL_QA_SECTIONS = Object.freeze([
  {
    id: 'auth-shell',
    title: 'Authentication & shell',
    items: [
      {
        id: 'login-dashboard',
        steps: 'Sign in → land on dashboard → open sidebar tools menu.',
        expected: 'Authenticated shell loads; no console errors on navigation.',
      },
      {
        id: 'tools-overview',
        steps: 'Navigate to /tools and /tools/catalog.',
        expected: 'Overview and catalog render; search/filter work; cards open correct routes or chat.',
      },
    ],
  },
  {
    id: 'tier-a-calculators',
    title: 'Tier A calculators (dedicated forms)',
    items: [
      {
        id: 'tier-a-disclaimer',
        steps: 'Open PHQ-9, HAS-BLED, SOFA, ASCVD routes; scroll lead + result areas.',
        expected: 'Decision-support disclaimer visible; no treatment orders on results.',
      },
      {
        id: 'phq9-q9',
        steps: 'PHQ-9: set question 9 > 0 before completing remaining items.',
        expected: 'Crisis/safety messaging surfaces; screening-only framing.',
      },
      {
        id: 'calc-reset',
        steps: 'Run calculation → Reset on 3 Tier A tools.',
        expected: 'Inputs clear; results hidden; no stale state.',
      },
    ],
  },
  {
    id: 'tier-b-chat',
    title: 'Tier B chat-assisted (hub launch)',
    items: [
      {
        id: 'hub-launch',
        steps: 'From catalog, launch Wells PE, PERC, NIHSS, dispatch-ai.',
        expected: 'Hub or fleet path opens; chat seed pre-filled; orchestrator tool null except Tier C.',
      },
      {
        id: 'pe-acs-language',
        steps: 'Complete Wells PE / GRACE chat flows with sample data.',
        expected: 'No “PE ruled out” or definitive ACS diagnosis language.',
      },
    ],
  },
  {
    id: 'tier-c-executors',
    title: 'Tier C backend executors',
    items: [
      {
        id: 'drug-checker',
        steps: 'Drug checker: enter ≥2 medications → run check.',
        expected: 'Results return; disclaimer on interactions; no dose prescriptions.',
      },
      {
        id: 'lab-interpreter',
        steps: 'Lab interpreter: enter sample panel → interpret.',
        expected: 'Interpretation returns; educational disclaimer footer.',
      },
      {
        id: 'sofa-executor',
        steps: 'SOFA dedicated page or orchestrator path with sample vitals.',
        expected: 'Deterministic score; decision-support disclaimer on layout.',
      },
    ],
  },
  {
    id: 'clinical-pages',
    title: 'Clinical AI pages',
    items: [
      {
        id: 'diagnosis-procedures',
        steps: 'Open /tools/diagnosis and /tools/procedures; submit sample prompt.',
        expected: 'AI documentation disclaimer; output labeled for clinician review.',
      },
      {
        id: 'protocols',
        steps: 'Open /tools/protocols; request ACLS summary.',
        expected: 'Guideline-style support; no autonomous orders.',
      },
    ],
  },
  {
    id: 'fleet',
    title: 'Fleet / dispatch',
    items: [
      {
        id: 'fleet-disclaimer',
        steps: 'Open Fleet Command, Route Optimizer, Predictive Maintenance.',
        expected: 'Operational decision-support disclaimer; no auto-dispatch controls.',
      },
      {
        id: 'dispatch-chat',
        steps: 'Launch dispatch-ai from catalog → review chat seed.',
        expected: 'Human approval required; no automated assignment language.',
      },
    ],
  },
  {
    id: 'nlu-aliases',
    title: 'NLU & alias resolution (chat)',
    items: [
      {
        id: 'alias-phrases',
        steps: 'In chat, mention "PHQ9", "bleeding risk", "sofa calculator", "drug interactions".',
        expected: 'Correct tool suggestion or route; no phantom tool launches.',
      },
    ],
  },
]);

/** Flat checklist for spreadsheets / test management tools. */
export function flattenManualQaChecklist() {
  return E2E_MANUAL_QA_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: section.id,
      sectionTitle: section.title,
      ...item,
    }))
  );
}

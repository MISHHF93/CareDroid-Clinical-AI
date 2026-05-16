/**
 * Tier-B chat-assisted configuration for PERC (no dedicated Calculators.jsx form).
 */

export const PERC_TOOL_ID = 'perc';

export const percChatConfig = {
  toolId: PERC_TOOL_ID,
  name: 'PERC',
  hubPath: '/tools/calculators',
  registryId: 'perc',
  category: 'calculator',
  description:
    'PERC checklist for low pre-test probability only — does not definitively exclude pulmonary embolism.',
  chatSeed: `Help me apply the PERC rule (Pulmonary Embolism Rule-out Criteria) using a guided conversational checklist.

First confirm that pre-test probability of pulmonary embolism is LOW (about 15% or less) — if it is not low, stop and explain that PERC must not be used.

If pre-test probability is low, ask me about each criterion in turn:
1) Age under 50 years
2) Heart rate under 100/min
3) SpO₂ at least 95% on room air
4) No unilateral leg swelling
5) No hemoptysis
6) No surgery or trauma requiring hospitalisation in the past 4 weeks
7) No prior DVT or PE
8) No estrogen use (e.g. OCP, HRT)

Report whether PERC is satisfied (all eight met) or not satisfied, list any unmet items, and emphasise in plain language:
- PERC applies only when pre-test probability is already low (~15% or less); if not low, stop and do not apply PERC
- PERC does NOT definitively rule out pulmonary embolism — never say PE is "ruled out", "excluded", or "confirmed absent"
- A satisfied PERC may support deferring further testing per some pathways — it is not proof that PE is absent
- If any criterion is unmet or clinical concern remains, continue assessment per local PE / chest pain protocol
- Do not recommend stopping workup, withholding imaging, or discharging based on PERC alone`,
  guidedCriteria: [
    'age < 50',
    'pulse < 100',
    'SpO2 >= 95% room air',
    'no unilateral leg swelling',
    'no hemoptysis',
    'no surgery/trauma (4 weeks)',
    'no prior DVT/PE',
    'no estrogen use',
  ],
};

/**
 * Tier-B chat-assisted configuration for Ottawa Ankle / Foot Rules.
 */

export const OTTAWA_ANKLE_TOOL_ID = 'ottawa-ankle';

export const ottawaAnkleChatConfig = {
  toolId: OTTAWA_ANKLE_TOOL_ID,
  name: 'Ottawa Ankle Rule',
  hubPath: '/tools/calculators',
  registryId: OTTAWA_ANKLE_TOOL_ID,
  category: 'calculator',
  description:
    'Ottawa ankle and foot rules for radiography after acute ankle/foot injury (chat-assisted; not a fracture clearance tool).',
  chatSeed: `Help me apply the Ottawa Ankle Rule and Ottawa foot rules using a structured workflow for an acute ankle or foot injury.

STEP 0 — Applicability and immediate safety (confirm first)
- Context is an acute ankle and/or foot injury (typically within days of injury; not chronic pain alone)
- STOP and state the rules must not replace urgent evaluation if any are present: suspected neurovascular compromise, open fracture, gross deformity, dislocation, compartment syndrome concern, or severe/multisystem trauma — proceed with full examination and imaging per local protocol
- Adults are the primary validated population; pediatric patients may need different pathways — note if age <18
- This tool is informational decision support unless your institution has governed executable trauma workflow

STEP 1 — Weight bearing (applies to both ankle and foot rules)
Ask: Was the patient unable to bear weight for four steps immediately after the injury AND unable to bear weight for four steps in the emergency department / at evaluation?
(If yes to inability at BOTH time points, this criterion is positive for the rules.)

STEP 2 — Malleolar zone (Ottawa Ankle Rule — ankle radiograph)
Ask:
1) Is there pain in the malleolar zone (lateral or medial malleolus region)?
2) If yes — bone tenderness at the posterior edge or tip of the lateral malleolus?
3) If yes — bone tenderness at the posterior edge or tip of the medial malleolus?

Ankle radiograph is indicated by the rule if there is malleolar zone pain AND any of: lateral malleolus tenderness, medial malleolus tenderness, or the weight-bearing criterion above is positive.

STEP 3 — Midfoot zone (Ottawa foot rules — foot radiograph)
Ask:
1) Is there pain in the midfoot zone?
2) If yes — bone tenderness at the navicular?
3) If yes — bone tenderness at the base of the fifth metatarsal?

Foot radiograph is indicated by the rule if there is midfoot zone pain AND any of: navicular tenderness, fifth metatarsal base tenderness, or the weight-bearing criterion above is positive.

After collecting answers, report separately:
- Ankle radiograph: indicated / not indicated by Ottawa Ankle Rule
- Foot radiograph: indicated / not indicated by Ottawa foot rules
- List which criteria were positive
- Applicability warnings if any

State clearly:
- Use only for acute ankle/foot injury; do not override clinician judgment or institutional protocols
- A negative rule result does not prove absence of fracture (high NPV in validation, not 100%)
- Do not recommend withholding care, discharge, splinting, orthopaedic referral, or specific imaging modalities beyond what the rule states
- Do not delay urgent evaluation, neurovascular reassessment, or hard-stop trauma care to finish this chat
- Proximal fibula (Maisonneuve), high ankle sprain, and other injuries are not fully addressed by these rules alone`,
  guidedSteps: ['applicability', 'weight bearing', 'malleolar zone', 'midfoot zone'],
};

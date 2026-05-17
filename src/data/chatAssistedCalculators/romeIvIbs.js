/**
 * Tier-B chat-assisted configuration for Rome IV IBS criteria (no dedicated Calculators.jsx form).
 * Informational criteria support only — does not diagnose irritable bowel syndrome.
 */

export const ROME_IV_IBS_TOOL_ID = 'rome-iv-ibs';

export const romeIvIbsChatConfig = {
  toolId: ROME_IV_IBS_TOOL_ID,
  name: 'Rome IV IBS',
  hubPath: '/tools/calculators',
  registryId: ROME_IV_IBS_TOOL_ID,
  category: 'calculator',
  description:
    'Rome IV irritable bowel syndrome criteria support from abdominal pain pattern and stool changes (informational only; does not diagnose IBS).',
  chatSeed: `Help me review Rome IV irritable bowel syndrome (IBS) symptom criteria using a guided step-by-step approach. This is informational criteria support only.

STEP 0 — Red flags (address before criteria review)
STOP and prioritise urgent evaluation if any are present: unintentional weight loss, rectal bleeding or melena, iron-deficiency anemia, nocturnal symptoms waking the patient from sleep, fever, family history of colorectal cancer or inflammatory bowel disease with concerning features, new symptoms after age 50, or progressive worsening. State clearly that alarm features require clinician evaluation and appropriate workup per local pathways — this chat does not replace that assessment.

Collect the following in turn (confirm the reference period is the last 3 months unless specified otherwise):

1) Recurrent abdominal pain frequency:
   - On average, at least 1 day per week with abdominal pain in the last 3 months? (yes/no; clarify if borderline)

2) Symptom duration / onset:
   - Have these symptoms been present for at least 6 months before today? (Rome IV requires symptom onset criteria for formal application)

3) Relation to defecation:
   - Is abdominal pain related to defecation (improves or worsens with bowel movements)? (yes/no/unclear)

4) Stool frequency change:
   - Associated with a change in frequency of stool compared with the patient's usual pattern? (yes/no/unclear)

5) Stool form change:
   - Associated with a change in form (appearance) of stool compared with the patient's usual pattern? (yes/no/unclear; Bristol stool scale may help if known)

After inputs are collected, provide a Rome IV criteria support assessment:
- Summarize whether the reported pattern appears to meet, partially meet, or not meet Rome IV IBS symptom criteria (abdominal pain ≥1 day/week in last 3 months PLUS ≥2 of: related to defecation, change in stool frequency, change in stool form, with appropriate symptom duration)
- Note any missing or uncertain elements that limit certainty
- Do NOT subtype as IBS-D, IBS-C, or IBS-M unless the user provides subtype data for discussion only — subtype requires clinician judgment

State clearly in plain language:
- This is Rome IV criteria support for discussion only, NOT a diagnosis of irritable bowel syndrome or any other disorder
- Meeting symptom criteria on history alone does not establish IBS — clinicians exclude organic disease and apply full Rome IV framework including duration and context
- Do NOT state that the patient has IBS, that IBS is confirmed, or that IBS is ruled in
- Do NOT recommend specific diets, medications, probiotics, antispasmodics, or referral plans — refer to clinician judgment and local gastroenterology pathways
- All outputs require review by a qualified clinician before clinical decisions
- If inputs are uncertain, state limitations and avoid overstating precision

Use institutional gastroenterology protocols for diagnosis and management. Do not delay evaluation of alarm features to finish this chat.`,
  guidedCriteria: [
    'abdominal pain frequency (≥1 day/week)',
    'symptom duration (≥6 months)',
    'relation to defecation',
    'stool frequency change',
    'stool form change',
  ],
};

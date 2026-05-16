/**
 * PR3 clinical safety, hub UX, and accessibility contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  CHAT_ASSISTED_HUB_GROUPS,
  chatAssistedLaunchAriaLabel,
} from './chatAssistedHubGroups';
import { PR3_TIER_B_CHAT_CALCULATOR_IDS } from './clinicalCatalogWiring';
import { graceAcsChatConfig } from './chatAssistedCalculators/graceAcs';
import { nihssChatConfig } from './chatAssistedCalculators/nihss';
import { canadianCSpineChatConfig } from './chatAssistedCalculators/canadianCSpine';
import { ottawaAnkleChatConfig } from './chatAssistedCalculators/ottawaAnkle';

const ABSOLUTE_DIAGNOSIS_PATTERN =
  /\b(definitively ruled out|rules out fracture completely|cleared the cervical spine|confirms acute coronary syndrome|diagnosis established)\b/i;

const TREATMENT_PATTERN =
  /\b(give aspirin|start heparin|iv tpa dose|mg\/kg|recommend pci now|prescribe)\b/i;

const PR3_CONFIGS = [
  graceAcsChatConfig,
  nihssChatConfig,
  canadianCSpineChatConfig,
  ottawaAnkleChatConfig,
];

describe('PR3 hub groups — catalog clarity', () => {
  it('groups every PR3 Tier-B tool under a clinical heading', () => {
    const grouped = new Set(CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds));
    for (const id of PR3_TIER_B_CHAT_CALCULATOR_IDS) {
      expect(grouped.has(id)).toBe(true);
    }
  });

  it('group leads warn against delaying emergency pathways', () => {
    const cardiac = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'cardiac');
    const neuro = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'neurology');
    const trauma = CHAT_ASSISTED_HUB_GROUPS.find((g) => g.groupId === 'trauma');
    expect(cardiac.lead).toMatch(/do not delay/i);
    expect(neuro.lead).toMatch(/do not defer urgent care/i);
    expect(trauma.lead).toMatch(/without delay/i);
  });
});

describe('PR3 accessibility — launch labels', () => {
  it('chat-assisted launch aria labels name the tool and decision-support scope', () => {
    const label = chatAssistedLaunchAriaLabel('NIHSS');
    expect(label).toMatch(/Start guided chat: NIHSS/i);
    expect(label).toMatch(/decision support only/i);
    expect(label).toMatch(/does not diagnose/i);
  });
});

describe('PR3 clinical safety — chat seeds and descriptions', () => {
  it.each(PR3_CONFIGS)('$toolId description states decision support scope', (config) => {
    expect(config.description).toMatch(/chat-assisted|decision support|does not replace|not a diagnosis|not clearance|not fracture clearance/i);
  });

  it.each(PR3_CONFIGS)('$toolId chat seed avoids absolute diagnosis and treatment dosing', (config) => {
    expect(config.chatSeed).not.toMatch(ABSOLUTE_DIAGNOSIS_PATTERN);
    expect(config.chatSeed).not.toMatch(TREATMENT_PATTERN);
  });

  it('stroke and trauma seeds include STEP 0 emergency gates', () => {
    expect(nihssChatConfig.chatSeed).toMatch(/STEP 0 — Time-critical stroke presentation/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/STEP 0 — Applicability and emergencies/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/STEP 0 — Applicability and immediate safety/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/STEP 0 — Unstable ACS and emergencies/i);
  });
});

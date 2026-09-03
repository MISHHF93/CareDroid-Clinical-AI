/**
 * PR2 clinical safety wording — utils and chat-assisted configs must avoid diagnostic certainty.
 */

import { describe, it, expect } from 'vitest';
import { interpretMeldScores } from '../utils/meldCalculator';
import { interpretTimiUaNstemi } from '../utils/timiUaNstemiCalculator';
import { interpretWellsPe } from '../utils/wellsPeCalculator';
import { interpretPerc, evaluatePerc } from '../utils/percCalculator';
import { wellsPeChatConfig } from './chatAssistedCalculators/wellsPe';
import { percChatConfig } from './chatAssistedCalculators/perc';
import { graceAcsChatConfig } from './chatAssistedCalculators/graceAcs';
import { canadianCSpineChatConfig } from './chatAssistedCalculators/canadianCSpine';
import { ottawaAnkleChatConfig } from './chatAssistedCalculators/ottawaAnkle';
import { nihssChatConfig } from './chatAssistedCalculators/nihss';
import { interpretGraceAcsRisk, computeGraceAcsRisk } from '../utils/graceAcsCalculator';
import { interpretNihssSeverity } from '../utils/nihssCalculator';
import {
  applyCanadianCSpineRule,
  evaluateCcrHighRisk,
  evaluateCcrLowRisk,
  interpretCanadianCSpine,
} from '../utils/canadianCSpineCalculator';
import {
  applyOttawaAnkleFootRules,
  interpretOttawaAnkleFootRules,
  ottawaApplicabilityWarnings,
} from '../utils/ottawaAnkleCalculator';

const CERTAINTY_PATTERN =
  /\b(confirmed|definitely|diagnosis established|rule out pe|ruled out|excluded pe|pe is absent)\b/i;

describe('PR2 UX & clinical safety — interpretation copy', () => {
  it('MELD interpretation avoids transplant listing language', () => {
    // interpretMeldScores' second param is inferred as `null | undefined` from its
    // `= null` default; cast the deliberately non-null test value to match.
    const i = interpretMeldScores(35, 36 as any);
    if (!i) throw new Error('expected interpretMeldScores to return a result');
    expect(i.interpretation).not.toMatch(/list for transplant|recommend transplant/i);
    expect(i.transplantDisclaimer).toMatch(/does not recommend transplant/i);
  });

  it('TIMI interpretation does not confirm ACS or prescribe therapy', () => {
    const i = interpretTimiUaNstemi(5);
    if (!i) throw new Error('expected interpretTimiUaNstemi to return a result');
    expect(i.acsDisclaimer).toMatch(/does not confirm ACS/i);
    expect(i.acsDisclaimer).toMatch(/not for STEMI/i);
    expect(i.interpretation).not.toMatch(/start heparin|give aspirin|pci now/i);
  });

  it('Wells PE interpretation avoids ruling in or out PE', () => {
    const i = interpretWellsPe(7);
    if (!i) throw new Error('expected interpretWellsPe to return a result');
    expect(i.diagnosticDisclaimer).toMatch(/does not rule in or rule out/i);
    expect(i.interpretation).not.toMatch(CERTAINTY_PATTERN);
  });

  it('PERC interpretation requires low pre-test probability and avoids definitive exclusion', () => {
    const evalResult = evaluatePerc({
      ageUnder50: true,
      heartRateUnder100: true,
      spo2AtLeast95: true,
      noUnilateralLegSwelling: true,
      noHemoptysis: true,
      noRecentSurgeryOrTrauma: true,
      noPriorDvtOrPe: true,
      noEstrogenUse: true,
    });
    const i = interpretPerc(evalResult, { lowPretestProbabilityAcknowledged: true });
    if (!i) throw new Error('expected interpretPerc to return a result');
    expect(i.safetyDisclaimer).toMatch(/does not rule out PE/i);
    expect(i.interpretation).toMatch(/not definitive exclusion/i);
    expect(i.interpretation).not.toMatch(/\bpe is ruled out\b|\bdefinitively ruled out\b/i);
  });
});

describe('PR2 UX & clinical safety — chat-assisted seeds', () => {
  it('Wells PE chat seed forbids diagnostic certainty phrasing', () => {
    expect(wellsPeChatConfig.chatSeed).toMatch(/STEP 0/i);
    expect(wellsPeChatConfig.chatSeed).toMatch(/does not rule in or rule out/i);
    expect(wellsPeChatConfig.chatSeed).toMatch(/not a diagnosis/i);
    expect(wellsPeChatConfig.description).toMatch(/pre-test probability/i);
  });

  it('PERC chat seed emphasises low pre-test probability and non-definitive rule-out', () => {
    expect(percChatConfig.chatSeed).toMatch(/pre-test probability is already low/i);
    expect(percChatConfig.chatSeed).toMatch(/does NOT definitively rule out/i);
    expect(percChatConfig.chatSeed).not.toMatch(/pe is ruled out/i);
  });

  it('GRACE ACS chat seed emphasises risk stratification without treatment or diagnostic certainty', () => {
    expect(graceAcsChatConfig.chatSeed).toMatch(/STEP 0/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/must not delay activation of emergency care/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/risk stratification support only/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/does not confirm or exclude ACS/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/Do not recommend specific treatments/i);
    expect(graceAcsChatConfig.chatSeed).toMatch(/Do not delay emergency ACS care/i);
    expect(graceAcsChatConfig.description).toMatch(/not a diagnosis/i);
  });

  it('NIHSS chat seed emphasises urgent stroke pathways and no treatment directives', () => {
    expect(nihssChatConfig.chatSeed).toMatch(/STEP 0/i);
    expect(nihssChatConfig.chatSeed).toMatch(/activate emergency stroke pathway/i);
    expect(nihssChatConfig.chatSeed).toMatch(/does not replace urgent stroke evaluation/i);
    expect(nihssChatConfig.chatSeed).toMatch(/Do not delay or defer emergency stroke pathways/i);
    expect(nihssChatConfig.chatSeed).toMatch(/Do not recommend IV tPA/i);
    expect(nihssChatConfig.description).toMatch(/does not replace urgent stroke evaluation/i);
  });

  it('Canadian C-Spine chat seed includes applicability limits and no clearance', () => {
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/STEP 0/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/spinal cord injury/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/unstable patients/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/does not "clear" the cervical spine/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/Do not override clinician judgment/i);
    expect(canadianCSpineChatConfig.chatSeed).toMatch(/delay primary trauma survey/i);
  });

  it('Ottawa Ankle chat seed includes acute injury context and hard-stop warnings', () => {
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/acute ankle/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/neurovascular compromise/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/gross deformity/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/do not override clinician judgment/i);
    expect(ottawaAnkleChatConfig.chatSeed).toMatch(/Do not delay urgent evaluation/i);
  });
});

describe('PR3 UX & clinical safety — Ottawa Ankle interpretation', () => {
  it('surfaces hard stops and avoids fracture clearance', () => {
    const warnings = ottawaApplicabilityWarnings({ neurovascularCompromise: true });
    const result = applyOttawaAnkleFootRules(
      {
        painMalleolarZone: false,
        tendernessLateralMalleolus: false,
        tendernessMedialMalleolus: false,
        painMidfootZone: false,
        tendernessNavicular: false,
        tendernessFifthMetatarsalBase: false,
        unableToBearWeightBothTimes: false,
      },
      { applicabilityWarnings: warnings, rulesApplicable: false },
    );
    const i = interpretOttawaAnkleFootRules(result);
    if (!i) throw new Error('expected interpretOttawaAnkleFootRules to return a result');
    expect(i.label).toMatch(/not applicable/i);
    expect(i.interpretation).toMatch(/defer appropriate care/i);
    expect(i.safetyDisclaimer).toMatch(/acute ankle\/foot injury/i);
  });
});

describe('PR3 UX & clinical safety — Canadian C-Spine interpretation', () => {
  it('avoids clearance language and stresses trauma pathways', () => {
    const result = applyCanadianCSpineRule({
      highRisk: evaluateCcrHighRisk({
        age65OrOlder: false,
        dangerousMechanism: false,
        paresthesiasInExtremities: false,
      }),
      lowRisk: evaluateCcrLowRisk({
        simpleRearEndMvc: true,
        sittingInEd: true,
        ambulatoryAtAnyTime: true,
        delayedNeckPainOnset: true,
        noMidlineCervicalTenderness: true,
        noDistractingPainfulInjury: true,
      }),
      activeRotationLeft45: true,
      activeRotationRight45: true,
    });
    const i = interpretCanadianCSpine(result);
    if (!i) throw new Error('expected interpretCanadianCSpine to return a result');
    expect(i.safetyDisclaimer).toMatch(/does not clear the cervical spine/i);
    expect(i.pathwayDisclaimer).toMatch(/Do not delay primary trauma survey/i);
    expect(i.interpretation).not.toMatch(/cleared|no injury guaranteed/i);
  });
});

describe('PR3 UX & clinical safety — NIHSS interpretation', () => {
  it('avoid treatment recommendations and stresses emergency stroke care', () => {
    const i = interpretNihssSeverity(12);
    if (!i) throw new Error('expected interpretNihssSeverity to return a result');
    expect(i.label).toMatch(/deficit severity band/i);
    expect(i.label).not.toMatch(/\bstroke\b/i);
    expect(i.safetyDisclaimer).toMatch(/does not replace urgent stroke evaluation/i);
    expect(i.pathwayDisclaimer).toMatch(/local stroke pathways/i);
    expect(i.interpretation).not.toMatch(/give tpa|thrombectomy now/i);
    expect(i.interpretation).toMatch(/does not confirm acute ischemic stroke/i);
  });
});

describe('PR3 UX & clinical safety — GRACE ACS interpretation', () => {
  it('avoid treatment recommendations and diagnostic certainty', () => {
    const result = computeGraceAcsRisk({
      ageYears: 70,
      heartRateBpm: 90,
      systolicBpMmHg: 110,
      creatinineMgDl: 1.2,
      killipClass: 'II',
      cardiacArrestAtAdmission: false,
      stSegmentDeviation: true,
      elevatedCardiacEnzymes: true,
    });
    const i = interpretGraceAcsRisk(result);
    if (!i) throw new Error('expected interpretGraceAcsRisk to return a result');
    expect(i.safetyDisclaimer).toMatch(/does not confirm or exclude/i);
    expect(i.pathwayDisclaimer).toMatch(/local acute coronary syndrome protocols/i);
    expect(i.pathwayDisclaimer).toMatch(/without delay/i);
    expect(i.interpretation).not.toMatch(/start heparin|pci now|give aspirin/i);
  });
});

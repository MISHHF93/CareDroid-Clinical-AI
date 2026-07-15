import { readFileSync } from 'fs';
import { join } from 'path';
import {
  REGISTERED_EXECUTOR_TOOL_IDS,
  REGISTRY_ID_TO_EXECUTOR_TOOL_ID,
  EXECUTOR_ID_ALIASES,
  LEGACY_LLM_TOOL_NAME_TO_EXECUTOR,
  EXECUTOR_PARAMETER_ALIASES,
  EXECUTOR_REQUEST_CONTRACTS,
  NLU_TOOL_IDS_WITHOUT_EXECUTOR,
  resolveExecutorToolId,
  resolveLegacyLlmToolName,
  classifyToolExecutionError,
  validateExecutorRequestPayload,
  validateExecutorContractParameters,
  normalizeExecutorParameters,
  isKnownUnsupportedNluTool,
  getExecutorCatalogSnapshot,
  describeToolCapability,
  ToolExecutionErrorCode,
} from './tool-orchestrator.registry';

const patternsSource = readFileSync(
  join(__dirname, '../intent-classifier/patterns/tool.patterns.ts'),
  'utf8',
);

function patternToolIds(): string[] {
  return [...patternsSource.matchAll(/toolId:\s*'([^']+)'/g)].map((m) => m[1]);
}

describe('tool-orchestrator.registry', () => {
  it('exposes exactly thirty-nine registered executor ids', () => {
    expect(REGISTERED_EXECUTOR_TOOL_IDS).toEqual([
      'sofa-calculator',
      'drug-interactions',
      'lab-interpreter',
      'heart-score',
      'cha2ds2vasc-calculator',
      'wells-pe',
      'shock-index',
      'apache2-calculator',
      'anion-gap',
      'aa-gradient',
      'news2',
      'abcd2',
      'canadian-c-spine',
      'nexus-cspine',
      'gcs-calculator',
      'chads2',
      'duke-treadmill-score',
      'reynolds-risk-score',
      'has-bled',
      'timi-ua-nstemi',
      'framingham-risk',
      'grace-acs',
      'corrected-calcium',
      'corrected-sodium',
      'fena',
      'feurea',
      'osmolal-gap',
      'serum-osmolality',
      'pao2-fio2-ratio',
      'rox-index',
      'mews',
      'revised-trauma-score',
      'hunt-hess-scale',
      'ich-score',
      'four-score',
      'modified-rankin-scale',
      'pecarn-head',
      'wells-dvt-calculator',
      'abg-interpreter',
    ]);
  });

  it('maps registry ids to executor ids (includes PR-7 executable catalog expansions)', () => {
    expect(REGISTRY_ID_TO_EXECUTOR_TOOL_ID['drug-check']).toBe('drug-interactions');
    expect(REGISTRY_ID_TO_EXECUTOR_TOOL_ID['lab-interp']).toBe('lab-interpreter');
    expect(REGISTRY_ID_TO_EXECUTOR_TOOL_ID['sofa-score']).toBe('sofa-calculator');
    expect(REGISTRY_ID_TO_EXECUTOR_TOOL_ID['heart-score']).toBe('heart-score');
    expect(REGISTRY_ID_TO_EXECUTOR_TOOL_ID.news2).toBe('news2');
    // Every mapped target must be a registered executor
    for (const target of Object.values(REGISTRY_ID_TO_EXECUTOR_TOOL_ID)) {
      expect(REGISTERED_EXECUTOR_TOOL_IDS).toContain(target);
    }
  });

  it('resolves drug-interaction-checker alias', () => {
    const resolved = resolveExecutorToolId('drug-interaction-checker');
    expect(resolved?.resolvedId).toBe('drug-interactions');
    expect(resolved?.aliased).toBe(true);
  });

  it('resolves common aliases added in PR-7', () => {
    expect(resolveExecutorToolId('heart')?.resolvedId).toBe('heart-score');
    expect(resolveExecutorToolId('gcs')?.resolvedId).toBe('gcs-calculator');
    expect(resolveExecutorToolId('news-2')?.resolvedId).toBe('news2');
    expect(resolveExecutorToolId('wells')?.resolvedId).toBe('wells-pe');
  });

  it('describes unsupported tools honestly without implying success', () => {
    const cap = describeToolCapability('dispatch-ai');
    expect(cap.executable).toBe(false);
    expect(cap.status).toBe('unsupported');
    expect(cap.doNotTreatAsSuccess).toBe(true);
    expect(cap.requiresClinicianReview).toBe(true);
    expect(cap.message.toLowerCase()).toMatch(/not available|not.*server/);
  });

  it('resolves sidebar registry ids', () => {
    expect(resolveExecutorToolId('sofa-score')?.resolvedId).toBe('sofa-calculator');
    expect(resolveExecutorToolId('drug-check')?.resolvedId).toBe('drug-interactions');
  });

  it('returns null for unknown ids', () => {
    expect(resolveExecutorToolId('dispatch-ai')).toBeNull();
    expect(resolveExecutorToolId('')).toBeNull();
  });

  it('classifies dispatch-ai as unsupported', () => {
    expect(classifyToolExecutionError('dispatch-ai')).toBe(ToolExecutionErrorCode.UNSUPPORTED_TOOL);
  });

  it('documents contracts for every registered executor', () => {
    for (const id of REGISTERED_EXECUTOR_TOOL_IDS) {
      expect(EXECUTOR_REQUEST_CONTRACTS[id]).toBeDefined();
      expect(EXECUTOR_REQUEST_CONTRACTS[id].toolId).toBe(id);
    }
  });

  it('marks SOFA as deterministic', () => {
    expect(EXECUTOR_REQUEST_CONTRACTS['sofa-calculator'].deterministic).toBe(true);
  });

  it('validates parameters must be a plain object', () => {
    expect(validateExecutorRequestPayload({ a: 1 }).valid).toBe(true);
    expect(validateExecutorRequestPayload([]).valid).toBe(false);
    expect(validateExecutorRequestPayload(null).valid).toBe(false);
  });

  it('does not alias unknown legacy ids into executors', () => {
    expect(EXECUTOR_ID_ALIASES['sofa_calculator']).toBeUndefined();
    expect(LEGACY_LLM_TOOL_NAME_TO_EXECUTOR.sofa_calculator).toBe('sofa-calculator');
    expect(resolveLegacyLlmToolName('drug_checker')).toBe('drug-interactions');
  });

  it('NLU_TOOL_IDS_WITHOUT_EXECUTOR covers every tool.patterns id except registered executors', () => {
    const patterns = patternToolIds();
    const registered = new Set(REGISTERED_EXECUTOR_TOOL_IDS);
    const unsupported = new Set(NLU_TOOL_IDS_WITHOUT_EXECUTOR);
    const expected = patterns.filter(
      (id) => !registered.has(id as (typeof REGISTERED_EXECUTOR_TOOL_IDS)[number]),
    );
    expect([...unsupported].sort()).toEqual([...expected].sort());
  });

  it('validateExecutorContractParameters enforces drug-interactions medications', () => {
    expect(
      validateExecutorContractParameters('drug-interactions', { medications: ['aspirin'] }).valid,
    ).toBe(true);
    expect(validateExecutorContractParameters('drug-interactions', { medications: [] }).valid).toBe(
      false,
    );
    expect(validateExecutorContractParameters('drug-interactions', {}).valid).toBe(false);
  });

  it('validateExecutorContractParameters allows empty optional SOFA inputs', () => {
    expect(validateExecutorContractParameters('sofa-calculator', {}).valid).toBe(true);
    expect(EXECUTOR_REQUEST_CONTRACTS['sofa-calculator'].deterministic).toBe(true);
  });

  it('normalizes SOFA snake_case NLU parameters to executor camelCase parameters', () => {
    expect(EXECUTOR_PARAMETER_ALIASES['sofa-calculator']).toEqual({
      mechanical_ventilation: 'mechanicalVentilation',
      urine_output: 'urineOutput',
    });
    expect(
      normalizeExecutorParameters('sofa-calculator', {
        urine_output: 450,
        mechanical_ventilation: true,
      }),
    ).toEqual({
      urineOutput: 450,
      mechanicalVentilation: true,
    });
  });

  it('documents executor parameter aliases for pattern parameters that differ by casing', () => {
    const sofaPattern = patternsSource.match(
      /toolId:\s*'sofa-calculator'[\s\S]*?optionalParameters:\s*\[([\s\S]*?)\]/,
    );
    expect(sofaPattern?.[1]).toContain("'urine_output'");
    expect(EXECUTOR_REQUEST_CONTRACTS['sofa-calculator'].optionalParameters).toContain(
      'urineOutput',
    );
    expect(EXECUTOR_PARAMETER_ALIASES['sofa-calculator'].urine_output).toBe('urineOutput');

    expect(EXECUTOR_PARAMETER_ALIASES['lab-interpreter'].lab_values).toBe('labValues');
    expect(EXECUTOR_PARAMETER_ALIASES['lab-interpreter'].patient_age).toBe('patientAge');
    expect(EXECUTOR_PARAMETER_ALIASES['lab-interpreter'].clinical_context).toBe('clinicalContext');
    expect(EXECUTOR_PARAMETER_ALIASES['drug-interactions'].severity_filter).toBe('severityFilter');
  });

  it('isKnownUnsupportedNluTool identifies dispatch-ai', () => {
    expect(isKnownUnsupportedNluTool('dispatch-ai')).toBe(true);
    expect(isKnownUnsupportedNluTool('sofa-calculator')).toBe(false);
  });

  it('getExecutorCatalogSnapshot lists thirty-nine registered executors', () => {
    const snap = getExecutorCatalogSnapshot();
    expect(snap.registeredExecutorToolIds).toHaveLength(39);
    expect(snap.unsupportedTools.length).toBeGreaterThan(30);
  });

  describe('representative-batch executors (heart-score, cha2ds2vasc-calculator, wells-pe, shock-index, apache2-calculator, anion-gap, aa-gradient, news2, abcd2, canadian-c-spine, nexus-cspine, gcs-calculator)', () => {
    const NEW_TOOL_IDS = [
      'heart-score',
      'cha2ds2vasc-calculator',
      'wells-pe',
      'shock-index',
      'apache2-calculator',
      'anion-gap',
      'aa-gradient',
      'news2',
      'abcd2',
      'canadian-c-spine',
      'nexus-cspine',
      'gcs-calculator',
    ] as const;

    it.each(NEW_TOOL_IDS)('is no longer listed in NLU_TOOL_IDS_WITHOUT_EXECUTOR: %s', (id) => {
      expect(NLU_TOOL_IDS_WITHOUT_EXECUTOR).not.toContain(id);
    });

    it.each(NEW_TOOL_IDS)('has a parameter-alias entry (possibly empty): %s', (id) => {
      expect(EXECUTOR_PARAMETER_ALIASES[id]).toBeDefined();
    });

    it.each(NEW_TOOL_IDS)('has a deterministic request contract: %s', (id) => {
      expect(EXECUTOR_REQUEST_CONTRACTS[id].deterministic).toBe(true);
      expect(EXECUTOR_REQUEST_CONTRACTS[id].toolId).toBe(id);
    });

    it.each(NEW_TOOL_IDS)('classifies as a known tool, not unsupported: %s', (id) => {
      expect(isKnownUnsupportedNluTool(id)).toBe(false);
      expect(classifyToolExecutionError(id)).not.toBe(ToolExecutionErrorCode.UNSUPPORTED_TOOL);
    });

    it('normalizes shock-index snake_case NLU parameters to executor camelCase parameters', () => {
      expect(
        normalizeExecutorParameters('shock-index', { heart_rate: 110, systolic_bp: 100 }),
      ).toEqual({ heartRate: 110, systolicBp: 100 });
    });

    it('normalizes news2 snake_case NLU parameters to executor camelCase parameters', () => {
      expect(
        normalizeExecutorParameters('news2', { respiratory_rate: 18, spo2_scale: '1' }),
      ).toEqual({ respiratoryRate: 18, spo2Scale: '1' });
    });

    it('validateExecutorContractParameters enforces heart-score required dimensions', () => {
      expect(
        validateExecutorContractParameters('heart-score', {
          history: 0,
          ecg: 0,
          age: 0,
          riskFactors: 0,
          troponin: 0,
        }).valid,
      ).toBe(true);
      expect(validateExecutorContractParameters('heart-score', {}).valid).toBe(false);
    });

    it('validateExecutorContractParameters allows canadian-c-spine and nexus-cspine with all-optional inputs', () => {
      expect(validateExecutorContractParameters('canadian-c-spine', {}).valid).toBe(true);
      expect(validateExecutorContractParameters('nexus-cspine', {}).valid).toBe(true);
    });
  });

  describe('cardiology batch executors (chads2, duke-treadmill-score, reynolds-risk-score, has-bled, timi-ua-nstemi, framingham-risk, grace-acs)', () => {
    const CARDIOLOGY_TOOL_IDS = [
      'chads2',
      'duke-treadmill-score',
      'reynolds-risk-score',
      'has-bled',
      'timi-ua-nstemi',
      'framingham-risk',
      'grace-acs',
    ] as const;

    it.each(CARDIOLOGY_TOOL_IDS)(
      'is no longer listed in NLU_TOOL_IDS_WITHOUT_EXECUTOR: %s',
      (id) => {
        expect(NLU_TOOL_IDS_WITHOUT_EXECUTOR).not.toContain(id);
      },
    );

    it.each(CARDIOLOGY_TOOL_IDS)('has a parameter-alias entry: %s', (id) => {
      expect(EXECUTOR_PARAMETER_ALIASES[id]).toBeDefined();
    });

    it.each(CARDIOLOGY_TOOL_IDS)('has a deterministic request contract: %s', (id) => {
      expect(EXECUTOR_REQUEST_CONTRACTS[id].deterministic).toBe(true);
      expect(EXECUTOR_REQUEST_CONTRACTS[id].toolId).toBe(id);
    });

    it.each(CARDIOLOGY_TOOL_IDS)('classifies as a known tool, not unsupported: %s', (id) => {
      expect(isKnownUnsupportedNluTool(id)).toBe(false);
      expect(classifyToolExecutionError(id)).not.toBe(ToolExecutionErrorCode.UNSUPPORTED_TOOL);
    });

    it('normalizes has-bled snake_case NLU parameters to executor camelCase parameters', () => {
      expect(
        normalizeExecutorParameters('has-bled', { renal_dysfunction: true, age_over65: true }),
      ).toEqual({ renalDysfunction: true, ageOver65: true });
    });

    it('validateExecutorContractParameters enforces has-bled and timi-ua-nstemi required booleans', () => {
      expect(validateExecutorContractParameters('has-bled', {}).valid).toBe(false);
      expect(validateExecutorContractParameters('timi-ua-nstemi', {}).valid).toBe(false);
    });

    it('validateExecutorContractParameters allows empty optional chads2 inputs', () => {
      expect(validateExecutorContractParameters('chads2', {}).valid).toBe(true);
    });
  });

  describe('critical-care batch executors (corrected-calcium, corrected-sodium, fena, feurea, osmolal-gap, serum-osmolality, pao2-fio2-ratio, rox-index, mews, revised-trauma-score)', () => {
    const CRITICAL_CARE_TOOL_IDS = [
      'corrected-calcium',
      'corrected-sodium',
      'fena',
      'feurea',
      'osmolal-gap',
      'serum-osmolality',
      'pao2-fio2-ratio',
      'rox-index',
      'mews',
      'revised-trauma-score',
    ] as const;

    it.each(CRITICAL_CARE_TOOL_IDS)(
      'is no longer listed in NLU_TOOL_IDS_WITHOUT_EXECUTOR: %s',
      (id) => {
        expect(NLU_TOOL_IDS_WITHOUT_EXECUTOR).not.toContain(id);
      },
    );

    it.each(CRITICAL_CARE_TOOL_IDS)('has a parameter-alias entry: %s', (id) => {
      expect(EXECUTOR_PARAMETER_ALIASES[id]).toBeDefined();
    });

    it.each(CRITICAL_CARE_TOOL_IDS)('has a deterministic request contract: %s', (id) => {
      expect(EXECUTOR_REQUEST_CONTRACTS[id].deterministic).toBe(true);
      expect(EXECUTOR_REQUEST_CONTRACTS[id].toolId).toBe(id);
    });

    it.each(CRITICAL_CARE_TOOL_IDS)('classifies as a known tool, not unsupported: %s', (id) => {
      expect(isKnownUnsupportedNluTool(id)).toBe(false);
      expect(classifyToolExecutionError(id)).not.toBe(ToolExecutionErrorCode.UNSUPPORTED_TOOL);
    });

    it('normalizes fena snake_case NLU parameters to executor camelCase parameters', () => {
      expect(
        normalizeExecutorParameters('fena', {
          serum_sodium: 140,
          urine_sodium: 20,
          serum_creatinine_mg_dl: 2.0,
          urine_creatinine_mg_dl: 60,
        }),
      ).toEqual({
        serumSodium: 140,
        urineSodium: 20,
        serumCreatinineMgDl: 2.0,
        urineCreatinineMgDl: 60,
      });
    });

    it('validateExecutorContractParameters enforces mews and revised-trauma-score required fields', () => {
      expect(validateExecutorContractParameters('mews', {}).valid).toBe(false);
      expect(validateExecutorContractParameters('revised-trauma-score', {}).valid).toBe(false);
    });
  });

  describe('neuro batch executors (hunt-hess-scale, ich-score, four-score, modified-rankin-scale, pecarn-head)', () => {
    const NEURO_TOOL_IDS = [
      'hunt-hess-scale',
      'ich-score',
      'four-score',
      'modified-rankin-scale',
      'pecarn-head',
    ] as const;

    it.each(NEURO_TOOL_IDS)('is no longer listed in NLU_TOOL_IDS_WITHOUT_EXECUTOR: %s', (id) => {
      expect(NLU_TOOL_IDS_WITHOUT_EXECUTOR).not.toContain(id);
    });

    it.each(NEURO_TOOL_IDS)('has a parameter-alias entry (possibly empty): %s', (id) => {
      expect(EXECUTOR_PARAMETER_ALIASES[id]).toBeDefined();
    });

    it.each(NEURO_TOOL_IDS)('has a deterministic request contract: %s', (id) => {
      expect(EXECUTOR_REQUEST_CONTRACTS[id].deterministic).toBe(true);
      expect(EXECUTOR_REQUEST_CONTRACTS[id].toolId).toBe(id);
    });

    it.each(NEURO_TOOL_IDS)('classifies as a known tool, not unsupported: %s', (id) => {
      expect(isKnownUnsupportedNluTool(id)).toBe(false);
      expect(classifyToolExecutionError(id)).not.toBe(ToolExecutionErrorCode.UNSUPPORTED_TOOL);
    });

    it('normalizes ich-score snake_case NLU parameters to executor camelCase parameters', () => {
      expect(
        normalizeExecutorParameters('ich-score', {
          volume_ml: 20,
          intraventricular_hemorrhage: 'no',
          infratentorial_origin: 'no',
        }),
      ).toEqual({ volumeMl: 20, intraventricularHemorrhage: 'no', infratentorialOrigin: 'no' });
    });

    it('validateExecutorContractParameters enforces four-score and pecarn-head required fields', () => {
      expect(validateExecutorContractParameters('four-score', {}).valid).toBe(false);
      expect(validateExecutorContractParameters('pecarn-head', {}).valid).toBe(false);
    });
  });
});

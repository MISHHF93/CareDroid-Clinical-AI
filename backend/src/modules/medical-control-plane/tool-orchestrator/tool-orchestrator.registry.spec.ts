import { readFileSync } from 'fs';
import { join } from 'path';
import {
  REGISTERED_EXECUTOR_TOOL_IDS,
  REGISTRY_ID_TO_EXECUTOR_TOOL_ID,
  EXECUTOR_ID_ALIASES,
  EXECUTOR_PARAMETER_ALIASES,
  EXECUTOR_REQUEST_CONTRACTS,
  NLU_TOOL_IDS_WITHOUT_EXECUTOR,
  resolveExecutorToolId,
  classifyToolExecutionError,
  validateExecutorRequestPayload,
  validateExecutorContractParameters,
  normalizeExecutorParameters,
  isKnownUnsupportedNluTool,
  getExecutorCatalogSnapshot,
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
  it('exposes exactly three registered executor ids', () => {
    expect(REGISTERED_EXECUTOR_TOOL_IDS).toEqual([
      'sofa-calculator',
      'drug-interactions',
      'lab-interpreter',
    ]);
  });

  it('maps registry ids to executor ids (frontend REGISTRY_ID_TO_ORCHESTRATOR_TOOL parity)', () => {
    expect(REGISTRY_ID_TO_EXECUTOR_TOOL_ID).toEqual({
      'drug-check': 'drug-interactions',
      'lab-interp': 'lab-interpreter',
      'sofa-score': 'sofa-calculator',
    });
  });

  it('resolves drug-interaction-checker alias', () => {
    const resolved = resolveExecutorToolId('drug-interaction-checker');
    expect(resolved?.resolvedId).toBe('drug-interactions');
    expect(resolved?.aliased).toBe(true);
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
    const sofaPattern = patternsSource.match(/toolId:\s*'sofa-calculator'[\s\S]*?optionalParameters:\s*\[([\s\S]*?)\]/);
    expect(sofaPattern?.[1]).toContain("'urine_output'");
    expect(EXECUTOR_REQUEST_CONTRACTS['sofa-calculator'].optionalParameters).toContain('urineOutput');
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

  it('getExecutorCatalogSnapshot lists three registered executors', () => {
    const snap = getExecutorCatalogSnapshot();
    expect(snap.registeredExecutorToolIds).toHaveLength(3);
    expect(snap.unsupportedTools.length).toBeGreaterThan(30);
  });
});

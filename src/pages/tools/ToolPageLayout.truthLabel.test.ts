import { truthLabelForTool } from './ToolPageLayout';

describe('truthLabelForTool (P0.4)', () => {
  it('labels a deterministic calculator Manual, not AI', () => {
    expect(truthLabelForTool('qsofa')).toEqual({
      state: 'Manual',
      sourceContext: 'Deterministic calculator or rule engine — not a trained model',
    });
  });

  it('labels a drug-interaction checker Manual', () => {
    expect(truthLabelForTool('drug-check').state).toBe('Manual');
  });

  it('labels a declared AI-documentation tool Demo, reflecting this environment having no configured LLM provider', () => {
    expect(truthLabelForTool('diagnosis')).toEqual({
      state: 'Demo',
      sourceContext:
        'AI-assisted tool — no LLM provider is configured in this environment (see AI_CONFIGURATION_MAP.md)',
    });
  });

  // 2026-08-08: these 8 were previously labeled 'Demo' alongside 'diagnosis'
  // above, but backend/src/modules/clinical-intelligence/clinical-intelligence
  // .service.ts has zero AI-provider import anywhere -- every response is
  // keyword-trigger-table matching (or, for guideline-rag, real vector
  // retrieval with an extractive, non-generated summary). Unlike 'diagnosis'
  // (which would be live if an LLM provider were configured), these 8 are
  // architecturally permanent rule engines -- 'Manual' is correct regardless
  // of provider configuration, matching this file's own established
  // convention for every other rule-based engine (Sentinel,
  // HospitalCommandCenter, ContinuousPatientFlow, etc.).
  it('labels the 8 Clinical Intelligence capabilities Manual, not Demo — they never call an LLM regardless of provider configuration', () => {
    expect(truthLabelForTool('ambient-scribe')).toEqual({
      state: 'Manual',
      sourceContext:
        'Clinical Intelligence module — deterministic keyword/pattern matching over submitted clinical text, not a trained model',
    });
    for (const toolId of [
      'differential-ai',
      'ai-explainability',
      'clinical-audit',
      'order-set-ai',
      'patient-summary-ai',
      'timeline-ai',
    ]) {
      expect(truthLabelForTool(toolId).state).toBe('Manual');
    }
  });

  it('labels guideline-rag Manual with a source context distinguishing real retrieval from generation', () => {
    expect(truthLabelForTool('guideline-rag')).toEqual({
      state: 'Manual',
      sourceContext:
        'Clinical Intelligence guideline search — real vector retrieval over indexed guideline documents; summary text is extracted verbatim from retrieved passages, not model-generated',
    });
  });

  it('defaults an unknown tool id to Manual rather than silently claiming AI', () => {
    expect(truthLabelForTool('some-unknown-future-tool').state).toBe('Manual');
  });
});

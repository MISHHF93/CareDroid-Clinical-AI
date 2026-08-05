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
    expect(truthLabelForTool('ambient-scribe')).toEqual({
      state: 'Demo',
      sourceContext:
        'AI-assisted tool — no LLM provider is configured in this environment (see AI_CONFIGURATION_MAP.md)',
    });
    expect(truthLabelForTool('diagnosis').state).toBe('Demo');
    expect(truthLabelForTool('differential-ai').state).toBe('Demo');
  });

  it('defaults an unknown tool id to Manual rather than silently claiming AI', () => {
    expect(truthLabelForTool('some-unknown-future-tool').state).toBe('Manual');
  });
});

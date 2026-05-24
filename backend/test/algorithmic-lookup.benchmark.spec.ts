import {
  getToolPattern,
  matchToolPatterns,
} from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';
import { resolveExecutorToolId } from '../src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry';

describe('algorithmic lookup benchmark coverage', () => {
  it('keeps repeated NLU matching stable across representative clinical queries', () => {
    const messages = [
      'calculate qsofa for suspected sepsis',
      'open national early warning score calculator',
      'check wells pulmonary embolism score',
      'use stop bang for sleep apnea risk',
      'fleet route optimizer for delivery stops',
    ];

    for (let i = 0; i < 25; i += 1) {
      const results = messages.map((message) => matchToolPatterns(message)[0]?.toolId);
      expect(results).toEqual(['qsofa', 'news2', 'wells-pe', 'stop-bang', 'route-optimizer']);
    }
  });

  it('keeps indexed tool pattern and executor lookup behavior correct', () => {
    expect(getToolPattern('qsofa')?.toolName).toContain('qSOFA');
    expect(getToolPattern('not-a-real-tool')).toBeUndefined();

    const executorLookups = [
      ['sofa-calculator', 'sofa-calculator', false],
      ['drug-interaction-checker', 'drug-interactions', true],
      ['drug-check', 'drug-interactions', true],
      ['lab-interp', 'lab-interpreter', true],
      ['not-a-real-tool', undefined, undefined],
    ] as const;

    for (let i = 0; i < 100; i += 1) {
      for (const [requested, resolvedId, aliased] of executorLookups) {
        const result = resolveExecutorToolId(requested);
        if (!resolvedId) {
          expect(result).toBeNull();
        } else {
          expect(result).toMatchObject({ requestedId: requested, resolvedId, aliased });
        }
      }
    }
  });
});

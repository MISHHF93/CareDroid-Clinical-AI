import { describe, expect, it } from 'vitest';
import {
  INTERACTION_CLASSES,
  classifyInteractionControl,
  extractControlCandidates,
  summarizeInteractionRecords,
  type InteractionControlRecord,
} from './interactionInventoryModel';

describe('interactionInventoryModel', () => {
  it('classifies wired buttons as LIVE', () => {
    const result = classifyInteractionControl({
      kind: 'button',
      attributesAndBody:
        '<button type="button" onClick={handleSave} aria-label="Save">Save</button>',
    });
    expect(result.class).toBe(INTERACTION_CLASSES.LIVE);
    expect(result.hasClickHandler).toBe(true);
  });

  it('classifies Link with to as LIVE', () => {
    const result = classifyInteractionControl({
      kind: 'link',
      attributesAndBody: '<Link to="/emergency/ems">EMS</Link>',
    });
    expect(result.class).toBe(INTERACTION_CLASSES.LIVE);
    expect(result.hasNavigation).toBe(true);
  });

  it('flags decorative buttons without handlers as BROKEN', () => {
    const result = classifyInteractionControl({
      kind: 'button',
      attributesAndBody: '<button type="button" className="cd-btn">Looks clickable</button>',
    });
    expect(result.class).toBe(INTERACTION_CLASSES.BROKEN);
  });

  it('flags always-disabled without reason as BROKEN', () => {
    const result = classifyInteractionControl({
      kind: 'button',
      attributesAndBody: '<button type="button" disabled={true} onClick={noop}>New Order</button>',
    });
    expect(result.class).toBe(INTERACTION_CLASSES.BROKEN);
    expect(result.reason).toMatch(/without title/i);
  });

  it('accepts disabled with title as DISABLED_REASONED', () => {
    const result = classifyInteractionControl({
      kind: 'button',
      attributesAndBody:
        '<button type="button" disabled={true} title="Order API not available" aria-label="New Order">New Order</button>',
    });
    expect(result.class).toBe(INTERACTION_CLASSES.DISABLED_REASONED);
  });

  it('extracts candidates from multi-line JSX', () => {
    const source = `
export function Demo() {
  return (
    <button
      type="button"
      onClick={onRun}
      aria-label="Run score"
    >
      Run
    </button>
  );
}
`;
    const candidates = extractControlCandidates(source, 'Demo.tsx');
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].kind).toBe('button');
    const classified = classifyInteractionControl({
      kind: candidates[0].kind,
      attributesAndBody: candidates[0].attributesAndBody,
    });
    expect(classified.class).toBe(INTERACTION_CLASSES.LIVE);
  });

  it('summarizes inventory counts', () => {
    const records: InteractionControlRecord[] = [
      {
        id: 'a',
        file: 'a.tsx',
        line: 1,
        kind: 'button',
        snippet: 'x',
        accessibleNameHint: null,
        hasClickHandler: true,
        hasSubmitType: false,
        hasNavigation: false,
        isDisabled: false,
        hasDisabledReason: false,
        class: INTERACTION_CLASSES.LIVE,
        reason: 'ok',
      },
      {
        id: 'b',
        file: 'b.tsx',
        line: 2,
        kind: 'button',
        snippet: 'y',
        accessibleNameHint: null,
        hasClickHandler: false,
        hasSubmitType: false,
        hasNavigation: false,
        isDisabled: false,
        hasDisabledReason: false,
        class: INTERACTION_CLASSES.BROKEN,
        reason: 'dead',
      },
    ];
    const summary = summarizeInteractionRecords(records, 2);
    expect(summary.total).toBe(2);
    expect(summary.byClass.LIVE).toBe(1);
    expect(summary.broken).toHaveLength(1);
  });
});

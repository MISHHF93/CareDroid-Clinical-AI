import { describe, it, expect } from 'vitest';
import {
  buildToolVisibilityMatrix,
  getToolVisibilityMatrixDocument,
  formatToolVisibilityMatrixMarkdown,
} from './toolVisibilityMatrix';
import { ALL_REGISTRY_TOOL_IDS, NLU_HUB_ONLY_PROFILE_TOOL_IDS } from './clinicalToolIdContract';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';

describe('toolVisibilityMatrix', () => {
  it('includes every sidebar registry tool', () => {
    const ids = new Set(buildToolVisibilityMatrix().map((r) => r.canonicalId));
    for (const registryId of ALL_REGISTRY_TOOL_IDS) {
      expect(ids.has(registryId), `missing registry row ${registryId}`).toBe(true);
    }
  });

  it('includes NLU hub-only profile ids', () => {
    const ids = new Set(buildToolVisibilityMatrix().map((r) => r.canonicalId));
    for (const nluId of NLU_HUB_ONLY_PROFILE_TOOL_IDS) {
      expect(ids.has(nluId), `missing hub-only row ${nluId}`).toBe(true);
    }
  });

  it('covers all clinicalIntentTools profiles', () => {
    const ids = new Set(buildToolVisibilityMatrix().map((r) => r.canonicalId));
    for (const nlu of clinicalIntentTools) {
      const covered =
        ids.has(nlu.toolId) ||
        ids.has(nlu.sidebarToolId) ||
        [...ids].some((id) => id === nlu.sidebarToolId);
      expect(covered, `NLU ${nlu.toolId} not represented`).toBe(true);
    }
  });

  it('documents three backend executors on Tier C tools only', () => {
    const rows = buildToolVisibilityMatrix();
    const executors = rows.filter((r) => r.backendExecutorExists);
    expect(executors.map((r) => r.canonicalId).sort()).toEqual(
      ['drug-check', 'lab-interp', 'sofa-score'].sort()
    );
  });

  it('marks Tier B registry tools as fully visible after centralized launch', () => {
    const rows = buildToolVisibilityMatrix();
    const wells = rows.find((r) => r.canonicalId === 'wells-pe');
    expect(wells?.tier).toBe('B');
    expect(wells?.currentStatus).toBe('fully visible');
    expect(wells?.launchPathWorks).toBe(true);
  });

  it('marks NLU hub-only profiles with sidebar registry rows as fully visible', () => {
    const rows = buildToolVisibilityMatrix();
    for (const nluId of NLU_HUB_ONLY_PROFILE_TOOL_IDS) {
      const row = rows.find((r) => r.canonicalId === nluId);
      expect(row, nluId).toBeTruthy();
      expect(row.registryEntryExists).toBe(true);
      expect(row.sidebarVisible).toBe(true);
      expect(row.launchPathWorks).toBe(true);
      expect(row.currentStatus).toBe('fully visible');
    }
  });

  it('maps calc-gfr to gfr calculator slug', () => {
    const row = buildToolVisibilityMatrix().find((r) => r.canonicalId === 'calc-gfr');
    expect(row?.calculatorSlug).toBe('gfr');
    expect(row?.rendersInUi).toBe(true);
    expect(row?.currentStatus).toBe('frontend-only');
  });

  it('generates markdown with matrix table header', () => {
    const md = formatToolVisibilityMatrixMarkdown();
    expect(md).toContain('# Tool visibility matrix');
    expect(md).toContain('| Canonical ID | Display name |');
    expect(md).toContain('## Recommended code fixes');
  });

  it('document summary matches row count', () => {
    const doc = getToolVisibilityMatrixDocument();
    expect(doc.rows.length).toBe(doc.summary.totalRows);
    expect(doc.summary.totalRows).toBeGreaterThanOrEqual(ALL_REGISTRY_TOOL_IDS.length);
  });
});

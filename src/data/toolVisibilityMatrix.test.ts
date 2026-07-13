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

  it('documents 37 backend executors on Tier C tools only', () => {
    const rows = buildToolVisibilityMatrix();
    const executors = rows.filter((r) => r.backendExecutorExists);
    expect(executors.map((r) => r.canonicalId).sort()).toEqual(
      [
        'drug-check', 'lab-interp', 'sofa-score', 'heart-score', 'calc-chads2vasc', 'wells-pe',
        'shock-index', 'apache2-calculator', 'anion-gap', 'aa-gradient', 'news2', 'abcd2',
        'canadian-c-spine', 'nexus-cspine', 'gcs-calculator', 'chads2', 'duke-treadmill-score',
        'reynolds-risk-score', 'has-bled', 'timi-ua-nstemi', 'framingham-risk', 'grace-acs',
        'corrected-calcium', 'corrected-sodium', 'fena', 'feurea', 'osmolal-gap', 'serum-osmolality',
        'pao2-fio2-ratio', 'rox-index', 'mews', 'revised-trauma-score', 'hunt-hess-scale', 'ich-score',
        'four-score', 'modified-rankin-scale', 'pecarn-head',
      ].sort()
    );
    for (const row of executors) {
      expect(row.tier, row.canonicalId).toBe('C');
    }
  });

  it('marks Tier C registry tools (backend-executed) as archived after active tools routes were retired', () => {
    const rows = buildToolVisibilityMatrix();
    const wells = rows.find((r) => r.canonicalId === 'wells-pe');
    expect(wells?.tier).toBe('C');
    expect(wells?.currentStatus).toBe('archived route');
    expect(wells?.launchPathWorks).toBe(true);
  });

  it('marks NLU hub-only profiles with sidebar registry rows as archived routes', () => {
    const rows = buildToolVisibilityMatrix();
    for (const nluId of NLU_HUB_ONLY_PROFILE_TOOL_IDS) {
      const row = rows.find((r) => r.canonicalId === nluId);
      expect(row, nluId).toBeTruthy();
      expect(row.registryEntryExists).toBe(true);
      expect(row.sidebarVisible).toBe(true);
      expect(row.launchPathWorks).toBe(true);
      expect(row.currentStatus).toBe('archived route');
    }
  });

  it('maps calc-gfr to gfr calculator slug', () => {
    const row = buildToolVisibilityMatrix().find((r) => r.canonicalId === 'calc-gfr');
    expect(row?.calculatorSlug).toBe('gfr');
    expect(row?.rendersInUi).toBe(true);
    expect(row?.currentStatus).toBe('archived route');
  });

  it('generates markdown with matrix table header', () => {
    const md = formatToolVisibilityMatrixMarkdown();
    expect(md).toContain('# Tool Visibility Matrix');
    expect(md).toContain('| Canonical ID | Display name |');
    expect(md).toContain('## Recommended code fixes');
  });

  it('document summary matches row count', () => {
    const doc = getToolVisibilityMatrixDocument();
    expect(doc.rows.length).toBe(doc.summary.totalRows);
    expect(doc.summary.totalRows).toBeGreaterThanOrEqual(ALL_REGISTRY_TOOL_IDS.length);
  });
});

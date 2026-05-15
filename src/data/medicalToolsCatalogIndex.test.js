import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import toolRegistry from './toolRegistry';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';

describe('medicalToolsCatalogIndex', () => {
  it('includes every NLU clinical tool profile', () => {
    const ids = new Set(getMedicalToolsCatalogRows().map((r) => r.primaryId || r.id));
    for (const tool of clinicalIntentTools) {
      expect(ids.has(tool.toolId)).toBe(true);
    }
  });

  it('includes sidebar registry tools and procedures', () => {
    const rows = getMedicalToolsCatalogRows();
    const ids = new Set(rows.flatMap((r) => [r.primaryId, r.id, r.sidebarToolId].filter(Boolean)));
    for (const tool of toolRegistry) {
      const covered =
        ids.has(tool.id) ||
        clinicalIntentTools.some((n) => n.sidebarToolId === tool.id);
      expect(covered).toBe(true);
    }
    expect(ids.has('procedures')).toBe(true);
  });

  it('marks chat-on-request for NLU and keyword calculators', () => {
    const rows = getMedicalToolsCatalogRows();
    const apache = rows.find((r) => r.primaryId === 'apache2-calculator');
    expect(apache?.chatOnRequest).toBe(true);
    expect(apache?.chatOnlyForm).toBe(true);

    const gfr = rows.find((r) => r.id === 'calc-gfr');
    expect(gfr?.chatOnRequest).toBe(true);
    expect(gfr?.uiCalculatorSlug).toBe('gfr');
  });

  it('reports summary aligned with NLU count', () => {
    const summary = getMedicalCatalogSummary();
    expect(summary.nluProfiles).toBe(15);
    expect(summary.total).toBeGreaterThanOrEqual(15);
    expect(summary.chatOnRequest).toBeGreaterThanOrEqual(15);
  });
});

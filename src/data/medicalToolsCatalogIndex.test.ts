import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import toolRegistry from './toolRegistry';
import { getMedicalCatalogSummary, getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { catalogRowsMatchingQuery } from '../utils/catalogSearch';
import { REGISTRY_ID_TO_ORCHESTRATOR_TOOL } from './clinicalToolIdContract';

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
    expect(apache?.chatOnlyForm).toBe(false);
    expect(apache?.pagePath).toBe('/tools/calculators/apache-ii');
    expect(apache?.uiCalculatorSlug).toBe('apache-ii');

    const gfr = rows.find((r) => r.id === 'calc-gfr');
    expect(gfr?.chatOnRequest).toBe(true);
    expect(gfr?.uiCalculatorSlug).toBe('gfr');
  });

  it('reports summary aligned with NLU count', () => {
    const nluCount = clinicalIntentTools.length;
    const summary = getMedicalCatalogSummary();
    expect(summary.nluProfiles).toBe(nluCount);
    expect(summary.total).toBeGreaterThanOrEqual(nluCount);
    expect(summary.chatOnRequest).toBeGreaterThanOrEqual(nluCount);
  });

  it('indexes HAS-BLED with dedicated page and calculator slug', () => {
    const rows = getMedicalToolsCatalogRows();
    const hb = rows.find((r) => r.primaryId === 'has-bled' || r.id === 'has-bled');
    expect(hb?.pagePath).toBe('/tools/calculators/has-bled');
    expect(hb?.uiCalculatorSlug).toBe('has-bled');
    expect(hb?.chatOnRequest).toBe(true);
  });

  it('indexes Child-Pugh with dedicated page and calculator slug', () => {
    const rows = getMedicalToolsCatalogRows();
    const cp = rows.find((r) => r.primaryId === 'child-pugh' || r.id === 'child-pugh');
    expect(cp?.pagePath).toBe('/tools/calculators/child-pugh');
    expect(cp?.uiCalculatorSlug).toBe('child-pugh');
    expect(cp?.chatOnRequest).toBe(true);
  });

  it('indexes qSOFA with dedicated page and calculator slug', () => {
    const rows = getMedicalToolsCatalogRows();
    const qsofa = rows.find((r) => r.primaryId === 'qsofa' || r.id === 'qsofa');
    expect(qsofa?.pagePath).toBe('/tools/calculators/qsofa');
    expect(qsofa?.uiCalculatorSlug).toBe('qsofa');
    expect(qsofa?.chatOnRequest).toBe(true);
  });

  it('indexes NEWS2 with dedicated page and calculator slug', () => {
    const rows = getMedicalToolsCatalogRows();
    const news2 = rows.find((r) => r.primaryId === 'news2' || r.id === 'news2');
    expect(news2?.pagePath).toBe('/tools/calculators/news2');
    expect(news2?.uiCalculatorSlug).toBe('news2');
    expect(news2?.chatOnRequest).toBe(true);
  });

  it('marks all PR1 NLU tools as client-side (no backend executor flag)', () => {
    const rows = getMedicalToolsCatalogRows();
    const pr1 = ['qsofa', 'news2', 'child-pugh', 'has-bled'];
    for (const id of pr1) {
      const row = rows.find((r) => r.primaryId === id);
      // news2 and has-bled now have a real backend executor (REGISTRY_ID_TO_ORCHESTRATOR_TOOL).
      const expectedBackendExecutor = Boolean(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[id]);
      expect(row?.backendExecutor).toBe(expectedBackendExecutor);
    }
  });

  it('indexes MELD with dedicated page and calculator slug', () => {
    const rows = getMedicalToolsCatalogRows();
    const meld = rows.find((r) => r.primaryId === 'meld' || r.id === 'meld');
    expect(meld?.pagePath).toBe('/tools/calculators/meld');
    expect(meld?.uiCalculatorSlug).toBe('meld');
    expect(meld?.chatOnRequest).toBe(true);
  });

  it('indexes PERC as chat-only on calculator hub', () => {
    const rows = getMedicalToolsCatalogRows();
    const perc = rows.find((r) => r.primaryId === 'perc' || r.id === 'perc');
    expect(perc?.pagePath).toBe('/tools/calculators');
    expect(perc?.chatOnlyForm).toBe(true);
    expect(perc?.chatOnRequest).toBe(true);
  });

  it('indexes Wells PE as chat-only on calculator hub', () => {
    const rows = getMedicalToolsCatalogRows();
    const wells = rows.find((r) => r.primaryId === 'wells-pe' || r.id === 'wells-pe');
    expect(wells?.pagePath).toBe('/tools/calculators');
    expect(wells?.chatOnlyForm).toBe(true);
    expect(wells?.chatOnRequest).toBe(true);
    expect(wells?.uiCalculatorSlug).toBeNull();
  });

  it('indexes TIMI UA/NSTEMI with dedicated page and calculator slug', () => {
    const rows = getMedicalToolsCatalogRows();
    const timi = rows.find((r) => r.primaryId === 'timi-ua-nstemi' || r.id === 'timi-ua-nstemi');
    expect(timi?.pagePath).toBe('/tools/calculators/timi-ua-nstemi');
    expect(timi?.uiCalculatorSlug).toBe('timi-ua-nstemi');
    expect(timi?.chatOnRequest).toBe(true);
    // timi-ua-nstemi now has a real backend executor (REGISTRY_ID_TO_ORCHESTRATOR_TOOL).
    expect(timi?.backendExecutor).toBe(true);
  });

  it('finds wells-pe via pe-score alias search', () => {
    const rows = getMedicalToolsCatalogRows();
    const hits = catalogRowsMatchingQuery(rows, 'pe-score');
    expect(hits.some((r) => r.primaryId === 'wells-pe')).toBe(true);
  });

  it('indexes MELD-Na with dedicated page and calculator slug', () => {
    const rows = getMedicalToolsCatalogRows();
    const meldNa = rows.find((r) => r.primaryId === 'meld-na' || r.id === 'meld-na');
    expect(meldNa?.pagePath).toBe('/tools/calculators/meld-na');
    expect(meldNa?.uiCalculatorSlug).toBe('meld-na');
    expect(meldNa?.chatOnRequest).toBe(true);
  });

  it('includes calculators hub and procedures registry shortcuts', () => {
    const rows = getMedicalToolsCatalogRows();
    const hub = rows.find((r) => r.id === 'calculators');
    expect(hub?.pagePath).toBe('/tools/calculators');
    expect(hub?.launchable).toBe(true);

    const procedures = rows.find((r) => r.id === 'procedures');
    expect(procedures?.pagePath).toBe('/tools/procedures');
    expect(procedures?.launchable).toBe(true);
  });

  it('marks dose-calculator as chat-assisted hub tool (informational)', () => {
    const rows = getMedicalToolsCatalogRows();
    const dose = rows.find((r) => r.primaryId === 'dose-calculator');
    expect(dose?.chatOnlyForm).toBe(true);
    expect(dose?.category).toBe('chat-assisted');
    expect(dose?.launchLabel).toBe('Start guided chat');
  });
});

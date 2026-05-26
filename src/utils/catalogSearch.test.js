import { describe, it, expect } from 'vitest';
import { getMedicalToolsCatalogRows } from '../data/medicalToolsCatalogIndex';
import { phantomToolReferences } from '../data/sourceCodeToolDiscovery';
import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';
import { getAllDiscoveredTools } from '../data/sourceCodeToolDiscovery';
import {
  assertCatalogCategoriesNormalized,
  catalogRowsMatchingQuery,
  enrichDiscoveredCatalogRow,
  enrichMedicalCatalogRow,
  getSearchTermsForCatalogIds,
  isDiscoveredRowLaunchable,
  isOrchestratorRegisteredNlu,
  matchesCatalogRow,
  matchesDiscoveredRow,
  matchesMedicalCatalogCategoryFilter,
  normalizeCatalogCategory,
  textMatchesCatalogQuery,
  validateMedicalCatalogRow,
} from './catalogSearch';

describe('catalogSearch', () => {
  it('finds tools by NLU alias phrases', () => {
    const rows = getMedicalToolsCatalogRows();
    expect(catalogRowsMatchingQuery(rows, 'pe-score').some((r) => r.primaryId === 'wells-pe')).toBe(
      true
    );
    expect(
      catalogRowsMatchingQuery(rows, 'depression screen').some((r) => r.primaryId === 'phq9')
    ).toBe(true);
    expect(
      catalogRowsMatchingQuery(rows, 'anxiety screen').some((r) => r.primaryId === 'gad7')
    ).toBe(true);
  });

  it('includes alias terms for canonical registry ids', () => {
    const terms = getSearchTermsForCatalogIds('wells-pe');
    expect(terms).toContain('pe-score');
    expect(terms).toContain('wells-pe');
  });

  it('normalizes hub-only rows to chat-assisted category', () => {
    const rows = getMedicalToolsCatalogRows();
    const wells = rows.find((r) => r.primaryId === 'wells-pe');
    expect(wells?.category).toBe('chat-assisted');
    expect(normalizeCatalogCategory('calculator', { chatOnlyForm: true })).toBe('chat-assisted');
  });

  it('marks Tier B hub tools with Start guided chat launch label', () => {
    const rows = getMedicalToolsCatalogRows();
    const wells = rows.find((r) => r.primaryId === 'wells-pe');
    expect(wells?.chatOnlyForm).toBe(true);
    expect(wells?.launchLabel).toBe('Start guided chat');
    expect(wells?.launchable).toBe(true);
  });

  it('flags dispatch-ai as NLU API intent without orchestrator registration', () => {
    const rows = getMedicalToolsCatalogRows();
    const dispatch = rows.find((r) => r.primaryId === 'dispatch-ai');
    expect(dispatch?.backendApiIntentOnly).toBe(true);
    expect(dispatch?.backendApiRegistered).toBe(false);
    expect(isOrchestratorRegisteredNlu('dispatch-ai')).toBe(false);
    expect(isOrchestratorRegisteredNlu('sofa-calculator')).toBe(true);
  });

  it('treats phantom discovery rows as not launchable', () => {
    for (const phantom of phantomToolReferences) {
      expect(isDiscoveredRowLaunchable(phantom)).toBe(false);
    }
  });

  it('resolves launch for alias ids used in catalog search', () => {
    const launch = resolveCatalogLaunch('pe-score');
    expect(launch.registryId).toBe('wells-pe');
    expect(launch.path || launch.chatSeed).toBeTruthy();
  });

  it('enriched medical rows include required metadata fields', () => {
    const rows = getMedicalToolsCatalogRows();
    for (const row of rows) {
      expect(row.id || row.primaryId).toBeTruthy();
      expect(row.name).toBeTruthy();
      expect(row.category).toBeTruthy();
      expect(row.description).toBeTruthy();
      expect(Array.isArray(row.searchTerms)).toBe(true);
      expect(typeof row.launchable).toBe('boolean');
    }
  });

  it('matchesCatalogRow uses searchTerms on enriched rows', () => {
    const row = enrichMedicalCatalogRow({
      primaryId: 'phq9',
      id: 'phq9',
      name: 'PHQ-9',
      category: 'calculator',
      description: 'Depression screening',
      searchTerms: ['depression screen'],
    });
    expect(matchesCatalogRow(row, 'depression screen')).toBe(true);
  });

  it('textMatchesCatalogQuery resolves NLU/registry alias ids', () => {
    const terms = getSearchTermsForCatalogIds('sofa-calculator');
    expect(terms).toContain('sofa-score');
    expect(
      textMatchesCatalogQuery('SOFA Score', 'sofa-score', { ids: ['sofa-calculator'] })
    ).toBe(true);
  });

  it('validateMedicalCatalogRow passes for every medical index row', () => {
    const rows = getMedicalToolsCatalogRows();
    assertCatalogCategoriesNormalized(rows);
    for (const row of rows) {
      const result = validateMedicalCatalogRow(row);
      expect(result.ok, `missing on ${row.primaryId}: ${result.missing.join(', ')}`).toBe(true);
      expect(row.title).toBeTruthy();
    }
  });

  it('labels dispatch-ai discovery rows as NLU API intent', () => {
    const dispatch = getAllDiscoveredTools().find((r) => r.id === 'dispatch-ai');
    expect(dispatch).toBeTruthy();
    const enriched = enrichDiscoveredCatalogRow(dispatch);
    expect(enriched.displayStatus).toBe('nlu-api-intent');
    expect(enriched.backendApiIntentOnly).toBe(true);
    expect(enriched.launchable).toBe(true);
  });

  it('matches discovered scan rows by alias terms', () => {
    const rows = getAllDiscoveredTools();
    expect(matchesDiscoveredRow(rows.find((r) => r.id === 'wells-pe'), 'pe-score')).toBe(true);
  });

  it('does not mark informational phantom tools launchable', () => {
    const phantom = { id: 'fake-tool', status: 'phantom', name: 'Fake' };
    expect(isDiscoveredRowLaunchable(phantom)).toBe(false);
    expect(enrichDiscoveredCatalogRow(phantom).launchable).toBe(false);
  });

  it('matchesMedicalCatalogCategoryFilter maps checker to diagnostic tools', () => {
    const rows = getMedicalToolsCatalogRows();
    const drugCheck = rows.find((r) => r.sidebarToolId === 'drug-check' || r.id === 'drug-check');
    expect(drugCheck).toBeTruthy();
    expect(matchesMedicalCatalogCategoryFilter(drugCheck, 'checker')).toBe(true);

    const qsofa = rows.find((r) => r.primaryId === 'qsofa');
    expect(matchesMedicalCatalogCategoryFilter(qsofa, 'calculator')).toBe(true);
    expect(matchesMedicalCatalogCategoryFilter(qsofa, 'chat-assisted')).toBe(false);
  });

  it('labels Tier-A calculator rows with Open calculator launch label', () => {
    const rows = getMedicalToolsCatalogRows();
    const qsofa = rows.find((r) => r.primaryId === 'qsofa');
    expect(qsofa?.launchLabel).toBe('Open calculator');
  });
});

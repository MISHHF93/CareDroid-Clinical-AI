import { describe, it, expect } from 'vitest';
import { getMedicalToolsCatalogRows } from '../data/medicalToolsCatalogIndex';
import { phantomToolReferences } from '../data/sourceCodeToolDiscovery';
import { resolveCatalogLaunch } from '../data/clinicalCatalogWiring';
import {
  catalogRowsMatchingQuery,
  enrichMedicalCatalogRow,
  getSearchTermsForCatalogIds,
  isDiscoveredRowLaunchable,
  isOrchestratorRegisteredNlu,
  matchesCatalogRow,
  normalizeCatalogCategory,
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
    const apache = rows.find((r) => r.primaryId === 'apache2-calculator');
    expect(apache?.category).toBe('chat-assisted');
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
});

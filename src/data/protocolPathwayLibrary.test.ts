import { describe, expect, it } from 'vitest';
import {
  buildProtocolAiPrompt,
  getProtocolPathwayById,
  getProtocolPathwaysByCategory,
  PROTOCOL_CATEGORIES,
  PROTOCOL_PATHWAYS,
  searchProtocolPathways,
} from './protocolPathwayLibrary';

describe('protocolPathwayLibrary', () => {
  it('covers required clinical pathway categories', () => {
    expect(PROTOCOL_CATEGORIES).toEqual([
      'sepsis',
      'ACS',
      'stroke',
      'trauma',
      'DKA',
      'respiratory failure',
      'pediatric fever',
    ]);
    expect(PROTOCOL_PATHWAYS.map((protocol) => protocol.category)).toEqual(
      expect.arrayContaining(PROTOCOL_CATEGORIES)
    );
  });

  it('models viewer content, version history, calculators, and simulations', () => {
    const sepsis = getProtocolPathwayById('sepsis');

    expect(sepsis.title).toBe('Sepsis Management');
    expect(sepsis.steps.length).toBeGreaterThan(0);
    expect(sepsis.versionHistory.length).toBeGreaterThan(0);
    expect(sepsis.linkedCalculators.map((calculator) => calculator.id)).toContain('qsofa');
    expect(sepsis.linkedSimulations.map((simulation) => simulation.id)).toContain('sepsis-deterioration');
    expect(buildProtocolAiPrompt(sepsis)).toMatch(/decision support only/i);
  });

  it('filters and searches pathways by clinical terms', () => {
    expect(getProtocolPathwaysByCategory('DKA')).toHaveLength(1);
    expect(searchProtocolPathways('troponin').map((protocol) => protocol.id)).toContain('acs');
    expect(searchProtocolPathways('PEWS').map((protocol) => protocol.id)).toContain('pediatric-fever');
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildCustomerExpansionOpportunities,
  getExpansionOpportunityBand,
} from './customerExpansionEngine';

describe('customerExpansionEngine', () => {
  it('recommends ICU and Simulation packs for hospitals using Emergency Pack', () => {
    const model = buildCustomerExpansionOpportunities({
      organizationType: 'hospital',
      currentPacks: ['Emergency Pack'],
    });
    const packs = model.segments.flatMap((segment) =>
      segment.opportunities.map((opportunity) => opportunity.recommendedPack),
    );

    expect(model.summary.opportunityCount).toBe(2);
    expect(packs).toEqual(expect.arrayContaining(['ICU Pack', 'Simulation Pack']));
    expect(model.summary.highConfidenceCount).toBe(2);
  });

  it('recommends Research and AI Evaluation packs for universities using Education Pack', () => {
    const model = buildCustomerExpansionOpportunities({
      organizationType: 'university',
      currentPacks: ['Education Pack'],
    });
    const packs = model.segments.flatMap((segment) =>
      segment.opportunities.map((opportunity) => opportunity.recommendedPack),
    );

    expect(packs).toEqual(expect.arrayContaining(['Research Pack', 'AI Evaluation Pack']));
    expect(model.segments[0].opportunities.every((opportunity) => opportunity.evidenceCount > 0)).toBe(true);
  });

  it('assigns opportunity bands from score thresholds', () => {
    expect(getExpansionOpportunityBand(90)).toMatchObject({ id: 'high-confidence' });
    expect(getExpansionOpportunityBand(74)).toMatchObject({ id: 'qualified' });
    expect(getExpansionOpportunityBand(52)).toMatchObject({ id: 'nurture' });
  });
});

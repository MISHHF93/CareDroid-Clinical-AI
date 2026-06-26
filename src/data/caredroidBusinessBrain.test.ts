import { describe, expect, it } from 'vitest';
import {
  BUSINESS_BRAIN_ANALYTIC_DOMAINS,
  BUSINESS_BRAIN_RECOMMENDATION_TYPES,
  buildCareDroidBusinessBrain,
} from './caredroidBusinessBrain';

describe('caredroidBusinessBrain', () => {
  it('aggregates all required analytics domains', () => {
    const brain = buildCareDroidBusinessBrain();
    const domains = brain.analytics.map((item) => item.domain);

    expect(domains).toEqual(expect.arrayContaining(BUSINESS_BRAIN_ANALYTIC_DOMAINS));
    expect(brain.summary.analyticDomainCount).toBe(7);
    for (const domain of brain.analytics) {
      expect(domain.score).toBeGreaterThan(0);
      expect(domain.metrics.length).toBeGreaterThan(0);
    }
  });

  it('generates all required business recommendations', () => {
    const brain = buildCareDroidBusinessBrain();
    const recommendationTypes = brain.recommendations.map((item) => item.type);

    expect(recommendationTypes).toEqual(
      expect.arrayContaining(BUSINESS_BRAIN_RECOMMENDATION_TYPES),
    );
    expect(brain.summary.recommendationCount).toBe(5);
    expect(brain.summary.highPriorityCount).toBeGreaterThan(0);
  });

  it('connects platform operations to business operations', () => {
    const brain = buildCareDroidBusinessBrain();

    expect(brain.sourceModels.productLayer.products.length).toBeGreaterThan(0);
    expect(brain.sourceModels.workflowMining.mostCommonUserJourneys.length).toBeGreaterThan(0);
    expect(brain.sourceModels.department.departments.length).toBeGreaterThan(0);
    expect(brain.recommendations.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        'Merge protocol lookup and workflow builder assets',
        'Onboard customers with low activation and high expansion fit',
      ]),
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_KNOWLEDGE_BASE_ARTICLES,
  KNOWLEDGE_BASE_CATEGORIES,
  buildKnowledgeBaseAssistantContext,
  searchCustomerKnowledgeBase,
} from './customerKnowledgeBase';

describe('customerKnowledgeBase', () => {
  it('covers all required customer training categories', () => {
    expect(KNOWLEDGE_BASE_CATEGORIES).toEqual([
      'onboarding',
      'workflows',
      'calculators',
      'simulations',
      'integrations',
      'ai-agents',
      'troubleshooting',
    ]);

    for (const category of KNOWLEDGE_BASE_CATEGORIES) {
      expect(
        CUSTOMER_KNOWLEDGE_BASE_ARTICLES.some((article) => article.category === category),
      ).toBe(true);
    }
  });

  it('returns relevant articles for customer training searches', () => {
    const results = searchCustomerKnowledgeBase('How do I request SSO and FHIR integrations?');

    expect(results[0]).toMatchObject({
      id: 'integrations-request-connectors',
      category: 'integrations',
    });
  });

  it('builds an assistant context that records knowledge base first search', () => {
    const context = buildKnowledgeBaseAssistantContext('tenant context troubleshooting');

    expect(context.searchedFirst).toBe(true);
    expect(context.matches[0]).toMatchObject({
      category: 'troubleshooting',
    });
  });
});

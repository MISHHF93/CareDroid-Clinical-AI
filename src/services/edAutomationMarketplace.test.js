import { describe, expect, it } from 'vitest';
import EdAutomationMarketplace, {
  ED_AUTOMATION_MARKETPLACE_CATEGORIES,
  getEdAutomationMarketplaceDashboard,
} from './edAutomationMarketplace';

describe('EdAutomationMarketplace', () => {
  it('defines ED automation SaaS marketplace categories', () => {
    expect(ED_AUTOMATION_MARKETPLACE_CATEGORIES).toEqual([
      'Triage',
      'Referral',
      'Documentation',
      'EMS',
      'Capacity',
      'Boarding',
      'Equipment',
      'Discharge',
    ]);
  });

  it('packages every Emergency automation with sellable module fields', () => {
    const modules = EdAutomationMarketplace.getMarketplaceModules();

    expect(modules).toHaveLength(10);
    for (const module of modules) {
      expect(module).toEqual(
        expect.objectContaining({
          automationId: expect.any(String),
          title: expect.any(String),
          categories: expect.arrayContaining([expect.any(String)]),
          enabled: expect.any(Boolean),
          disabled: expect.any(Boolean),
          subscriptionTier: expect.any(String),
          workspaceVisibility: expect.any(Array),
          roiEstimate: expect.any(String),
        })
      );
      expect(module.roiEstimate.length).toBeGreaterThan(12);
    }
  });

  it('groups modules by marketplace category', () => {
    const categories = EdAutomationMarketplace.getMarketplaceCategories();

    expect(categories).toHaveLength(8);
    expect(categories.find((category) => category.category === 'Boarding')).toEqual(
      expect.objectContaining({
        moduleCount: expect.any(Number),
        modules: expect.arrayContaining([
          expect.objectContaining({
            title: 'Surge Staffing',
          }),
        ]),
      })
    );
    expect(categories.find((category) => category.category === 'EMS').modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Virtual ED',
        }),
      ])
    );
  });

  it('returns a marketplace dashboard summary', () => {
    const dashboard = getEdAutomationMarketplaceDashboard();

    expect(dashboard).toEqual(
      expect.objectContaining({
        categories: expect.any(Array),
        modules: expect.any(Array),
        metrics: expect.objectContaining({
          totalModules: 10,
          enabledModules: expect.any(Number),
          disabledModules: expect.any(Number),
          categories: 8,
          reviewRequired: expect.any(Number),
        }),
        packagingStatement: expect.stringMatching(/sellable SaaS modules/i),
      })
    );
  });
});

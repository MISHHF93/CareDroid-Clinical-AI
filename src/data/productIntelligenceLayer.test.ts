import { describe, expect, it } from 'vitest';
import {
  PRODUCT_INTELLIGENCE_PRODUCTS,
  buildProductIntelligenceLayer,
  getProductHealthBand,
} from './productIntelligenceLayer';

describe('productIntelligenceLayer', () => {
  it('generates adoption, ROI, health, and engagement for every SaaS product', () => {
    const layer = buildProductIntelligenceLayer();

    expect(layer.products).toHaveLength(PRODUCT_INTELLIGENCE_PRODUCTS.length);
    for (const product of layer.products) {
      expect(product.adoption.score).toBeGreaterThan(0);
      expect(product.roi.score).toBeGreaterThan(0);
      expect(product.health.score).toBeGreaterThan(0);
      expect(product.engagement.score).toBeGreaterThan(0);
      expect(product.health.band.label).toBeTruthy();
    }
  });

  it('represents the Product to Pack to Asset to Usage to Outcome value chain', () => {
    const layer = buildProductIntelligenceLayer();
    const emergency = layer.products.find((product) => product.id === 'emergency-department-solution');

    expect(emergency.valueChain.product).toBe('Emergency Flow Intelligence Platform');
    expect(emergency.valueChain.packs).toEqual(expect.arrayContaining(['Emergency Flow Pack']));
    expect(emergency.valueChain.assets).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'ED command center' })]),
    );
    expect(emergency.valueChain.usage.launches).toBeGreaterThan(0);
    expect(emergency.valueChain.outcomes).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Bottleneck reduction' })]),
    );
  });

  it('summarizes product portfolio value', () => {
    const layer = buildProductIntelligenceLayer();

    expect(layer.summary.productCount).toBe(3);
    expect(layer.summary.averageAdoption).toBeGreaterThan(0);
    expect(layer.summary.averageRoi).toBeGreaterThan(0);
    expect(layer.summary.averageHealth).toBeGreaterThan(0);
    expect(layer.summary.averageEngagement).toBeGreaterThan(0);
    expect(layer.summary.totalEstimatedValue).toBeGreaterThan(layer.summary.totalImplementationCost);
    expect(getProductHealthBand(86)).toMatchObject({ id: 'excellent' });
  });
});

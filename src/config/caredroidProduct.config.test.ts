import { describe, expect, it } from 'vitest';
import { CAREDROID_PRODUCT } from './caredroidProduct.config';
import { EMERGENCY_OS_BRANDING } from './emergencyOsBranding.config';

const LEGACY_PRODUCT_NAMES = /Emergency OS|AIIOS|Clinical AI|CareDroid Clinical|Clinical OS|CareDroid-Clinical-AI/i;

describe('caredroidProduct identity', () => {
  it('uses CareDroid as the sole external product name', () => {
    expect(CAREDROID_PRODUCT.name).toBe('CareDroid');
    expect(EMERGENCY_OS_BRANDING.productName).toBe('CareDroid');
    expect(EMERGENCY_OS_BRANDING.copilotName).toBe('CareDroid Copilot');
  });

  it('does not expose legacy competing product identities in branding', () => {
    const brandingValues = Object.values(EMERGENCY_OS_BRANDING).join(' ');
    expect(brandingValues).not.toMatch(LEGACY_PRODUCT_NAMES);
  });

  it('uses CareDroid as the only product name in canonical config', () => {
    const serialized = JSON.stringify(CAREDROID_PRODUCT);
    expect(serialized).not.toMatch(LEGACY_PRODUCT_NAMES);
    expect(CAREDROID_PRODUCT.copilotRole).toContain('CareDroid Copilot');
  });

  it('positions CareDroid as reception-first first-resolution ED platform', () => {
    expect(CAREDROID_PRODUCT.tagline).toContain('Reception-first');
    expect(CAREDROID_PRODUCT.firstResolutionLine).toContain('First-resolution');
    expect(CAREDROID_PRODUCT.receptionRoute).toBe('/emergency/reception');
  });
});
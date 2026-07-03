import { describe, expect, it } from 'vitest';
import { buildEmergencyToolsRedirect } from '../App';

function redirectFor(pathname, search = '', hash = '') {
  const target = buildEmergencyToolsRedirect({ pathname, search, hash });
  return `${target.pathname}${target.search}${target.hash || ''}`;
}

describe('Medical Tools route alias fixtures', () => {
  it.each([
    ['/tools', '/emergency/tools?source=tools'],
    ['/catalog', '/emergency/tools?source=catalog&filter=all'],
    ['/tools/catalog/', '/emergency/tools?source=catalog&filter=all'],
    ['/all-tools', '/emergency/tools?source=all-tools&filter=all'],
    ['/clinical-tools', '/emergency/tools?source=clinical-tools&filter=clinical-tools'],
    ['/tools/calculator/qsofa/', '/emergency/tools?source=calculators&filter=calculator&q=qsofa&open=qsofa'],
    ['/scores/has-bled', '/emergency/tools?source=calculators&filter=calculator&q=has-bled&open=has-bled'],
    ['/tools/quick%20sofa', '/emergency/tools?source=tools&filter=clinical-tools&q=qsofa&open=qsofa'],
    ['/fleet/route-optimizer', '/emergency/tools?source=operations&filter=operations&q=route-optimizer&open=route-optimizer'],
    ['/operations/route%20optimizer', '/emergency/tools?source=operations&filter=operations&q=route-optimizer&open=route-optimizer'],
    ['/digital-twin', '/emergency/tools?source=operations&filter=operations&q=digital-twin&open=digital-twin'],
    ['/pharmacy/drug-interactions', '/emergency/tools?source=clinical-tools&filter=clinical-tools&q=drug-check&open=drug-check'],
    ['/radiology/chest-xray', '/emergency/tools?source=workflows&filter=ai-workflows&q=guideline-rag&open=guideline-rag'],
    ['/automation', '/workflows'],
    ['/automation-analytics', '/workflows'],
  ])('maps %s to %s', (source, expected) => {
    expect(redirectFor(source)).toBe(expected);
  });

  it('preserves unrelated query params while adding redirect intent for retired tool aliases', () => {
    expect(redirectFor('/pharmacy/drug-interactions', '?patientId=p1')).toBe(
      '/emergency/tools?patientId=p1&source=clinical-tools&filter=clinical-tools&q=drug-check&open=drug-check',
    );
  });

  it('preserves hashes while adding redirect intent', () => {
    expect(redirectFor('/tools/calculator/qsofa', '', '#result')).toBe(
      '/emergency/tools?source=calculators&filter=calculator&q=qsofa&open=qsofa#result',
    );
  });

  it('does not throw for malformed encoded tool slugs', () => {
    expect(redirectFor('/tools/%E0%A4%A')).toBe(
      '/emergency/tools?source=tools&filter=clinical-tools&q=%25E0%25A4%25A&open=%25E0%25A4%25A',
    );
  });
});

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardsCss = readFileSync(join(__dirname, 'cards.css'), 'utf8');
const contrastCss = readFileSync(join(__dirname, '../card-contrast-normalization.css'), 'utf8');
const patientCardTsx = readFileSync(join(__dirname, '../../components/PatientCard.tsx'), 'utf8');

describe('CDL v2 card contrast contract', () => {
  it('defines severity-aware card surfaces and wait text utilities', () => {
    expect(cardsCss).toContain('.cdl-card[data-severity=\'critical\']');
    expect(cardsCss).toContain('.cdl-wait[data-severity=\'critical\']');
    expect(cardsCss).toContain('--cdl-critical-text');
    expect(cardsCss).toContain('.patient-card.cdl-card');
    expect(cardsCss).toContain('.cdl-badge[data-tone=\'critical\']');
  });

  it('does not force white contract over severity-tinted cards', () => {
    expect(contrastCss).toContain(':not([data-severity])');
    expect(contrastCss).toContain('Severity cards own their contrast');
    expect(contrastCss).toContain('--cdl-ink-muted');
  });

  it('PatientCard uses CDL severity instead of raw wait hex', () => {
    expect(patientCardTsx).toContain('cdl-card');
    expect(patientCardTsx).toContain('data-severity');
    expect(patientCardTsx).toContain('waitSeverity');
    expect(patientCardTsx).not.toMatch(/waitStatusColor\s*=\s*hasLwbsRisk\s*\?\s*'#EF4444'/);
    expect(patientCardTsx).not.toContain("'#EF4444'");
    expect(patientCardTsx).not.toContain("'#F59E0B'");
  });

  it('PatientCard disables double rail (::before off; single border-left shell)', () => {
    expect(cardsCss).toContain('.patient-card.cdl-card::before');
    expect(cardsCss).toMatch(/\.patient-card\.cdl-card::before\s*\{[\s\S]*display:\s*none/);
    expect(patientCardTsx).toContain('secondaryHeaderBadges');
    expect(patientCardTsx).toContain('patient-card__secondary-badges');
  });

  it('does not force nested Visual QA min-height shells', () => {
    const patientCss = readFileSync(
      join(__dirname, '../../components/PatientCard.css'),
      'utf8',
    );
    expect(patientCss).not.toContain('min-height: 246px');
    expect(patientCss).not.toContain('min-height: 338px');
    expect(patientCss).not.toContain('border-left: 7px');
  });

  it('composition rules keep zones flat and patient board leaf-only', () => {
    const composition = readFileSync(join(__dirname, 'composition.css'), 'utf8');
    expect(composition).toContain('data-cdl-zone');
    expect(composition).toContain('cdl-patient-board');
    expect(composition).toContain('box-shadow: none');
    expect(composition).toContain('cdl-situation-cell');
  });

  it('MetricGraphicCard is a single surface class (no emergency-route-card stack)', () => {
    const kit = readFileSync(
      join(__dirname, '../../components/graphics/CdlGraphicKit.tsx'),
      'utf8',
    );
    expect(kit).toContain('cdl-metric-graphic-card');
    expect(kit).not.toMatch(/cdl-metric-graphic-card['"\s,\n]+'emergency-route-card'/);
  });
});

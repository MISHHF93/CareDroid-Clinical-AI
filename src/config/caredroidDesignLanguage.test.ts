import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CDL_COMPONENT_PREFIXES,
  CDL_COMPONENT_STANDARDS,
  CDL_PAGE_ZONES,
  CDL_PRINCIPLES,
  CDL_SEMANTIC_ROLE_ORDER,
  CDL_TONE_TO_SEMANTIC,
  cdlSemanticSurfaceClass,
  cdlZoneClassName,
  resolveCdlSemanticRole,
} from './caredroidDesignLanguage';
import { SEMANTIC_COLOR_ROLES } from './semanticColorSystem';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cdlCss = readFileSync(join(__dirname, '../styles/caredroid-design-language.css'), 'utf8');
const designSystemCss = readFileSync(join(__dirname, '../styles/design-system.css'), 'utf8');
const primitivesSource = readFileSync(
  join(__dirname, '../components/ui/CareDroidPrimitives.tsx'),
  'utf8',
);

describe('caredroidDesignLanguage', () => {
  it('defines ED OS design principles and seven page composition zones', () => {
    expect(CDL_PRINCIPLES.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(CDL_PAGE_ZONES)).toEqual([
      'identity',
      'operationalSummary',
      'primaryActions',
      'activeWork',
      'supportingContext',
      'analytics',
      'history',
    ]);
    expect(cdlZoneClassName('activeWork')).toBe('cdl-zone cdl-zone--active-work');
  });

  it('extends semantic roles for AI, operational status, and infrastructure health', () => {
    expect(CDL_SEMANTIC_ROLE_ORDER).toContain('ai_assistance');
    expect(CDL_SEMANTIC_ROLE_ORDER).toContain('operational_status');
    expect(CDL_SEMANTIC_ROLE_ORDER).toContain('infrastructure_health');
    expect(SEMANTIC_COLOR_ROLES.ai_assistance.cssVar).toBe('--semantic-ai-assistance');
    expect(cdlSemanticSurfaceClass('ai_assistance')).toBe('cdl-surface cdl-surface--ai-assistance');
  });

  it('maps operational tones to semantic roles', () => {
    expect(resolveCdlSemanticRole('copilot')).toBe('ai_assistance');
    expect(resolveCdlSemanticRole('infrastructure')).toBe('infrastructure_health');
    expect(resolveCdlSemanticRole('warning')).toBe('warning');
    expect(CDL_TONE_TO_SEMANTIC.operational).toBe('operational_status');
  });

  it('is wired through the canonical design-system entry', () => {
    expect(designSystemCss).toContain("@import './caredroid-design-language.css'");
  });

  it('declares semantic tokens and zone classes in CSS', () => {
    [
      '--semantic-ai-assistance',
      '--semantic-operational-status',
      '--semantic-infrastructure-health',
      '.cdl-operational-page',
      '.cdl-zone--operational-summary',
      '.cdl-surface--critical',
    ].forEach((token) => {
      expect(cdlCss).toContain(token);
    });
  });

  it('formalizes OperationalPageTemplate in shared primitives', () => {
    expect(primitivesSource).toContain('function OperationalPageTemplate');
    expect(primitivesSource).toContain('function OperationalZone');
    expect(primitivesSource).toContain('function CareDroidPage');
    expect(primitivesSource).toContain('function PublicPageTemplate');
    expect(primitivesSource).toContain('function OperationalGrid');
    expect(CDL_COMPONENT_PREFIXES).toContain('cdl-zone');
    expect(CDL_COMPONENT_STANDARDS.pageShell.emergencyWrapper).toBe('EmergencyRoutePage');
    expect(CDL_COMPONENT_STANDARDS.aiPanel.tone).toBe('ai_assistance');
  });
});
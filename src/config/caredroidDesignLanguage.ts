/**
 * CareDroid Design Language (CDL) — single programmatic contract for the ED Operating System.
 * CSS custom properties in caredroid-design-language.css are the runtime source of truth.
 *
 * Principles: scan before read · group before decorate · state before aesthetics · guide before detail.
 */
import {
  DESIGN_BREAKPOINTS_PX,
  DESIGN_ELEVATION,
  DESIGN_SPACING,
  DESIGN_TYPOGRAPHY,
} from '../layout/designTokens';
import {
  SEMANTIC_COLOR_ROLES,
  type SemanticColorRole,
  resolveSemanticColorRole,
} from './semanticColorSystem';

/** Core interaction principles every surface must follow. */
export const CDL_PRINCIPLES = Object.freeze([
  'Operational meaning drives color — never decoration.',
  'Typography supports scanning before reading.',
  'Spacing groups related work before ornament.',
  'Layouts guide attention before presenting detail.',
  'One component library, role-aware density variants only.',
  'Predictable interactions under time pressure.',
]);

/**
 * Standard page composition zones — every screen answers:
 * What is happening? What needs attention? Who owns this? What should happen next?
 */
export const CDL_PAGE_ZONES = Object.freeze({
  identity: Object.freeze({
    id: 'identity',
    label: 'Page identity',
    className: 'cdl-zone cdl-zone--identity',
    question: 'Where am I in the ED OS?',
  }),
  operationalSummary: Object.freeze({
    id: 'operational-summary',
    label: 'Operational summary',
    className: 'cdl-zone cdl-zone--operational-summary',
    question: 'What is happening right now?',
  }),
  primaryActions: Object.freeze({
    id: 'primary-actions',
    label: 'Primary actions',
    className: 'cdl-zone cdl-zone--primary-actions',
    question: 'What should happen next?',
  }),
  activeWork: Object.freeze({
    id: 'active-work',
    label: 'Active work',
    className: 'cdl-zone cdl-zone--active-work',
    question: 'What requires immediate attention?',
  }),
  supportingContext: Object.freeze({
    id: 'supporting-context',
    label: 'Supporting context',
    className: 'cdl-zone cdl-zone--supporting-context',
    question: 'What context supports this decision?',
  }),
  analytics: Object.freeze({
    id: 'analytics',
    label: 'Analytics',
    className: 'cdl-zone cdl-zone--analytics',
    question: 'What trends inform the next hour?',
  }),
  history: Object.freeze({
    id: 'history',
    label: 'Historical information',
    className: 'cdl-zone cdl-zone--history',
    question: 'What happened before this moment?',
  }),
});

export type CdlPageZoneId = keyof typeof CDL_PAGE_ZONES;

/** Extended semantic roles beyond clinical urgency — AI, ops, and infrastructure. */
export const CDL_EXTENDED_SEMANTIC_ROLES = Object.freeze({
  ...SEMANTIC_COLOR_ROLES,
  warning: Object.freeze({
    label: 'Warning / caution threshold',
    fg: 'var(--semantic-warning)',
    bg: 'var(--semantic-warning-bg)',
    border: 'var(--semantic-warning-border)',
    cssVar: '--semantic-warning',
  }),
  ai_assistance: Object.freeze({
    label: 'AI assistance / recommendations',
    fg: 'var(--semantic-ai-assistance)',
    bg: 'var(--semantic-ai-assistance-bg)',
    border: 'var(--semantic-ai-assistance-border)',
    cssVar: '--semantic-ai-assistance',
  }),
  operational_status: Object.freeze({
    label: 'Live operational status',
    fg: 'var(--semantic-operational-status)',
    bg: 'var(--semantic-operational-status-bg)',
    border: 'var(--semantic-operational-status-border)',
    cssVar: '--semantic-operational-status',
  }),
  infrastructure_health: Object.freeze({
    label: 'Infrastructure / service health',
    fg: 'var(--semantic-infrastructure-health)',
    bg: 'var(--semantic-infrastructure-health-bg)',
    border: 'var(--semantic-infrastructure-health-border)',
    cssVar: '--semantic-infrastructure-health',
  }),
});

export type CdlSemanticRole = keyof typeof CDL_EXTENDED_SEMANTIC_ROLES;

export const CDL_SEMANTIC_ROLE_ORDER: readonly CdlSemanticRole[] = Object.freeze([
  'critical',
  'urgent',
  'warning',
  'attention',
  'healthy',
  'information',
  'ai_assistance',
  'operational_status',
  'infrastructure_health',
  'inactive',
]);

/** Maps extended tones (AI, ops, infra) to semantic roles. */
export const CDL_TONE_TO_SEMANTIC: Readonly<Record<string, CdlSemanticRole>> = Object.freeze({
  critical: 'critical',
  urgent: 'urgent',
  warning: 'warning',
  watch: 'attention',
  attention: 'attention',
  high: 'urgent',
  stable: 'healthy',
  success: 'healthy',
  healthy: 'healthy',
  info: 'information',
  information: 'information',
  ai: 'ai_assistance',
  copilot: 'ai_assistance',
  recommendation: 'ai_assistance',
  operational: 'operational_status',
  live: 'operational_status',
  infrastructure: 'infrastructure_health',
  service: 'infrastructure_health',
  neutral: 'inactive',
  inactive: 'inactive',
});

export function resolveCdlSemanticRole(
  tone: string | undefined,
  fallback: CdlSemanticRole = 'inactive',
): CdlSemanticRole {
  if (!tone) return fallback;
  return (
    CDL_TONE_TO_SEMANTIC[tone] || resolveSemanticColorRole(tone, fallback as SemanticColorRole)
  );
}

export function cdlSemanticSurfaceClass(role: CdlSemanticRole): string {
  return `cdl-surface cdl-surface--${role.replace(/_/g, '-')}`;
}

export function cdlZoneClassName(zoneId: CdlPageZoneId): string {
  return CDL_PAGE_ZONES[zoneId].className;
}

/** Motion — calm, purposeful; respects reduced-motion. */
export const CDL_MOTION = Object.freeze({
  durationFast: 'var(--cdl-motion-fast, 120ms)',
  durationStandard: 'var(--cdl-motion-standard, 180ms)',
  durationEmphasis: 'var(--cdl-motion-emphasis, 260ms)',
  easing: 'var(--cdl-motion-ease, cubic-bezier(0.22, 1, 0.36, 1))',
  reducedMotionQuery: '(prefers-reduced-motion: reduce)',
});

/** Accessibility baseline — WCAG-aligned touch targets and focus. */
export const CDL_ACCESSIBILITY = Object.freeze({
  focusRing: 'var(--app-focus-ring)',
  minTouchTarget: '44px',
  skipLinkClass: 'ed-skip-link',
  liveRegionPoliteness: Object.freeze({ assertive: 'assertive', polite: 'polite' }),
});

/** Iconography — Lucide-aligned stroke, consistent sizing. */
export const CDL_ICONOGRAPHY = Object.freeze({
  strokeWidth: 1.75,
  sizes: Object.freeze({
    sm: 'var(--app-icon-size-sm, 1rem)',
    md: 'var(--app-icon-size-md, 1.25rem)',
    lg: 'var(--app-icon-size-lg, 1.5rem)',
  }),
  operationalIcons: Object.freeze({
    critical: 'alert-octagon',
    urgent: 'alert-triangle',
    healthy: 'check-circle',
    ai_assistance: 'sparkles',
    operational_status: 'activity',
    infrastructure_health: 'server',
  }),
});

/** Role-aware information density — same language, different data weight. */
export const CDL_ROLE_DENSITY = Object.freeze({
  reception: 'simple-fast',
  triage: 'medium-safety',
  charge_nurse: 'high-operational',
  physician: 'patient-clinical',
  administrator: 'metric-aggregate',
  it_staff: 'metric-aggregate',
  public_display: 'public-aggregate',
});

/** Responsive grid presets — use with `.cdl-grid` + modifier class. */
export const CDL_GRID = Object.freeze({
  base: 'cdl-grid',
  metrics: 'cdl-grid cdl-grid--metrics',
  cards: 'cdl-grid cdl-grid--cards',
  split: 'cdl-grid cdl-grid--split',
  tools: 'cdl-grid cdl-grid--tools',
});

/** Typography utility classes for operational scan hierarchy. */
export const CDL_TYPOGRAPHY = Object.freeze({
  display: 'cdl-type-display',
  heading: 'cdl-type-heading',
  subheading: 'cdl-type-subheading',
  eyebrow: 'cdl-type-eyebrow',
  muted: 'cdl-type-muted',
  mono: 'cdl-type-mono',
});

/** Shell class registry — one language across ED, entry, and display contexts. */
export const CDL_SHELL = Object.freeze({
  base: 'cdl-shell',
  emergency: 'emergency-app-shell cdl-shell',
  entry: 'cdl-shell cdl-shell--entry',
  display: 'cdl-shell cdl-shell--display',
  publicPage: 'cdl-public-page',
});

export const CDL_FOUNDATION = Object.freeze({
  spacing: DESIGN_SPACING,
  typography: DESIGN_TYPOGRAPHY,
  elevation: DESIGN_ELEVATION,
  breakpoints: DESIGN_BREAKPOINTS_PX,
  cssEntry: 'src/styles/caredroid-design-language.css',
  applicationSweep: 'src/styles/cdl-unified-application.css',
  pageShellClass: 'cd-page-shell',
  operationalPageClass: 'cdl-operational-page',
  publicPageClass: 'cdl-public-page',
});

/** Reusable component class prefixes governed by CDL. */
export const CDL_COMPONENT_PREFIXES = Object.freeze([
  'cd-page-shell',
  'cd-section-header',
  'cd-dashboard-grid',
  'cd-surface-card',
  'cd-metric-card',
  'cd-status-widget',
  'cd-info-notice',
  'cd-data-table',
  'cd-state',
  'cd-btn',
  'cdl-zone',
  'cdl-surface',
]);

/** Component usage standards — one library, semantic tones only. */
export const CDL_COMPONENT_STANDARDS = Object.freeze({
  pageShell: Object.freeze({
    component: 'CareDroidPage | PageShell + OperationalPageTemplate',
    emergencyWrapper: 'EmergencyRoutePage',
    identityClass: 'cdl-zone--identity',
  }),
  button: Object.freeze({
    classPrefix: 'cd-btn',
    variants: ['primary', 'secondary', 'ghost', 'outline', 'danger', 'link'],
    legacyAlias: 'emergency-route-filter-banner__btn',
  }),
  card: Object.freeze({
    classPrefix: 'cd-surface-card',
    legacyAlias: 'emergency-route-card',
    tones: CDL_SEMANTIC_ROLE_ORDER,
  }),
  metric: Object.freeze({
    classPrefix: 'cd-metric-card',
    legacyAlias: 'emergency-route-metric-card',
    valueClass: 'cd-metric-card__value',
  }),
  status: Object.freeze({
    classPrefix: 'cd-status-widget',
    badgeClass: 'cd-status-badge',
    semanticMap: 'resolveCdlSemanticRole',
  }),
  aiPanel: Object.freeze({
    classPrefix: 'cdl-ai-panel',
    tone: 'ai_assistance',
  }),
  healthWidget: Object.freeze({
    classPrefix: 'cdl-health-widget--infrastructure',
    tone: 'infrastructure_health',
  }),
  situationBrief: Object.freeze({
    classPrefix: 'cdl-situation-brief',
    legacyAlias: 'emergency-route-situation-brief',
    questions: ['Happening now', 'Needs attention', 'Owner', 'Next action'],
  }),
  table: Object.freeze({ classPrefix: 'cd-data-table', wrapClass: 'cd-table-wrap' }),
  form: Object.freeze({ fieldClass: 'cd-form-field', filterClass: 'cd-filter-panel' }),
  state: Object.freeze({
    loading: 'cd-state--loading',
    unsupported: 'cd-state--unsupported',
    empty: 'emergency-route-empty',
  }),
});

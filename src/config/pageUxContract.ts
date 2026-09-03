/**
 * Shared UX contract for the page-by-page CareDroid rebuild.
 * Every rebuilt surface should satisfy these zones unless explicitly exempt (e.g. kiosk).
 */
export const PAGE_UX_ZONES = Object.freeze({
  orientation: 'orientation',
  situationBrief: 'situation-brief',
  journeyRail: 'journey-rail',
  primaryWorkspace: 'primary-workspace',
  supportingContext: 'supporting-context',
  primaryActions: 'primary-actions',
  emptyState: 'empty-state',
  loadingState: 'loading-state',
  errorState: 'error-state',
} as const);

export type PageUxZone = (typeof PAGE_UX_ZONES)[keyof typeof PAGE_UX_ZONES];

export const PAGE_REBUILD_STATUS = Object.freeze({
  pending: 'pending',
  inProgress: 'in_progress',
  rebuilt: 'rebuilt',
  deferred: 'deferred',
} as const);

export type PageRebuildStatus = (typeof PAGE_REBUILD_STATUS)[keyof typeof PAGE_REBUILD_STATUS];

export type PageUxContract = Readonly<{
  /** Layout shell — AppShell, DisplayShell, or AuthShell */
  shell: 'app' | 'display' | 'minimal';
  /** Required content zones for this page type */
  requiredZones: readonly PageUxZone[];
  /** Uses EmergencyRoutePage / OperationalPageTemplate */
  usesEdRouteTemplate: boolean;
  /** Registers route chrome (eyebrow/title) with AppShell */
  registersRouteChrome: boolean;
  /** PHI visibility tier */
  phiTier: 'full' | 'staff' | 'operational' | 'public_redacted' | 'none';
}>;

export const DEFAULT_ED_PAGE_UX_CONTRACT: PageUxContract = Object.freeze({
  shell: 'app',
  requiredZones: [
    PAGE_UX_ZONES.orientation,
    PAGE_UX_ZONES.situationBrief,
    PAGE_UX_ZONES.journeyRail,
    PAGE_UX_ZONES.primaryWorkspace,
    PAGE_UX_ZONES.primaryActions,
    PAGE_UX_ZONES.emptyState,
    PAGE_UX_ZONES.loadingState,
    PAGE_UX_ZONES.errorState,
  ],
  usesEdRouteTemplate: true,
  registersRouteChrome: true,
  phiTier: 'staff',
});

export const ENTRY_HUB_UX_CONTRACT: PageUxContract = Object.freeze({
  shell: 'app',
  requiredZones: [
    PAGE_UX_ZONES.orientation,
    PAGE_UX_ZONES.primaryWorkspace,
    PAGE_UX_ZONES.primaryActions,
  ],
  usesEdRouteTemplate: false,
  registersRouteChrome: true,
  phiTier: 'none',
});

export const PUBLIC_DISPLAY_UX_CONTRACT: PageUxContract = Object.freeze({
  shell: 'display',
  requiredZones: [
    PAGE_UX_ZONES.orientation,
    PAGE_UX_ZONES.situationBrief,
    PAGE_UX_ZONES.primaryWorkspace,
    PAGE_UX_ZONES.emptyState,
    PAGE_UX_ZONES.loadingState,
  ],
  usesEdRouteTemplate: false,
  registersRouteChrome: false,
  phiTier: 'public_redacted',
});

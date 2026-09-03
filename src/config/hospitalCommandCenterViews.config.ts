import { CANONICAL_ROUTES } from './routes.config';

export type CommandCenterIntelligenceView = 'executive' | 'ai' | 'predictive';

export type CommandCenterIntelligenceViewDefinition = Readonly<{
  id: CommandCenterIntelligenceView;
  label: string;
  description: string;
  legacyPaths: readonly string[];
  /**
   * HEAL-080: the standalone page this condensed lens summarizes (real,
   * substantial content -- see HEAL-022) -- restored to a real route rather
   * than left orphaned. Lets the lens link back to the fuller original
   * dashboard instead of only offering the "Default view" redirect.
   */
  fullDashboardPath: string;
}>;

export const COMMAND_CENTER_INTELLIGENCE_VIEWS: readonly CommandCenterIntelligenceViewDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'executive',
      label: 'Executive lens',
      description: 'Shift KPIs, platform health, and surge posture for hospital leadership.',
      legacyPaths: Object.freeze([CANONICAL_ROUTES.executive]),
      fullDashboardPath: CANONICAL_ROUTES.executiveDashboard,
    }),
    Object.freeze({
      id: 'ai',
      label: 'AI operations lens',
      description: 'Model health, expert roster, governance signals, and AI cost posture.',
      legacyPaths: Object.freeze([
        CANONICAL_ROUTES.aiCommandCenter,
        '/ai/command-center',
        '/ai-command',
      ]),
      fullDashboardPath: CANONICAL_ROUTES.aiOperationsDashboard,
    }),
    Object.freeze({
      id: 'predictive',
      label: 'Predictive intelligence lens',
      description: 'Risk models for deterioration, overcrowding, and clinical escalation.',
      legacyPaths: Object.freeze([CANONICAL_ROUTES.predictiveAnalytics]),
      fullDashboardPath: CANONICAL_ROUTES.predictiveAnalyticsDashboard,
    }),
  ]);

const VIEW_BY_LEGACY_PATH = Object.freeze(
  Object.fromEntries(
    COMMAND_CENTER_INTELLIGENCE_VIEWS.flatMap((view) =>
      view.legacyPaths.map((path) => [path, view.id]),
    ),
  ),
) as Record<string, CommandCenterIntelligenceView>;

export function resolveCommandCenterIntelligenceView(
  search: string,
): CommandCenterIntelligenceView | null {
  const view = new URLSearchParams(search).get('view');
  if (view === 'executive' || view === 'ai' || view === 'predictive') {
    return view;
  }
  return null;
}

export function resolveCommandCenterViewFromPath(
  pathname: string,
): CommandCenterIntelligenceView | null {
  const normalized = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return VIEW_BY_LEGACY_PATH[normalized] ?? null;
}

export function commandCenterRedirectForView(view: CommandCenterIntelligenceView): string {
  return `${CANONICAL_ROUTES.emergencyCommandCenter}?view=${view}`;
}

export const COMMAND_CENTER_INTELLIGENCE_REDIRECTS = Object.freeze(
  COMMAND_CENTER_INTELLIGENCE_VIEWS.flatMap((view) =>
    view.legacyPaths.map((path) =>
      Object.freeze({
        path,
        view: view.id,
        to: commandCenterRedirectForView(view.id),
      }),
    ),
  ),
);

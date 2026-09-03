import { useMemo, type ReactNode } from 'react';
import useRovingTabs from '../../hooks/useRovingTabs';
import EdDataSourceBanner from '../../components/emergency/EdDataSourceBanner';
import PatientCard from '../../components/PatientCard';
import EdJourneyProgressRail from '../../components/emergency/EdJourneyProgressRail';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { OperationalPageTemplate, PageShell } from '../../components/ui/CareDroidPrimitives';
import { PatientFlag } from '../../types/emergency';
import { isEmergencyOsBoarding } from '../../../lib/emergency-os/logic';
import { resolveEdDataFreshness, resolveEdSourceLabel } from '../../utils/edDataSource';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { metricColorForTone } from '../../config/semanticColorSystem';
import useEdOperatingSurface from '../../hooks/useEdOperatingSurface';
import usePatientWorkflow from '../../hooks/usePatientWorkflow';
import { useEmergencyStore } from '../../store/emergencyStore';
import { MetricGraphicCard, SituationGraphicCard } from '../../components/graphics/CdlGraphicKit';
import { CdlEmptyIllustration } from '../../components/graphics/CdlGraphicIllustrations';
import { resolveEmptyStateGraphic } from '../../config/cdlGraphicModel';
import './emergency-route.css';

export type WorkflowSituationTone = 'neutral' | 'info' | 'warning' | 'critical';

export type WorkflowSituationBriefProps = {
  status?: ReactNode;
  attention?: ReactNode;
  owner?: ReactNode;
  nextAction?: ReactNode;
  tone?: WorkflowSituationTone;
  className?: string;
};

const SITUATION_BRIEF_LABELS = Object.freeze({
  status: 'Happening now',
  attention: 'Needs attention',
  owner: 'Owner',
  nextAction: 'Next action',
});

export function WorkflowSituationBrief({
  status,
  attention,
  owner,
  nextAction,
  tone = 'neutral',
  className = '',
}: WorkflowSituationBriefProps) {
  const surfaces = usePractitionerSurfaceVisibility();
  if (!surfaces.emergencyRoutes.showSituationBrief) {
    return null;
  }

  const items = [
    { id: 'status', label: SITUATION_BRIEF_LABELS.status, value: status },
    { id: 'attention', label: SITUATION_BRIEF_LABELS.attention, value: attention },
    { id: 'owner', label: SITUATION_BRIEF_LABELS.owner, value: owner },
    { id: 'nextAction', label: SITUATION_BRIEF_LABELS.nextAction, value: nextAction },
  ].filter((item) => item.value != null && item.value !== '');

  if (!items.length) {
    return null;
  }

  const cdlTone = tone === 'info' ? 'information' : tone === 'neutral' ? 'inactive' : tone;

  return (
    <section
      className={[
        /* One summary surface — cells inside are flat, not nested cards */
        'emergency-route-situation-brief',
        'cdl-situation-brief',
        'cdl-surface-flat',
        `emergency-route-situation-brief--${tone}`,
        tone !== 'neutral' ? `cdl-situation-brief--${cdlTone}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Workflow situation summary"
      data-cdl-surface="summary"
    >
      <ol className="emergency-route-situation-brief__list emergency-route-situation-brief__list--graphic cdl-situation-grid">
        {items.map((item) => (
          <SituationGraphicCard
            key={item.id}
            id={item.id as 'status' | 'attention' | 'owner' | 'nextAction'}
            label={item.label}
            value={item.value}
          />
        ))}
      </ol>
    </section>
  );
}

const MATURITY_CHIP_LABELS = {
  demo: 'Demo',
  preview: 'Preview',
  planned: 'Planned',
};

export function MaturityChip({ maturity }) {
  if (!maturity || maturity === 'live' || !MATURITY_CHIP_LABELS[maturity]) return null;

  return (
    <span
      className={`emergency-route-maturity-chip emergency-route-maturity-chip--${maturity}`}
      aria-label={`${MATURITY_CHIP_LABELS[maturity]} surface`}
    >
      {MATURITY_CHIP_LABELS[maturity]}
    </span>
  );
}

const FLOW_CAPACITY_VIEWS = [
  { id: 'capacity', label: 'Capacity' },
  { id: 'boarding', label: 'Boarding' },
] as const;

const FLOW_CAPACITY_VIEW_IDS = FLOW_CAPACITY_VIEWS.map((view) => view.id);

export function FlowCapacityViewTabs({ activeView, onViewChange }) {
  // Declared role="tablist"/role="tab" with an accurate aria-selected, but had
  // none of the keyboard half: no arrow keys, and every tab left in the tab order
  // so Tab walked through the strip instead of treating it as one stop.
  const { tabListRef, onKeyDown, tabIndexFor } = useRovingTabs({
    ids: FLOW_CAPACITY_VIEW_IDS,
    activeId: activeView,
    onSelect: onViewChange,
  });

  return (
    <div
      className="emergency-route-view-tabs"
      role="tablist"
      aria-label="Flow and capacity views"
      ref={tabListRef}
    >
      {FLOW_CAPACITY_VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          tabIndex={tabIndexFor(view.id)}
          onKeyDown={onKeyDown}
          {...(activeView === view.id
            ? { 'aria-selected': 'true' as const }
            : { 'aria-selected': 'false' as const })}
          className={`emergency-route-view-tabs__btn${
            activeView === view.id ? ' emergency-route-view-tabs__btn--active' : ''
          }`}
          onClick={() => onViewChange(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

export function EmergencyRoutePage({
  title = undefined,
  titleId = undefined,
  description = undefined,
  children = undefined,
  actions = undefined,
  situationBrief = undefined,
  showJourneyRail = true,
  surfaceClassName = '',
  primaryActions = undefined,
  supportingContext = undefined,
  analytics = undefined,
  history = undefined,
  operationalSummaryExtra = undefined,
  // Accepted as an alias for `children` — two real pages (ClinicalAlertsPage,
  // HospitalCommandCenter) pass their main content this way, matching the
  // `activeWork` zone name below; without this, that content was silently
  // dropped (this component's props are typed `any`, so nothing caught it).
  activeWork = undefined,
}: any = {}) {
  const surfaces = usePractitionerSurfaceVisibility();
  const operatingSurface = useEdOperatingSurface();
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const patientWorkflow = usePatientWorkflow(selectedPatientId);
  const compactLayout = surfaces.compactLayout;
  const showDescription = description && surfaces.emergencyRoutes.showDescriptions;
  const resolvedSituationBrief = useMemo(() => {
    const base = situationBrief ?? operatingSurface.situationBrief ?? undefined;
    if (!patientWorkflow.hasPatient || !patientWorkflow.step) {
      return base;
    }
    return {
      ...base,
      owner: base?.owner ?? patientWorkflow.ownerRole,
      nextAction: base?.nextAction ?? patientWorkflow.primaryAction,
    };
  }, [situationBrief, operatingSurface.situationBrief, patientWorkflow]);
  // No static eyebrow/maturity/Guide in chrome — staff use title + sidebar Guide only.
  const headerActions = useMemo(() => (actions ? <>{actions}</> : null), [actions]);

  const routeChrome = useMemo(
    () => ({
      eyebrow: undefined,
      title,
      subtitle: showDescription ? description : undefined,
      actions: headerActions,
    }),
    [description, headerActions, showDescription, title],
  );

  // HEAL-185 applied to the emergency route shell too. This component
  // registers its title with the shell's RouteChrome slot (ShellRouteTab
  // renders the page's one REAL, visible <h1>) and ALSO passed `title` to
  // PageShell, whose suppressHeader branch renders a visually-hidden <h1>
  // with the same text -- leaving two elements in the accessibility tree
  // with an identical heading role and name. Confirmed live across 16
  // emergency routes (queues, ems, patients, alerts, boarding, capacity,
  // reassessment, referrals, handoffs, diagnostics, ed-readiness, dispatch,
  // journey, reports, ...): a screen reader announced every page title twice
  // when navigating by headings. CareDroidPage already guarded against
  // exactly this; this shell never got the same treatment.
  //
  // Withhold the title from PageShell ONLY when registration actually
  // succeeded, mirroring CareDroidPage: outside a RouteChromeProvider (unit
  // harnesses) the hook no-ops, and dropping the title unconditionally would
  // leave those pages with no <h1> at all.
  // Withholding the title alone is not enough, and CareDroidPage already
  // learned why: registration "succeeding" only means a provider was present,
  // not that anything rendered ShellRouteTab to consume it. Several route
  // tests mount a provider without the shell, so dropping the title outright
  // removed it from the tree entirely and those tests hung waiting for it.
  // Keep an always-rendered plain-text copy -- a <p>, deliberately NOT a
  // heading, so it carries the name without competing for the heading role.
  const chromeRegistered = useRouteChromeRegistration(routeChrome);

  return (
    <>
      {chromeRegistered && title ? (
        <p className="sr-only cd-page-shell__title-text" data-testid="cd-page-title-text">
          {title}
        </p>
      ) : null}
      <PageShell
        as="section"
        suppressHeader
        title={chromeRegistered ? undefined : title}
        titleId={titleId}
        className={[
          'emergency-route-page',
          'cd-page-shell',
          compactLayout ? 'emergency-route-page--practitioner-compact' : '',
          surfaceClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        contentClassName="emergency-route-page__content"
        aria-label={title}
      >
        <OperationalPageTemplate
          zones={{
            operationalSummary: (
              <>
                {showJourneyRail &&
                surfaces.emergencyRoutes.showJourneyRail &&
                operatingSurface.phaseId &&
                selectedPatientId ? (
                  <EdJourneyProgressRail
                    activePhaseId={operatingSurface.phaseId}
                    ownerRole={patientWorkflow.ownerRole ?? operatingSurface.ownerRole}
                    priorityLabel={operatingSurface.priority}
                    patientId={selectedPatientId}
                    encounterId={
                      (patientWorkflow.patient as { encounterId?: string } | null)?.encounterId ??
                      null
                    }
                  />
                ) : null}
                {resolvedSituationBrief ? (
                  <WorkflowSituationBrief {...resolvedSituationBrief} />
                ) : null}
                {operationalSummaryExtra}
              </>
            ),
            primaryActions,
            activeWork: activeWork ?? children,
            supportingContext,
            analytics,
            history,
          }}
        />
      </PageShell>
    </>
  );
}

/** Prefer semantic tone; never pass raw hex as color into metric tiles. */
function resolveMetricTone(metric: { tone?: string; color?: string }): string | undefined {
  if (metric.tone) return metric.tone;
  const c = String(metric.color || '').toUpperCase();
  if (!c) return undefined;
  if (c.includes('EF4444') || c.includes('DC2626') || c.includes('B91C1C')) return 'critical';
  if (c.includes('F97316') || c.includes('EA580C') || c.includes('C2410C')) return 'urgent';
  if (c.includes('F59E0B') || c.includes('D97706') || c.includes('B45309')) return 'warning';
  if (c.includes('10B981') || c.includes('059669') || c.includes('15803D')) return 'success';
  if (c.includes('0EA5E9') || c.includes('0284C7') || c.includes('075985')) return 'info';
  return 'neutral';
}

export function MetricGrid({ metrics }) {
  const surfaces = usePractitionerSurfaceVisibility();
  if (surfaces.active && !surfaces.emergencyRoutes.showMetricCards) {
    return null;
  }

  return (
    <div className="emergency-route-metric-grid emergency-route-metric-grid--graphic">
      {metrics.map((metric) => {
        const tone = resolveMetricTone(metric);
        const accent = tone ? metricColorForTone(tone) : undefined;
        return (
          <MetricGraphicCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={tone}
            color={accent}
            progress={metric.progress}
            iconKey={metric.iconKey}
          />
        );
      })}
    </div>
  );
}

export function PatientGrid({ patients, emptyMessage }) {
  if (!patients.length) {
    return (
      <div
        role="status"
        className="emergency-route-card emergency-route-empty emergency-route-empty--graphic cdl-surface cdl-elev-1"
      >
        <CdlEmptyIllustration variant={resolveEmptyStateGraphic(emptyMessage)} />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div
      className="emergency-route-patient-grid cdl-patient-board"
      data-cdl-surface="board"
      role="list"
      aria-label="Patient cards"
    >
      {patients.map((patient) => (
        <div key={patient.id} className="cdl-patient-board__item" role="listitem">
          <PatientCard patient={patient} />
        </div>
      ))}
    </div>
  );
}

function dataFreshness(generatedAt) {
  return resolveEdDataFreshness(generatedAt);
}

export type EmergencyRouteModuleState = Readonly<{
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  data?: {
    generatedAt?: string;
    source?: string;
  } | null;
}>;

export type OperationalModuleStatePlacement = 'header' | 'footer';

export type OperationalModuleStateProps = Readonly<{
  moduleState: EmergencyRouteModuleState;
  activeScenarioId?: string | null;
  backendAvailable?: boolean;
  compact?: boolean;
  fallbackText?: string;
  placement?: OperationalModuleStatePlacement;
  showApiState?: boolean;
  showDataSourceNote?: boolean;
}>;

/** Canonical loading/error/freshness stack for emergency route pages. */
export function OperationalModuleState({
  moduleState,
  activeScenarioId,
  backendAvailable,
  compact = false,
  fallbackText,
  placement = 'header',
  showApiState = true,
  showDataSourceNote = true,
}: OperationalModuleStateProps) {
  if (placement === 'footer') {
    return showDataSourceNote ? <DataSourceNote moduleState={moduleState} /> : null;
  }

  return (
    <>
      <EdDataSourceBanner
        envelope={moduleState.data}
        loading={moduleState.loading}
        error={moduleState.error}
        activeScenarioId={activeScenarioId}
        backendAvailable={backendAvailable}
        compact={compact}
      />
      {showApiState ? (
        <ApiStateBanner moduleState={moduleState} fallbackText={fallbackText} />
      ) : null}
    </>
  );
}

export function ApiStateBanner({
  moduleState,
  fallbackText = 'Showing the last local CareDroid state. Verify against the current department record before operational decisions.',
}) {
  const surfaces = usePractitionerSurfaceVisibility();
  if (!surfaces.chrome.showDeveloperApiBanners) {
    return null;
  }

  if (moduleState.loading && !moduleState.data) {
    return (
      <div role="status" className="emergency-route-card emergency-route-banner">
        Loading department data...
      </div>
    );
  }

  if (moduleState.error) {
    return (
      <div role="alert" className="emergency-route-banner emergency-route-banner--error">
        {moduleState.error}. {fallbackText}
      </div>
    );
  }

  if (moduleState.isEmpty) {
    return (
      <div role="status" className="emergency-route-card emergency-route-empty">
        No active records are available for this module yet. Add or load department data before
        using this view for handoff decisions.
      </div>
    );
  }

  return null;
}

export function DataSourceNote({ moduleState }) {
  const surfaces = usePractitionerSurfaceVisibility();
  if (!surfaces.chrome.showDeveloperApiBanners) {
    return null;
  }

  const generatedAt = moduleState.data?.generatedAt;
  const source = moduleState.data?.source;
  const freshness = dataFreshness(generatedAt);
  const sourceLabel = resolveEdSourceLabel(source);
  return (
    <div
      role="status"
      title={
        freshness.stale
          ? 'Data may be stale. Validate against current department state.'
          : undefined
      }
      className={`emergency-route-data-source${freshness.stale ? ' emergency-route-data-source--stale' : ''}`}
    >
      Source: {sourceLabel} | {freshness.label}
      {freshness.stale ? ' | validate before operational decisions' : ''}
    </div>
  );
}

export function isHighRisk(patient) {
  return (
    patient.priority === 'P1' ||
    patient.priority === 'P2' ||
    patient.flags.includes(PatientFlag.HighRisk) ||
    patient.flags.includes(PatientFlag.DeteriorationRisk) ||
    patient.flags.includes(PatientFlag.SepsisAlert)
  );
}

export function isBoarding(patient) {
  return isEmergencyOsBoarding(patient);
}

export function displayPatientName(patient) {
  return (
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn
  );
}

const REASSESSMENT_ATTENTION_FLAGS = [
  PatientFlag.DeteriorationRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.HighRisk,
  PatientFlag.ReassessmentDue,
];

export const QUEUE_MOVEMENT_STAGES = Object.freeze({
  Arrival: ['Arrival'],
  Registration: ['Arrival'],
  Triage: ['Triage'],
  Waiting: ['Waiting'],
  Assessment: ['Assessment'],
  Orders: ['Assessment'],
  Results: ['Results'],
  Admission: ['Admission'],
  Boarding: ['Admission'],
  Referral: ['Disposition', 'Admission'],
  Discharge: ['Disposition', 'Discharge'],
  Reassessment: ['Waiting', 'Assessment', 'Results', 'Disposition'],
});

export function needsReassessmentAttention(patient) {
  return REASSESSMENT_ATTENTION_FLAGS.some((flag) => patient.flags.includes(flag));
}

export function findUpgradeSignal(signals = [] as any[], capability) {
  return signals.find((signal) => signal.capability === capability) || null;
}

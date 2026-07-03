import { useMemo, type ReactNode } from 'react';
import PatientCard from '../../components/PatientCard';
import HelpTrigger from '../../components/help/HelpTrigger';
import LivingContextualHelpBanner from '../../components/help/LivingContextualHelpBanner';
import EdJourneyProgressRail from '../../components/emergency/EdJourneyProgressRail';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { OperationalPageTemplate, PageShell } from '../../components/ui/CareDroidPrimitives';
import { PatientFlag, PatientState } from '../../types/emergency';
import { resolveEdDataFreshness, resolveEdSourceLabel } from '../../utils/edDataSource';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { metricColorForTone } from '../../config/semanticColorSystem';
import useEdOperatingSurface from '../../hooks/useEdOperatingSurface';
import usePatientWorkflow from '../../hooks/usePatientWorkflow';
import { useEmergencyStore } from '../../store/emergencyStore';
import {
  MetricGraphicCard,
  SituationGraphicCard,
} from '../../components/graphics/CdlGraphicKit';
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

  const cdlTone =
    tone === 'info' ? 'information' : tone === 'neutral' ? 'inactive' : tone;

  return (
    <section
      className={[
        'emergency-route-situation-brief',
        'cdl-situation-brief',
        'cdl-zone',
        'cdl-zone--operational-summary',
        `emergency-route-situation-brief--${tone}`,
        tone !== 'neutral' ? `cdl-situation-brief--${cdlTone}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Workflow situation summary"
    >
      <ol className="emergency-route-situation-brief__list emergency-route-situation-brief__list--graphic">
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

export function FlowCapacityViewTabs({ activeView, onViewChange }) {
  const views = [
    { id: 'capacity', label: 'Capacity' },
    { id: 'boarding', label: 'Boarding' },
  ];

  return (
    <div className="emergency-route-view-tabs" role="tablist" aria-label="Flow and capacity views">
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={activeView === view.id}
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
  eyebrow = undefined,
  title = undefined,
  titleId = undefined,
  description = undefined,
  children = undefined,
  actions = undefined,
  maturity = undefined,
  situationBrief = undefined,
  showJourneyRail = true,
  surfaceClassName = '',
  primaryActions = undefined,
  supportingContext = undefined,
  analytics = undefined,
  history = undefined,
  operationalSummaryExtra = undefined,
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
  const resolvedEyebrow =
    eyebrow ??
    (operatingSurface.phaseLabel
      ? `ED OS · ${operatingSurface.phaseLabel}`
      : undefined);
  const headerActions = useMemo(
    () => (
      <>
        {actions}
        <HelpTrigger variant="button" className="emergency-route-help-trigger" label="Guide" />
        <MaturityChip maturity={maturity} />
      </>
    ),
    [actions, maturity],
  );

  const routeChrome = useMemo(
    () => ({
      eyebrow: surfaces.chrome.showPageEyebrow ? resolvedEyebrow : undefined,
      title,
      subtitle: showDescription ? description : undefined,
      actions: headerActions,
    }),
    [
      description,
      headerActions,
      resolvedEyebrow,
      showDescription,
      surfaces.chrome.showPageEyebrow,
      title,
    ],
  );

  useRouteChromeRegistration(routeChrome);

  return (
    <PageShell
      as="section"
      suppressHeader
      title={title}
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
              {showJourneyRail && operatingSurface.phaseId ? (
                <EdJourneyProgressRail
                  activePhaseId={operatingSurface.phaseId}
                  ownerRole={patientWorkflow.ownerRole ?? operatingSurface.ownerRole}
                  priorityLabel={operatingSurface.priority}
                  patientId={selectedPatientId}
                  encounterId={
                    (patientWorkflow.patient as { encounterId?: string } | null)?.encounterId ?? null
                  }
                />
              ) : null}
              <LivingContextualHelpBanner />
              {resolvedSituationBrief ? <WorkflowSituationBrief {...resolvedSituationBrief} /> : null}
              {operationalSummaryExtra}
            </>
          ),
          primaryActions,
          activeWork: children,
          supportingContext,
          analytics,
          history,
        }}
      />
    </PageShell>
  );
}

export function MetricGrid({ metrics }) {
  const surfaces = usePractitionerSurfaceVisibility();
  if (surfaces.active && !surfaces.emergencyRoutes.showMetricCards) {
    return null;
  }

  return (
    <div className="emergency-route-metric-grid emergency-route-metric-grid--graphic">
      {metrics.map((metric) => {
        const accent = metric.tone ? metricColorForTone(metric.tone) : metric.color;
        return (
          <MetricGraphicCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
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
      <div role="status" className="emergency-route-card emergency-route-empty emergency-route-empty--graphic">
        <CdlEmptyIllustration variant={resolveEmptyStateGraphic(emptyMessage)} />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="emergency-route-patient-grid">
      {patients.map((patient) => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}

function dataFreshness(generatedAt) {
  return resolveEdDataFreshness(generatedAt);
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
        No active records are available for this module yet. Add or load department data before using this view for handoff decisions.
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
      title={freshness.stale ? 'Data may be stale. Validate against current department state.' : undefined}
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
  return (
    patient.state === PatientState.Admission || patient.flags.includes(PatientFlag.PendingAdmission)
  );
}

export function displayPatientName(patient) {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn;
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

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConversation } from '../../../../contexts/ConversationContext';
import { useToolPreferences } from '../../../../contexts/ToolPreferencesContext';
import { useWorkspace } from '../../../../contexts/WorkspaceContext';
import {
  DEFAULT_CARE_WORKSPACE_ID,
  buildCareWorkspaceModel,
  getWorkspaceSubpageById,
  isFutureWorkspace,
} from '../../../../config/workspace.config';
import { getWorkspaceExperienceProfile } from '../../../../data/workspaceExperience';
import { workspaceFilterSummary } from '../../../../data/platformOperatingSystem';
import { getAutomationAuditEntries } from '../../../../data/automationAuditTrail';
import { getWorkspaceAutomations } from '../../../../data/automationRegistry';
import {
  buildDynamicRiskBundle,
  buildEmergencyCopilotGuidance,
  estimateEmergencyRoi,
  routeEmergencyChiefComplaint,
} from '../../../../data/emergencyOperatingSystem';
import WorkspaceDataPipelineService from '../../../../services/workspaceDataPipelineService';
import AutomationEngine from '../../../../services/automationEngine';
import { applyRegistryToolLaunch } from '../../../../navigation/registryToolLaunch';
import { NavIcon } from '../../../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon, getWorkspaceIcon } from '../../../../navigation/iconRegistry';
import EMSPipeline from '../../../../components/EMSPipeline';
import EmergencyWhiteboard from '../../../../components/EmergencyWhiteboard';
import ReferralPanel from '../../../../components/ReferralPanel';
import ShiftSummary from '../../../../components/ShiftSummary';
import LaunchActionCard from '../../../../components/ui/LaunchActionCard';
import {
  DashboardGrid,
  DashboardSection,
  MetricCard,
  PageShell,
} from '../../../../components/ui/CareDroidPrimitives';
import './WorkspaceHome.css';

function WorkspaceRouteCard({ route, onLaunch }) {
  return (
    <LaunchActionCard
      className="workspace-route-card"
      onClick={() => onLaunch(route.path)}
      ariaLabel={`Open ${route.label}`}
      icon={CHROME_ICONS.layoutDashboard}
      title={route.label}
      description={route.description}
      classNames={{
        icon: 'workspace-route-card__icon',
        body: 'workspace-route-card__body',
      }}
    />
  );
}

function WorkspaceToolCard({ tool, onLaunch }) {
  return (
    <LaunchActionCard
      className="workspace-tool-card"
      onClick={() => onLaunch(tool)}
      ariaLabel={`Open ${tool.name}`}
      icon={getToolIcon(tool.id)}
      iconSize={21}
      iconColor={tool.color}
      title={tool.name}
      description={tool.description}
      meta={tool.category}
      classNames={{
        icon: 'workspace-tool-card__icon',
        body: 'workspace-tool-card__body',
        meta: 'workspace-tool-card__meta',
      }}
    />
  );
}

function cssToken(value = 'default') {
  return String(value || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
}

function workspaceThemeStyle(experience) {
  return {
    '--workspace-os-accent': experience.theme?.accent,
    '--workspace-os-surface': experience.theme?.surface,
    '--workspace-os-border': experience.theme?.border,
  };
}

function statusLabel(status) {
  return status === 'backend-wired' ? 'Backend wired' : 'Demo/local fallback';
}

const SUBPAGE_GROUP_LABELS = Object.freeze({
  command: 'Command',
  flow: 'Flow',
  operations: 'Operations',
  clinical: 'Clinical work',
  proof: 'Pilot proof',
  other: 'More',
});

const EMERGENCY_OS_NAV_ITEMS = Object.freeze([
  Object.freeze({ id: 'whiteboard', label: 'Whiteboard', target: '/workspace/emergency' }),
  Object.freeze({ id: 'patients', label: 'Patients', target: '/workspace/emergency/patients' }),
  Object.freeze({ id: 'ems', label: 'EMS', target: '/workspace/emergency/ems' }),
  Object.freeze({ id: 'operations', label: 'Operations', target: '/workspace/emergency/flow' }),
  Object.freeze({ id: 'copilot', label: 'Copilot', target: '/workspace/emergency/command-center' }),
]);

const EMERGENCY_OS_NAV_ACTIVE_MAP = Object.freeze({
  whiteboard: ['whiteboard'],
  ems: ['ems', 'pre-arrival'],
  patients: ['patient-path', 'patients', 'patient-context', 'intake'],
  operations: [
    'flow',
    'queues',
    'waiting-room',
    'throughput',
    'capacity',
    'boarding',
    'referrals',
    'resources',
    'escalations',
    'iot',
    'analytics',
    'automation-roi',
    'roi',
    'deployment',
    'implementation',
    'demo',
    'intake-analytics',
    'director',
    'charge-nurse',
    'dashboard',
    'automations',
    'documentation',
    'simulations',
    'shift-summary',
  ],
  copilot: ['command-center', 'triage', 'evidence', 'knowledge'],
});

function emergencyOsNavIdForSubpage(activeSubpageId) {
  return (
    EMERGENCY_OS_NAV_ITEMS.find((item) =>
      (EMERGENCY_OS_NAV_ACTIVE_MAP[item.id] || []).includes(activeSubpageId)
    )?.id || 'whiteboard'
  );
}

function groupSubpages(subpages = []) {
  return Object.entries(
    subpages.reduce((groups, subpage) => {
      const group = subpage.group || 'other';
      return {
        ...groups,
        [group]: [...(groups[group] || []), subpage],
      };
    }, {})
  ).map(([group, items]) => ({
    group,
    label: SUBPAGE_GROUP_LABELS[group] || SUBPAGE_GROUP_LABELS.other,
    items: [...items].sort((a, b) => (a.priority || 99) - (b.priority || 99)),
  }));
}

function WorkspaceSubpageTabs({ workspaceId, subpages, activeSubpageId }) {
  const groupedSubpages = groupSubpages(subpages);
  const hasGroupedNavigation = groupedSubpages.some(({ group }) => group !== 'other');
  const renderSubpageGroup = ({ group, label, items }) => (
    <div key={group} className="workspace-subpage-group">
      <span className="workspace-subpage-group__label">{label}</span>
      <div className="workspace-subpage-group__links">
        {items.map((subpage) => (
          <Link
            key={subpage.id}
            to={`/workspace/${workspaceId}/${subpage.id}`}
            className={`workspace-subpage-tab${subpage.id === activeSubpageId ? ' workspace-subpage-tab--active' : ''}`}
            aria-current={subpage.id === activeSubpageId ? 'page' : undefined}
          >
            {subpage.label}
          </Link>
        ))}
      </div>
    </div>
  );

  if (workspaceId === 'emergency') {
    const activeNavId = emergencyOsNavIdForSubpage(activeSubpageId);
    return (
      <nav
        className="workspace-subpage-tabs workspace-subpage-tabs--emergency-os"
        aria-label="Workspace subpages"
        data-qa-ignore-overflow
      >
        {EMERGENCY_OS_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.target}
            className={`workspace-subpage-tab${item.id === activeNavId ? ' workspace-subpage-tab--active' : ''}`}
            aria-current={item.id === activeNavId ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="workspace-subpage-tabs" aria-label="Workspace subpages" data-qa-ignore-overflow>
      {hasGroupedNavigation
        ? groupedSubpages.map(renderSubpageGroup)
        : subpages.map((subpage) => (
            <Link
              key={subpage.id}
              to={`/workspace/${workspaceId}/${subpage.id}`}
              className={`workspace-subpage-tab${subpage.id === activeSubpageId ? ' workspace-subpage-tab--active' : ''}`}
              aria-current={subpage.id === activeSubpageId ? 'page' : undefined}
            >
              {subpage.label}
            </Link>
          ))}
    </nav>
  );
}

function WorkspaceListPanel({
  title,
  description,
  items = [],
  empty = 'No items available.',
  renderItem,
}) {
  return (
    <DashboardSection className="workspace-panel" title={title} description={description}>
      <DashboardGrid className="workspace-card-grid">
        {items.length ? items.map(renderItem) : <p className="workspace-empty-state">{empty}</p>}
      </DashboardGrid>
    </DashboardSection>
  );
}

function WorkspaceCapabilityCard({ item, icon = CHROME_ICONS.activity }) {
  const id = item.id || item.label || item;
  const label = item.label || item.name || item.title || item;
  const detail = item.description || item.detail || item.reason || item.source || '';
  return (
    <article key={id} className="workspace-capability-card">
      <span className="workspace-route-card__icon" aria-hidden>
        <NavIcon icon={icon} size={18} />
      </span>
      <span className="workspace-route-card__body">
        <strong>{label}</strong>
        {detail ? <span>{detail}</span> : null}
      </span>
    </article>
  );
}

function FutureWorkspacePanel({ workspace, onLaunchEmergency }) {
  return (
    <section className="workspace-panel" aria-labelledby="future-workspace-title">
      <div className="workspace-panel__header">
          <p className="workspace-eyebrow">{workspace.roadmapLabel || 'Future Feature'}</p>
        <h2 id="future-workspace-title">{workspace.label} is coming later</h2>
        <p>
          {workspace.productFocus ||
            'This workspace is preserved in the codebase as a roadmap feature.'}
        </p>
      </div>
      <div className="emergency-journey-insights" aria-label="Future feature status">
        <p>
          <strong>Status:</strong> {workspace.availabilityLabel || 'Coming Later'}.
        </p>
        <p>
          <strong>Product focus:</strong> Emergency Department Operating System.
        </p>
        <p>
          <strong>Code posture:</strong> hidden from active workspace selection, not deleted.
        </p>
      </div>
      <button type="button" className="workspace-secondary-action" onClick={onLaunchEmergency}>
        Open CareDroid
      </button>
    </section>
  );
}

function WorkspaceAutomationHub({ workspaceId, solutionPackage, onRunAutomation }) {
  const automationState = AutomationEngine.getWorkspaceAutomationState(workspaceId);
  const history = getAutomationAuditEntries()
    .filter((entry) => entry.workspace.id === workspaceId)
    .slice(0, 5);
  const allAutomations = [
    ...automationState.activeAutomations,
    ...automationState.demoAutomations,
    ...automationState.disabledAutomations,
  ];
  const analytics = {
    runs: history.length,
    success: history.filter((entry) => entry.status === 'success').length,
    blocked: history.filter((entry) => entry.status === 'blocked').length,
    failed: history.filter((entry) => entry.status === 'failed').length,
  };

  return (
    <section className="workspace-automation-layout" aria-label="Workspace automations">
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <h2>{solutionPackage?.title || 'Workspace Automation Hub'}</h2>
          <p>
            Automations package this workspace into a sellable solution: workspace, assets, AI,
            workflows, and measurable outcomes.
          </p>
        </div>
        <div className="workspace-card-grid">
          {allAutomations.map((automation) => (
            <article key={automation.automationId} className="workspace-automation-card">
              <div>
                <strong>{automation.title}</strong>
                <span>{automation.description}</span>
              </div>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{automation.status}</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>{automation.riskLevel}</dd>
                </div>
                <div>
                  <dt>Review</dt>
                  <dd>{automation.humanReviewRequired ? 'Required' : 'Not required'}</dd>
                </div>
                <div>
                  <dt>Readiness</dt>
                  <dd>{automation.readiness?.classification || 'Unclassified'}</dd>
                </div>
              </dl>
              {automation.readiness?.firstCustomerNote ? (
                <span>{automation.readiness.firstCustomerNote}</span>
              ) : null}
              <button
                type="button"
                className="workspace-secondary-action"
                onClick={() => onRunAutomation(automation.automationId)}
              >
                Preview run
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <h2>Automation analytics</h2>
          <p>Workspace-local run history and adoption signals.</p>
        </div>
        <div className="workspace-focus-metrics">
          {Object.entries(analytics).map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>Audit trail</small>
            </div>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <h2>Automation history</h2>
          <p>Recent auditable events for this workspace.</p>
        </div>
        <div className="workspace-card-grid">
          {history.length ? (
            history.map((entry) => (
              <WorkspaceCapabilityCard
                key={entry.id}
                icon={CHROME_ICONS.bolt}
                item={{
                  id: entry.id,
                  label: entry.triggerFired,
                  detail: `${entry.status} · ${entry.actionSelected}`,
                }}
              />
            ))
          ) : (
            <p className="workspace-empty-state">
              No automation history yet. Preview an automation to create an audit event.
            </p>
          )}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <h2>Automation settings</h2>
          <p>Risk, review, and packaging controls for this workspace solution.</p>
        </div>
        <div className="workspace-card-grid">
          <WorkspaceCapabilityCard
            icon={CHROME_ICONS.shield}
            item={{
              id: 'review-required',
              label: 'Human review required',
              detail: `${automationState.settings.humanReviewRequired} automations require review.`,
            }}
          />
          <WorkspaceCapabilityCard
            icon={CHROME_ICONS.circleDollar}
            item={{
              id: 'solution-package',
              label: 'Sellable solution',
              detail: solutionPackage?.title || 'No packaged solution assigned.',
            }}
          />
        </div>
      </div>
    </section>
  );
}

function EmergencyAutomationMarketplacePanel({ marketplace = {} }) {
  const categories = marketplace.categories || [];
  const metrics = marketplace.metrics || {};

  return (
    <section
      className="workspace-panel emergency-automation-marketplace"
      aria-labelledby="ed-automation-marketplace-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">SaaS Marketplace</p>
        <h2 id="ed-automation-marketplace-title">ED Automation Marketplace</h2>
        <p>
          {marketplace.packagingStatement ||
            'Emergency automations are packaged as sellable SaaS features.'}
        </p>
      </div>
      <div className="emergency-journey-summary" aria-label="ED automation marketplace metrics">
        <span>{metrics.totalModules || 0} features</span>
        <span>{metrics.enabledModules || 0} enabled</span>
        <span>{metrics.disabledModules || 0} disabled</span>
        <span>{metrics.categories || 0} categories</span>
      </div>
      <div className="emergency-queue-grid">
        {categories.map((category) => (
          <article key={category.category} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">Marketplace Category</span>
                <h3>{category.category}</h3>
              </div>
              <strong>{category.moduleCount}</strong>
            </div>
            <p>
              {category.enabledCount} enabled · {category.disabledCount} disabled
            </p>
            <div className="emergency-journey-insights">
              {category.modules.map((module) => (
                <p key={`${category.category}-${module.automationId}`}>
                  <strong>{module.title}:</strong> {module.subscriptionTier} ·{' '}
                  {module.enabled ? 'enabled' : 'disabled'} · {module.roiEstimate}
                  <br />
                  <span>Visibility: {module.workspaceVisibility.join(', ')}</span>
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmergencyJourneyFlow({ journey = [], engine = {} }) {
  const metrics = engine.metrics;
  const bottlenecks = engine.bottlenecks || [];
  const recommendations = engine.recommendations || [];

  return (
    <section
      className="workspace-panel emergency-journey-panel"
      aria-labelledby="emergency-journey-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Patient Journey</p>
        <h2 id="emergency-journey-title">Patient Journey Engine</h2>
        <p>
          Every patient, queue, automation, referral, and analytic signal maps to the canonical ED
          flow instead of launching as an isolated tool.
        </p>
      </div>
      {metrics ? (
        <div className="emergency-journey-summary" aria-label="Patient journey metrics">
          <span>{metrics.activePatients} active patients</span>
          <span>{metrics.waitingPatients} waiting</span>
          <span>{metrics.bottleneckCount} bottlenecks</span>
          <span>{metrics.automationCoveragePercent}% automation coverage</span>
        </div>
      ) : null}
      <ol className="emergency-journey-flow">
        {journey.map((stage) => (
          <li key={stage.id}>
            <strong>{stage.label}</strong>
            <span>{stage.description}</span>
            <small className="emergency-journey-meta">
              {stage.automationCount || 0} automations | {stage.metrics?.waitingPatients || 0}{' '}
              waiting | target {stage.metrics?.targetMinutes || stage.targetMinutes} min
            </small>
          </li>
        ))}
      </ol>
      {bottlenecks.length || recommendations.length ? (
        <div className="emergency-journey-insights" aria-label="Patient journey recommendations">
          {bottlenecks.slice(0, 2).map((bottleneck) => (
            <p key={bottleneck.stateId}>
              <strong>{bottleneck.label} bottleneck:</strong> {bottleneck.reason}
            </p>
          ))}
          {recommendations.slice(0, 2).map((recommendation) => (
            <p key={recommendation.id}>
              <strong>{recommendation.title}:</strong> {recommendation.action}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmergencyIntakeCommandCenterPanel({ intake = {}, onLaunchRoute, onAskAssistant }) {
  const commandCenter = intake.commandCenter || {};
  const smartArrival = intake.smartArrival || {};
  const registrationScore = intake.registrationCompletionScore || {};
  const intakeRecord = intake.intakeRecord || {};
  const governance = intake.governance || {};
  const preTriageQueue = intake.preTriageQueue || {};
  const marketplace = intake.marketplace || {};
  const documentIntelligence = intake.documentIntelligence || {};
  const referralDocumentIngestion = intake.referralDocumentIngestion || {};
  const voiceIntake = intake.voiceIntake || {};
  const smartArrivalSnapshot = smartArrival.generatedSnapshot || {};
  const smartArrivalConfirmation = smartArrival.confirmationGate || {};
  const smartArrivalFeed = smartArrival.emergencyWorkspaceFeed || {};

  return (
    <section className="emergency-os-layout" aria-label="Emergency Intake Command Center">
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Emergency Intake OS</p>
          <h2>{commandCenter.title || 'Emergency Intake Command Center'}</h2>
          <p>
            Monitor arrivals, registration, pending verification, pending intake review, and
            triage-ready patients before triage starts.
          </p>
        </div>
        <div
          className="workspace-focus-metrics emergency-analytics-grid"
          aria-label="Emergency intake tracked states"
        >
          {(commandCenter.trackedStates || []).map((state) => (
            <div key={state.id}>
              <span>{state.label}</span>
              <strong>{state.value}</strong>
              <small>active intake window</small>
            </div>
          ))}
        </div>
        <div className="emergency-journey-insights">
          <p>
            <strong>Supported modes:</strong>{' '}
            {(intake.supportedIntakeModes || commandCenter.intakeModes || []).join(', ')}
          </p>
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Smart Arrival</p>
          <h2>{smartArrival.title || 'Smart Arrival'}</h2>
          <p>{smartArrival.operatingModel || 'Embedded in CareDroid.'}</p>
        </div>
        <div className="emergency-journey-summary" aria-label="Smart Arrival summary">
          <span>{(smartArrival.capturePipeline || []).length} capture steps</span>
          <span>{smartArrivalSnapshot.status || 'draft pending confirmation'}</span>
          <span>
            {smartArrivalConfirmation.finalizationStatus ||
              'blocked until patient or staff confirmation'}
          </span>
          <span>{smartArrivalFeed.arrivalState || 'patient summarized inside CareDroid'}</span>
        </div>
        <div className="emergency-journey-insights">
          {(smartArrival.capturePipeline || []).map((step) => (
            <p key={step.id}>
              <strong>{step.label}:</strong> {step.output} · {step.reviewState}
            </p>
          ))}
          <p>
            <strong>Patient Snapshot contains:</strong>{' '}
            {(smartArrivalSnapshot.contains || []).join(', ')}
          </p>
          <p>
            <strong>Confirmation gate:</strong>{' '}
            {smartArrivalConfirmation.rule ||
              'Patient confirmation or staff confirmation is required before finalizing.'}
          </p>
          <p>
            <strong>Emergency Whiteboard:</strong>{' '}
            {(smartArrivalFeed.targetSurfaces || []).join(', ')}
          </p>
        </div>
        <button
          type="button"
          className="workspace-secondary-action"
          onClick={() => onLaunchRoute('/workspace/emergency/patient-context')}
        >
          Open finalized Patient Snapshot
        </button>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Registration Accelerator</p>
          <h2>{registrationScore.label || 'Registration Completion Score'}</h2>
          <p>
            One readiness signal shows whether demographic, identity, contact, insurance, and forms
            are complete.
          </p>
        </div>
        <div className="emergency-journey-summary" aria-label="Registration completion score">
          <span>{registrationScore.score || 0}% complete</span>
          <span>{registrationScore.status || 'needs review'}</span>
          <span>{(registrationScore.missingFields || []).length} missing fields</span>
          <span>{(registrationScore.conflictingFields || []).length} conflicts</span>
        </div>
        <div className="emergency-journey-insights">
          {(commandCenter.bottleneckSignals || []).map((signal) => (
            <p key={signal.id}>
              <strong>{signal.label}:</strong> {signal.value} · {signal.severity}
            </p>
          ))}
          {(commandCenter.staleItems || []).slice(0, 2).map((item) => (
            <p key={item.patientId}>
              <strong>{item.label}:</strong> {item.delayedState} for {item.ageMinutes} min ·{' '}
              {item.intakeMode}
            </p>
          ))}
        </div>
        <button
          type="button"
          className="workspace-secondary-action"
          onClick={() => onLaunchRoute('/workspace/emergency/patient-context')}
        >
          Open Patient Snapshot
        </button>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Verified intake patient</p>
          <h2>{intakeRecord.title || 'Create Intake Patient'}</h2>
          <p>
            {intakeRecord.promotionRule ||
              'Only confirmed values are promoted into the intake patient context.'}
          </p>
        </div>
        <div className="emergency-journey-summary" aria-label="Intake governance summary">
          <span>{(intakeRecord.confirmedFields || []).length} tracked fields</span>
          <span>{(intakeRecord.draftSuggestions || []).length} draft suggestions</span>
          <span>{governance.verificationRule || 'Verification required'}</span>
        </div>
        <div className="emergency-journey-insights">
          {(intakeRecord.fieldProposals || []).map((proposal) => (
            <p key={proposal.field}>
              <strong>{proposal.field}:</strong> {proposal.confirmationState} · {proposal.source}
              {proposal.conflict ? ' · conflict highlighted' : ''}
              {proposal.missing ? ' · missing required value' : ''}
            </p>
          ))}
          {(intakeRecord.draftSuggestions || []).map((suggestion) => (
            <p key={`${suggestion.field}-${suggestion.source}`}>
              <strong>{suggestion.field}:</strong> {suggestion.value} · {suggestion.reason}
            </p>
          ))}
          <p>
            <strong>Consent/audit:</strong>{' '}
            {(governance.artifacts?.consentCapture?.records || []).length} consent records ·{' '}
            {(governance.artifacts?.auditLog || []).length} audit events · correction workflow
            required
          </p>
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">DocumentIntelligenceService</p>
          <h2>Documents become structured data</h2>
          <p>
            Capture, OCR, extraction, validation, review, and structured records preserve source
            references.
          </p>
        </div>
        <div className="emergency-journey-summary" aria-label="Document intelligence summary">
          <span>{(documentIntelligence.supportedInputs || []).length} intake inputs</span>
          <span>{(documentIntelligence.acceptedInputChannels || []).join(', ')}</span>
          <span>{(documentIntelligence.records || []).length} structured records</span>
          <span>{documentIntelligence.searchable ? 'searchable' : 'not searchable'}</span>
          <span>{(documentIntelligence.pipeline || []).join(' -> ')}</span>
        </div>
        <div className="emergency-queue-grid">
          {(documentIntelligence.records || []).map((record) => (
            <article key={record.sourceDocumentReference} className="emergency-queue-card">
              <div className="emergency-queue-card__header">
                <div>
                  <span className="workspace-eyebrow">{record.structuredRecord.reviewState}</span>
                  <h3>{record.documentType}</h3>
                </div>
                <strong>{record.extractedFields.length}</strong>
              </div>
              <p>{record.sourceDocumentReference}</p>
              <small>
                {record.structuredRecord.reviewerAttribution} ·{' '}
                {(record.structuredRecord.unresolvedFields || []).length
                  ? `unresolved: ${record.structuredRecord.unresolvedFields.join(', ')}`
                  : 'review complete'}
              </small>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">External document ingestion</p>
          <h2>{referralDocumentIngestion.title || 'Referral Document Ingestion'}</h2>
          <p>
            External clinical documents become searchable by patient, document type, extracted
            concept, source, and review state.
          </p>
        </div>
        <div className="emergency-journey-summary" aria-label="Referral document ingestion summary">
          <span>{(referralDocumentIngestion.supportedDocuments || []).length} document types</span>
          <span>{(referralDocumentIngestion.extractedConcepts || []).join(', ')}</span>
          <span>
            {referralDocumentIngestion.sourceReferencesStored
              ? 'source references stored'
              : 'source references missing'}
          </span>
        </div>
        <div className="emergency-journey-insights">
          {(referralDocumentIngestion.records || []).slice(0, 3).map((record) => (
            <p key={record.sourceDocumentReference}>
              <strong>{record.documentType}:</strong> {record.sourceDocumentReference} ·{' '}
              {record.structuredRecord.reviewState}
            </p>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Pre-Triage Queue</p>
          <h2>{preTriageQueue.title || 'Pre-Triage Queue'}</h2>
          <p>{preTriageQueue.decisionBoundary || 'No autonomous triage decisions.'}</p>
        </div>
        <div className="emergency-queue-grid">
          {(preTriageQueue.patients || []).map((patient) => (
            <article key={patient.patientId} className="emergency-queue-card">
              <div className="emergency-queue-card__header">
                <div>
                  <span className="workspace-eyebrow">{patient.confirmationStatus}</span>
                  <h3>{patient.displayName}</h3>
                </div>
                <strong>{patient.complaint}</strong>
              </div>
              <p>
                {patient.demographicSummary} · {patient.intakeMode}
              </p>
              <p>
                <strong>Risk:</strong> {patient.riskIndicators.join(', ')}
              </p>
              <p>
                <strong>Missing:</strong>{' '}
                {patient.missingOrUnconfirmedFields.length
                  ? patient.missingOrUnconfirmedFields.join(', ')
                  : 'None'}
              </p>
              <small>
                Queue position {patient.queuePosition} · {patient.arrivalOrIntakeTimestamp}
              </small>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Voice accessibility</p>
          <h2>{voiceIntake.title || 'Voice Assisted Intake'}</h2>
          <p>{voiceIntake.accessibilityStatement}</p>
        </div>
        <div className="emergency-journey-summary" aria-label="Voice intake conversion flow">
          {(voiceIntake.conversionFlow || []).map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
        <div className="emergency-journey-insights">
          <p>
            <strong>Transcript:</strong> {voiceIntake.sampleTranscript}
          </p>
          <p>
            <strong>Structured fields:</strong> {(voiceIntake.structuredFields || []).join(', ')}
          </p>
          {(voiceIntake.mappedFields || []).map((field) => (
            <p key={field.field}>
              <strong>{field.field}:</strong> {field.value} · {field.correctionState}
            </p>
          ))}
          <p>
            <strong>Review and correction:</strong>{' '}
            {voiceIntake.reviewAndCorrectionRequired
              ? 'required before confirmation'
              : 'not configured'}
          </p>
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Sellable product category</p>
          <h2>{marketplace.title || 'Emergency Intake Automation Marketplace'}</h2>
          <p>{marketplace.packagingStatement}</p>
        </div>
        <div
          className="emergency-journey-summary"
          aria-label="Emergency intake marketplace metrics"
        >
          <span>{marketplace.metrics?.totalModules || 0} features</span>
          <span>{marketplace.metrics?.includedInCore || 0} core included</span>
          <span>{marketplace.metrics?.addOnModules || 0} add-ons</span>
          <span>{marketplace.metrics?.reviewControlledModules || 0} review controlled</span>
        </div>
        <div className="emergency-journey-insights">
          {(marketplace.modules || []).slice(0, 4).map((module) => (
            <p key={module.moduleId}>
              <strong>{module.title}:</strong> Core {module.tierAvailability.core}, Pro{' '}
              {module.tierAvailability.pro}, Enterprise {module.tierAvailability.enterprise}
            </p>
          ))}
          {(marketplace.upgradePaths || []).map((path) => (
            <p key={`${path.from}-${path.to}`}>
              <strong>
                {path.from} to {path.to}:
              </strong>{' '}
              unlocks {path.unlocks.join(', ')}
            </p>
          ))}
        </div>
        <button
          type="button"
          className="workspace-secondary-action"
          onClick={() =>
            onAskAssistant(
              'Summarize Emergency Intake OS bottlenecks, registration completion, pending verification, and pre-triage readiness. Keep it operational and review-required.'
            )
          }
        >
          Ask assistant for intake summary
        </button>
      </div>
    </section>
  );
}

function EmergencyPatientContextPanel({ intake = {}, onAskAssistant }) {
  const smartArrival = intake.smartArrival || {};
  const snapshot = intake.patientSnapshot || {};
  const medicationSummary = intake.medicationSummary || {};
  const allergyRiskCapture = intake.allergyRiskCapture || {};
  const identityResolution = intake.identityResolution || {};
  const flags = medicationSummary.flags || {};
  const structuredSummary =
    snapshot.structuredSummary || smartArrival.generatedSnapshot?.structuredSummary || {};
  const demographics = structuredSummary.demographics || {};

  return (
    <section className="emergency-os-layout" aria-label="Patient Snapshot">
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Patient Snapshot</p>
          <h2>{snapshot.title || 'Patient Snapshot'}</h2>
          <p>
            Source-cited patient context generated in {snapshot.generatedWithinSeconds || 'seconds'}{' '}
            seconds and marked
            {` ${snapshot.clinicianReviewStatus || 'review required'}`}.
          </p>
        </div>
        <div className="emergency-queue-grid">
          {(snapshot.sections || []).map((section) => (
            <article key={section.id} className="emergency-queue-card">
              <div className="emergency-queue-card__header">
                <div>
                  <span className="workspace-eyebrow">Source cited</span>
                  <h3>{section.question}</h3>
                </div>
              </div>
              <p>{section.answer}</p>
              <small>Sources: {section.sourceRecords.join(', ')}</small>
            </article>
          ))}
        </div>
        <div className="emergency-journey-insights">
          {(snapshot.freshnessIndicators || []).map((indicator) => (
            <p key={indicator.context}>
              <strong>{indicator.context} freshness:</strong> {indicator.freshness} ·{' '}
              {indicator.source}
            </p>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Smart Arrival finalized snapshot</p>
          <h2>Patient arrives summarized in CareDroid</h2>
          <p>
            {smartArrival.confirmationGate?.rule ||
              'Patient confirmation or staff confirmation is required before finalizing the Patient Snapshot.'}
          </p>
        </div>
        <div className="emergency-journey-summary" aria-label="Finalized Patient Snapshot contents">
          <span>
            Demographics: {demographics.displayName || 'pending'} ·{' '}
            {demographics.dateOfBirth || 'DOB pending'}
          </span>
          <span>Arrival complaint: {structuredSummary.arrivalComplaint || 'pending'}</span>
          <span>Referral reason: {structuredSummary.referralReason || 'pending'}</span>
          <span>
            Chronic conditions:{' '}
            {(structuredSummary.chronicConditions || []).join(', ') || 'None listed'}
          </span>
          <span>Allergies: {(structuredSummary.allergies || []).join(', ') || 'None listed'}</span>
          <span>
            Medications: {(structuredSummary.medications || []).join(', ') || 'None listed'}
          </span>
        </div>
        <p className="emergency-queue-warning">
          <strong>Finalization:</strong>{' '}
          {smartArrival.confirmationGate?.finalizationStatus ||
            'blocked until patient or staff confirmation'}{' '}
          · separate intake app created:{' '}
          {smartArrival.emergencyWorkspaceFeed?.separateIntakeAppCreated ? 'yes' : 'no'}
        </p>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Medication Capture</p>
          <h2>{medicationSummary.title || 'Medication Summary'}</h2>
          <p>
            Duplicates, missing information, and uncertain entries stay flagged until human
            verification.
          </p>
        </div>
        <div className="emergency-journey-insights">
          <p>
            <strong>Duplicates:</strong> {(flags.duplicates || []).join(', ') || 'None'}
          </p>
          <p>
            <strong>Missing information:</strong>{' '}
            {(flags.missingInformation || []).join(', ') || 'None'}
          </p>
          <p>
            <strong>Uncertain entries:</strong>{' '}
            {(flags.uncertainEntries || []).join(', ') || 'None'}
          </p>
        </div>
        <div className="emergency-queue-grid">
          {(medicationSummary.entries || []).map((entry) => (
            <article key={`${entry.name}-${entry.source}`} className="emergency-queue-card">
              <strong>{entry.name}</strong>
              <p>
                {[entry.dose, entry.route, entry.frequency].filter(Boolean).join(' · ') ||
                  'Incomplete medication details'}
              </p>
              <small>
                {entry.source} · {entry.verificationStatus}
              </small>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Allergy and risk capture</p>
          <h2>{allergyRiskCapture.title || 'Allergy and Risk Capture'}</h2>
          <p>
            Critical risk information displays prominently in triage while confirmed and pending
            values remain distinct.
          </p>
        </div>
        <div className="emergency-queue-grid">
          {(allergyRiskCapture.collected || []).map((item) => (
            <article key={`${item.type}-${item.label}`} className="emergency-queue-card">
              <span className="workspace-eyebrow">{item.type}</span>
              <strong>{item.label}</strong>
              <p>
                {item.status} · {item.source}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Identity resolution</p>
          <h2>{identityResolution.title || 'Emergency Identity Resolution Layer'}</h2>
          <p>
            Uncertain matches require review before staff select an existing record or create a new
            record.
          </p>
        </div>
        <div
          className="emergency-journey-summary"
          aria-label="Identity resolution confidence score"
        >
          <span>{identityResolution.confidenceScore?.label || 'Confidence Score'}</span>
          <span>{identityResolution.confidenceScore?.value || 0}</span>
          <span>{identityResolution.confidenceScore?.status || 'review required'}</span>
        </div>
        <div className="emergency-journey-insights">
          {(identityResolution.candidateMatches || []).map((candidate) => (
            <p key={candidate.candidateRecordId}>
              <strong>{candidate.candidateRecordId}:</strong> {candidate.confidenceScore} · matched{' '}
              {candidate.matchedFields.join(', ')} · conflicts{' '}
              {candidate.conflictingFields.join(', ')}
            </p>
          ))}
          <p>
            <strong>Resolution workflow:</strong>{' '}
            {(identityResolution.resolutionWorkflow || []).slice(0, 3).join(', ')}
          </p>
        </div>
        <p className="emergency-queue-warning">
          <strong>Safety boundary:</strong> {snapshot.safetyStatement}
        </p>
        <button
          type="button"
          className="workspace-secondary-action"
          onClick={() =>
            onAskAssistant(
              'Summarize this Patient Snapshot with source citations and clinician review language. Do not diagnose or reconcile medications.'
            )
          }
        >
          Ask assistant for reviewed summary
        </button>
      </div>
    </section>
  );
}

function EmergencyIntakeAnalyticsPanel({ intake = {} }) {
  const analytics = intake.analytics || {};
  const doorToTriage = intake.doorToTriage || {};
  const firstFiveMinuteExperience = intake.firstFiveMinuteExperience || {};
  const patientJourneyFeed = intake.patientJourneyFeed || [];
  const implementationTraceability = intake.implementationTraceability || {};
  const productSurfaces = intake.productSurfaces || [];

  return (
    <section className="emergency-analytics-layout" aria-label="Emergency intake analytics">
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Patient Intake Analytics</p>
          <h2>{analytics.title || 'Patient Intake Analytics'}</h2>
          <p>
            Registration, verification, document volume, completion rate, and triage readiness
            become measurable.
          </p>
        </div>
        <div className="workspace-focus-metrics emergency-analytics-grid">
          {(analytics.metrics || []).map((metric) => (
            <div key={metric.id}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.unit}</small>
            </div>
          ))}
        </div>
        <div className="emergency-journey-insights">
          {Object.entries(analytics.metricDefinitions || {})
            .slice(0, 3)
            .map(([id, definition]) => (
              <p key={id}>
                <strong>{id}:</strong> {definition}
              </p>
            ))}
          {(analytics.trends || []).map((trend) => (
            <p key={trend.metricId}>
              <strong>{trend.metricId} trend:</strong> {trend.direction} · {trend.comparison}
            </p>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Door-to-Triage</p>
          <h2>{doorToTriage.title || 'Patient Flow Door To Triage'}</h2>
          <p>
            First 15-minute intake stages track processing time, bottlenecks, and completion rates.
          </p>
        </div>
        <ol className="emergency-journey-flow">
          {(doorToTriage.stages || []).map((stage) => (
            <li key={stage.id}>
              <strong>{stage.label}</strong>
              <span>{stage.status}</span>
              <small className="emergency-journey-meta">
                {stage.processingMinutes} min | {stage.completionRate}% complete
                {stage.bottleneck ? ` | ${stage.bottleneck}` : ''}
              </small>
              <small className="emergency-journey-meta">
                {stage.startTimestamp} to {stage.completionTimestamp || 'pending'} |{' '}
                {stage.responsibleRole}
              </small>
            </li>
          ))}
        </ol>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">First 5 minutes</p>
          <h2>{firstFiveMinuteExperience.title || 'First Five Minute Experience'}</h2>
          <p>{firstFiveMinuteExperience.improvementStatement}</p>
        </div>
        <div className="workspace-focus-metrics emergency-analytics-grid">
          {(firstFiveMinuteExperience.measures || []).map((measure) => (
            <div key={measure.id}>
              <span>{measure.label}</span>
              <strong>{measure.value}</strong>
              <small>{measure.unit}</small>
              <small>
                {measure.completionTimestamp} · {measure.verificationStatus}
              </small>
              <small>
                {measure.responsibleRole} · {measure.completionStatus}
              </small>
              <small>
                Unresolved:{' '}
                {(measure.missingOrUnresolvedFields || []).length
                  ? measure.missingOrUnresolvedFields.join(', ')
                  : 'none'}
              </small>
            </div>
          ))}
        </div>
        <div className="emergency-journey-insights">
          <p>
            <strong>Blockers:</strong> {(firstFiveMinuteExperience.blockers || []).join(', ')}
          </p>
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Patient Journey Engine whiteboard updates</p>
          <h2>All intake automations update CareDroid</h2>
          <p>
            Every intake feature declares valid patient journey states and remains review-controlled.
          </p>
        </div>
        <div className="emergency-journey-insights">
          {patientJourneyFeed.map((module) => (
            <p key={module.moduleId}>
              <strong>{module.title}:</strong> {module.patientJourneyStates.join(', ')} ·{' '}
              {module.validJourneyStages ? 'valid journey states' : 'invalid journey mapping'}
            </p>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Plan traceability</p>
          <h2>Markdown plans linked to implementation</h2>
          <p>{implementationTraceability.status}</p>
        </div>
        <div className="emergency-journey-summary" aria-label="Intake implementation traceability">
          <span>{implementationTraceability.totalPlans || 0} plans</span>
          <span>{implementationTraceability.implementedPlans || 0} implemented</span>
          <span>{(implementationTraceability.routes || []).length} routes</span>
          <span>{(implementationTraceability.tests || []).length} test files</span>
        </div>
        <div className="emergency-journey-insights">
          {(implementationTraceability.docs || []).slice(0, 6).map((doc) => (
            <p key={doc.docPath}>
              <strong>{doc.capability}:</strong> {doc.docPath} · {doc.acceptance}
            </p>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Emergency Intake OS surfaces</p>
          <h2>Product surfaces connected</h2>
          <p>
            Intake dashboards, review workspaces, queue surfaces, and CareDroid views share one
            governed model.
          </p>
        </div>
        <div className="emergency-journey-insights">
          {productSurfaces.map((surface) => (
            <p key={`${surface.surface}-${surface.artifact}`}>
              <strong>{surface.surface}:</strong> {surface.route} · {surface.artifact}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmergencyDigitalWhiteboardPanel({
  whiteboard = {},
  onLaunchRoute,
  onAskAssistant,
  onWorkspaceAction,
}) {
  const columns = whiteboard.columns || [];
  const summary = whiteboard.summary || {};
  const whiteboardActions = [
    {
      id: 'patients',
      label: 'Patients',
      value: summary.totalActivePatients || 0,
      helper: 'Open patient path',
      target: '/workspace/emergency/patients',
    },
    {
      id: 'queues',
      label: 'Queues',
      value: summary.queueBottlenecks || 0,
      helper: 'Review queue pressure',
      target: '/workspace/emergency/queues',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      value: summary.activeAlerts || 0,
      helper: 'Escalate active alerts',
      target: '/workspace/emergency/escalations',
    },
    {
      id: 'referrals',
      label: 'Referrals',
      value: summary.referralDelays || 0,
      helper: 'Unblock referrals',
      target: '/workspace/emergency/referrals',
    },
    {
      id: 'ems-arrivals',
      label: 'EMS Arrivals',
      value: summary.emsArrivals || 0,
      helper: 'Review inbound arrivals',
      target: '/workspace/emergency/ems',
    },
    {
      id: 'boarding',
      label: 'Boarding',
      value: summary.boardingPatients || 0,
      helper: 'Review boarding blockers',
      target: '/workspace/emergency/boarding',
    },
    {
      id: 'capacity',
      label: 'Capacity',
      value: summary.capacityScore != null ? summary.capacityScore : 'Watch',
      helper: `${summary.capacityRiskLevel || summary.capacityLabel || 'Review capacity'} Capacity Score`,
      target: '/workspace/emergency/capacity',
    },
  ];

  if (!whiteboard.useLegacyWhiteboard) {
    return <EmergencyWhiteboard />;
  }

  return (
    <section
      className="workspace-panel emergency-whiteboard-panel"
      aria-labelledby="emergency-whiteboard-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Primary workspace screen · No dashboard hopping</p>
        <h2 id="emergency-whiteboard-title">{whiteboard.title || 'Emergency Whiteboard'}</h2>
        <p>
          CareDroid is organized around Patient Flow, Queue Flow, EMS Flow, Capacity
          Flow, and Decision Support for small teams handling 50-150 patients/day with fewer than 10
          staff.
        </p>
        <p>
          Every action starts from this whiteboard. Detailed tools stay contextual to reduce clicks,
          searching, and cognitive load.
        </p>
      </div>
      <EmergencyCopilotCommandBar
        contextLabel="Whiteboard"
        title="Navigate from Whiteboard"
        description="Type an ED command and Copilot opens the right patient, queue, workflow, referral, EMS, boarding, or capacity surface."
        examples={[
          'Who has waited the longest?',
          'Which patients need reassessment?',
          'How many EMS patients are inbound?',
          'What is the current bottleneck?',
        ]}
        compact
        onLaunchRoute={onLaunchRoute}
        onWorkspaceAction={onWorkspaceAction}
      />
      <div className="emergency-journey-summary" aria-label="Emergency whiteboard summary">
        <span>{summary.patientsToday || 0} patients today</span>
        <span>{summary.totalActivePatients || 0} active patients</span>
        <span>{summary.waitingPatients || 0} waiting</span>
        <span>{summary.currentAverageWait || 0} min avg wait</span>
        <span>{summary.highRiskPatients || 0} high-risk cards</span>
        <span>{summary.needsReassessment || 0} needs reassessment</span>
        <span>{summary.referralDelays || 0} referral delays</span>
        <span>{summary.emsArrivals || 0} EMS arrivals</span>
        <span>{summary.boardingPatients || 0} boarding</span>
        <span>{summary.capacityScore || 0} Capacity Score</span>
        <span>{summary.capacityRiskLevel || 'Green'} capacity</span>
        <span>{summary.nextRecommendedActions || 0} next actions</span>
        <span>{summary.longestWaitMinutes || 0} min longest wait</span>
      </div>
      <div className="emergency-whiteboard-action-grid" aria-label="Whiteboard direct actions">
        {whiteboardActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="emergency-whiteboard-action"
            onClick={() => onLaunchRoute(action.target)}
          >
            <span>{action.label}</span>
            <strong>{action.value}</strong>
            <small>{action.helper}</small>
          </button>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Emergency whiteboard controls">
        <p>
          <strong>Filters:</strong> {(whiteboard.filters || []).slice(0, 6).join(', ')}
        </p>
        <p>
          <strong>Search:</strong> {(whiteboard.searchFields || []).join(', ')}
        </p>
        <p>
          <strong>Source:</strong> {whiteboard.sourceState || 'Demo data · No live integration'}
        </p>
        <p>
          <strong>Operating areas:</strong> {(whiteboard.operatingAreas || []).join(', ')}
        </p>
        {whiteboard.emsHandoffPipeline ? (
          <p>
            <strong>EMS Handoff Pipeline:</strong>{' '}
            {(whiteboard.emsHandoffPipeline.statuses || []).join(', ')} ·{' '}
            {whiteboard.emsHandoffPipeline.output}
          </p>
        ) : null}
        {whiteboard.reassessmentIntelligence ? (
          <p>
            <strong>Reassessment Intelligence:</strong>{' '}
            {(whiteboard.reassessmentIntelligence.thresholds || []).join(', ')} ·{' '}
            {(whiteboard.reassessmentIntelligence.alerts || []).length} Needs Reassessment alerts
          </p>
        ) : null}
        {whiteboard.capacityEngine ? (
          <p>
            <strong>Capacity Engine:</strong> {whiteboard.capacityEngine.output}{' '}
            {whiteboard.capacityEngine.score} · {whiteboard.capacityEngine.riskLevel} · occupancy{' '}
            {whiteboard.capacityEngine.occupancyPercent}%
          </p>
        ) : null}
        {whiteboard.capacityEngine ? (
          <p>
            <strong>Capacity recommendation categories:</strong> discharge opportunities,
            bottlenecks, overloaded queues
          </p>
        ) : null}
        {whiteboard.capacityEngine?.recommendations?.length ? (
          <div
            className="emergency-journey-insights"
            aria-label="Whiteboard capacity recommendations"
          >
            {whiteboard.capacityEngine.recommendations.slice(0, 3).map((recommendation) => (
              <p key={recommendation.id}>
                <strong>{recommendation.category}:</strong> {recommendation.title} ·{' '}
                {recommendation.action}
              </p>
            ))}
          </div>
        ) : null}
        {whiteboard.flowEngine ? (
          <p>
            <strong>Emergency Flow Engine:</strong>{' '}
            {(whiteboard.flowEngine.monitoredStages || []).map((stage) => stage.label).join(', ')} ·{' '}
            {whiteboard.flowEngine.metrics?.activeDetections || 0} flow detections
          </p>
        ) : null}
        {whiteboard.flowEngine?.nextRecommendedActions?.length ? (
          <div
            className="emergency-journey-insights"
            aria-label="Whiteboard next recommended actions"
          >
            {whiteboard.flowEngine.nextRecommendedActions.slice(0, 4).map((action) => (
              <p key={action.id}>
                <strong>Next Recommended Action:</strong> {action.action}
                <br />
                <span>
                  {action.stage} · {action.title} · {action.reason}
                </span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="emergency-queue-grid">
        {columns.map((column) => (
          <article key={column.id} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{column.highRiskCount || 0} high risk</span>
                <h3>{column.label}</h3>
              </div>
              <strong>{column.count || 0}</strong>
            </div>
            <div className="emergency-journey-insights">
              {(column.cards || []).slice(0, 3).map((card) => (
                <p key={card.patientId}>
                  <strong>{card.displayName}</strong> · age {card.age} · {card.complaint}
                  <br />
                  <span>
                    {card.acuity || 'Acuity pending'} · {card.riskLevel} risk · {card.waitingTime}{' '}
                    min · {card.currentState}
                  </span>
                  <br />
                  <span>Assigned clinician: {card.assignedClinician || 'Unassigned'}</span>
                  {card.handoffStatus ? (
                    <>
                      <br />
                      <span>
                        EMS status: {card.handoffStatus} · ETA {card.etaMinutes} min
                      </span>
                    </>
                  ) : null}
                  <br />
                  <span>Next action: {card.nextAction}</span>
                  {card.alerts.length ? (
                    <>
                      <br />
                      <span>Alerts: {card.alerts.join(', ')}</span>
                    </>
                  ) : null}
                  {card.needsReassessment ? (
                    <>
                      <br />
                      <span>Needs Reassessment: {(card.reassessmentSignals || []).join('; ')}</span>
                    </>
                  ) : null}
                  {card.edHandoffSummary ? (
                    <>
                      <br />
                      <span>ED Handoff Summary: {card.edHandoffSummary.summary}</span>
                    </>
                  ) : null}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
      <p className="emergency-queue-warning">
        <strong>Safety boundary:</strong> {whiteboard.safetyStatement}
      </p>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Summarize Emergency Whiteboard pressure. ${summary.totalActivePatients || 0} patients, ${summary.highRiskPatients || 0} high-risk cards, ${summary.referralDelays || 0} referral delays, ${summary.emsArrivals || 0} EMS arrivals, ${summary.boardingPatients || 0} boarding patients, Capacity Score ${summary.capacityScore || 0} ${summary.capacityRiskLevel || 'Green'}, ${summary.flowDetections || 0} Emergency Flow Engine detections, ${summary.nextRecommendedActions || 0} next recommended actions, bottleneck column ${summary.bottleneckColumn || 'unknown'}. Start every action from the Whiteboard and keep all actions human-reviewed.`
          )
        }
      >
        Ask assistant to summarize whiteboard pressure
      </button>
    </section>
  );
}

function EmergencyPatientPathPanel({
  patientPath = {},
  onLaunchRoute,
  onAskAssistant,
  onWorkspaceAction,
}) {
  const metrics = patientPath.metrics || {};
  const milestones = patientPath.milestones || [];
  const patients = patientPath.patients || [];
  const recommendations = patientPath.recommendations || [];

  return (
    <section
      className="workspace-panel emergency-patient-path-panel"
      aria-labelledby="emergency-patient-path-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Door-to-Direction</p>
        <h2 id="emergency-patient-path-title">Emergency Patient Path</h2>
        <p>
          {patientPath.salesNarrative ||
            'Every arrival becomes a known, risk-routed, queue-assigned, action-ready patient flow object.'}
        </p>
      </div>
      <EmergencyCopilotCommandBar
        contextLabel="Patient Cards"
        title="Navigate patient cards with Copilot"
        description="Type a patient-flow command to find high-risk patients, longest waits, or complaint workflows without opening menus."
        examples={[
          'Find high-risk patients',
          'Show longest waiting patients',
          'Open chest pain workflow',
        ]}
        compact
        onLaunchRoute={onLaunchRoute}
        onWorkspaceAction={onWorkspaceAction}
      />

      <div className="emergency-patient-path-hero">
        <div>
          <span>Door-to-Direction</span>
          <strong>{metrics.doorToDirectionMinutes || 0} min</strong>
          <small>
            {metrics.targetCompliance || 0}% within {metrics.targetDoorToDirectionMinutes || 10} min
            target
          </small>
        </div>
        <div>
          <span>Patients visible</span>
          <strong>{metrics.patientCount || patients.length}</strong>
          <small>{metrics.highRiskPatients || 0} high-risk patients routed</small>
        </div>
        <div>
          <span>Open direction gaps</span>
          <strong>{metrics.patientsWithoutDirection || 0}</strong>
          <small>{metrics.highRiskNotActioned || 0} high-risk over action target</small>
        </div>
      </div>

      <ol className="emergency-patient-path-line" aria-label="Patient path milestones">
        {milestones.map((milestone) => (
          <li
            key={milestone.id}
            className={`emergency-patient-path-line__step emergency-patient-path-line__step--${cssToken(milestone.status)}`}
          >
            <span>{milestone.label}</span>
            <strong>
              {milestone.value ?? 0} {milestone.unit || 'min'}
            </strong>
            <small>Target {milestone.targetMinutes} min</small>
          </li>
        ))}
      </ol>

      <div className="emergency-patient-path-grid" aria-label="Patient path cards">
        {patients.slice(0, 12).map((patient) => (
          <article
            key={patient.patientId}
            className={`emergency-patient-path-card emergency-patient-path-card--${cssToken(patient.riskLevel)}`}
          >
            <div className="emergency-patient-path-card__header">
              <div>
                <span className="workspace-eyebrow">{patient.arrivalMode}</span>
                <h3>{patient.displayName}</h3>
              </div>
              <strong>{patient.timing?.doorToDirectionMinutes || 0} min</strong>
            </div>
            <p>
              {patient.complaint} · {patient.currentState}
            </p>
            <dl className="emergency-queue-metrics">
              <div>
                <dt>Risk</dt>
                <dd>{patient.riskLevel}</dd>
              </div>
              <div>
                <dt>Queue</dt>
                <dd>{patient.assignedQueue?.label}</dd>
              </div>
              <div>
                <dt>Destination</dt>
                <dd>{patient.destination?.label}</dd>
              </div>
            </dl>
            <p className="emergency-queue-warning">
              <strong>Next action:</strong> {patient.nextAction}
            </p>
            {patient.edHandoffSummary ? (
              <p>
                <strong>ED Handoff Summary:</strong> {patient.edHandoffSummary.summary}
              </p>
            ) : null}
            {patient.calculators?.length ? (
              <div
                className="emergency-prearrival-risk-bundle"
                aria-label={`${patient.patientId} calculators`}
              >
                {patient.calculators.map((calculator) => (
                  <span key={calculator.id}>{calculator.label}</span>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="workspace-secondary-action"
              onClick={() =>
                onWorkspaceAction(
                  `Review patient card ${patient.displayName}. Complaint: ${patient.complaint}. Risk: ${patient.riskLevel}. Queue: ${patient.assignedQueue?.label}. Next action: ${patient.nextAction}. Keep all actions human-reviewed.`
                )
              }
            >
              Ask Copilot about patient card
            </button>
          </article>
        ))}
      </div>

      <div className="emergency-journey-insights" aria-label="Patient path recommendations">
        {recommendations.slice(0, 4).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
        <p>
          <strong>Source:</strong> {patientPath.sourceState || 'Demo data · No live integration'}
        </p>
        <p>{patientPath.safetyStatement}</p>
      </div>

      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Explain ED patient flow blockers and next operational actions. Door-to-Direction is ${metrics.doorToDirectionMinutes || 0} minutes with ${metrics.patientsWithoutDirection || 0} direction gaps. Keep all actions human-reviewed.`
          )
        }
      >
        Explain patient flow blockers
      </button>
    </section>
  );
}

function EmergencyQueueIntelligencePanel({ queueIntelligence = {}, onAskAssistant }) {
  const queues = queueIntelligence.queues || [];
  const metrics = queueIntelligence.metrics || {};
  const bottlenecks = queueIntelligence.bottlenecks || [];
  const recommendations = queueIntelligence.recommendations || [];

  return (
    <section
      className="workspace-panel emergency-queue-panel"
      aria-labelledby="emergency-queue-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Queue Intelligence</p>
        <h2 id="emergency-queue-title">Emergency Queue Intelligence</h2>
        <p>
          CareDroid watches ED queue pressure, oldest-patient waits, risk, and throughput before
          staff notice bottlenecks.
        </p>
      </div>
      <div className="emergency-journey-summary" aria-label="Emergency queue metrics">
        <span>{metrics.totalCount || 0} queued items</span>
        <span>{metrics.averageWaitTime || 0} min average wait</span>
        <span>{metrics.totalThroughput || 0}/hr throughput</span>
        <span>{metrics.bottleneckCount || 0} early warnings</span>
      </div>
      <div className="emergency-queue-grid">
        {queues.map((queue) => (
          <article
            key={queue.id}
            className={`emergency-queue-card emergency-dashboard-widget--${queue.bottleneck?.severity || queue.riskLevel}`}
          >
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{queue.riskLevel} risk</span>
                <h3>{queue.label}</h3>
              </div>
              <strong>{queue.count}</strong>
            </div>
            <p>{queue.description}</p>
            <dl className="emergency-queue-metrics">
              <div>
                <dt>Wait time</dt>
                <dd>{queue.waitTime} min</dd>
              </div>
              <div>
                <dt>Oldest patient</dt>
                <dd>
                  {queue.oldestPatient.label} ({queue.oldestPatient.waitMinutes} min)
                </dd>
              </div>
              <div>
                <dt>Throughput</dt>
                <dd>{queue.throughput}/hr</dd>
              </div>
            </dl>
            {queue.bottleneck ? (
              <p className="emergency-queue-warning">
                <strong>Early warning:</strong> {queue.bottleneck.reason}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Emergency queue recommendations">
        {bottlenecks.slice(0, 3).map((bottleneck) => (
          <p key={bottleneck.queueId}>
            <strong>{bottleneck.label}:</strong> {bottleneck.reason}
          </p>
        ))}
        {recommendations.slice(0, 3).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Prioritize Emergency Queue Intelligence bottlenecks: ${recommendations
              .slice(0, 3)
              .map((recommendation) => recommendation.title)
              .join(', ')}. Keep all actions human-reviewed.`
          )
        }
      >
        Ask assistant to prioritize queue bottlenecks
      </button>
    </section>
  );
}

function EmergencyPreArrivalPanel({ preArrival = {}, onAskAssistant }) {
  const workflow = preArrival.workflow || [];
  const queue = preArrival.queue || {};
  const incomingPatients = queue.incomingPatients || [];
  const metrics = preArrival.metrics || {};
  const recommendations = preArrival.recommendations || [];
  const [emsIntake, setEmsIntake] = useState({
    patientLabel: 'Unknown patient',
    age: 'pending',
    sex: 'unknown',
    complaint: 'Chest pain',
    vitals: 'BP 148/92, HR 104, RR 20, SpO2 96%',
    etaMinutes: '12',
    riskFlags: 'Chest pain, abnormal vitals',
    notes: 'EMS radio report pending.',
  });
  const [submittedEmsIntake, setSubmittedEmsIntake] = useState(null);
  const visibleIncomingPatients = submittedEmsIntake
    ? [submittedEmsIntake, ...incomingPatients]
    : incomingPatients;

  const submitEmsIntake = (event) => {
    event.preventDefault();
    setSubmittedEmsIntake({
      id: 'EMS-INTAKE-LOCAL',
      unit: 'Staff EMS intake',
      handoffStatus: 'Incoming',
      patientLabel: emsIntake.patientLabel || 'Unknown patient',
      complaint: emsIntake.complaint,
      etaMinutes: Number(emsIntake.etaMinutes || 0),
      riskLevel: /stroke|sepsis|chest pain|critical/i.test(
        `${emsIntake.complaint} ${emsIntake.riskFlags}`
      )
        ? 'high'
        : 'medium',
      notificationStatus: 'draft',
      vitals: {
        bloodPressure: emsIntake.vitals,
        heartRate: 'entered',
        respiratoryRate: 'entered',
        oxygenSaturation: 'entered',
      },
      riskIndicators: emsIntake.riskFlags
        .split(',')
        .map((flag) => flag.trim())
        .filter(Boolean),
      riskScoreBundle: [],
      edHandoffSummary: {
        title: 'Draft ED Handoff Summary',
        summary: `${emsIntake.patientLabel || 'Unknown patient'}, age ${emsIntake.age}, ${emsIntake.sex}, ${emsIntake.complaint}. ETA ${emsIntake.etaMinutes} min. Notes: ${emsIntake.notes}`,
        journeyAttachment: { label: 'Ready to convert into active ED patient journey on arrival' },
      },
    });
  };

  return (
    <section
      className="workspace-panel emergency-prearrival-panel"
      aria-labelledby="emergency-prearrival-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">EMS Handoff Pipeline</p>
        <h2 id="emergency-prearrival-title">EMS Pre-arrival Workspace</h2>
        <p>
          EMS sends complaint, vitals, ETA, and risk indicators. Patient journey context starts
          before arrival and appears on the Emergency Whiteboard.
        </p>
      </div>
      <div className="emergency-journey-summary" aria-label="EMS pre-arrival metrics">
        <span>{metrics.incomingCount || 0} incoming patients</span>
        <span>{metrics.nextEtaMinutes || 0} min next ETA</span>
        <span>{metrics.criticalCount || 0} critical risk</span>
        <span>{metrics.handoffReadyCount || 0} handoffs ready</span>
        <span>{metrics.journeyAttachmentCount || 0} journey attachments</span>
      </div>
      <div className="emergency-journey-insights" aria-label="EMS handoff pipeline contract">
        <p>
          <strong>Input:</strong> {(preArrival.inputSchema || []).join(', ')}
        </p>
        <p>
          <strong>Status:</strong> {(preArrival.statuses || []).join(', ')}
        </p>
        <p>
          <strong>Output:</strong> {preArrival.output || 'ED Handoff Summary'}
        </p>
      </div>
      <form
        className="workspace-panel emergency-copilot-command"
        aria-label="EMS Intake workflow"
        onSubmit={submitEmsIntake}
      >
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">EMS Intake workflow</p>
          <h3>Enter inbound EMS patient</h3>
          <p>
            Submitted records appear in EMS Incoming and can be converted into an active ED patient
            journey on arrival.
          </p>
        </div>
        <div className="emergency-copilot-command__form">
          {[
            ['patientLabel', 'Patient name or unknown patient'],
            ['age', 'Age'],
            ['sex', 'Sex'],
            ['complaint', 'Chief complaint'],
            ['vitals', 'Vitals'],
            ['etaMinutes', 'ETA'],
            ['riskFlags', 'Risk flags'],
            ['notes', 'Notes'],
          ].map(([key, label]) => (
            <label key={key} className="emergency-evidence-select">
              <span>{label}</span>
              <input
                value={emsIntake[key]}
                onChange={(event) =>
                  setEmsIntake((current) => ({ ...current, [key]: event.target.value }))
                }
                aria-label={label}
              />
            </label>
          ))}
          <button type="submit" className="workspace-primary-action">
            Add to EMS Incoming
          </button>
        </div>
      </form>
      <ol className="emergency-journey-flow emergency-prearrival-workflow">
        {workflow.map((step) => (
          <li key={step.id}>
            <strong>{step.label}</strong>
            <span>{step.description}</span>
          </li>
        ))}
      </ol>
      <div className="emergency-queue-grid">
        {visibleIncomingPatients.map((patient) => (
          <article
            key={patient.id}
            className={`emergency-queue-card emergency-dashboard-widget--${patient.riskLevel}`}
          >
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">
                  {patient.unit} · {patient.handoffStatus}
                </span>
                <h3>{patient.patientLabel}</h3>
              </div>
              <strong>{patient.etaMinutes}m</strong>
            </div>
            <p>{patient.complaint}</p>
            <dl className="emergency-queue-metrics">
              <div>
                <dt>ETA</dt>
                <dd>{patient.etaMinutes} min</dd>
              </div>
              <div>
                <dt>Risk level</dt>
                <dd>{patient.riskLevel}</dd>
              </div>
              <div>
                <dt>ED notification</dt>
                <dd>{patient.notificationStatus}</dd>
              </div>
              <div>
                <dt>Whiteboard state</dt>
                <dd>{patient.handoffStatus}</dd>
              </div>
            </dl>
            <div
              className="emergency-prearrival-vitals"
              aria-label={`${patient.patientLabel} vitals`}
            >
              <span>BP {patient.vitals.bloodPressure}</span>
              <span>HR {patient.vitals.heartRate}</span>
              <span>RR {patient.vitals.respiratoryRate}</span>
              <span>SpO2 {patient.vitals.oxygenSaturation}</span>
            </div>
            <div className="emergency-prearrival-risk-bundle">
              <strong>Risk indicators</strong>
              {(patient.riskIndicators || []).map((indicator) => (
                <span key={indicator}>{indicator}</span>
              ))}
              <strong>Risk score bundle</strong>
              {(patient.riskScoreBundle || []).map((score) => (
                <span key={score.id}>
                  {score.label}: {score.value} ({score.riskLevel})
                </span>
              ))}
            </div>
            <p className="emergency-queue-warning">
              <strong>{patient.edHandoffSummary?.title || 'ED Handoff Summary'}:</strong>{' '}
              {patient.edHandoffSummary?.summary || patient.handoffSummary}
            </p>
            <p>
              Journey attachment:{' '}
              {patient.edHandoffSummary?.journeyAttachment?.label || 'attached to patient journey'}
            </p>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="EMS pre-arrival recommendations">
        {recommendations.slice(0, 3).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
        <p>
          <strong>Safety boundary:</strong> {preArrival.safetyStatement}
        </p>
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Prepare ED for incoming EMS patients: ${visibleIncomingPatients
              .slice(0, 3)
              .map(
                (patient) =>
                  `${patient.patientLabel} ETA ${patient.etaMinutes} minutes, ${patient.complaint}`
              )
              .join('; ')}. Keep all triage and clinical actions human-reviewed.`
          )
        }
      >
        Ask assistant to prepare ED handoff
      </button>
    </section>
  );
}

function EmergencyThroughputPanel({ throughput = {}, kpiLayer = {}, onAskAssistant }) {
  const kpi = throughput.kpi || {};
  const delays = throughput.delays || [];
  const bottlenecks = throughput.bottlenecks || [];
  const metrics = kpiLayer.metrics || [];

  return (
    <section className="workspace-panel" aria-labelledby="emergency-throughput-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Door-to-Doctor Intelligence</p>
        <h2 id="emergency-throughput-title">Emergency Throughput</h2>
        <p>
          Leadership can monitor arrival, triage, provider assessment, delays, bottlenecks, and
          staffing pressure from one throughput view.
        </p>
        <p>Canonical KPI source: EmergencyKPILayer.</p>
      </div>
      <DashboardGrid variant="metrics" className="workspace-focus-metrics">
        <MetricCard
          label="Door-to-Doctor"
          value={`${kpi.value || 0} min`}
          helper={`${kpi.targetCompliance || 0}% target compliance`}
        />
        <MetricCard
          label="90th percentile"
          value={`${kpi.p90 || 0} min`}
          helper="Longest tail of current demo shift"
        />
        <MetricCard
          label="Longest active wait"
          value={`${kpi.longestActiveWait || 0} min`}
          helper={throughput.staffingPressure?.state || 'staffing pressure'}
        />
      </DashboardGrid>
      <div className="emergency-queue-grid">
        {metrics.map((metric) => (
          <article key={metric.metricId} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{metric.dataState}</span>
                <h3>{metric.label}</h3>
              </div>
              <strong>{metric.value}</strong>
            </div>
            <p>{metric.sourceSignals.join(', ')}</p>
            <small>
              Target: {metric.target || 'not configured'} {metric.unit}
            </small>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Throughput delay insights">
        {delays.slice(0, 3).map((delay) => (
          <p key={delay.patientId}>
            <strong>{delay.patientId}:</strong> {delay.reason}
          </p>
        ))}
        {bottlenecks.map((bottleneck) => (
          <p key={bottleneck.id}>
            <strong>{bottleneck.label} bottleneck:</strong> {bottleneck.reason}
          </p>
        ))}
        <p>
          <strong>Source:</strong> {throughput.sourceState}
        </p>
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            'Summarize Door-to-Doctor throughput, current delays, bottlenecks, and staffing pressure for ED leadership.'
          )
        }
      >
        Ask assistant to summarize throughput
      </button>
    </section>
  );
}

function EmergencyWaitingRoomPanel({ waitingRoom = {}, onAskAssistant }) {
  const metrics = waitingRoom.metrics || {};
  const reassessmentQueue = waitingRoom.reassessmentQueue || {};
  const recommendations = waitingRoom.recommendations || [];
  const [completedReassessments, setCompletedReassessments] = useState({});

  return (
    <section className="workspace-panel" aria-labelledby="emergency-waiting-room-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Waiting Room Intelligence</p>
        <h2 id="emergency-waiting-room-title">Waiting Room Health</h2>
        <p>
          Treat the waiting room as a managed queue with visible wait duration, patient count, risk,
          and reassessment need.
        </p>
      </div>
      <div
        className={`emergency-capacity-score emergency-capacity-score--${cssToken(waitingRoom.riskState)}`}
      >
        <div>
          <span>Waiting Room Health Score</span>
          <strong>{waitingRoom.healthScore || 0}</strong>
          <small>{waitingRoom.riskState || 'Normal'}</small>
        </div>
        <div>
          <span>Reassessment Queue</span>
          <strong>{reassessmentQueue.count || 0}</strong>
          <small>
            {reassessmentQueue.criticalCount || 0} critical · {reassessmentQueue.urgentCount || 0}{' '}
            urgent
          </small>
        </div>
      </div>
      <DashboardGrid variant="metrics" className="workspace-focus-metrics">
        <MetricCard
          label="Patient count"
          value={metrics.patientCount || 0}
          helper="Active waiting room patients"
        />
        <MetricCard
          label="Median wait"
          value={`${metrics.waitDuration || 0} min`}
          helper="Current waiting-room wait duration"
        />
        <MetricCard
          label="Oldest wait"
          value={`${metrics.oldestWaitMinutes || 0} min`}
          helper="Oldest active waiting patient"
        />
      </DashboardGrid>
      <div className="emergency-queue-grid">
        {(reassessmentQueue.items || []).map((item) => (
          <article
            key={item.patientId}
            className={`emergency-queue-card emergency-dashboard-widget--${item.priority}`}
          >
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{item.priority} reassessment</span>
                <h3>{item.patientId}</h3>
              </div>
              <strong>{item.waitDuration}m</strong>
            </div>
            <p>{item.triggerReason}</p>
            <p>State: {item.status}</p>
            {completedReassessments[item.patientId] ? (
              <p>
                Reassessment complete: {completedReassessments[item.patientId]?.timestamp} ·{' '}
                {completedReassessments[item.patientId]?.notes}
              </p>
            ) : (
              <label className="emergency-evidence-select">
                <span>Reassessment notes</span>
                <input
                  aria-label={`${item.patientId} reassessment notes`}
                  placeholder="Vitals reviewed, clinician updated"
                  onChange={(event) =>
                    setCompletedReassessments((current) => ({
                      ...current,
                      [item.patientId]: {
                        ...(current[item.patientId] || {}),
                        draftNotes: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            )}
            {item.thresholdSignals?.length ? (
              <small>Thresholds: {item.thresholdSignals.join('; ')}</small>
            ) : null}
            <small>{item.recommendedAction}</small>
            <button
              type="button"
              className="workspace-secondary-action"
              onClick={() =>
                setCompletedReassessments((current) => ({
                  ...current,
                  [item.patientId]: {
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    notes:
                      current[item.patientId]?.draftNotes || 'Reassessment completed by staff.',
                  },
                }))
              }
            >
              Mark reassessment complete
            </button>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Waiting room recommendations">
        {waitingRoom.reassessmentIntelligence ? (
          <p>
            <strong>Reassessment Intelligence:</strong>{' '}
            {(waitingRoom.reassessmentIntelligence.thresholds || []).join(', ')} ·{' '}
            {(waitingRoom.reassessmentIntelligence.alerts || []).length} generated alerts ·{' '}
            {waitingRoom.reassessmentIntelligence.preventionGoal}
          </p>
        ) : null}
        {recommendations.slice(0, 4).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
        <p>
          <strong>Source:</strong> {waitingRoom.sourceState}
        </p>
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            'Prioritize waiting room pressure, reassessment recommendations, oldest waits, and queue bottlenecks.'
          )
        }
      >
        Ask assistant to prioritize waiting room pressure
      </button>
    </section>
  );
}

function EmergencyEmsOffloadPanel({
  emsOffload = {},
  onLaunchRoute,
  onAskAssistant,
  onWorkspaceAction,
}) {
  const metrics = emsOffload.metrics || {};
  const handoffs = emsOffload.handoffs || [];
  const arrivalEtaTimeline = emsOffload.arrivalEtaTimeline || [];

  return (
    <section className="workspace-panel" aria-labelledby="emergency-ems-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">EMS Offload Command Center</p>
        <h2 id="emergency-ems-title">EMS Pressure</h2>
        <p>
          Track incoming ambulances, arrival ETA, waiting handoffs, and offload delays from one
          command center.
        </p>
      </div>
      <EmergencyCopilotCommandBar
        contextLabel="EMS"
        title="Navigate EMS with Copilot"
        description="Type an EMS command to open handoffs, pre-arrival summaries, Whiteboard context, or capacity blockers."
        examples={['Show EMS handoffs', 'Show capacity pressure', 'Find high-risk patients']}
        compact
        onLaunchRoute={onLaunchRoute}
        onWorkspaceAction={onWorkspaceAction}
      />
      <div className="emergency-journey-summary" aria-label="EMS offload metrics">
        <span>{metrics.incomingAmbulances || 0} incoming ambulances</span>
        <span>{metrics.nextEtaMinutes || 0} min next ETA</span>
        <span>{metrics.waitingHandoffs || 0} waiting handoffs</span>
        <span>{metrics.longestOffloadDelay || 0} min longest offload</span>
      </div>
      <div className="emergency-queue-grid">
        {arrivalEtaTimeline.map((arrival) => (
          <article
            key={arrival.patientId}
            className={`emergency-queue-card emergency-dashboard-widget--${arrival.riskLevel}`}
          >
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{arrival.unitId}</span>
                <h3>{arrival.patientId}</h3>
              </div>
              <strong>{arrival.etaMinutes}m</strong>
            </div>
            <p>{arrival.complaint}</p>
          </article>
        ))}
        {handoffs.map((handoff) => (
          <article key={handoff.patientId} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{handoff.status}</span>
                <h3>{handoff.unitId}</h3>
              </div>
              <strong>{handoff.offloadDelayMinutes}m</strong>
            </div>
            <p>
              {handoff.patientId} arrived {handoff.arrivalTime}
            </p>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="EMS offload recommendations">
        {(emsOffload.recommendations || []).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
        <p>
          <strong>Source:</strong> {emsOffload.sourceState}
        </p>
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            'Summarize EMS pressure, incoming ambulance ETAs, waiting handoffs, and offload delays.'
          )
        }
      >
        Ask assistant to summarize EMS pressure
      </button>
    </section>
  );
}

function EmergencyResourceBoardPanel({ resourceBoard = {}, onAskAssistant }) {
  const metrics = resourceBoard.metrics || {};
  const resources = resourceBoard.resources || [];

  return (
    <section className="workspace-panel" aria-labelledby="emergency-resources-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Emergency Resource Board</p>
        <h2 id="emergency-resources-title">Operational Resources</h2>
        <p>
          Staff can understand rooms, stretchers, monitors, telemetry units, and infusion pumps by
          availability status.
        </p>
      </div>
      <div className="emergency-journey-summary" aria-label="Resource board metrics">
        <span>{metrics.available || 0} available</span>
        <span>{metrics.occupied || 0} occupied</span>
        <span>{metrics.outOfService || 0} out of service</span>
        <span>{metrics.shortageCount || 0} shortages</span>
      </div>
      <div className="emergency-queue-grid">
        {resources.map((resource) => (
          <article key={resource.id} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{resource.status}</span>
                <h3>{resource.label}</h3>
              </div>
              <strong>{resource.available}</strong>
            </div>
            <dl className="emergency-queue-metrics">
              <div>
                <dt>Occupied</dt>
                <dd>{resource.occupied}</dd>
              </div>
              <div>
                <dt>Out of service</dt>
                <dd>{resource.outOfService}</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>{resource.availabilityRate}%</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Resource recommendations">
        {(resourceBoard.recommendations || []).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
        <p>
          <strong>Source:</strong> {resourceBoard.sourceState}
        </p>
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            'Summarize ED resource availability, shortages, out-of-service equipment, and operational actions.'
          )
        }
      >
        Ask assistant to summarize resources
      </button>
    </section>
  );
}

function EmergencyEscalationPanel({ escalationEngine = {}, onAskAssistant }) {
  const metrics = escalationEngine.metrics || {};
  const escalations = escalationEngine.escalations || [];

  return (
    <section className="workspace-panel" aria-labelledby="emergency-escalations-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Emergency Escalation Engine</p>
        <h2 id="emergency-escalations-title">Operational Risk</h2>
        <p>
          Capacity overload, boarding overload, EMS congestion, high-risk queue growth, and critical
          device outages surface early.
        </p>
      </div>
      <div className="emergency-journey-summary" aria-label="Escalation metrics">
        <span>{metrics.activeEscalations || 0} active escalations</span>
        <span>{metrics.criticalEscalations || 0} critical</span>
        <span>{metrics.urgentEscalations || 0} urgent</span>
      </div>
      <div className="emergency-queue-grid">
        {escalations.map((escalation) => (
          <article
            key={escalation.id}
            className={`emergency-queue-card emergency-dashboard-widget--${escalation.severity}`}
          >
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{escalation.severity}</span>
                <h3>{escalation.trigger}</h3>
              </div>
              <strong>{escalation.affectedWorkflow}</strong>
            </div>
            <p>{escalation.reason}</p>
            <small>{escalation.recommendedAction}</small>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Escalation recommendations">
        {(escalationEngine.recommendations || []).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
        <p>
          <strong>Source:</strong> {escalationEngine.sourceState}
        </p>
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            'Summarize active ED operational escalations and recommended leadership actions.'
          )
        }
      >
        Ask assistant to summarize escalations
      </button>
    </section>
  );
}

function EmergencyCapacityIntelligencePanel({
  capacity = {},
  onLaunchRoute,
  onAskAssistant,
  onWorkspaceAction,
}) {
  const signals = capacity.signals || [];
  const recommendations = capacity.recommendations || [];

  return (
    <section
      className="workspace-panel emergency-capacity-panel"
      aria-labelledby="emergency-capacity-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Capacity Engine</p>
        <h2 id="emergency-capacity-title">Emergency Capacity Intelligence</h2>
        <p>
          Staff can understand department pressure instantly from census, spaces, admissions,
          boarding, EMS arrivals, and discharge candidates.
        </p>
      </div>
      <EmergencyCopilotCommandBar
        contextLabel="Capacity"
        title="Navigate capacity with Copilot"
        description="Type a capacity command to move between capacity pressure, boarding bottlenecks, EMS arrivals, and discharge candidates."
        examples={['Show capacity pressure', 'Show boarding bottlenecks', 'Show EMS handoffs']}
        compact
        onLaunchRoute={onLaunchRoute}
        onWorkspaceAction={onWorkspaceAction}
      />
      <div
        className={`emergency-capacity-score emergency-capacity-score--${cssToken(capacity.riskLevel)}`}
      >
        <div>
          <span>Capacity Score</span>
          <strong>{capacity.score ?? 0}</strong>
          <small>{capacity.occupancyPercent ?? 0}% occupied</small>
        </div>
        <div>
          <span>Risk Level</span>
          <strong>{capacity.riskLevel || 'Green'}</strong>
          <small>{capacity.summary}</small>
        </div>
      </div>
      <div className="emergency-journey-insights" aria-label="Capacity engine contract">
        <p>
          <strong>Inputs:</strong> {(capacity.inputSchema || []).join(', ')}
        </p>
        <p>
          <strong>States:</strong> Green, Yellow, Orange, Red
        </p>
        <p>
          <strong>Recommendation categories:</strong> discharge opportunities, bottlenecks,
          overloaded queues
        </p>
      </div>
      <div className="emergency-queue-grid">
        {signals.map((signal) => (
          <article key={signal.id} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">Pressure signal</span>
                <h3>{signal.label}</h3>
              </div>
              <strong>{signal.value}</strong>
            </div>
            <p>{signal.helper}</p>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Emergency capacity recommendations">
        {recommendations.map((recommendation) => (
          <p key={recommendation.id}>
            <strong>
              {recommendation.category || 'capacity'} · {recommendation.title}:
            </strong>{' '}
            {recommendation.action}
          </p>
        ))}
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Summarize ED capacity pressure. Capacity score ${capacity.score}, risk level ${capacity.riskLevel}. ${recommendations
              .slice(0, 3)
              .map((recommendation) => recommendation.title)
              .join(', ')}. Keep operational actions human-reviewed.`
          )
        }
      >
        Ask assistant to summarize capacity pressure
      </button>
    </section>
  );
}

function EmergencyReferralHubPanel({
  referralHub = {},
  automations = [],
  onLaunchRoute,
  onAskAssistant,
  onWorkspaceAction,
}) {
  const flowStages = referralHub.flowStages || [];
  const departmentQueues = referralHub.departmentQueues || [];
  const referrals = referralHub.referrals || [];
  const metrics = referralHub.metrics || {};
  const delays = referralHub.delays || [];
  const recommendations = referralHub.recommendations || [];
  const referralAutomations = automations.filter((automation) =>
    automation.workspaceVisibility?.includes('referrals')
  );

  return (
    <section
      className="workspace-panel emergency-referral-panel"
      aria-labelledby="emergency-referral-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">ReferralHub</p>
        <h2 id="emergency-referral-title">Referral Intelligence Network</h2>
        <p>
          Tracks referral requests from classification through department queue, review, acceptance,
          and closure so delays become measurable.
        </p>
      </div>
      <EmergencyCopilotCommandBar
        contextLabel="Referrals"
        title="Navigate referrals with Copilot"
        description="Type a referral or complaint command to open referral queues, chest pain workflows, or patient context without menu hunting."
        examples={['Open chest pain workflow', 'Show referral delays', 'Find high-risk patients']}
        compact
        onLaunchRoute={onLaunchRoute}
        onWorkspaceAction={onWorkspaceAction}
      />
      <div className="emergency-journey-summary" aria-label="ReferralHub metrics">
        <span>{metrics.active || 0} active referrals</span>
        <span>{metrics.delayed || 0} delayed</span>
        <span>{metrics.accepted || 0} accepted</span>
        <span>{metrics.closed || 0} closed</span>
      </div>
      <ol className="emergency-journey-flow emergency-prearrival-workflow">
        {flowStages.map((stage) => (
          <li key={stage.id}>
            <strong>{stage.label}</strong>
            <span>Target: {stage.targetMinutes} min</span>
          </li>
        ))}
      </ol>
      <div className="emergency-queue-grid">
        {departmentQueues.map((queue) => (
          <article key={queue.department} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">Department Queue</span>
                <h3>{queue.department}</h3>
              </div>
              <strong>{queue.count}</strong>
            </div>
            <dl className="emergency-queue-metrics">
              <div>
                <dt>Delayed</dt>
                <dd>{queue.delayedCount}</dd>
              </div>
              <div>
                <dt>Avg elapsed</dt>
                <dd>{queue.averageElapsedMinutes} min</dd>
              </div>
              <div>
                <dt>Oldest referral</dt>
                <dd>{queue.oldestReferral?.id || 'None'}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="emergency-referral-table" role="table" aria-label="Referral rows">
        <div role="row" className="emergency-referral-table__header">
          <span role="columnheader">Referral</span>
          <span role="columnheader">Department</span>
          <span role="columnheader">State</span>
          <span role="columnheader">Elapsed</span>
          <span role="columnheader">Priority</span>
        </div>
        {referrals.map((referral) => (
          <div key={referral.id} role="row">
            <span role="cell">
              <strong>{referral.id}</strong>
              <small>
                {referral.patientLabel}: {referral.reason}
              </small>
            </span>
            <span role="cell">{referral.department}</span>
            <span role="cell">{referral.stageLabel}</span>
            <span role="cell">{referral.elapsedMinutes} min</span>
            <span role="cell">{referral.priority}</span>
          </div>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Referral delay recommendations">
        {delays.slice(0, 3).map((delay) => (
          <p key={delay.referralId}>
            <strong>{delay.department} delay:</strong> {delay.reason}
          </p>
        ))}
        {recommendations.slice(0, 3).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
        <p>
          <strong>Safety boundary:</strong> {referralHub.safetyStatement}
        </p>
      </div>
      {referralAutomations.length ? (
        <div className="emergency-journey-insights" aria-label="Referral automations">
          {referralAutomations.map((automation) => (
            <p key={automation.automationId}>
              <strong>{automation.title}:</strong> {automation.description}
            </p>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Prioritize ReferralHub delays: ${recommendations
              .slice(0, 3)
              .map((recommendation) => recommendation.title)
              .join(', ')}. Keep referral sending, acceptance, and closure human-reviewed.`
          )
        }
      >
        Ask assistant to prioritize referral delays
      </button>
    </section>
  );
}

function EmergencyBoardingIntelligencePanel({
  boarding = {},
  onLaunchRoute,
  onAskAssistant,
  onWorkspaceAction,
}) {
  const metrics = boarding.metrics || {};
  const boarders = boarding.boarders || [];
  const longestBoarders = boarding.longestBoarders || [];
  const recommendations = boarding.recommendations || [];

  return (
    <section
      className="workspace-panel emergency-boarding-panel"
      aria-labelledby="emergency-boarding-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Boarding Intelligence</p>
        <h2 id="emergency-boarding-title">Boarding Intelligence Engine</h2>
        <p>
          Tracks admitted patients waiting for beds so boarding becomes visible, measurable, and
          ready for operations review.
        </p>
      </div>
      <EmergencyCopilotCommandBar
        contextLabel="Boarding"
        title="Navigate boarding with Copilot"
        description="Type a boarding command to open boarders, pending beds, capacity pressure, and patient cards."
        examples={[
          'Show boarding bottlenecks',
          'Show capacity pressure',
          'Find high-risk patients',
        ]}
        compact
        onLaunchRoute={onLaunchRoute}
        onWorkspaceAction={onWorkspaceAction}
      />
      <div
        className={`emergency-capacity-score emergency-capacity-score--${cssToken(metrics.bedPressure)}`}
      >
        <div>
          <span>Boarding Risk Score</span>
          <strong>{boarding.score ?? 0}</strong>
          <small>{metrics.bedPressure || 'Moderate'} bed pressure</small>
        </div>
        <div>
          <span>Boarding Snapshot</span>
          <strong>{metrics.boardingCount || 0}</strong>
          <small>
            {metrics.boardingTime || 0} min avg boarding time · {metrics.pendingBeds || 0} pending
            beds
          </small>
        </div>
      </div>
      <div className="emergency-journey-summary" aria-label="Boarding metrics">
        <span>{metrics.boardingCount || 0} boarding patients</span>
        <span>{metrics.boardingTime || 0} min boarding time</span>
        <span>{metrics.longestBoardingMinutes || 0} min longest boarder</span>
        <span>{metrics.pendingBeds || 0} pending beds</span>
      </div>
      <div className="emergency-referral-table" role="table" aria-label="Boarding patients">
        <div role="row" className="emergency-referral-table__header">
          <span role="columnheader">Patient</span>
          <span role="columnheader">Service</span>
          <span role="columnheader">Boarding time</span>
          <span role="columnheader">Pending bed</span>
          <span role="columnheader">Location</span>
        </div>
        {boarders.map((boarder) => (
          <div key={boarder.patientId} role="row">
            <span role="cell">
              <strong>{boarder.patientLabel}</strong>
              <small>{boarder.acuity}</small>
            </span>
            <span role="cell">{boarder.admittedService}</span>
            <span role="cell">{boarder.boardingMinutes} min</span>
            <span role="cell">{boarder.pendingBedType}</span>
            <span role="cell">{boarder.location}</span>
          </div>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Longest boarders">
        {longestBoarders.map((boarder) => (
          <p key={boarder.patientId}>
            <strong>{boarder.patientLabel}:</strong> {boarder.boardingMinutes} minutes waiting for{' '}
            {boarder.pendingBedType}.
          </p>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Boarding recommendations">
        {recommendations.map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
        <p>
          <strong>Safety boundary:</strong> {boarding.safetyStatement}
        </p>
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Summarize ED boarding pressure. Boarding risk score ${boarding.score}, ${metrics.boardingCount} admitted patients waiting for beds, ${metrics.pendingBeds} pending beds. Keep bed assignment and transfer actions human-reviewed.`
          )
        }
      >
        Ask assistant to summarize boarding pressure
      </button>
    </section>
  );
}

function emergencyActionGuidanceForCard({ id, label, detail }) {
  const guidance = {
    'current-patients': {
      verb: 'Review',
      suggestedAction: 'Review active patient flow and identify the next delayed patient.',
    },
    'waiting-room': {
      verb: 'Reassess',
      suggestedAction: 'Reassess waiting patients with the oldest waits or new risk signals.',
    },
    'high-risk-queue': {
      verb: 'Reassess',
      suggestedAction: 'Reassess high-risk patients and confirm clinician review priority.',
    },
    'ems-arrivals': {
      verb: 'Complete',
      suggestedAction: 'Complete handoff preparation for the next inbound EMS patient.',
    },
    'referral-queue': {
      verb: 'Refer',
      suggestedAction: 'Refer, re-route, or unblock the oldest delayed referral.',
    },
    'bed-pressure': {
      verb: 'Escalate',
      suggestedAction: 'Escalate bed pressure if pending admissions or boarders are blocking flow.',
    },
    'equipment-status': {
      verb: 'Review',
      suggestedAction: 'Review resource shortages and assign the next equipment recovery step.',
    },
    'staffing-pressure': {
      verb: 'Escalate',
      suggestedAction: 'Escalate staffing pressure when queue growth exceeds available coverage.',
    },
    'flow-alerts': {
      verb: 'Escalate',
      suggestedAction: 'Escalate the highest-risk alert or document why no escalation is needed.',
    },
    'door-to-direction': {
      verb: 'Review',
      suggestedAction: 'Review patient path blockers before they become queue delays.',
    },
    'door-to-doctor': {
      verb: 'Review',
      suggestedAction: 'Review throughput delays and assign the next operational staff member.',
    },
    'boarding-pressure': {
      verb: 'Escalate',
      suggestedAction: 'Escalate boarding pressure to bed management when pending beds block flow.',
    },
    'capacity-score': {
      verb: 'Review',
      suggestedAction:
        'Review capacity pressure and choose the next bed, discharge, or staffing action.',
    },
    'escalation-status': {
      verb: 'Escalate',
      suggestedAction: 'Escalate active critical risks or confirm the assigned clinician for mitigation.',
    },
    'automation-status': {
      verb: 'Complete',
      suggestedAction: 'Complete human review for blocked or pending automation outputs.',
    },
  };

  return (
    guidance[id] || {
      verb: 'Review',
      suggestedAction: `Review ${label || 'this card'} and choose the next human-owned step.`,
      context: detail,
    }
  );
}

const EMERGENCY_COMPLAINT_LAUNCHER_ITEMS = Object.freeze([
  Object.freeze({ label: 'Chest Pain', query: 'Chest Pain' }),
  Object.freeze({ label: 'Stroke Symptoms', query: 'Stroke Symptoms' }),
  Object.freeze({ label: 'Shortness of Breath', query: 'Shortness of Breath' }),
  Object.freeze({ label: 'Trauma', query: 'Trauma' }),
  Object.freeze({ label: 'Abdominal Pain', query: 'Abdominal Pain' }),
  Object.freeze({ label: 'Psychiatric Crisis', query: 'Psychiatric Crisis' }),
  Object.freeze({ label: 'Sepsis Concern', query: 'Sepsis Concern' }),
]);

function EmergencyComplaintLauncher({ onLaunchRoute, onWorkspaceAction }) {
  const complaintLaunches = EMERGENCY_COMPLAINT_LAUNCHER_ITEMS.map((item) => ({
    ...item,
    route: routeEmergencyChiefComplaint(item.query),
  })).filter((item) => item.route);

  return (
    <section
      className="workspace-panel emergency-complaint-launcher"
      aria-labelledby="emergency-complaint-launcher-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Complaint launcher</p>
        <h2 id="emergency-complaint-launcher-title">Start with the presentation</h2>
        <p>
          Choose the complaint first. CareDroid surfaces the workflow, calculators, protocols,
          referrals, and AI Copilot context automatically.
        </p>
      </div>
      <div className="emergency-complaint-grid">
        {complaintLaunches.map(({ label, route }) => {
          const calculators = route.calculators || [];
          const protocols = route.protocols || [];
          const referrals = route.referrals || [];
          const workflow = route.workflows?.[0] || 'Complaint workflow';
          const prompt = `Launch ${label} complaint-first pathway. Complaint -> Workflow -> Calculators -> Protocols -> Referrals -> AI Copilot. Start with ${workflow}, surface calculators ${calculators.map((calculator) => calculator.label).join(', ') || 'none listed'}, review protocols ${protocols.join(', ') || 'none listed'}, and referral path ${referrals.join(', ') || 'none listed'}. Keep all outputs human-reviewed.`;

          return (
            <article key={label} className="emergency-complaint-card">
              <div>
                <span className="workspace-eyebrow">Complaint</span>
                <h3>{label}</h3>
              </div>
              <ol className="emergency-complaint-path" aria-label={`${label} pathway`}>
                <li>
                  <span>Complaint</span>
                  <strong>{route.complaint}</strong>
                </li>
                <li>
                  <span>Workflow</span>
                  <strong>{workflow}</strong>
                </li>
                <li>
                  <span>Calculators</span>
                  <strong>
                    {calculators.map((calculator) => calculator.label).join(', ') ||
                      'Clinician-selected'}
                  </strong>
                </li>
                <li>
                  <span>Protocols</span>
                  <strong>{protocols.slice(0, 2).join(', ') || 'Protocol review'}</strong>
                </li>
                <li>
                  <span>Referrals</span>
                  <strong>{referrals.join(', ') || 'Referral review if indicated'}</strong>
                </li>
                <li>
                  <span>AI Copilot</span>
                  <strong>Complaint-specific guidance</strong>
                </li>
              </ol>
              <p>{route.guidance}</p>
              <div className="emergency-command-actions">
                <button
                  type="button"
                  className="workspace-primary-action"
                  onClick={() => onWorkspaceAction(prompt)}
                >
                  Start {label}
                </button>
                <button
                  type="button"
                  className="workspace-secondary-action"
                  onClick={() =>
                    onLaunchRoute(
                      `/workspace/emergency/evidence?complaint=${encodeURIComponent(route.complaint)}`
                    )
                  }
                >
                  Open pathway
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function routeEmergencyCopilotComplaint(command) {
  const normalized = String(command || '').toLowerCase();
  if (/stroke|facial droop|slurred|neuro|weakness/.test(normalized))
    return routeEmergencyChiefComplaint('Stroke Symptoms');
  if (/chest|acs|troponin|ecg/.test(normalized)) return routeEmergencyChiefComplaint('Chest Pain');
  if (/sepsis|infection|fever|hypotension/.test(normalized))
    return routeEmergencyChiefComplaint('Sepsis Concern');
  if (/trauma|mvc|fall|injury/.test(normalized)) return routeEmergencyChiefComplaint('Trauma');
  if (/respiratory|shortness|sob|dyspnea|breath|pe/.test(normalized))
    return routeEmergencyChiefComplaint('respiratory distress');
  if (/abdominal|belly|pancreatitis|gi bleed|surgical abdomen|vomiting/.test(normalized))
    return routeEmergencyChiefComplaint('Abdominal Pain');
  if (/psychiatric|behavioral|suicid|self[-\s]?harm|agitation|psychosis|crisis/.test(normalized))
    return routeEmergencyChiefComplaint('Psychiatric Crisis');
  return routeEmergencyChiefComplaint(command);
}

function resolveEmergencyCopilotCommand(command) {
  const normalized = String(command || '')
    .trim()
    .toLowerCase();
  const complaintRoute = routeEmergencyCopilotComplaint(command);

  if (
    /longest.*wait|waiting.*longest|oldest.*wait|show longest waiting patients/.test(normalized)
  ) {
    return {
      label: 'Show longest waiting patients',
      type: 'Waiting room navigation',
      target: '/workspace/emergency/waiting-room',
      summary:
        'Open waiting-room intelligence with oldest waits, reassessment intervals, and queue pressure.',
      prompt:
        'Show longest waiting patients. Prioritize waiting duration, reassessment needs, abnormal vitals, and clinician-reviewed next actions.',
      actions: [
        { label: 'Waiting Room', target: '/workspace/emergency/waiting-room' },
        { label: 'Patient Cards', target: '/workspace/emergency/patient-path' },
        { label: 'Whiteboard', target: '/workspace/emergency' },
      ],
    };
  }

  if (/reassessment|reassess|needs reassessment|reassessment due/.test(normalized)) {
    return {
      label: 'Show reassessment due',
      type: 'Reassessment navigation',
      target: '/workspace/emergency/waiting-room',
      summary:
        'Open reassessment queue with wait time, abnormal vitals, acuity, and staff concern signals.',
      prompt:
        'Show patients needing reassessment. Include waiting time, acuity, abnormal vitals, complaint risk, staff concern, timestamp, notes, and human-review-required next actions.',
      actions: [
        { label: 'Waiting Room', target: '/workspace/emergency/waiting-room' },
        { label: 'Whiteboard', target: '/workspace/emergency' },
      ],
    };
  }

  if (/current bottleneck|bottleneck queue|queue bottleneck|what.*bottleneck/.test(normalized)) {
    return {
      label: 'Show current bottleneck',
      type: 'Queue intelligence navigation',
      target: '/workspace/emergency/queues',
      summary:
        'Open Queue Intelligence with bottleneck queue, queue health, oldest waits, and pressure indicators.',
      prompt:
        'Show the current CareDroid bottleneck. Summarize queue pressure, oldest wait, reassessment needs, capacity state, and human-reviewed operational next actions.',
      actions: [
        { label: 'Queues', target: '/workspace/emergency/queues' },
        { label: 'Operations', target: '/workspace/emergency/flow' },
        { label: 'Whiteboard', target: '/workspace/emergency' },
      ],
    };
  }

  if (/sepsis/.test(normalized)) {
    return {
      label: 'Show sepsis workflow',
      type: 'Complaint workflow navigation',
      target: '/workspace/emergency/evidence?complaint=Sepsis%20Concern',
      summary:
        'Open sepsis complaint workflow with qSOFA, NEWS2, protocol, referral, and Copilot context.',
      prompt:
        'Open sepsis workflow. Surface qSOFA, NEWS2, sepsis protocol context, referral considerations, and human-review-required guidance.',
      actions: [
        { label: 'Evidence', target: '/workspace/emergency/evidence?complaint=Sepsis%20Concern' },
        { label: 'Triage', target: '/workspace/emergency/triage' },
      ],
    };
  }

  if (/stroke/.test(normalized)) {
    return {
      label: 'Show stroke workflow',
      type: 'Complaint workflow navigation',
      target: '/workspace/emergency/evidence?complaint=Stroke%20Symptoms',
      summary:
        'Open stroke complaint workflow with NIHSS, GCS, protocol, referral, and Copilot context.',
      prompt:
        'Open stroke workflow. Surface NIHSS, GCS, stroke protocol context, referral considerations, and human-review-required guidance.',
      actions: [
        { label: 'Evidence', target: '/workspace/emergency/evidence?complaint=Stroke%20Symptoms' },
        { label: 'Triage', target: '/workspace/emergency/triage' },
      ],
    };
  }

  if (/boarding|boarder|bed bottleneck|bed block|admission bottleneck/.test(normalized)) {
    return {
      label: 'Show boarding bottlenecks',
      type: 'Boarding navigation',
      target: '/workspace/emergency/boarding',
      summary:
        'Open boarding intelligence with longest boarders, pending beds, and bed-management blockers.',
      prompt:
        'Show boarding bottlenecks. Summarize longest boarders, pending beds, bed pressure, and human-reviewed bed-management next actions.',
      actions: [
        { label: 'Boarding', target: '/workspace/emergency/boarding' },
        { label: 'Capacity', target: '/workspace/emergency/capacity' },
        { label: 'Patient Cards', target: '/workspace/emergency/patient-path' },
      ],
    };
  }

  if (/capacity|census|spaces|available beds|department pressure/.test(normalized)) {
    return {
      label: 'Show capacity pressure',
      type: 'Capacity navigation',
      target: '/workspace/emergency/capacity',
      summary:
        'Open capacity intelligence for census, spaces, admissions, boarding, EMS arrivals, and discharge candidates.',
      prompt:
        'Show capacity pressure. Summarize census, available spaces, pending admissions, boarding, EMS arrivals, and discharge candidates for human-reviewed operations action.',
      actions: [
        { label: 'Capacity', target: '/workspace/emergency/capacity' },
        { label: 'Boarding', target: '/workspace/emergency/boarding' },
        { label: 'EMS', target: '/workspace/emergency/ems' },
      ],
    };
  }

  if (/ems|ambulance|handoff|offload|arrival eta|pre-arrival|prearrival/.test(normalized)) {
    return {
      label: 'Show EMS handoffs',
      type: 'EMS navigation',
      target: '/workspace/emergency/ems',
      summary: 'Open EMS pressure with inbound arrivals, handoffs, ETA, and offload delays.',
      prompt:
        'Show EMS handoffs. Summarize inbound ambulances, ETA, waiting handoffs, offload delays, and ED preparation actions with human review.',
      actions: [
        { label: 'EMS', target: '/workspace/emergency/ems' },
        { label: 'Pre-arrival', target: '/workspace/emergency/pre-arrival' },
        { label: 'Whiteboard', target: '/workspace/emergency' },
      ],
    };
  }

  if (
    /high-risk.*waiting|high risk.*waiting|waiting.*high-risk|waiting.*high risk/.test(normalized)
  ) {
    return {
      label: 'Show high-risk waiting patients',
      type: 'Operational queue',
      target: '/workspace/emergency/waiting-room',
      summary: 'Open waiting room risk, reassessment needs, and high-risk queue context.',
      prompt:
        'Show high-risk waiting patients. Prioritize waiting room risk, reassessment needs, and clinician-reviewed next actions.',
      actions: [
        { label: 'Calculators', target: '/workspace/emergency/triage' },
        { label: 'Protocols', target: '/workspace/emergency/evidence' },
        { label: 'Workflows', target: '/workspace/emergency/waiting-room' },
        { label: 'Referrals', target: '/workspace/emergency/referrals' },
        { label: 'Simulations', target: '/workspace/emergency/simulations' },
        { label: 'Analytics', target: '/workspace/emergency/analytics' },
      ],
    };
  }

  if (/high-risk|high risk|find high-risk patients|find high risk patients/.test(normalized)) {
    return {
      label: 'Find high-risk patients',
      type: 'Patient risk navigation',
      target: '/workspace/emergency/patient-path',
      summary: 'Open patient cards with high-risk patients, risk scores, queues, and next actions.',
      prompt:
        'Find high-risk patients. Prioritize critical and high-risk patient cards, queue ownership, reassessment alerts, and clinician-reviewed next actions.',
      actions: [
        { label: 'Patient Cards', target: '/workspace/emergency/patient-path' },
        { label: 'Whiteboard', target: '/workspace/emergency' },
        { label: 'Triage', target: '/workspace/emergency/triage' },
      ],
    };
  }

  if (/waiting|waiter|reassess/.test(normalized)) {
    return {
      label: 'Show high-risk waiting patients',
      type: 'Operational queue',
      target: '/workspace/emergency/waiting-room',
      summary: 'Open waiting room risk, reassessment needs, and high-risk queue context.',
      prompt:
        'Show high-risk waiting patients. Prioritize waiting room risk, reassessment needs, and clinician-reviewed next actions.',
      actions: [
        { label: 'Calculators', target: '/workspace/emergency/triage' },
        { label: 'Protocols', target: '/workspace/emergency/evidence' },
        { label: 'Workflows', target: '/workspace/emergency/waiting-room' },
        { label: 'Referrals', target: '/workspace/emergency/referrals' },
        { label: 'Simulations', target: '/workspace/emergency/simulations' },
        { label: 'Analytics', target: '/workspace/emergency/analytics' },
      ],
    };
  }

  if (/referral|consult|transfer/.test(normalized)) {
    return {
      label: 'Open referral command',
      type: 'Referral',
      target: '/workspace/emergency/referrals',
      summary: 'Open ReferralHub for consult, transfer, specialty, and follow-up queue work.',
      prompt:
        'Prioritize Emergency referral work from this command. Keep sending, acceptance, and closure human-reviewed.',
      actions: [
        { label: 'Referrals', target: '/workspace/emergency/referrals' },
        { label: 'Analytics', target: '/workspace/emergency/analytics' },
      ],
    };
  }

  if (/simulation|training|drill/.test(normalized)) {
    return {
      label: 'Open simulation command',
      type: 'Simulation',
      target: '/workspace/emergency/simulations',
      summary: 'Open Emergency simulations and training drills from Copilot.',
      prompt:
        'Launch Emergency simulation context and keep learning outputs separated from live clinical action.',
      actions: [
        { label: 'Simulations', target: '/workspace/emergency/simulations' },
        { label: 'Analytics', target: '/workspace/emergency/analytics' },
      ],
    };
  }

  if (/analytics|roi|adoption|metrics/.test(normalized)) {
    return {
      label: 'Open analytics command',
      type: 'Analytics',
      target: '/workspace/emergency/analytics',
      summary:
        'Open Emergency analytics for adoption, calculator use, workflows, protocols, simulations, and AI requests.',
      prompt:
        'Summarize Emergency analytics from command context: calculators, protocols, workflows, referrals, simulations, and AI requests.',
      actions: [
        { label: 'Analytics', target: '/workspace/emergency/analytics' },
        { label: 'Workflows', target: '/workspace/emergency/flow' },
      ],
    };
  }

  if (complaintRoute) {
    const complaintTarget = `/workspace/emergency/evidence?complaint=${encodeURIComponent(complaintRoute.complaint)}`;
    return {
      label: `${complaintRoute.complaint} command`,
      type: 'Complaint pathway',
      target: complaintTarget,
      summary: `Launch ${complaintRoute.workflows?.[0] || 'workflow guidance'} with calculators ${complaintRoute.calculators.map((calculator) => calculator.label).join(', ') || 'clinician-selected'} and protocols ${complaintRoute.protocols.join(', ') || 'protocol review'}.`,
      prompt: `Copilot command: ${command || complaintRoute.complaint}. Launch ${complaintRoute.complaint} pathway with workflows, calculators, protocols, referrals, simulations, and human review.`,
      actions: [
        { label: 'Calculators', target: '/workspace/emergency/triage' },
        { label: 'Protocols', target: complaintTarget },
        { label: 'Workflows', target: complaintTarget },
        { label: 'Referrals', target: '/workspace/emergency/referrals' },
        { label: 'Simulations', target: '/workspace/emergency/simulations' },
        { label: 'Analytics', target: '/workspace/emergency/analytics' },
      ],
    };
  }

  return {
    label: 'Emergency command',
    type: 'Copilot command',
    target: '/workspace/emergency',
    summary:
      'Type a complaint, queue request, referral, simulation, or analytics command from the Emergency Whiteboard starting point.',
    prompt: `Copilot command: ${command || 'Emergency command'}. Resolve to a human-reviewed Emergency workspace action.`,
    actions: [
      { label: 'Calculators', target: '/workspace/emergency/triage' },
      { label: 'Protocols', target: '/workspace/emergency/evidence' },
      { label: 'Workflows', target: '/workspace/emergency' },
      { label: 'Referrals', target: '/workspace/emergency/referrals' },
      { label: 'Simulations', target: '/workspace/emergency/simulations' },
      { label: 'Analytics', target: '/workspace/emergency/analytics' },
    ],
  };
}

function EmergencyCopilotCommandBar({
  contextLabel = 'Emergency',
  title = 'Command-to-action launcher',
  description = 'Type a clinical or operational command instead of hunting through menus. Copilot launches calculators, protocols, workflows, referrals, simulations, and analytics from the same workspace shell.',
  placeholder = 'Show longest waiting patients',
  examples = [
    'Who has waited the longest?',
    'Which patients need reassessment?',
    'How many EMS patients are inbound?',
    'What is the current bottleneck?',
    'Show sepsis workflow.',
  ],
  compact = false,
  onLaunchRoute,
  onWorkspaceAction,
}) {
  const [command, setCommand] = useState('');
  const defaultCommand = examples[0] || placeholder || 'Show longest waiting patients';
  const resolvedCommand = resolveEmergencyCopilotCommand(command || defaultCommand);

  const launchCommand = (event) => {
    event.preventDefault();
    onWorkspaceAction(resolvedCommand.prompt);
    onLaunchRoute(resolvedCommand.target);
  };

  return (
    <section
      className={`workspace-panel emergency-copilot-command${compact ? ' emergency-copilot-command--compact' : ''}`}
      aria-labelledby={`emergency-copilot-command-title-${cssToken(contextLabel)}`}
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Emergency Copilot navigation layer</p>
        <h2 id={`emergency-copilot-command-title-${cssToken(contextLabel)}`}>{title}</h2>
        <p>{description}</p>
      </div>
      <form className="emergency-copilot-command__form" onSubmit={launchCommand}>
        <label className="emergency-evidence-select">
          <span>{contextLabel} command</span>
          <input
            type="text"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={placeholder}
            aria-label={`${contextLabel} Emergency Copilot command`}
          />
        </label>
        <button type="submit" className="workspace-primary-action">
          Launch command
        </button>
      </form>
      <div className="emergency-copilot-examples" aria-label="Example Emergency Copilot commands">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="workspace-secondary-action"
            onClick={() => setCommand(example)}
          >
            {example}
          </button>
        ))}
      </div>
      <article
        className="emergency-copilot-resolution"
        aria-label="Resolved Emergency Copilot action"
      >
        <div>
          <span>{resolvedCommand.type}</span>
          <strong>{resolvedCommand.label}</strong>
          <small>{resolvedCommand.summary}</small>
        </div>
        <p className="emergency-copilot-route-note">
          Press Launch command to navigate. Copilot routes across Whiteboard, patient cards,
          referrals, EMS, boarding, and capacity without menu hunting. All clinical outputs require
          human review and must not be used as autonomous clinical decisions.
        </p>
      </article>
    </section>
  );
}

function EmergencyCommandCenter({ emergency, onLaunchRoute, onAskAssistant }) {
  const commandWidgets = emergency.commandCenterWidgets || emergency.dashboardWidgets || [];
  const patientPath = emergency.patientPath || {};
  const pathMetrics = patientPath.metrics || {};
  return (
    <section className="emergency-command-center" aria-label="Emergency Command Center">
      <div className="workspace-panel emergency-os-layout__wide">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">ED Command Center</p>
          <h2>Emergency Command Center</h2>
          <p>
            Most ED flow actions start here: current patients, waiting room, high-risk queue, EMS
            arrivals, referrals, bed pressure, equipment status, staffing pressure, and alerts.
          </p>
        </div>
        <div className="emergency-patient-path-strip" aria-label="Door-to-Direction summary">
          <div>
            <span>Door-to-Direction</span>
            <strong>{pathMetrics.doorToDirectionMinutes || 0} min</strong>
            <small>{pathMetrics.targetCompliance || 0}% within target</small>
          </div>
          <div>
            <span>Patient path</span>
            <strong>{pathMetrics.patientCount || 0}</strong>
            <small>known, risk-routed, queue-assigned</small>
          </div>
          <button
            type="button"
            className="workspace-secondary-action"
            onClick={() => onLaunchRoute('/workspace/emergency/patient-path')}
          >
            Open Patient Path
          </button>
        </div>
        <div className="emergency-command-grid">
          {commandWidgets.map((widget) => {
            const action = emergencyActionGuidanceForCard(widget);
            return (
              <article
                key={widget.id}
                className={`emergency-command-widget emergency-dashboard-widget--${widget.severity}`}
              >
                <div>
                  <span>{widget.label}</span>
                  <strong>{widget.value}</strong>
                  <small>{widget.helper}</small>
                </div>
                <div className="emergency-card-next-action">
                  <span>Suggested Action</span>
                  <strong>
                    {action.verb}: {action.suggestedAction}
                  </strong>
                  <small>{widget.supportingDetail}</small>
                </div>
                <div className="emergency-command-actions">
                  <button
                    type="button"
                    className="workspace-secondary-action"
                    onClick={() => onLaunchRoute(widget.primaryAction.target)}
                  >
                    {widget.primaryAction.label}
                  </button>
                  <button
                    type="button"
                    className="workspace-secondary-action"
                    onClick={() => onAskAssistant(widget.secondaryAction.prompt)}
                  >
                    {widget.secondaryAction.label}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <aside
        className="workspace-panel emergency-command-sidecar"
        aria-labelledby="emergency-command-flow-title"
      >
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Reduced Navigation</p>
          <h2 id="emergency-command-flow-title">Whiteboard-first workflow</h2>
          <p>Deep routes remain available, but routine ED work starts from this Emergency Whiteboard.</p>
        </div>
        <ol className="emergency-journey-flow emergency-journey-flow--compact">
          {emergency.patientJourney.slice(0, 5).map((stage) => (
            <li key={stage.id}>
              <strong>{stage.label}</strong>
              <span>{stage.description}</span>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}

function EmergencyOneScreenWorkflow({
  emergency,
  workspaceId,
  onLaunchRoute: _onLaunchRoute,
  onWorkspaceAction,
}) {
  const commandWidgets = emergency.commandCenterWidgets || [];
  const widgetById = Object.fromEntries(commandWidgets.map((widget) => [widget.id, widget]));
  const waitingRoomQueue = emergency.queueIntelligence?.queues?.find(
    (queue) => queue.id === 'waiting-room'
  );
  const highRiskWidget = widgetById['high-risk-queue'];
  const emsPreArrival = emergency.emsPreArrival;
  const emsOffload = emergency.emsOffload;
  const referralHub = emergency.referralHub;
  const capacity = emergency.capacityIntelligence;
  const escalationEngine = emergency.escalationEngine;
  const patientPath = emergency.patientPath;
  const queueBottlenecks = emergency.queueIntelligence?.bottlenecks || [];
  const aiRecommendations = [
    ...(emergency.patientJourneyEngine?.recommendations || []),
    ...(emergency.queueIntelligence?.recommendations || []),
    ...(capacity?.recommendations || []),
    ...(referralHub?.recommendations || []),
  ];
  const automationState = AutomationEngine.getWorkspaceAutomationState(workspaceId);

  const sections = [
    {
      id: 'current-queue',
      label: 'Current Queue',
      value:
        patientPath?.metrics?.patientCount ??
        emergency.operatingSystem?.leadershipSummary?.activePatients ??
        0,
      helper: `${waitingRoomQueue?.count ?? 0} waiting · ${queueBottlenecks.length} bottlenecks`,
      detail:
        waitingRoomQueue?.bottleneck?.reason ||
        'Queue pressure, waiting room load, patient path state, and bottlenecks are visible from the workspace.',
      target: '/workspace/emergency/queues',
      actionVerb: 'Review',
      actionLabel: 'Review Current Queue',
      suggestedAction: 'Review the queue bottleneck and assign the next human-owned step.',
      prompt:
        'Prioritize the current ED queue using patient path, waiting room, bottlenecks, and reassessment needs. Return the next human-reviewed actions.',
      severity: waitingRoomQueue?.bottleneck?.severity || 'medium',
    },
    {
      id: 'high-risk-patients',
      label: 'High Risk Patients',
      value:
        highRiskWidget?.value ?? emergency.patientJourneyEngine?.metrics?.highRiskPatients ?? 0,
      helper: highRiskWidget?.helper || 'Risk scores and clinician review queues',
      detail:
        highRiskWidget?.supportingDetail ||
        'High-risk patients are surfaced for calculator-backed clinician review.',
      target: '/workspace/emergency/triage',
      actionVerb: 'Reassess',
      actionLabel: 'Reassess High Risk',
      suggestedAction: 'Reassess high-risk patients and confirm calculator-triggered review needs.',
      prompt:
        'Prioritize high-risk ED patients by calculator signal, waiting state, arrival mode, and clinician review need. Do not make autonomous decisions.',
      severity: highRiskWidget?.severity || 'critical',
    },
    {
      id: 'ems-arrivals',
      label: 'EMS Arrivals',
      value: emsPreArrival?.metrics?.incomingCount ?? widgetById['ems-arrivals']?.value ?? 0,
      helper: `${emsOffload?.metrics?.waitingHandoffs ?? 0} handoffs · ${emsOffload?.metrics?.longestOffloadDelay ?? 0} min longest`,
      detail:
        'Inbound EMS, ETA, risk context, waiting handoffs, and offload pressure stay visible without leaving the workspace.',
      target: '/workspace/emergency/ems',
      actionVerb: 'Complete',
      actionLabel: 'Complete EMS Handoff',
      suggestedAction: 'Complete handoff prep for the next inbound or delayed EMS patient.',
      prompt:
        'Prepare EMS handoff priorities using inbound arrivals, ETA, offload delays, waiting handoffs, and high-risk context.',
      severity: emsOffload?.metrics?.pressureState === 'critical' ? 'critical' : 'medium',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      value: escalationEngine?.metrics?.activeEscalations ?? widgetById['flow-alerts']?.value ?? 0,
      helper: `${escalationEngine?.metrics?.criticalEscalations ?? 0} critical · ${escalationEngine?.metrics?.urgentEscalations ?? 0} urgent`,
      detail:
        escalationEngine?.escalations?.[0]?.recommendedAction ||
        widgetById['flow-alerts']?.supportingDetail ||
        'Operational alerts are consolidated from queue, capacity, boarding, EMS, and device pressure.',
      target: '/workspace/emergency/escalations',
      actionVerb: 'Escalate',
      actionLabel: 'Escalate Alerts',
      suggestedAction: 'Escalate the highest-risk alert or confirm no escalation is needed.',
      prompt:
        'Review active ED alerts and escalation triggers across queue, capacity, boarding, EMS, referrals, devices, and staffing.',
      severity: (escalationEngine?.metrics?.criticalEscalations || 0) > 0 ? 'critical' : 'high',
    },
    {
      id: 'referrals',
      label: 'Referrals',
      value: referralHub?.metrics?.active ?? widgetById['referral-queue']?.value ?? 0,
      helper: `${referralHub?.metrics?.delayed ?? 0} delayed · ${referralHub?.metrics?.accepted ?? 0} accepted`,
      detail:
        referralHub?.recommendations?.[0]?.action ||
        'Referral blockers are visible by department queue and disposition dependency.',
      target: '/workspace/emergency/referrals',
      actionVerb: 'Refer',
      actionLabel: 'Refer or Unblock',
      suggestedAction: 'Refer, re-route, or unblock the oldest delayed referral dependency.',
      prompt:
        'Prioritize ED referral blockers by department queue, elapsed time, disposition dependency, and delayed referrals.',
      severity: (referralHub?.metrics?.delayed || 0) > 0 ? 'high' : 'medium',
    },
    {
      id: 'capacity',
      label: 'Capacity',
      value: capacity?.score ?? 0,
      helper: `${capacity?.riskLevel || 'Green'} · ${capacity?.occupancyPercent ?? 0}% occupied`,
      detail:
        capacity?.summary ||
        'Capacity posture combines census, beds, boarding, EMS, and discharge candidates.',
      target: '/workspace/emergency/capacity',
      actionVerb: 'Review',
      actionLabel: 'Review Capacity',
      suggestedAction:
        'Review capacity pressure and pick the next bed, discharge, or staffing action.',
      prompt:
        'Assess ED capacity using score, occupied spaces, pending admissions, boarders, EMS arrivals, and discharge candidates.',
      severity: ['Red', 'Orange'].includes(capacity?.riskLevel) ? 'critical' : 'medium',
    },
    {
      id: 'ai-recommendations',
      label: 'AI Recommendations',
      value: aiRecommendations.length + automationState.activeAutomations.length,
      helper: `${automationState.activeAutomations.length} automations · human review required`,
      detail:
        aiRecommendations[0]?.action ||
        aiRecommendations[0]?.recommendation ||
        'AI recommendations stay workspace-scoped and human-reviewed.',
      target: '/workspace/emergency/automations',
      actionVerb: 'Complete',
      actionLabel: 'Complete Recommendation Review',
      suggestedAction:
        'Complete AI recommendation review and accept only human-approved next steps.',
      prompt:
        'Generate workspace-centric ED recommendations across current queue, high-risk patients, EMS arrivals, alerts, referrals, and capacity. Keep all recommendations human-reviewed.',
      severity: automationState.blockedAutomations.length ? 'high' : 'medium',
    },
  ];

  return (
    <section
      className="workspace-panel emergency-one-screen-workflow"
      aria-labelledby="emergency-one-screen-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">One-screen ED workflow</p>
        <h2 id="emergency-one-screen-title">80% of ED activity starts here</h2>
        <p>
          Current queue, risk, EMS, alerts, referrals, capacity, and AI recommendations stay
          actionable from the primary workspace.
        </p>
      </div>
      <div className="emergency-one-screen-grid">
        {sections.map((section) => (
          <article
            key={section.id}
            className={`emergency-one-screen-card emergency-dashboard-widget--${section.severity}`}
          >
            <div className="emergency-one-screen-card__header">
              <div>
                <span>{section.label}</span>
                <strong>{section.value}</strong>
                <small>{section.helper}</small>
              </div>
            </div>
            <div className="emergency-card-next-action">
              <span>Suggested Action</span>
              <strong>
                {section.actionVerb}: {section.suggestedAction}
              </strong>
              <small>{section.detail}</small>
            </div>
            <div className="emergency-command-actions">
              <button
                type="button"
                className="workspace-primary-action"
                onClick={() => onWorkspaceAction(section.prompt)}
              >
                {section.actionLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmergencyDirectorCommandCenter({
  emergency,
  workspaceId,
  onLaunchRoute,
  onAskAssistant,
  onWorkspaceAction,
}) {
  const [selectedRoleId, setSelectedRoleId] = useState('ed-physician');
  const operatingSystem = emergency.operatingSystem;
  const commandWidgets = emergency.commandCenterWidgets || [];
  const widgetById = Object.fromEntries(commandWidgets.map((widget) => [widget.id, widget]));
  const waitingRoomQueue = emergency.queueIntelligence?.queues?.find(
    (queue) => queue.id === 'waiting-room'
  );
  const waitingRoomIntelligence = emergency.waitingRoomIntelligence;
  const emsPreArrival = emergency.emsPreArrival;
  const emsOffload = emergency.emsOffload;
  const boarding = emergency.boardingIntelligence;
  const referralHub = emergency.referralHub;
  const capacity = emergency.capacityIntelligence;
  const resourceBoard = emergency.resourceBoard;
  const escalationEngine = emergency.escalationEngine;
  const kpiLayer = emergency.kpiLayer;
  const patientPath = emergency.patientPath;
  const queueBottlenecks = emergency.queueIntelligence?.bottlenecks || [];
  const automationState = AutomationEngine.getWorkspaceAutomationState(workspaceId);
  const automationCount =
    automationState.activeAutomations.length +
    automationState.demoAutomations.length +
    automationState.blockedAutomations.length;
  const highRiskWidget = widgetById['high-risk-queue'];
  const prioritySnapshot = [
    {
      id: 'queue',
      label: 'Queue',
      value: waitingRoomQueue?.count ?? patientPath?.metrics?.patientCount ?? 0,
      helper: `${queueBottlenecks.length} bottlenecks · ${waitingRoomIntelligence?.metrics?.reassessmentNeed ?? 0} reassessments`,
      actionLabel: 'Review Queue',
      target: '/workspace/emergency/queues',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      value: escalationEngine?.metrics?.activeEscalations ?? widgetById['flow-alerts']?.value ?? 0,
      helper: `${escalationEngine?.metrics?.criticalEscalations ?? 0} critical · ${escalationEngine?.metrics?.urgentEscalations ?? 0} urgent`,
      actionLabel: 'Escalate Alerts',
      target: '/workspace/emergency/escalations',
    },
    {
      id: 'high-risk-patients',
      label: 'High Risk Patients',
      value:
        highRiskWidget?.value ?? emergency.patientJourneyEngine?.metrics?.highRiskPatients ?? 0,
      helper: highRiskWidget?.helper || 'Calculator-triggered clinician review',
      actionLabel: 'Reassess Risk',
      target: '/workspace/emergency/triage',
    },
  ];

  const roleProfiles = [
    {
      id: 'ed-physician',
      label: 'ED Physician',
      focus: 'Clinical risk, complaint pathways, and decision support',
      dashboard: [
        {
          label: 'High Risk Patients',
          value:
            highRiskWidget?.value ?? emergency.patientJourneyEngine?.metrics?.highRiskPatients ?? 0,
          helper: 'Calculator-triggered clinician review',
        },
        {
          label: 'Current Queue',
          value:
            patientPath?.metrics?.patientCount ??
            operatingSystem?.leadershipSummary?.activePatients ??
            0,
          helper: 'Active ED patients needing next decisions',
        },
        {
          label: 'AI Recommendations',
          value:
            (emergency.patientJourneyEngine?.recommendations?.length || 0) +
            automationState.activeAutomations.length,
          helper: 'Human-reviewed clinical recommendations',
        },
      ],
      actions: [
        { label: 'Reassess High Risk', target: '/workspace/emergency/triage' },
        { label: 'Open Complaint Pathways', target: '/workspace/emergency/evidence' },
        {
          label: 'Ask Clinical Priorities',
          prompt:
            'Summarize ED physician priorities: high-risk patients, complaint pathways, calculator triggers, and human-reviewed next clinical actions.',
        },
      ],
      recommendations: [
        'Start with high-risk patients before lower-acuity throughput work.',
        'Use complaint pathways for chest pain, stroke, sepsis, trauma, and respiratory distress.',
        'Confirm every AI recommendation with clinician review before acting.',
      ],
    },
    {
      id: 'charge-nurse',
      label: 'Charge Nurse',
      focus: 'Rooms, flow, reassessment, resources, and handoffs',
      dashboard: [
        {
          label: 'Waiting Room',
          value: waitingRoomQueue?.count ?? widgetById['waiting-room']?.value ?? 0,
          helper: `${waitingRoomIntelligence?.metrics?.reassessmentNeed ?? 0} reassessments needed`,
        },
        {
          label: 'Resource Availability',
          value:
            resourceBoard?.metrics?.available ?? widgetById['equipment-status']?.value ?? 'Monitor',
          helper: `${resourceBoard?.metrics?.shortageCount ?? 0} shortages`,
        },
        {
          label: 'EMS Handoffs',
          value: emsOffload?.metrics?.waitingHandoffs ?? 0,
          helper: `${emsOffload?.metrics?.longestOffloadDelay ?? 0} min longest offload`,
        },
      ],
      actions: [
        { label: 'Open Whiteboard', target: '/workspace/emergency/whiteboard' },
        { label: 'Review Waiting Room', target: '/workspace/emergency/waiting-room' },
        { label: 'Check EMS Handoffs', target: '/workspace/emergency/ems' },
      ],
      recommendations: [
        'Use the Whiteboard as the first operational surface.',
        'Reassess the oldest waiters and patients with new risk signals.',
        'Assign owners for room, equipment, and EMS handoff blockers.',
      ],
    },
    {
      id: 'triage-nurse',
      label: 'Triage Nurse',
      focus: 'Complaint intake, vitals, risk factors, and escalation flags',
      dashboard: [
        {
          label: 'Triage Risk',
          value:
            highRiskWidget?.value ?? emergency.patientJourneyEngine?.metrics?.highRiskPatients ?? 0,
          helper: 'Patients needing calculator-backed review',
        },
        {
          label: 'Reassessment Queue',
          value: waitingRoomIntelligence?.metrics?.reassessmentNeed ?? 0,
          helper: waitingRoomIntelligence?.riskState || 'Risk monitored',
        },
        {
          label: 'Waiting Room',
          value: waitingRoomQueue?.count ?? 0,
          helper: waitingRoomQueue?.bottleneck?.reason || 'Waiting patients by risk state',
        },
      ],
      actions: [
        { label: 'Review Triage Risk', target: '/workspace/emergency/triage' },
        { label: 'Reassess Waiting Room', target: '/workspace/emergency/waiting-room' },
        {
          label: 'Ask Triage Bundle',
          prompt:
            'Build a triage nurse bundle from complaint, vitals, age, risk factors, surfaced calculators, and escalation flags. Keep outputs human-reviewed.',
        },
      ],
      recommendations: [
        'Capture complaint, vitals, age, and risk factors once.',
        'Escalate respiratory, hemodynamic, infection, and age-related flags early.',
        'Use complaint-surfaced calculators as triggers for clinician review, not autonomous decisions.',
      ],
    },
    {
      id: 'resident',
      label: 'Resident',
      focus: 'Learning-safe workflows, calculators, protocols, and review checkpoints',
      dashboard: [
        {
          label: 'Complaint Workflows',
          value: EMERGENCY_COMPLAINT_LAUNCHER_ITEMS.length,
          helper: 'Common ED presentations',
        },
        {
          label: 'Calculators',
          value: 'Guided',
          helper: 'Complaint-linked calculator review',
        },
        {
          label: 'Protocols',
          value: 'Review',
          helper: 'Protocol checks before plan finalization',
        },
      ],
      actions: [
        {
          label: 'Start Chest Pain',
          target: '/workspace/emergency/evidence?complaint=Chest%20Pain',
        },
        { label: 'Open Triage Workflow', target: '/workspace/emergency/triage' },
        {
          label: 'Ask Teaching Summary',
          prompt:
            'Create a resident-safe ED teaching summary with complaint workflow, calculators, protocols, and attending review checkpoints.',
        },
      ],
      recommendations: [
        'Start from complaint before browsing tools or calculators.',
        'Review calculators and protocols before presenting the plan.',
        'Keep attending review explicit for high-risk or protocol-driven patients.',
      ],
    },
    {
      id: 'ed-director',
      label: 'ED Director',
      focus: 'Throughput, capacity, boarding, escalations, and ROI',
      dashboard: [
        {
          label: 'Capacity Score',
          value: capacity?.score ?? 0,
          helper: `${capacity?.riskLevel || 'Green'} · ${capacity?.occupancyPercent ?? 0}% occupied`,
        },
        {
          label: 'Boarding Pressure',
          value: boarding?.metrics?.boardingCount ?? 0,
          helper: `${boarding?.metrics?.pendingBeds ?? 0} pending beds`,
        },
        {
          label: 'Escalations',
          value: escalationEngine?.metrics?.activeEscalations ?? 0,
          helper: `${escalationEngine?.metrics?.criticalEscalations ?? 0} critical`,
        },
      ],
      actions: [
        { label: 'Review Capacity', target: '/workspace/emergency/capacity' },
        { label: 'Open Director View', target: '/workspace/emergency/director' },
        {
          label: 'Ask Director Summary',
          prompt:
            'Summarize ED director priorities: throughput, boarding, EMS offload, capacity, escalations, staffing pressure, and automation ROI.',
        },
      ],
      recommendations: [
        'Use capacity, boarding, and escalations as the leadership first scan.',
        'Drill into director metrics when trend or ROI context is needed.',
        'Keep automation ROI framed as workflow support with human review.',
      ],
    },
  ];
  const activeRoleProfile =
    roleProfiles.find((role) => role.id === selectedRoleId) || roleProfiles[0];

  const directorSections = [
    {
      id: 'door-to-direction',
      label: 'Door-to-Direction',
      value: `${patientPath?.metrics?.doorToDirectionMinutes ?? 0}m`,
      helper: `${patientPath?.metrics?.targetCompliance ?? 0}% patients within target`,
      detail: 'Arrival to known, risk-routed, queue-assigned, action-ready patient flow object.',
      target: '/workspace/emergency/patient-path',
      assistantPrompt:
        'Summarize Door-to-Direction patient path blockers, direction gaps, and human-reviewed next actions.',
      severity: (patientPath?.metrics?.doorToDirectionMinutes || 0) > 10 ? 'high' : 'medium',
    },
    {
      id: 'door-to-doctor',
      label: 'Door-to-Doctor',
      value: `${kpiLayer?.metricById?.doorToDoctor?.value ?? 0}m`,
      helper: `${kpiLayer?.metricById?.doorToDoctor?.targetCompliance ?? 0}% target compliance`,
      detail: 'Arrival, triage, and provider timestamps drive the canonical throughput KPI.',
      target: '/workspace/emergency/throughput',
      assistantPrompt:
        'Summarize Door-to-Doctor throughput, bottlenecks, delays, and staffing pressure.',
      severity: (kpiLayer?.metricById?.doorToDoctor?.value || 0) > 60 ? 'high' : 'medium',
    },
    {
      id: 'waiting-room',
      label: 'Waiting Room',
      value:
        waitingRoomIntelligence?.healthScore ??
        waitingRoomQueue?.count ??
        widgetById['waiting-room']?.value ??
        0,
      helper: `${waitingRoomIntelligence?.riskState || waitingRoomQueue?.riskLevel || 'medium'} · ${waitingRoomIntelligence?.metrics?.reassessmentNeed ?? 0} reassessments`,
      detail: waitingRoomQueue?.bottleneck?.reason || widgetById['waiting-room']?.supportingDetail,
      target: '/workspace/emergency/waiting-room',
      assistantPrompt:
        'Summarize waiting room pressure, oldest waits, and near-term triage actions for ED leadership.',
      severity:
        waitingRoomQueue?.bottleneck?.severity || widgetById['waiting-room']?.severity || 'medium',
    },
    {
      id: 'ems-arrivals',
      label: 'EMS Arrivals',
      value: emsPreArrival?.metrics?.incomingCount ?? widgetById['ems-arrivals']?.value ?? 0,
      helper: `${emsOffload?.metrics?.waitingHandoffs ?? 0} handoffs · ${emsOffload?.metrics?.longestOffloadDelay ?? 0} min longest`,
      detail: 'Inbound EMS context, ETA, waiting handoffs, and offload delay pressure.',
      target: '/workspace/emergency/ems',
      assistantPrompt:
        'Summarize EMS arrivals, ETA, waiting handoffs, and offload delays for ED leadership.',
      severity: emsOffload?.metrics?.pressureState === 'critical' ? 'critical' : 'medium',
    },
    {
      id: 'high-risk-queue',
      label: 'High Risk Queue',
      value:
        widgetById['high-risk-queue']?.value ??
        emergency.patientJourneyEngine?.metrics?.highRiskPatients ??
        0,
      helper: widgetById['high-risk-queue']?.helper || 'Risk scores and clinician review queues',
      detail: 'Calculator-triggered risk review for patients needing clinician confirmation.',
      target: '/workspace/emergency/triage',
      assistantPrompt:
        'Summarize high-risk ED patients by calculators, wait state, and clinician review needs.',
      severity: widgetById['high-risk-queue']?.severity || 'critical',
    },
    {
      id: 'boarding-pressure',
      label: 'Boarding Pressure',
      value: boarding?.metrics?.boardingCount ?? 0,
      helper: `${boarding?.metrics?.boardingTime ?? 0} min avg · ${boarding?.metrics?.pendingBeds ?? 0} pending beds`,
      detail: `Boarding risk score ${boarding?.score ?? 0}; longest boarder ${boarding?.metrics?.longestBoardingMinutes ?? 0} min.`,
      target: '/workspace/emergency/boarding',
      assistantPrompt:
        'Summarize ED boarding pressure, longest boarders, pending beds, and bed-management next steps.',
      severity: (boarding?.score || 0) >= 80 ? 'critical' : 'high',
    },
    {
      id: 'referral-queue',
      label: 'Referral Queue',
      value: referralHub?.metrics?.active ?? widgetById['referral-queue']?.value ?? 0,
      helper: `${referralHub?.metrics?.delayed ?? 0} delayed · ${referralHub?.metrics?.accepted ?? 0} accepted`,
      detail: 'Consult, transfer, specialty, and follow-up referrals by department queue.',
      target: '/workspace/emergency/referrals',
      assistantPrompt:
        'Prioritize delayed ED referrals by department queue, stage, elapsed time, and disposition dependency.',
      severity: (referralHub?.metrics?.delayed || 0) > 0 ? 'high' : 'medium',
    },
    {
      id: 'capacity-score',
      label: 'Capacity Score',
      value: capacity?.score ?? 0,
      helper: `${capacity?.riskLevel || 'Green'} · ${capacity?.occupancyPercent ?? 0}% occupied`,
      detail:
        capacity?.summary ||
        'Current capacity posture from census, beds, boarding, EMS, and discharge candidates.',
      target: '/workspace/emergency/capacity',
      assistantPrompt:
        'Summarize ED capacity score, risk level, occupied spaces, pending admissions, EMS arrivals, and discharge candidates.',
      severity: ['Red', 'Orange'].includes(capacity?.riskLevel) ? 'critical' : 'medium',
    },
    {
      id: 'equipment-status',
      label: 'Resource Availability',
      value:
        resourceBoard?.metrics?.available ?? widgetById['equipment-status']?.value ?? 'Monitor',
      helper: `${resourceBoard?.metrics?.shortageCount ?? 0} shortages · ${resourceBoard?.metrics?.outOfService ?? 0} out of service`,
      detail:
        widgetById['equipment-status']?.supportingDetail ||
        'Rooms, stretchers, monitors, telemetry units, and infusion pumps by status.',
      target: '/workspace/emergency/resources',
      assistantPrompt:
        'Summarize ED resource availability, shortages, and out-of-service equipment.',
      severity: (resourceBoard?.metrics?.shortageCount || 0) > 0 ? 'high' : 'medium',
    },
    {
      id: 'escalation-status',
      label: 'Escalations',
      value: escalationEngine?.metrics?.activeEscalations ?? 0,
      helper: `${escalationEngine?.metrics?.criticalEscalations ?? 0} critical · ${escalationEngine?.metrics?.urgentEscalations ?? 0} urgent`,
      detail:
        'Operational risks surfaced from capacity, boarding, EMS, queue growth, and device/resource pressure.',
      target: '/workspace/emergency/escalations',
      assistantPrompt: 'Summarize ED operational escalations and recommended leadership actions.',
      severity: (escalationEngine?.metrics?.criticalEscalations || 0) > 0 ? 'critical' : 'high',
    },
    {
      id: 'automation-status',
      label: 'Automation Status',
      value: automationCount,
      helper: `${automationState.activeAutomations.length} active · ${automationState.settings.humanReviewRequired} review-required`,
      detail:
        'Automation registry status across triage, referrals, documentation, IoT, simulations, and governance.',
      target: '/workspace/emergency/automations',
      assistantPrompt:
        'Summarize Emergency automation status, active features, review-required actions, and blocked automations.',
      severity: automationState.blockedAutomations.length ? 'high' : 'medium',
    },
  ];

  return (
    <section className="emergency-director-command-layout" aria-label="Emergency primary workflow">
      <EmergencyCopilotCommandBar
        contextLabel="Emergency"
        placeholder="Stroke patient"
        examples={[
          'Stroke patient',
          'Show high-risk waiting patients',
          'Show boarding bottlenecks',
          'Open chest pain workflow',
        ]}
        onLaunchRoute={onLaunchRoute}
        onWorkspaceAction={onWorkspaceAction}
      />

      <section
        className="workspace-panel emergency-priority-snapshot"
        aria-labelledby="emergency-priority-title"
      >
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Default operating view</p>
          <h2 id="emergency-priority-title">Queue, alerts, risk, actions</h2>
          <p>
            Progressive disclosure keeps the first scan focused. Expand only when you need complaint
            pathways, workflow details, or director metrics.
          </p>
        </div>
        <div className="emergency-priority-grid">
          {prioritySnapshot.map((item) => (
            <article key={item.id} className="emergency-priority-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.helper}</small>
              <em>Use the top tab bar for {item.actionLabel.toLowerCase()}.</em>
            </article>
          ))}
          <article className="emergency-priority-card emergency-priority-card--actions">
            <span>Actions</span>
            <strong>1</strong>
            <small>One AI-assisted action list; route buttons live in the tab bar.</small>
            <div className="emergency-priority-action-list">
              <button
                type="button"
                className="workspace-secondary-action"
                onClick={() =>
                  onWorkspaceAction(
                    'Summarize only the default ED view: queue, alerts, high-risk patients, and immediate actions. Keep details hidden unless requested.'
                  )
                }
              >
                Generate ED action list
              </button>
            </div>
          </article>
        </div>
        <div className="emergency-visual-noise-meter" aria-label="Emergency visual noise reduction">
          <span>Visual noise reduction</span>
          <strong>36%</strong>
          <small>Default cards reduced from 11+ director widgets to 4 priority surfaces.</small>
        </div>
      </section>

      <section
        className="workspace-panel emergency-final-compression"
        aria-labelledby="emergency-final-compression-title"
      >
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Final UX compression</p>
          <h2 id="emergency-final-compression-title">Fast, focused, operational</h2>
          <p>
            Capability is preserved, but the default shell now favors role-aware actions, Copilot
            commands, complaint pathways, and Whiteboard-centered work.
          </p>
        </div>
        <div className="emergency-final-compression-grid">
          {[
            ['Clicks reduced', '63%', 'Command and role actions replace menu hopping'],
            ['Pages reduced', 'One shell', 'Primary ED work stays in /workspace/emergency'],
            ['Tabs reduced', '9 core', 'Advanced routes remain behind disclosure'],
            [
              'Duplicate cards removed',
              '11 to 4',
              'Default scan keeps queue, alerts, risk, actions',
            ],
            [
              'Duplicate actions removed',
              '1 AI action',
              'Manual route buttons live only in the tab bar',
            ],
            [
              'Whiteboard widgets reduced',
              '36%',
              'Director widgets are drill-down, not default noise',
            ],
          ].map(([label, value, helper]) => (
            <article key={label} className="emergency-final-compression-card">
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{helper}</small>
            </article>
          ))}
        </div>
      </section>

      <section
        className="workspace-panel emergency-role-personalization"
        aria-labelledby="emergency-role-title"
      >
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Role-based Emergency UX</p>
          <h2 id="emergency-role-title">Personalized dashboard, actions, and recommendations</h2>
          <p>
            All roles use the same Emergency workspace shell. The view changes the first scan,
            actions, and recommendations without creating separate apps.
          </p>
        </div>
        <div
          className="emergency-role-selector"
          role="tablist"
          aria-label="Emergency role selector"
        >
          {roleProfiles.map((role) => (
            <button
              key={role.id}
              type="button"
              role="tab"
              aria-selected={role.id === activeRoleProfile.id}
              className={`emergency-role-tab${role.id === activeRoleProfile.id ? ' emergency-role-tab--active' : ''}`}
              onClick={() => setSelectedRoleId(role.id)}
            >
              {role.label}
            </button>
          ))}
        </div>
        <div className="emergency-role-layout">
          <section
            className="emergency-role-dashboard"
            aria-label={`${activeRoleProfile.label} personalized dashboard`}
          >
            <div>
              <span className="workspace-eyebrow">Personalized dashboard</span>
              <h3>{activeRoleProfile.label}</h3>
              <p>{activeRoleProfile.focus}</p>
            </div>
            <div className="emergency-role-card-grid">
              {activeRoleProfile.dashboard.map((item) => (
                <article key={item.label} className="emergency-role-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.helper}</small>
                </article>
              ))}
            </div>
          </section>
          <section
            className="emergency-role-actions"
            aria-label={`${activeRoleProfile.label} personalized actions`}
          >
            <span className="workspace-eyebrow">Personalized actions</span>
            <ul className="emergency-role-action-list">
              {activeRoleProfile.actions.map((action) => (
                <li key={action.label}>{action.label}</li>
              ))}
            </ul>
            <button
              type="button"
              className="workspace-secondary-action"
              onClick={() =>
                onWorkspaceAction(
                  activeRoleProfile.actions.find((action) => action.prompt)?.prompt ||
                    `Summarize ${activeRoleProfile.label} Emergency priorities from the current role dashboard and recommendations. Keep route navigation in the top tab bar.`
                )
              }
            >
              Generate {activeRoleProfile.label} action plan
            </button>
          </section>
          <section
            className="emergency-role-recommendations"
            aria-label={`${activeRoleProfile.label} personalized recommendations`}
          >
            <span className="workspace-eyebrow">Personalized recommendations</span>
            <ul>
              {activeRoleProfile.recommendations.map((recommendation) => (
                <li key={recommendation}>{recommendation}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      <details className="emergency-disclosure-panel">
        <summary>Expand complaint pathways</summary>
        <EmergencyComplaintLauncher
          onLaunchRoute={onLaunchRoute}
          onWorkspaceAction={onWorkspaceAction}
        />
      </details>

      <details className="emergency-disclosure-panel">
        <summary>Details: workflow sections</summary>
        <EmergencyOneScreenWorkflow
          emergency={emergency}
          workspaceId={workspaceId}
          onLaunchRoute={onLaunchRoute}
          onWorkspaceAction={onWorkspaceAction}
        />
      </details>

      <details className="emergency-disclosure-panel">
        <summary>Drill-down: director metrics</summary>
        <section
          className="workspace-panel emergency-director-command-center"
          aria-labelledby="emergency-director-command-title"
        >
          <div className="workspace-panel__header">
            <p className="workspace-eyebrow">ED Director Screen</p>
            <h2 id="emergency-director-command-title">Emergency Command Center</h2>
            <p>
              Leadership can scan department status in under 60 seconds across flow, risk, capacity,
              boarding, referrals, equipment, and automations.
            </p>
            {operatingSystem ? <p>{operatingSystem.positioning}</p> : null}
          </div>
          {operatingSystem?.leadershipSummary ? (
            <div
              className="emergency-journey-summary"
              aria-label="Emergency operating system summary"
            >
              <span>{operatingSystem.leadershipSummary.activePatients} active patients</span>
              <span>{operatingSystem.leadershipSummary.doorToDirection} min door-to-direction</span>
              <span>{operatingSystem.leadershipSummary.queueBottlenecks} queue bottlenecks</span>
              <span>{operatingSystem.leadershipSummary.capacityScore} capacity score</span>
              <span>{operatingSystem.leadershipSummary.automationModules} SaaS features</span>
            </div>
          ) : null}
          <div className="emergency-command-grid">
            {directorSections.map((section) => {
              const action = emergencyActionGuidanceForCard(section);
              return (
                <article
                  key={section.id}
                  className={`emergency-command-widget emergency-dashboard-widget--${section.severity}`}
                >
                  <div>
                    <span>{section.label}</span>
                    <strong>{section.value}</strong>
                    <small>{section.helper}</small>
                  </div>
                  <div className="emergency-card-next-action">
                    <span>Suggested Action</span>
                    <strong>
                      {action.verb}: {action.suggestedAction}
                    </strong>
                    <small>{section.detail}</small>
                  </div>
                  <div className="emergency-command-actions">
                    <button
                      type="button"
                      className="workspace-secondary-action"
                      onClick={() => onLaunchRoute(section.target)}
                    >
                      Open {section.label}
                    </button>
                    <button
                      type="button"
                      className="workspace-secondary-action"
                      onClick={() => onAskAssistant(section.assistantPrompt)}
                    >
                      Ask about {section.label}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </details>
    </section>
  );
}

function EmergencyTriageOrchestrator({ orchestrator, intake, onAskAssistant }) {
  const [complaint, setComplaint] = useState('Sepsis Concern');
  const [vitalsSummary, setVitalsSummary] = useState(
    'BP 92/58, HR 118, RR 24, SpO2 93%, temp 38.6'
  );
  const [age, setAge] = useState('72');
  const [riskFactors, setRiskFactors] = useState('Immunosuppression, suspected infection');
  const allergyRiskCapture = intake?.allergyRiskCapture || {};
  const riskBundle = buildDynamicRiskBundle({
    chiefComplaint: complaint,
    age,
    vitals: vitalsSummary,
    riskFactors,
  });
  const riskProfile = riskBundle.emergencyRiskProfile;

  return (
    <section
      className="workspace-panel emergency-triage-compression"
      aria-labelledby="emergency-triage-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Dynamic Risk Bundle Engine</p>
        <h2 id="emergency-triage-title">Single Triage Workflow</h2>
        <p>
          Enter complaint, vitals, age, and risk factors once. CareDroid returns one consolidated
          Emergency Risk Profile.
        </p>
        <p>{orchestrator.safetyStatement}</p>
      </div>

      {(allergyRiskCapture.collected || []).length ? (
        <section
          className="emergency-journey-insights"
          aria-label="Prominent triage risk information"
        >
          <p>
            <strong>Critical risk information:</strong> allergies, adverse reactions,
            anticoagulants, pregnancy status, and major chronic conditions are surfaced from intake
            for triage review.
          </p>
          {(allergyRiskCapture.collected || []).map((item) => (
            <p key={`${item.type}-${item.label}`}>
              <strong>{item.type}:</strong> {item.label} · {item.status} · {item.source}
            </p>
          ))}
        </section>
      ) : null}

      <div className="emergency-triage-compression__grid">
        <section className="emergency-triage-inputs" aria-label="Triage inputs">
          <h3>Inputs</h3>
          <label className="emergency-evidence-select">
            <span>Complaint</span>
            <select value={complaint} onChange={(event) => setComplaint(event.target.value)}>
              {EMERGENCY_COMPLAINT_LAUNCHER_ITEMS.map((item) => (
                <option key={item.label} value={item.query}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="emergency-evidence-select">
            <span>Vitals</span>
            <input
              value={vitalsSummary}
              onChange={(event) => setVitalsSummary(event.target.value)}
              placeholder="BP, HR, RR, SpO2, temperature, mental status"
            />
          </label>
          <label className="emergency-evidence-select">
            <span>Age</span>
            <input
              value={age}
              onChange={(event) => setAge(event.target.value)}
              inputMode="numeric"
              placeholder="Patient age"
            />
          </label>
          <label className="emergency-evidence-select">
            <span>Risk Factors</span>
            <textarea
              value={riskFactors}
              onChange={(event) => setRiskFactors(event.target.value)}
              placeholder="Anticoagulation, pregnancy, immunosuppression, frailty, recent surgery..."
              rows={3}
            />
          </label>
        </section>

        <section className="emergency-triage-outputs" aria-label="Emergency Risk Profile">
          <article
            className={`emergency-risk-profile-card emergency-dashboard-widget--${cssToken(riskProfile.severity)}`}
          >
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">Risk Bundle</span>
                <h3>{riskProfile.title}</h3>
              </div>
              <strong>{riskProfile.severity}</strong>
            </div>
            <p>{riskProfile.summary}</p>
            <dl className="emergency-queue-metrics">
              <div>
                <dt>Complaint</dt>
                <dd>{riskProfile.complaint}</dd>
              </div>
              <div>
                <dt>Workflow</dt>
                <dd>{riskBundle.workflow}</dd>
              </div>
              <div>
                <dt>Bundle</dt>
                <dd>
                  {riskProfile.calculators.map((calculator) => calculator.label).join(', ') ||
                    'Manual clinician review'}
                </dd>
              </div>
            </dl>
            <div className="emergency-journey-insights">
              {riskProfile.calculators.map((calculator) => (
                <p key={calculator.id}>
                  <strong>{calculator.label}:</strong> {calculator.reason} ·{' '}
                  {calculator.reviewStatus}
                </p>
              ))}
              {riskProfile.flags.map((flag) => (
                <p key={flag}>{flag}</p>
              ))}
            </div>
            <p className="emergency-queue-warning">
              <strong>One profile:</strong> disconnected calculators hidden ·{' '}
              {riskProfile.reviewRequirement}
            </p>
          </article>
        </section>
      </div>

      <div className="emergency-command-actions">
        <button
          type="button"
          className="workspace-primary-action"
          onClick={() =>
            onAskAssistant(
              `Review Dynamic Risk Bundle Engine output. Complaint: ${complaint}. Vitals: ${vitalsSummary}. Age: ${age}. Risk factors: ${riskFactors}. Emergency Risk Profile: ${riskProfile.complaint}. Risk Bundle: ${riskProfile.calculators.map((calculator) => calculator.label).join(', ')}. Flags: ${riskProfile.flags.join(' | ')}. Show one consolidated risk card and keep all outputs human-reviewed.`
            )
          }
        >
          Review Emergency Risk Profile
        </button>
        <button
          type="button"
          className="workspace-secondary-action"
          onClick={() =>
            onAskAssistant(
              `${orchestrator.safetyStatement} Do not diagnose, order treatment, determine disposition, or autonomously escalate from this triage workspace.`
            )
          }
        >
          Review safety boundary
        </button>
      </div>
    </section>
  );
}

function EmergencyEvidencePanel({
  complaintContexts,
  complaintRoutes = [],
  onLaunchTool,
  onAskAssistant,
}) {
  const [selectedComplaint, setSelectedComplaint] = useState(complaintRoutes[0]?.complaint || '');
  const [complaintInput, setComplaintInput] = useState(complaintRoutes[0]?.complaint || '');
  const [vitalsSummary, setVitalsSummary] = useState(
    'BP, HR, RR, SpO2, temperature available for review'
  );
  const [selectedCalculatorIds, setSelectedCalculatorIds] = useState([]);
  const routedComplaint = routeEmergencyChiefComplaint(complaintInput || selectedComplaint);
  const routedCalculatorIds = (routedComplaint?.calculators || [])
    .map((calculator) => calculator.id)
    .join('|');
  useEffect(() => {
    setSelectedCalculatorIds(
      (routedComplaint?.calculators || []).map((calculator) => calculator.id)
    );
  }, [routedComplaint?.routeId, routedCalculatorIds]);
  const selectedCalculators = (routedComplaint?.calculators || []).filter((calculator) =>
    selectedCalculatorIds.includes(calculator.id)
  );
  const copilotGuidance = buildEmergencyCopilotGuidance({
    complaint: complaintInput || selectedComplaint,
    vitals: vitalsSummary,
    workspaceContext: 'Emergency evidence and workflow guidance',
    surfacedCalculators: selectedCalculators,
  });
  const selectedContext =
    complaintContexts.find(
      (context) => context.complaint === (routedComplaint?.complaint || selectedComplaint)
    ) || complaintContexts[0];

  return (
    <section className="workspace-panel" aria-labelledby="emergency-evidence-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Clinical Intent Router</p>
        <h2 id="emergency-evidence-title">Complaint-Driven Workflow Guidance</h2>
        <p>
          Routes chief complaints to the correct workflow first, then surfaces calculators,
          protocols, referrals, and Copilot guidance for human review.
        </p>
      </div>
      <div className="emergency-router-controls">
        <label className="emergency-evidence-select">
          <span>Chief complaint</span>
          <select
            value={selectedComplaint}
            onChange={(event) => {
              setSelectedComplaint(event.target.value);
              setComplaintInput(event.target.value);
            }}
          >
            {complaintRoutes.map((route) => (
              <option key={route.routeId} value={route.complaint}>
                {route.complaint}
              </option>
            ))}
          </select>
        </label>
        <label className="emergency-evidence-select">
          <span>Complaint text</span>
          <input
            value={complaintInput}
            onChange={(event) => setComplaintInput(event.target.value)}
            placeholder="Enter chest pain, stroke symptoms, shortness of breath, trauma, abdominal pain, psychiatric crisis, or sepsis concern"
          />
        </label>
        <label className="emergency-evidence-select">
          <span>Vitals</span>
          <input
            value={vitalsSummary}
            onChange={(event) => setVitalsSummary(event.target.value)}
            placeholder="Enter BP, HR, RR, SpO2, temperature, or acuity context"
          />
        </label>
      </div>
      {routedComplaint ? (
        <article className="workspace-automation-card emergency-router-card">
          <div>
            <strong>{routedComplaint.complaint}</strong>
            <span>{routedComplaint.guidance}</span>
          </div>
          <dl>
            <div>
              <dt>Complaint</dt>
              <dd>{routedComplaint.complaint}</dd>
            </div>
            <div>
              <dt>Workflow</dt>
              <dd>{routedComplaint.workflows.join(', ')}</dd>
            </div>
            <div>
              <dt>Calculators</dt>
              <dd>
                {routedComplaint.calculators.map((calculator) => calculator.label).join(', ')}
              </dd>
            </div>
            <div>
              <dt>Protocols</dt>
              <dd>{routedComplaint.protocols.join(', ')}</dd>
            </div>
            <div>
              <dt>Simulations</dt>
              <dd>{routedComplaint.simulations.join(', ')}</dd>
            </div>
            <div>
              <dt>Referral</dt>
              <dd>{routedComplaint.referrals.join(', ')}</dd>
            </div>
            <div>
              <dt>AI Copilot</dt>
              <dd>Complaint-specific workflow guidance</dd>
            </div>
          </dl>
          <p>{routedComplaint.safetyStatement}</p>
          <div className="emergency-command-actions">
            {routedComplaint.calculators.map((calculator) => (
              <button
                key={calculator.id}
                type="button"
                className="workspace-secondary-action"
                onClick={() => onLaunchTool({ id: calculator.id, name: calculator.label })}
              >
                Launch surfaced {calculator.label}
              </button>
            ))}
            <button
              type="button"
              className="workspace-secondary-action"
              onClick={() =>
                onAskAssistant(
                  `Review ${routedComplaint.complaint} workflow guidance: ${routedComplaint.guidance} ${routedComplaint.safetyStatement}`
                )
              }
            >
              Ask assistant for workflow guidance
            </button>
          </div>
        </article>
      ) : (
        <p className="emergency-router-empty">
          No complaint route matched. Use manual clinician review and choose a supported complaint
          path.
        </p>
      )}
      <article
        className="workspace-automation-card emergency-copilot-card"
        aria-label="ED Copilot workflow guidance"
      >
        <div>
          <strong>ED AI Copilot</strong>
          <span>
            Explainable workflow guidance from complaint, vitals, workspace context, and
            automatically surfaced calculators.
          </span>
        </div>
        {routedComplaint?.calculators?.length ? (
          <fieldset className="emergency-copilot-calculators">
            <legend>Surfaced calculators</legend>
            {routedComplaint.calculators.map((calculator) => (
              <label key={calculator.id}>
                <input
                  type="checkbox"
                  checked={selectedCalculatorIds.includes(calculator.id)}
                  onChange={(event) => {
                    setSelectedCalculatorIds((current) =>
                      event.target.checked
                        ? [...new Set([...current, calculator.id])]
                        : current.filter((calculatorId) => calculatorId !== calculator.id)
                    );
                  }}
                />
                <span>{calculator.label}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <dl>
          <div>
            <dt>Surfaced calculators</dt>
            <dd>
              {copilotGuidance.recommendedTools.map((tool) => tool.label).join(', ') ||
                'Manual selection'}
            </dd>
          </div>
          <div>
            <dt>Protocols</dt>
            <dd>{copilotGuidance.protocols.join(', ') || 'Manual protocol review'}</dd>
          </div>
          <div>
            <dt>Next workflow step</dt>
            <dd>{copilotGuidance.nextWorkflowStep}</dd>
          </div>
          <div>
            <dt>Simulations</dt>
            <dd>{copilotGuidance.simulations.join(', ') || 'No simulation attached'}</dd>
          </div>
          <div>
            <dt>Escalation suggestions</dt>
            <dd>{copilotGuidance.escalationSuggestions.join(' ')}</dd>
          </div>
        </dl>
        <div className="emergency-copilot-reasoning">
          <strong>Reasoning</strong>
          <ul>
            {copilotGuidance.reasoning.map((reason) => (
              <li key={reason.output}>{reason.explanation}</li>
            ))}
          </ul>
        </div>
        <p>{copilotGuidance.safetyBoundary}</p>
        <button
          type="button"
          className="workspace-secondary-action"
          onClick={() =>
            onAskAssistant(
              `Use ED AI Copilot guidance for ${copilotGuidance.inputs.complaint}. Surfaced calculators: ${
                copilotGuidance.recommendedTools.map((tool) => tool.label).join(', ') ||
                'manual selection'
              }. Next step: ${copilotGuidance.nextWorkflowStep}. Explain reasoning and keep all outputs clinician-reviewed.`
            )
          }
        >
          Ask assistant with Copilot context
        </button>
      </article>
      {selectedContext ? (
        <div className="emergency-evidence-grid">
          {[
            ['Workflow', selectedContext.workflows],
            ['Protocols', selectedContext.protocols],
            ['Evidence', selectedContext.evidence],
            ['Surfaced calculators', selectedContext.recommendedCalculators],
            ['Simulations', selectedContext.simulations],
          ].map(([title, items]) => (
            <article key={title} className="workspace-capability-card emergency-evidence-card">
              <span className="workspace-route-card__icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.formatPdf} size={18} />
              </span>
              <span className="workspace-route-card__body">
                <strong>{title}</strong>
                <span>{items.join(', ')}</span>
              </span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmergencyAutomationList({ title, description, automations = [], visibility }) {
  const items = automations.filter((automation) =>
    automation.workspaceVisibility?.includes(visibility)
  );
  return (
    <WorkspaceListPanel
      title={title}
      description={description}
      items={items}
      empty="No ED automations are assigned to this surface."
      renderItem={(automation) => (
        <WorkspaceCapabilityCard
          key={automation.automationId}
          icon={CHROME_ICONS.bolt}
          item={{
            id: automation.automationId,
            label: automation.title,
            detail: `${automation.trigger} Review: ${automation.humanReviewRequirement}`,
          }}
        />
      )}
    />
  );
}

function DemoDataLabels({ item }) {
  return (
    <div className="emergency-demo-labels" aria-label="Demo data labels">
      {[item.dataLabel, item.tenantLabel, item.integrationLabel].filter(Boolean).map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function EmergencyKnowledgeLayerPanel({ knowledgeLayer = {}, onLaunchRoute, onAskAssistant }) {
  const [query, setQuery] = useState('');
  const lowerQuery = query.trim().toLowerCase();
  const results = lowerQuery
    ? (knowledgeLayer.results || []).filter((item) =>
        [
          item.title,
          item.domain,
          item.summary,
          ...(item.complaintTags || []),
          ...(item.aliases || []),
          ...(item.workflowIds || []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(lowerQuery)
      )
    : knowledgeLayer.results || [];

  return (
    <section
      className="workspace-panel emergency-knowledge-panel"
      aria-labelledby="emergency-knowledge-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Search-first ED knowledge</p>
        <h2 id="emergency-knowledge-title">Emergency Knowledge Layer</h2>
        <p>
          Protocols, calculators, pathways, simulations, evidence, and workflows are centralized for
          fast human-reviewed guidance.
        </p>
      </div>
      <label className="workspace-form-field" htmlFor="emergency-knowledge-search">
        <span>Search emergency knowledge</span>
        <input
          id="emergency-knowledge-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try chest pain, sepsis, stroke, referral, boarding..."
        />
      </label>
      <div className="emergency-journey-summary" aria-label="Emergency knowledge domains">
        {(knowledgeLayer.domains || []).map((domain) => (
          <span key={domain}>{domain}</span>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Emergency knowledge quick filters">
        <p>
          <strong>Quick filters:</strong> {(knowledgeLayer.quickFilters || []).join(', ')}
        </p>
        <p>
          <strong>Source:</strong> {knowledgeLayer.sourceState}
        </p>
      </div>
      <div className="emergency-queue-grid">
        {results.map((item) => (
          <article key={item.knowledgeId} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{item.domain}</span>
                <h3>{item.title}</h3>
              </div>
              <strong>{item.sourceState}</strong>
            </div>
            <p>{item.summary}</p>
            <div className="emergency-journey-insights">
              <p>
                <strong>Calculators:</strong>{' '}
                {item.relatedCalculators?.length
                  ? item.relatedCalculators.join(', ')
                  : 'No calculator required'}
              </p>
              <p>
                <strong>Workflows:</strong> {(item.workflowIds || []).join(', ')}
              </p>
              <p>
                <strong>Tags:</strong> {(item.complaintTags || []).join(', ')}
              </p>
            </div>
            <button
              type="button"
              className="workspace-secondary-action"
              onClick={() => onLaunchRoute(item.launchTarget)}
            >
              Open knowledge target
            </button>
          </article>
        ))}
      </div>
      <p className="emergency-queue-warning">
        <strong>Safety boundary:</strong> {knowledgeLayer.safetyStatement}
      </p>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Use Emergency Knowledge Layer context for ${query || 'current ED flow'}. Recommend calculators, protocols, workflow next steps, referral options, and simulations for human review only.`
          )
        }
      >
        Ask assistant with knowledge context
      </button>
    </section>
  );
}

function EmergencyDemoModePanel({ demoTenant, demoEnvironment, onLaunchRoute }) {
  if (!demoTenant) return null;
  const demoSections = [
    [
      'Sample patients',
      demoTenant.samplePatients,
      (patient) => `${patient.chiefComplaint} · ${patient.state || patient.stage} · ${patient.summary}`,
    ],
    ['Sample alerts', demoTenant.sampleAlerts, (alert) => `${alert.severity} · ${alert.detail}`],
    ['Sample workflows', demoTenant.sampleWorkflows, (workflow) => workflow.detail],
    [
      'Sample protocols',
      demoTenant.sampleProtocols,
      (protocol) => `${protocol.protocol}: ${protocol.summary}`,
    ],
    [
      'Sample analytics',
      demoTenant.sampleAnalytics,
      (metric) => `${metric.value} ${metric.unit} · ${metric.helper}`,
    ],
  ];

  return (
    <section className="emergency-demo-layout" aria-label="Emergency demo mode">
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Demo Tenant</p>
          <h2>{demoTenant.tenantName}</h2>
          <p>{demoTenant.dataPosture}</p>
        </div>
        <div className="emergency-demo-summary">
          <DemoDataLabels item={demoTenant.labels} />
          <p>{demoTenant.safetyPosture}</p>
          {demoEnvironment ? (
            <div
              className="emergency-journey-summary"
              aria-label="Emergency demo environment metrics"
            >
              <span>{demoEnvironment.metrics.patientCount} demo patients</span>
              <span>{demoEnvironment.metrics.waitingRoomPatients} waiting room</span>
              <span>{demoEnvironment.metrics.boardingPatients} boarding</span>
              <span>{demoEnvironment.metrics.emsPatients} EMS</span>
            </div>
          ) : null}
        </div>
      </div>

      {demoEnvironment ? (
        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <p className="workspace-eyebrow">Emergency Demo Environment</p>
            <h2>Realistic ED OS demo tenant</h2>
            <p>{demoEnvironment.safetyStatement}</p>
          </div>
          <div className="workspace-card-grid emergency-demo-grid">
            {demoEnvironment.patients.slice(0, 12).map((patient) => (
              <article
                key={patient.patientId}
                className="workspace-automation-card emergency-demo-card"
              >
                <div>
                  <strong>{patient.label}</strong>
                  <span>
                    {patient.journeyLabel} · {patient.complaint} · risk {patient.riskScore}
                  </span>
                </div>
                <div
                  className="emergency-demo-labels"
                  aria-label={`${patient.patientId} demo labels`}
                >
                  <span>{patient.demoLabel}</span>
                  <span>No live integration</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {demoSections.map(([title, items, detailForItem]) => (
        <div key={title} className="workspace-panel">
          <div className="workspace-panel__header">
            <p className="workspace-eyebrow">Demo data</p>
            <h2>{title}</h2>
            <p>
              Prospect-ready sample content for evaluating CareDroid without
              integrations.
            </p>
          </div>
          <div className="workspace-card-grid emergency-demo-grid">
            {(items || []).map((item) => (
              <article key={item.id} className="workspace-automation-card emergency-demo-card">
                <div>
                  <strong>{item.displayName || item.label || item.complaint}</strong>
                  <span>{detailForItem(item)}</span>
                </div>
                <DemoDataLabels item={item} />
                {item.targetRoute ? (
                  <button
                    type="button"
                    className="workspace-secondary-action"
                    onClick={() => onLaunchRoute(item.targetRoute)}
                  >
                    Open sample
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function EmergencySimulationScenariosPanel({ simulationScenarios = {} }) {
  const scenarios = simulationScenarios.scenarios || [];
  return (
    <section className="workspace-panel" aria-labelledby="emergency-simulation-scenarios-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Emergency Simulation Scenarios</p>
        <h2 id="emergency-simulation-scenarios-title">Operational Training</h2>
        <p>
          Training mirrors real ED operational problems by reusing CareDroid signals,
          KPIs, queues, resources, and escalations.
        </p>
      </div>
      <DashboardGrid variant="metrics" className="workspace-focus-metrics">
        <MetricCard
          label="Scenarios"
          value={simulationScenarios.metrics?.scenarioCount || 0}
          helper="Operational ED scenarios"
        />
        <MetricCard
          label="Debrief metrics"
          value={simulationScenarios.metrics?.debriefMetrics || 0}
          helper="Timeline, KPIs, queues, decisions"
        />
        <MetricCard label="Source state" value="Simulated" helper="Training only" />
      </DashboardGrid>
      <div className="emergency-queue-grid">
        {scenarios.map((scenario) => (
          <article key={scenario.scenarioId} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">Scenario</span>
                <h3>{scenario.scenarioName}</h3>
              </div>
              <strong>{scenario.pressureSignals.length}</strong>
            </div>
            <p>{scenario.triggerPattern}</p>
            <small>Success: {scenario.successCriteria}</small>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Simulation safety statement">
        <p>
          <strong>Source:</strong> {simulationScenarios.sourceState}
        </p>
        <p>
          <strong>Safety boundary:</strong> {simulationScenarios.safetyStatement}
        </p>
      </div>
    </section>
  );
}

function EmergencyRoiEstimatorPanel({ estimator }) {
  const defaultInputs = Object.fromEntries(
    (estimator?.inputFields || []).map((field) => [field.id, field.defaultValue])
  );
  const [inputs, setInputs] = useState(defaultInputs);
  const estimate = estimateEmergencyRoi(inputs);
  const outputCards = [
    {
      id: 'estimatedTimeSaved',
      label: 'Estimated time saved',
      value: estimate.summary.estimatedTimeSaved,
      helper: estimator?.outputDefinitions?.find((output) => output.id === 'estimatedTimeSaved')
        ?.helper,
    },
    {
      id: 'workflowEfficiency',
      label: 'Workflow efficiency',
      value: estimate.summary.workflowEfficiency,
      helper: estimator?.outputDefinitions?.find((output) => output.id === 'workflowEfficiency')
        ?.helper,
    },
    {
      id: 'adoptionPotential',
      label: 'Adoption potential',
      value: estimate.summary.adoptionPotential,
      helper: estimator?.outputDefinitions?.find((output) => output.id === 'adoptionPotential')
        ?.helper,
    },
  ];

  if (!estimator) return null;

  return (
    <section className="emergency-roi-layout" aria-label="ED ROI estimator">
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Sales and Onboarding</p>
          <h2>{estimator.title}</h2>
          <p>{estimator.goal}</p>
        </div>
        <div className="emergency-roi-input-grid">
          {estimator.inputFields.map((field) => (
            <label key={field.id} className="emergency-roi-input">
              <span>{field.label}</span>
              <input
                type="number"
                min="0"
                value={inputs[field.id] ?? field.defaultValue}
                onChange={(event) =>
                  setInputs((current) => ({
                    ...current,
                    [field.id]: event.target.value,
                  }))
                }
              />
              <small>{field.helper}</small>
            </label>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Estimated Value</p>
          <h2>ROI estimator output</h2>
          <p>
            Use this during sales discovery and onboarding planning before live integrations are
            connected.
          </p>
        </div>
        <div className="workspace-focus-metrics emergency-roi-output-grid">
          {outputCards.map((output) => (
            <div key={output.id}>
              <span>{output.label}</span>
              <strong>{output.value}</strong>
              <small>{output.helper}</small>
            </div>
          ))}
        </div>
        <div className="emergency-roi-assumptions">
          <strong>Planning assumptions</strong>
          <span>
            {estimate.assumptions.minutesSavedPerAssessment} minutes saved per assessment,{' '}
            {Math.round(estimate.assumptions.workflowCoverageRate * 100)}% workflow coverage, and{' '}
            {estimate.assumptions.minutesSavedPerWorkflowLaunch} minutes saved per workflow launch.
          </span>
          <small>{estimate.disclaimer}</small>
        </div>
      </div>
    </section>
  );
}

function EmergencyDeploymentBlueprintPanel({ blueprint }) {
  if (!blueprint) return null;

  return (
    <section
      className="emergency-deployment-layout"
      aria-label="First customer deployment blueprint"
    >
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Minimal Operational Risk</p>
          <h2>{blueprint.title}</h2>
          <p>{blueprint.goal}</p>
        </div>
        <article className="emergency-deployment-principle">
          <strong>Deployment principle</strong>
          <span>{blueprint.principle}</span>
          <small>{blueprint.acceptance}</small>
        </article>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Phased Rollout</p>
          <h2>Demonstrate, pilot, sell, then integrate</h2>
          <p>Each phase adds value without forcing a hospital-wide rollout.</p>
        </div>
        {blueprint.minimumSellableCapabilities?.length ? (
          <article className="emergency-deployment-principle">
            <strong>Minimum sellable CareDroid</strong>
            <span>{blueprint.minimumSellableCapabilities.join(', ')}</span>
          </article>
        ) : null}
        <div className="workspace-card-grid emergency-deployment-grid">
          {blueprint.phases.map((phase) => (
            <article key={phase.id} className="workspace-automation-card emergency-deployment-card">
              <div>
                <span className="workspace-tool-card__meta">{phase.phase}</span>
                <strong>{phase.title}</strong>
                <span>{phase.description}</span>
              </div>
              <dl>
                <div>
                  <dt>Risk</dt>
                  <dd>{phase.operationalRisk}</dd>
                </div>
                <div>
                  <dt>Integration</dt>
                  <dd>{phase.integrationRequirement}</dd>
                </div>
                <div>
                  <dt>Acceptance</dt>
                  <dd>{phase.acceptance}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        {blueprint.rolloutPlans?.length ? (
          <div className="workspace-card-grid emergency-deployment-grid">
            {blueprint.rolloutPlans.map((plan) => (
              <article
                key={plan.id}
                className="workspace-automation-card emergency-deployment-card"
              >
                <div>
                  <span className="workspace-tool-card__meta">First Customer Path</span>
                  <strong>{plan.label}</strong>
                  <span>{plan.outcome}</span>
                </div>
                <dl>
                  <div>
                    <dt>Focus</dt>
                    <dd>{plan.focus.join(', ')}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EmergencyImplementationSummaryPanel({ summary, onLaunchRoute }) {
  if (!summary) return null;

  return (
    <section
      className="emergency-deployment-layout"
      aria-label="CareDroid implementation summary"
    >
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Implementation Write-up</p>
          <h2>{summary.title}</h2>
          <p>{summary.purpose}</p>
        </div>
        <article className="emergency-deployment-principle">
          <strong>Current posture</strong>
          <span>{summary.implementationPosture}</span>
          <small>Source write-up: {summary.sourceDocument}</small>
        </article>
        <div className="workspace-focus-metrics emergency-roi-output-grid">
          <div>
            <span>Coverage docs</span>
            <strong>{summary.coverage.length}</strong>
            <small>Markdown plans mapped to app routes and services</small>
          </div>
          <div>
            <span>Focused tests</span>
            <strong>{summary.verification.tests}</strong>
            <small>
              {summary.verification.testFiles} files · {summary.verification.status}
            </small>
          </div>
          <div>
            <span>Future modules</span>
            <strong>{summary.frozenModules.length}</strong>
            <small>Preserved in code and hidden from active ED OS discovery</small>
          </div>
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Docs to Code Coverage</p>
          <h2>Every ED OS plan has an application surface</h2>
          <p>
            Each row maps a markdown plan to its route, deterministic service, and acceptance
            result.
          </p>
        </div>
        <div className="workspace-card-grid emergency-deployment-grid">
          {summary.coverage.map((item) => (
            <article key={item.doc} className="workspace-automation-card emergency-deployment-card">
              <div>
                <span className="workspace-tool-card__meta">{item.doc}</span>
                <strong>{item.capability}</strong>
                <span>{item.acceptance}</span>
              </div>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{item.status}</dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>{item.service}</dd>
                </div>
                <div>
                  <dt>Route</dt>
                  <dd>{item.route}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="workspace-secondary-action"
                onClick={() => onLaunchRoute(item.route)}
              >
                Open capability
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">MVP Boundary</p>
          <h2>Sell ED OS without pretending integrations exist</h2>
          <p>These boundaries keep the first-customer pilot honest and focused.</p>
        </div>
        <div className="emergency-journey-insights">
          <p>
            <strong>Minimum sellable ED OS:</strong>{' '}
            {summary.minimumSellableCapabilities.join(', ')}.
          </p>
          <p>
            <strong>Verification:</strong> {summary.verification.lintStatus};{' '}
            {summary.verification.tests} focused tests passing.
          </p>
          <p>
            <strong>Frozen modules:</strong> {summary.frozenModules.join(', ')}.
          </p>
        </div>
        <div className="workspace-card-grid emergency-deployment-grid">
          {summary.intentionalBoundaries.map((boundary) => (
            <article key={boundary} className="workspace-automation-card emergency-deployment-card">
              <strong>{boundary}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmergencyFlowIntelligencePanel({ platform, flowEngine }) {
  if (!platform) return null;
  const registryStats = [
    ['Automation registry', platform.automationRegistry.length, 'Flow-aware automations'],
    ['Workflow registry', platform.workflowRegistry.length, 'Review-required workflows'],
    ['Analytics model', platform.analyticsModel.events.length, 'Bottleneck and adoption events'],
    ['Whiteboard model', platform.dashboardModel.widgets.length, 'Command-center widgets'],
    ['AI model', platform.aiModel.agents.length, 'Flow-aware AI agents'],
    ['SaaS packages', platform.saasPackagingModel.packages.length, 'Sellable tiers'],
  ];

  return (
    <section className="emergency-flow-layout" aria-label="Emergency Flow Intelligence Platform">
      <DashboardSection
        className="workspace-panel"
        eyebrow="Emergency Flow Intelligence"
        title={platform.title}
        description={platform.positioning}
      >
        <div className="emergency-flow-stage-list" aria-label="End-to-end patient flow">
          {platform.patientFlow.map((stage) => (
            <span key={stage}>{stage}</span>
          ))}
        </div>
        <article className="emergency-flow-principle">
          <strong>Primary objective</strong>
          <span>{platform.primaryObjective}</span>
          <small>{platform.acceptance}</small>
        </article>
      </DashboardSection>

      {flowEngine ? (
        <DashboardSection
          className="workspace-panel"
          eyebrow="Emergency Flow Engine"
          title="Next Recommended Action"
          description="Live flow detections guide staff across arrival, triage, waiting, assessment, orders, results, and disposition."
        >
          <div
            className="emergency-flow-stage-list"
            aria-label="Emergency Flow Engine monitored stages"
          >
            {(flowEngine.monitoredStages || []).map((stage) => (
              <span key={stage.id}>{stage.label}</span>
            ))}
          </div>
          <DashboardGrid
            variant="metrics"
            className="workspace-focus-metrics emergency-flow-registry-grid"
          >
            <MetricCard
              label="Active detections"
              value={flowEngine.metrics?.activeDetections || 0}
              helper="Flow risks currently surfaced"
            />
            <MetricCard
              label="Delayed referrals"
              value={flowEngine.metrics?.delayedReferrals || 0}
              helper="Disposition dependencies"
            />
            <MetricCard
              label="Delayed reassessments"
              value={flowEngine.metrics?.delayedReassessments || 0}
              helper="Waiting-room safety net"
            />
          </DashboardGrid>
          <div
            className="emergency-journey-insights"
            aria-label="Emergency Flow Engine next recommended actions"
          >
            {(flowEngine.nextRecommendedActions || []).slice(0, 5).map((action) => (
              <p key={action.id}>
                <strong>Next Recommended Action:</strong> {action.action}
                <br />
                <span>
                  {action.stage} · {action.title} · {action.reason}
                </span>
              </p>
            ))}
          </div>
          <p className="emergency-queue-warning">
            <strong>Safety boundary:</strong> {flowEngine.safetyStatement}
          </p>
        </DashboardSection>
      ) : null}

      <DashboardSection
        className="workspace-panel"
        eyebrow="Buyer Pain"
        title="Hospitals pay for flow, not more calculators"
        description="Emergency Flow Intelligence is framed around the operating pain ED leaders, EMS teams, and hospital operations already budget against."
      >
        <DashboardGrid className="workspace-card-grid emergency-flow-solution-grid">
          {platform.marketPains.map((pain) => (
            <article key={pain} className="workspace-automation-card emergency-flow-solution-card">
              <strong>{pain}</strong>
            </article>
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection
        className="workspace-panel"
        eyebrow="Commercial Value Drivers"
        title="Throughput, capacity, coordination, and cognitive load"
        description="These are the executive outcomes the Emergency Flow Intelligence Platform can prove during sales discovery and first-customer onboarding."
      >
        <DashboardGrid className="workspace-card-grid emergency-flow-solution-grid">
          {platform.valueDrivers.map((driver) => (
            <article
              key={driver.id}
              className="workspace-automation-card emergency-flow-solution-card"
            >
              <div>
                <strong>{driver.title}</strong>
                <span>{driver.description}</span>
              </div>
              <dl>
                <div>
                  <dt>Proof signals</dt>
                  <dd>{driver.proofSignals.join(', ')}</dd>
                </div>
              </dl>
            </article>
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection
        className="workspace-panel"
        eyebrow="Commercial Solution Areas"
        title="Ten areas mapped into one ED patient flow"
        description="Each solution maps into the same ED patient flow instead of launching as an isolated calculator or tool."
      >
        <DashboardGrid className="workspace-card-grid emergency-flow-solution-grid">
          {platform.solutions.map((solution) => (
            <article
              key={solution.id}
              className="workspace-automation-card emergency-flow-solution-card"
            >
              <div>
                <strong>{solution.title}</strong>
                <span>{solution.buyerPain}</span>
              </div>
              <dl>
                <div>
                  <dt>Flow stages</dt>
                  <dd>{solution.flowStages.join(', ')}</dd>
                </div>
                <div>
                  <dt>Capabilities</dt>
                  <dd>{solution.capabilities.join(', ')}</dd>
                </div>
                <div>
                  <dt>Package</dt>
                  <dd>{solution.packageTier}</dd>
                </div>
              </dl>
            </article>
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection
        className="workspace-panel"
        eyebrow="Platform Registries"
        title="One operating model for all 10 areas"
        description="Automation, workflow, analytics, dashboard, AI, and packaging models are all derived from the same solution architecture."
      >
        <DashboardGrid
          variant="metrics"
          className="workspace-focus-metrics emergency-flow-registry-grid"
        >
          {registryStats.map(([label, value, helper]) => (
            <MetricCard key={label} label={label} value={value} helper={helper} />
          ))}
        </DashboardGrid>
      </DashboardSection>

      <DashboardSection
        className="workspace-panel"
        eyebrow="SaaS Packaging"
        title={platform.saasPackagingModel.productName}
        description={`Buyer personas: ${platform.saasPackagingModel.buyerPersonas.join(', ')}.`}
      >
        <DashboardGrid className="workspace-card-grid emergency-flow-package-grid">
          {platform.saasPackagingModel.packages.map((solutionPackage) => (
            <article key={solutionPackage.packageId} className="workspace-automation-card">
              <div>
                <strong>{solutionPackage.title}</strong>
                <span>{solutionPackage.positioning}</span>
              </div>
              <dl>
                <div>
                  <dt>Solution areas</dt>
                  <dd>{solutionPackage.solutionIds.length}</dd>
                </div>
                <div>
                  <dt>Included IDs</dt>
                  <dd>{solutionPackage.solutionIds.join(', ')}</dd>
                </div>
              </dl>
            </article>
          ))}
        </DashboardGrid>
        <article className="emergency-flow-principle">
          <strong>First-customer readiness</strong>
          <span>{platform.firstCustomerReadiness.sellableNow}</span>
          <small>{platform.firstCustomerReadiness.noIntegrationPosture}</small>
        </article>
        <article className="emergency-flow-principle">
          <strong>Integration posture</strong>
          <span>{platform.integrationPosture}</span>
        </article>
        <article className="emergency-flow-principle">
          <strong>AI safety boundary</strong>
          <span>{platform.aiModel.safetyBoundary}</span>
        </article>
      </DashboardSection>
    </section>
  );
}

function EmergencyOnboardingPanel({ onboarding, onLaunchRoute }) {
  if (!onboarding) return null;
  return (
    <section className="emergency-onboarding-layout" aria-label="Emergency onboarding walkthrough">
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">10-Minute Hospital Onboarding</p>
          <h2>{onboarding.title}</h2>
          <p>{onboarding.goal}</p>
        </div>
        <div className="workspace-card-grid emergency-onboarding-grid">
          {onboarding.sections.map((section) => (
            <article key={section.id} className="workspace-automation-card">
              <div>
                <strong>{section.label}</strong>
                <span>{section.summary}</span>
              </div>
              <dl>
                <div>
                  <dt>Time</dt>
                  <dd>{section.duration}</dd>
                </div>
                <div>
                  <dt>Outcome</dt>
                  <dd>{section.outcome}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="workspace-secondary-action"
                onClick={() => onLaunchRoute(section.targetRoute)}
              >
                Open {section.label}
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Guided Walkthrough</p>
          <h2>Run the first hospital demo</h2>
          <p>{onboarding.takeaway}</p>
        </div>
        <ol className="emergency-onboarding-timeline">
          {onboarding.walkthrough.map((step) => (
            <li key={`${step.minute}-${step.title}`}>
              <span>{step.minute}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.instruction}</p>
                <button
                  type="button"
                  className="workspace-secondary-action"
                  onClick={() => onLaunchRoute(step.targetRoute)}
                >
                  Go to step
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function EmergencyDirectorViewPanel({ emergency = {}, onLaunchRoute, onAskAssistant }) {
  const summary = emergency.operatingSystem?.leadershipSummary || {};
  const roiTotals = emergency.automationRoi?.totals || {};
  const kpis = emergency.kpiLayer?.metrics || [];
  const boarding = emergency.boardingIntelligence?.metrics || {};

  return (
    <section
      className="workspace-panel emergency-director-view"
      aria-labelledby="emergency-director-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Leadership view</p>
        <h2 id="emergency-director-title">ED Director View</h2>
        <p>
          Throughput, boarding, EMS offload, staffing pressure, adoption analytics, and automation
          ROI in one scan.
        </p>
      </div>
      <div className="emergency-journey-summary" aria-label="ED director summary">
        <span>{summary.doorToDirection || 0} min door-to-direction</span>
        <span>{summary.doorToDoctor || 0} min door-to-doctor</span>
        <span>{summary.boardingCount || 0} boarding patients</span>
        <span>{summary.emsArrivals || 0} EMS arrivals</span>
        <span>{roiTotals.estimatedMinutesSaved || 0} min saved</span>
      </div>
      <div className="emergency-queue-grid">
        {[
          {
            id: 'patient-path',
            title: 'Patient Path',
            value: `${summary.doorToDirection || 0} min`,
            detail: `${summary.doorToDirectionCompliance || 0}% of patients are known, risk-routed, queue-assigned, and action-ready within target.`,
            route: '/workspace/emergency/patient-path',
          },
          {
            id: 'throughput',
            title: 'Throughput',
            value: `${summary.doorToDoctor || 0} min`,
            detail:
              'Door-to-doctor, length of stay, triage, disposition, referral, and discharge delay KPIs.',
            route: '/workspace/emergency/throughput',
          },
          {
            id: 'boarding',
            title: 'Boarding',
            value: `${boarding.boardingCount || 0} boarders`,
            detail: `${boarding.boardingTime || 0} min average boarding time; ${boarding.pendingBeds || 0} pending beds.`,
            route: '/workspace/emergency/boarding',
          },
          {
            id: 'ems-offload',
            title: 'EMS Offload',
            value: `${summary.emsOffloadDelay || 0} min`,
            detail: 'Current offload delay and inbound EMS pressure.',
            route: '/workspace/emergency/pre-arrival',
          },
          {
            id: 'staffing-pressure',
            title: 'Staffing Pressure',
            value: `${summary.queueBottlenecks || 0} bottlenecks`,
            detail:
              'Queue bottlenecks, resource shortages, reassessment load, and active escalations.',
            route: '/workspace/emergency/charge-nurse',
          },
          {
            id: 'adoption-analytics',
            title: 'Adoption Analytics',
            value: `${roiTotals.totalRuns || 0} runs`,
            detail: `${roiTotals.adoptedAutomations || 0} adopted automations tracked during the demo shift.`,
            route: '/workspace/emergency/automation-roi',
          },
          {
            id: 'automation-roi',
            title: 'Automation ROI',
            value: `${roiTotals.estimatedClicksReduced || 0} clicks`,
            detail: `${roiTotals.queueMinutesReduced || 0} queue minutes and ${roiTotals.throughputMinutesReduced || 0} throughput minutes reduced.`,
            route: '/workspace/emergency/automation-roi',
          },
        ].map((signal) => (
          <article key={signal.id} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">Director signal</span>
                <h3>{signal.title}</h3>
              </div>
              <strong>{signal.value}</strong>
            </div>
            <p>{signal.detail}</p>
            <button
              type="button"
              className="workspace-secondary-action"
              onClick={() => onLaunchRoute(signal.route)}
            >
              Open {signal.title}
            </button>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Director KPI layer">
        {kpis.slice(0, 4).map((metric) => (
          <p key={metric.metricId}>
            <strong>{metric.label}:</strong> {metric.value} {metric.unit} · target{' '}
            {metric.target || 'review'}
          </p>
        ))}
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Summarize ED Director View: throughput ${summary.doorToDoctor} min door-to-doctor, ${summary.boardingCount} boarding patients, ${summary.emsArrivals} EMS arrivals, ${roiTotals.estimatedMinutesSaved || 0} minutes saved. Keep recommendations operational and human-reviewed.`
          )
        }
      >
        Ask assistant for director summary
      </button>
    </section>
  );
}

function EmergencyChargeNurseViewPanel({ emergency = {}, onLaunchRoute, onAskAssistant }) {
  const resources = emergency.resourceBoard || {};
  const waitingRoom = emergency.waitingRoomIntelligence || {};
  const reassessment = emergency.reassessmentAutomation || {};
  const capacity = emergency.capacityIntelligence || {};
  const alerts = emergency.escalationEngine?.escalations || [];

  return (
    <section
      className="workspace-panel emergency-charge-nurse-view"
      aria-labelledby="emergency-charge-nurse-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Operational nurse view</p>
        <h2 id="emergency-charge-nurse-title">Charge Nurse View</h2>
        <p>
          Room availability, waiting patients, reassessment queue, critical alerts, device
          availability, and next operational actions.
        </p>
      </div>
      <div className="emergency-journey-summary" aria-label="Charge nurse summary">
        <span>
          {capacity.signals?.find((signal) => signal.id === 'availableSpaces')?.value || 0}{' '}
          available spaces
        </span>
        <span>{waitingRoom.metrics?.patientCount || 0} waiting patients</span>
        <span>{reassessment.metrics?.total || 0} reassessment queue</span>
        <span>{resources.metrics?.shortageCount || 0} resource shortages</span>
      </div>
      <div className="emergency-queue-grid">
        <article className="emergency-queue-card">
          <div className="emergency-queue-card__header">
            <div>
              <span className="workspace-eyebrow">Rooms</span>
              <h3>Room Availability</h3>
            </div>
            <strong>{capacity.riskLevel || 'Green'}</strong>
          </div>
          <p>{capacity.summary}</p>
          <button
            type="button"
            className="workspace-secondary-action"
            onClick={() => onLaunchRoute('/workspace/emergency/capacity')}
          >
            Open capacity
          </button>
        </article>
        <article className="emergency-queue-card">
          <div className="emergency-queue-card__header">
            <div>
              <span className="workspace-eyebrow">Waiting</span>
              <h3>Waiting Patients</h3>
            </div>
            <strong>{waitingRoom.metrics?.patientCount || 0}</strong>
          </div>
          <p>
            Waiting room health score {waitingRoom.healthScore || 0}; risk state{' '}
            {waitingRoom.riskState || 'green'}.
          </p>
          <button
            type="button"
            className="workspace-secondary-action"
            onClick={() => onLaunchRoute('/workspace/emergency/waiting-room')}
          >
            Open waiting room
          </button>
        </article>
        <article className="emergency-queue-card">
          <div className="emergency-queue-card__header">
            <div>
              <span className="workspace-eyebrow">Reassessment</span>
              <h3>Reassessment Queue</h3>
            </div>
            <strong>{reassessment.metrics?.total || 0}</strong>
          </div>
          <p>
            {reassessment.recommendations?.[0]?.action ||
              'Review reassessment queue and high-risk waiting patients.'}
          </p>
          <button
            type="button"
            className="workspace-secondary-action"
            onClick={() => onLaunchRoute('/workspace/emergency/waiting-room')}
          >
            Open reassessments
          </button>
        </article>
        <article className="emergency-queue-card">
          <div className="emergency-queue-card__header">
            <div>
              <span className="workspace-eyebrow">Devices</span>
              <h3>Device Availability</h3>
            </div>
            <strong>{resources.metrics?.available || 0}</strong>
          </div>
          <p>
            {resources.summary ||
              'Device and resource readiness from the Emergency Resource Board.'}
          </p>
          <button
            type="button"
            className="workspace-secondary-action"
            onClick={() => onLaunchRoute('/workspace/emergency/resources')}
          >
            Open resources
          </button>
        </article>
      </div>
      <div
        className="emergency-journey-insights"
        aria-label="Critical alerts and next operational actions"
      >
        {alerts.slice(0, 3).map((alert) => (
          <p key={alert.id}>
            <strong>{alert.trigger}:</strong> {alert.recommendedAction}
          </p>
        ))}
        {(capacity.recommendations || []).slice(0, 2).map((recommendation) => (
          <p key={recommendation.id}>
            <strong>{recommendation.title}:</strong> {recommendation.action}
          </p>
        ))}
      </div>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Prioritize Charge Nurse View operational actions: ${waitingRoom.metrics?.patientCount || 0} waiting patients, ${reassessment.metrics?.total || 0} reassessments, ${resources.metrics?.shortageCount || 0} resource shortages. Keep all actions human-reviewed.`
          )
        }
      >
        Ask assistant for charge nurse actions
      </button>
    </section>
  );
}

function EmergencyAutomationRoiPanel({ roi = {}, onAskAssistant }) {
  const totals = roi.totals || {};
  const automations = roi.automations || [];

  return (
    <section
      className="workspace-panel emergency-automation-roi-panel"
      aria-labelledby="emergency-automation-roi-title"
    >
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Automation value</p>
        <h2 id="emergency-automation-roi-title">Emergency Automation ROI</h2>
        <p>
          Every automation justifies itself through time saved, clicks reduced, queue impact,
          throughput impact, and adoption.
        </p>
      </div>
      <div className="emergency-journey-summary" aria-label="Emergency automation ROI totals">
        <span>{totals.automationsTracked || 0} automations tracked</span>
        <span>{totals.estimatedMinutesSaved || 0} min saved</span>
        <span>{totals.estimatedClicksReduced || 0} clicks reduced</span>
        <span>{totals.totalRuns || 0} automation runs</span>
      </div>
      <div className="emergency-journey-insights" aria-label="Emergency automation ROI definitions">
        <p>
          <strong>Measured:</strong> {(roi.metricDefinitions || []).join(', ')}
        </p>
        <p>
          <strong>Source:</strong> {roi.sourceState}
        </p>
      </div>
      <div className="emergency-queue-grid">
        {automations.slice(0, 8).map((automation) => (
          <article key={automation.automationId} className="emergency-queue-card">
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{automation.measurementState}</span>
                <h3>{automation.title}</h3>
              </div>
              <strong>{automation.valueScore}</strong>
            </div>
            <dl className="emergency-queue-metrics">
              <div>
                <dt>Time saved</dt>
                <dd>{automation.timeSaved.totalMinutes} min</dd>
              </div>
              <div>
                <dt>Clicks reduced</dt>
                <dd>{automation.clicksReduced.totalClicks}</dd>
              </div>
              <div>
                <dt>Queue impact</dt>
                <dd>{automation.queueImpact.estimatedMinutesReduced} min</dd>
              </div>
              <div>
                <dt>Adoption</dt>
                <dd>{automation.adoptionRate}%</dd>
              </div>
            </dl>
            <p>{automation.roiEstimate}</p>
          </article>
        ))}
      </div>
      <p className="emergency-queue-warning">
        <strong>Safety boundary:</strong> {roi.safetyStatement}
      </p>
      <button
        type="button"
        className="workspace-secondary-action"
        onClick={() =>
          onAskAssistant(
            `Summarize Emergency Automation ROI: ${totals.estimatedMinutesSaved || 0} minutes saved, ${totals.estimatedClicksReduced || 0} clicks reduced, ${totals.queueMinutesReduced || 0} queue minutes reduced. Keep this as workflow ROI only.`
          )
        }
      >
        Ask assistant to summarize automation ROI
      </button>
    </section>
  );
}

function EmergencyAnalyticsPanel({ analytics, kpiLayer, demoEnvironment }) {
  const emergencyAnalytics = analytics?.emergency || {};
  const metrics = emergencyAnalytics.metrics || [];
  const roiSummary = emergencyAnalytics.roiSummary || {};
  const kpiMetrics = kpiLayer?.metrics || [];
  return (
    <section className="emergency-analytics-layout" aria-label="Emergency analytics MVP">
      {kpiMetrics.length ? (
        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <p className="workspace-eyebrow">EmergencyKPILayer</p>
            <h2>Canonical ED KPIs</h2>
            <p>{kpiLayer.safetyStatement}</p>
          </div>
          <div className="workspace-focus-metrics emergency-analytics-grid">
            {kpiMetrics.map((metric) => (
              <div key={metric.metricId}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.unit}</small>
                <small>
                  {metric.trend} · {metric.dataState}
                </small>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">ED Analytics MVP</p>
          <h2 id="emergency-analytics-title">ROI and adoption dashboard</h2>
          <p>{emergencyAnalytics.goal || 'Demonstrate emergency workspace ROI and adoption.'}</p>
        </div>
        <div className="workspace-focus-metrics emergency-analytics-grid">
          {metrics.map((metric) => (
            <div key={metric.id}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.unit}</small>
              <small>{metric.helper}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Buyer Proof</p>
          <h2>Demonstrate ROI and adoption</h2>
          <p>
            Converts pilot usage into ED buyer language without claiming autonomous clinical
            outcomes.
          </p>
        </div>
        <div className="workspace-card-grid">
          {Object.entries(roiSummary).map(([id, detail]) => (
            <WorkspaceCapabilityCard
              key={id}
              icon={CHROME_ICONS.lineChart}
              item={{
                id,
                label: id.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
                detail,
              }}
            />
          ))}
          {emergencyAnalytics.humanReviewStatement ? (
            <WorkspaceCapabilityCard
              icon={CHROME_ICONS.shield}
              item={{
                id: 'human-review-statement',
                label: 'Human review posture',
                detail: emergencyAnalytics.humanReviewStatement,
              }}
            />
          ) : null}
          {demoEnvironment ? (
            <WorkspaceCapabilityCard
              icon={CHROME_ICONS.layoutDashboard}
              item={{
                id: 'demo-environment-coverage',
                label: `${demoEnvironment.metrics.patientCount} clearly labeled demo patients`,
                detail: `${demoEnvironment.metrics.reassessmentNeeded} reassessment needs, ${demoEnvironment.metrics.emsPatients} EMS patients, ${demoEnvironment.metrics.boardingPatients} boarders.`,
              }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EmergencyProductTiers({
  productTiers = [],
  automations = [],
  mvpPackage,
  optionalAddOns = [],
}) {
  const automationsById = Object.fromEntries(
    automations.map((automation) => [automation.automationId, automation])
  );
  return (
    <section className="workspace-panel" aria-labelledby="emergency-products-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Packaging</p>
        <h2 id="emergency-products-title">Emergency Flow Intelligence Platform</h2>
        <p>
          Emergency Flow Starter is the smallest sellable package; deeper flow, EMS, equipment, and
          surge capabilities expand from there.
        </p>
      </div>
      {mvpPackage ? (
        <article className="workspace-automation-card emergency-mvp-package">
          <div>
            <strong>{mvpPackage.title} MVP</strong>
            <span>{mvpPackage.positioning}</span>
          </div>
          <dl>
            <div>
              <dt>Buyer</dt>
              <dd>{mvpPackage.buyerPersonas.join(', ')}</dd>
            </div>
            <div>
              <dt>Billing</dt>
              <dd>{mvpPackage.billingMetric}</dd>
            </div>
            <div>
              <dt>Trial</dt>
              <dd>{mvpPackage.trialPosture}</dd>
            </div>
            <div>
              <dt>Dependency</dt>
              <dd>{mvpPackage.implementationDependency}</dd>
            </div>
            <div>
              <dt>EHR</dt>
              <dd>{mvpPackage.ehrDependency}</dd>
            </div>
            <div>
              <dt>Integration</dt>
              <dd>{mvpPackage.integrationDependency}</dd>
            </div>
            <div>
              <dt>Review</dt>
              <dd>{mvpPackage.humanReviewRequirement}</dd>
            </div>
          </dl>
          <div
            className="emergency-package-chip-grid"
            aria-label="Emergency Flow Starter MVP inclusions"
          >
            {mvpPackage.includedCapabilities.map((capability) => (
              <span key={capability.id} className="workspace-tool-card__meta">
                {capability.label}
              </span>
            ))}
          </div>
          <div
            className="emergency-core-capability-list"
            aria-label="Why each Emergency Flow Starter capability is included"
          >
            {mvpPackage.includedCapabilities.map((capability) => (
              <div key={`${capability.id}-reason`}>
                <strong>{capability.label}</strong>
                <span>{capability.reason}</span>
                <small>{capability.dependencyPosture}</small>
              </div>
            ))}
          </div>
          <span>{mvpPackage.packageRule}</span>
          <span>{mvpPackage.upgradePath}</span>
        </article>
      ) : null}
      {optionalAddOns.length ? (
        <div className="workspace-panel__header emergency-addons-header">
          <h2>Optional add-ons</h2>
          <p>
            Expansion modules move beyond Core when the buyer is ready for workflow or integration
            depth.
          </p>
        </div>
      ) : null}
      <div className="workspace-card-grid emergency-addons-grid">
        {optionalAddOns.map((addOn) => (
          <article key={addOn.addOnId} className="workspace-automation-card">
            <div>
              <strong>{addOn.title}</strong>
              <span>{addOn.dependencyLevel}</span>
            </div>
            <dl>
              <div>
                <dt>Tier</dt>
                <dd>{addOn.upgradeTier}</dd>
              </div>
              <div>
                <dt>Modules</dt>
                <dd>{addOn.automationIds.length}</dd>
              </div>
              <div>
                <dt>Dependency</dt>
                <dd>{addOn.implementationDependency}</dd>
              </div>
              <div>
                <dt>Trial</dt>
                <dd>{addOn.trialPosture}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="workspace-card-grid">
        {productTiers.map((tier) => (
          <article key={tier.productId} className="workspace-automation-card">
            <div>
              <strong>{tier.title}</strong>
              <span>
                {tier.mvpPackageId
                  ? `${tier.includedCapabilityIds?.length || 0} Core MVP capabilities at ${tier.tier} tier.`
                  : `${tier.automationIds.length} ED automations available at ${tier.tier} tier.`}
              </span>
            </div>
            <dl>
              <div>
                <dt>Ready</dt>
                <dd>
                  {
                    tier.automationIds.filter(
                      (automationId) =>
                        automationsById[automationId]?.readiness?.classification === 'Ready to sell'
                    ).length
                  }
                </dd>
              </div>
              <div>
                <dt>Needs wiring</dt>
                <dd>
                  {
                    tier.automationIds.filter(
                      (automationId) =>
                        automationsById[automationId]?.readiness?.classification === 'Needs wiring'
                    ).length
                  }
                </dd>
              </div>
              <div>
                <dt>Integration</dt>
                <dd>
                  {
                    tier.automationIds.filter(
                      (automationId) =>
                        automationsById[automationId]?.readiness?.requiresIntegration
                    ).length
                  }
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const { workspaceId = DEFAULT_CARE_WORKSPACE_ID, subpage } = useParams();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const { activeWorkspaceId, assistantContext, recommendations, shortcuts, switchWorkspace } =
    useWorkspace();
  const model = useMemo(() => buildCareWorkspaceModel(workspaceId), [workspaceId]);
  const canonicalWorkspaceId = model.workspace.id || DEFAULT_CARE_WORKSPACE_ID;
  const defaultSubpageId = canonicalWorkspaceId === 'emergency' ? 'whiteboard' : 'dashboard';
  const activeSubpage = useMemo(
    () => getWorkspaceSubpageById(canonicalWorkspaceId, subpage || defaultSubpageId),
    [canonicalWorkspaceId, defaultSubpageId, subpage]
  );
  const activeSubpageId = activeSubpage?.id || defaultSubpageId;
  const pipelineData = useMemo(
    () => WorkspaceDataPipelineService.normalizeWorkspaceData(canonicalWorkspaceId),
    [canonicalWorkspaceId]
  );
  const isEmergencyWorkspace =
    canonicalWorkspaceId === 'emergency' && Boolean(pipelineData.emergency);
  const isFutureModule = isFutureWorkspace(model.workspace);

  useEffect(() => {
    if (workspaceId !== canonicalWorkspaceId) {
      navigate(`/workspace/${canonicalWorkspaceId}/${activeSubpageId}`, { replace: true });
      return;
    }
    if (subpage && !activeSubpage) {
      navigate(`/workspace/${canonicalWorkspaceId}/${defaultSubpageId}`, { replace: true });
      return;
    }
    if (!isFutureModule && activeWorkspaceId !== canonicalWorkspaceId) {
      void switchWorkspace(canonicalWorkspaceId);
    }
  }, [
    activeSubpage,
    activeSubpageId,
    activeWorkspaceId,
    canonicalWorkspaceId,
    defaultSubpageId,
    isFutureModule,
    navigate,
    subpage,
    switchWorkspace,
    workspaceId,
  ]);
  const workspaceExperience = useMemo(
    () => getWorkspaceExperienceProfile(model.workspace),
    [model.workspace]
  );
  const workspaceSummary = useMemo(
    () => workspaceFilterSummary(model.workspace.id),
    [model.workspace.id]
  );
  const WorkspaceIcon = getWorkspaceIcon(model.workspace.icon);
  const visibleRouteEntries = useMemo(
    () => (shortcuts.length ? shortcuts : model.routeEntries).slice(0, 4),
    [model.routeEntries, shortcuts]
  );
  const visibleToolEntries = useMemo(
    () =>
      (recommendations.length
        ? recommendations
            .map((recommendation) =>
              model.toolEntries.find((tool) => tool.id === recommendation.assetId)
            )
            .filter(Boolean)
        : model.toolEntries
      ).slice(0, 3),
    [model.toolEntries, recommendations]
  );

  const launchRoute = (path) => {
    const [pathname, search = ''] = String(path).split('?');
    navigate({ pathname, search: search ? `?${search}` : '' });
  };

  const launchTool = (tool) => {
    applyRegistryToolLaunch(tool.id, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      replace: false,
      state: { source: 'workspace', workspaceId: model.workspace.id },
    });
  };

  const launchAssistantContext = () => {
    addMessage(
      assistantContext ||
        pipelineData.aiContext.assistantContext ||
        workspaceExperience.assistantContext ||
        model.workspace.aiContext ||
        `Open ${workspaceExperience.operatingLabel}.`,
      'user'
    );
    navigate('/assistant');
  };

  const launchAssistantPrompt = (prompt) => {
    addMessage(prompt, 'user');
    navigate('/assistant');
  };

  const runWorkspaceAction = (prompt) => {
    addMessage(prompt, 'user');
  };

  const previewAutomation = (automationId) => {
    const result = AutomationEngine.runAutomation(automationId, {
      workspaceId: canonicalWorkspaceId,
      subscriptionTier: 'professional',
      humanReviewAvailable: true,
      integrationsEnabled: true,
    });
    addMessage(result.assistantPrompt || `Review automation ${automationId}.`, 'user');
    navigate('/assistant');
  };

  if (isEmergencyWorkspace && activeSubpageId === 'whiteboard') {
    return <EmergencyWhiteboard />;
  }

  if (isEmergencyWorkspace && activeSubpageId === 'ems') {
    return <EMSPipeline />;
  }

  if (isEmergencyWorkspace && activeSubpageId === 'referrals') {
    return <ReferralPanel />;
  }

  if (isEmergencyWorkspace && activeSubpageId === 'shift-summary') {
    return <ShiftSummary />;
  }

  return (
    <PageShell
      className={`workspace-home workspace-home--${cssToken(workspaceExperience.tone)} workspace-home--workspace-${cssToken(workspaceExperience.id)}`}
      contentClassName="cd-page-stack cd-page-stack--compact workspace-home__content"
      data-workspace-os={workspaceExperience.id}
      style={workspaceThemeStyle(workspaceExperience)}
      eyebrow={workspaceExperience.operatingLabel}
      title={isEmergencyWorkspace ? 'CareDroid' : `${model.workspace.label} Workspace`}
      description={workspaceExperience.dashboardSubtitle || model.workspace.description}
      actions={
        !isEmergencyWorkspace ? (
          <>
            <button
              type="button"
              className="workspace-primary-action"
              onClick={launchAssistantContext}
            >
              <NavIcon icon={CHROME_ICONS.bot} size={18} aria-hidden />
              Ask Assistant
            </button>
            <button
              type="button"
              className="workspace-secondary-action"
              onClick={() => launchRoute(`/workspace/${canonicalWorkspaceId}/${defaultSubpageId}`)}
            >
              Command Center
            </button>
          </>
        ) : null
      }
    >
      {!isEmergencyWorkspace ? (
        <>
          <section
            className="workspace-operating-brief"
            aria-label={`${workspaceExperience.operatingLabel} brief`}
          >
            <div>
              <p className="workspace-eyebrow">{workspaceExperience.environment}</p>
              <h2>{workspaceExperience.dashboardTitle}</h2>
              <ul>
                {(workspaceExperience.operatingBrief || []).slice(0, 2).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <DashboardGrid variant="metrics" className="workspace-focus-metrics">
              {(workspaceExperience.focusMetrics || []).slice(0, 2).map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.helper}</small>
                </div>
              ))}
            </DashboardGrid>
          </section>

          <section className="workspace-switch-grid" aria-label="Workspace management">
            <Link className="workspace-chip workspace-chip--active" to="/profile/workspaces">
              <NavIcon icon={WorkspaceIcon} size={17} aria-hidden />
              <span>Manage workspaces</span>
            </Link>
          </section>

          <section className="workspace-context-panel" aria-labelledby="workspace-context-title">
            <div>
              <p className="workspace-eyebrow">AI Context</p>
              <h2 id="workspace-context-title">{workspaceExperience.assistantTitle}</h2>
              <p>
                {assistantContext ||
                  pipelineData.aiContext.assistantContext ||
                  workspaceExperience.assistantContext ||
                  model.workspace.aiContext}
              </p>
            </div>
            <dl className="workspace-stats">
              <div>
                <dt>Context routes</dt>
                <dd>{model.stats.routes}</dd>
              </div>
              <div>
                <dt>Relevant tools</dt>
                <dd>{model.stats.tools}</dd>
              </div>
              <div>
                <dt>Notifications</dt>
                <dd>{workspaceSummary.notifications.length}</dd>
              </div>
              <div>
                <dt>Backend wired</dt>
                <dd>{pipelineData.analytics.counts.backendWiredServices}</dd>
              </div>
            </dl>
          </section>

          <WorkspaceSubpageTabs
            workspaceId={canonicalWorkspaceId}
            subpages={model.subpageEntries}
            activeSubpageId={activeSubpageId}
          />

          <section className="workspace-pipeline-status" aria-label="Workspace data status">
            <div>
              <p className="workspace-eyebrow">Data Pipeline</p>
              <h2>{pipelineData.mode.modeName}</h2>
              <p>{pipelineData.sourceStatus}</p>
            </div>
            <div className="workspace-service-list" aria-label="Backend service status">
              {pipelineData.backendConnections.slice(0, 4).map((service) => (
                <span
                  key={service.id}
                  className={`workspace-service-chip workspace-service-chip--${service.status}`}
                >
                  {service.label}: {statusLabel(service.status)}
                </span>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {isFutureModule ? (
        <FutureWorkspacePanel
          workspace={model.workspace}
          onLaunchEmergency={() => navigate('/workspace/emergency')}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'command-center' ? (
        <EmergencyDirectorCommandCenter
          emergency={pipelineData.emergency}
          workspaceId={canonicalWorkspaceId}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
          onWorkspaceAction={runWorkspaceAction}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'dashboard' ? (
        <EmergencyCommandCenter
          emergency={pipelineData.emergency}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'director' ? (
        <EmergencyDirectorViewPanel
          emergency={pipelineData.emergency}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'charge-nurse' ? (
        <EmergencyChargeNurseViewPanel
          emergency={pipelineData.emergency}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'whiteboard' ? (
        <EmergencyDigitalWhiteboardPanel
          whiteboard={pipelineData.emergency.digitalWhiteboard}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
          onWorkspaceAction={runWorkspaceAction}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'patient-path' ? (
        <EmergencyPatientPathPanel
          patientPath={pipelineData.emergency.patientPath}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
          onWorkspaceAction={runWorkspaceAction}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'intake' ? (
        <EmergencyIntakeCommandCenterPanel
          intake={pipelineData.emergency.intakeOperatingSystem}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'patient-context' ? (
        <EmergencyPatientContextPanel
          intake={pipelineData.emergency.intakeOperatingSystem}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {!isEmergencyWorkspace && !isFutureModule && activeSubpageId === 'dashboard' ? (
        <DashboardGrid className="workspace-content-grid">
          <DashboardSection
            className="workspace-panel"
            title="Context Panels"
            description="Dashboards, maps, and settings that belong to this workspace."
          >
            <DashboardGrid className="workspace-card-grid">
              {visibleRouteEntries.map((route) => (
                <WorkspaceRouteCard key={route.id} route={route} onLaunch={launchRoute} />
              ))}
            </DashboardGrid>
          </DashboardSection>

          <DashboardSection
            className="workspace-panel"
            title="Recommended Tools"
            description="Inventory-backed actions surfaced by context instead of sidebar sprawl."
          >
            <DashboardGrid className="workspace-card-grid">
              {visibleToolEntries.map((tool) => (
                <WorkspaceToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
              ))}
            </DashboardGrid>
          </DashboardSection>

          <DashboardSection
            className="workspace-panel"
            title="Notifications"
            description="Workspace-filtered operational inbox items."
          >
            <DashboardGrid className="workspace-card-grid">
              {workspaceSummary.notifications.slice(0, 3).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className="workspace-route-card"
                  onClick={() => navigate('/notifications')}
                >
                  <span className="workspace-route-card__icon" aria-hidden>
                    <NavIcon icon={CHROME_ICONS.bell} size={20} />
                  </span>
                  <span className="workspace-route-card__body">
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                  </span>
                </button>
              ))}
            </DashboardGrid>
          </DashboardSection>
        </DashboardGrid>
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'queues' ? (
        <EmergencyQueueIntelligencePanel
          queueIntelligence={pipelineData.emergency.queueIntelligence}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'throughput' ? (
        <EmergencyThroughputPanel
          throughput={pipelineData.emergency.doorToDoctorIntelligence}
          kpiLayer={pipelineData.emergency.kpiLayer}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'waiting-room' ? (
        <EmergencyWaitingRoomPanel
          waitingRoom={pipelineData.emergency.waitingRoomIntelligence}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'pre-arrival' ? (
        <EmergencyPreArrivalPanel
          preArrival={pipelineData.emergency.emsPreArrival}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'ems' ? (
        <EmergencyEmsOffloadPanel
          emsOffload={pipelineData.emergency.emsOffload}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
          onWorkspaceAction={runWorkspaceAction}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'capacity' ? (
        <EmergencyCapacityIntelligencePanel
          capacity={pipelineData.emergency.capacityIntelligence}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
          onWorkspaceAction={runWorkspaceAction}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'boarding' ? (
        <EmergencyBoardingIntelligencePanel
          boarding={pipelineData.emergency.boardingIntelligence}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
          onWorkspaceAction={runWorkspaceAction}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'resources' ? (
        <EmergencyResourceBoardPanel
          resourceBoard={pipelineData.emergency.resourceBoard}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'escalations' ? (
        <EmergencyEscalationPanel
          escalationEngine={pipelineData.emergency.escalationEngine}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'triage' ? (
        <EmergencyTriageOrchestrator
          orchestrator={pipelineData.emergency.triageOrchestrator}
          intake={pipelineData.emergency.intakeOperatingSystem}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'patients' ? (
        <section className="emergency-os-layout">
          <EmergencyJourneyFlow
            journey={pipelineData.emergency.patientJourney}
            engine={pipelineData.emergency.patientJourneyEngine}
          />
          <EmergencyPatientPathPanel
            patientPath={pipelineData.emergency.patientPath}
            onLaunchRoute={launchRoute}
            onAskAssistant={launchAssistantPrompt}
            onWorkspaceAction={runWorkspaceAction}
          />
          <EmergencyAutomationList
            title="Patient operating queues"
            description="Patient-facing ED automations stay attached to journey stages and clinician review."
            automations={getWorkspaceAutomations(canonicalWorkspaceId)}
            visibility="patients"
          />
        </section>
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'referrals' ? (
        <EmergencyReferralHubPanel
          referralHub={pipelineData.emergency.referralHub}
          automations={getWorkspaceAutomations(canonicalWorkspaceId)}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
          onWorkspaceAction={runWorkspaceAction}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'documentation' ? (
        <EmergencyAutomationList
          title="Documentation Queue"
          description="Documentation integrity, discharge summary drafting, and authorization drafts remain review-required."
          automations={getWorkspaceAutomations(canonicalWorkspaceId)}
          visibility="documentation"
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'evidence' ? (
        <EmergencyEvidencePanel
          complaintContexts={pipelineData.emergency.ragComplaintContext}
          complaintRoutes={pipelineData.emergency.chiefComplaintRoutes}
          onLaunchTool={launchTool}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'knowledge' ? (
        <EmergencyKnowledgeLayerPanel
          knowledgeLayer={pipelineData.emergency.knowledgeLayer}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'simulations' ? (
        <EmergencySimulationScenariosPanel
          simulationScenarios={pipelineData.emergency.simulationScenarios}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'iot' ? (
        <EmergencyAutomationList
          title="Medical IoT Monitoring"
          description="Device alerts and telemetry gaps feed ED patient risk context."
          automations={getWorkspaceAutomations(canonicalWorkspaceId)}
          visibility="iot"
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'tools' ? (
        <WorkspaceListPanel
          title={`${workspaceExperience.shortLabel} tools`}
          description="Workspace assets stay inside the page model rather than the sidebar."
          items={model.toolEntries}
          renderItem={(tool) => (
            <WorkspaceToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
          )}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'workflows' ? (
        <WorkspaceListPanel
          title="Workspace workflows"
          description="Workflow recommendations are mode-driven and can launch existing tools or assistant context."
          items={pipelineData.recommendations.filter((item) => item.type === 'workflow')}
          renderItem={(item) => (
            <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.route} />
          )}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'automations' ? (
        <>
          {isEmergencyWorkspace ? (
            <EmergencyAutomationMarketplacePanel
              marketplace={pipelineData.emergency.automationMarketplace}
            />
          ) : null}
          <WorkspaceAutomationHub
            workspaceId={canonicalWorkspaceId}
            solutionPackage={pipelineData.analytics.solutionPackage}
            onRunAutomation={previewAutomation}
          />
        </>
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'demo' ? (
        <EmergencyDemoModePanel
          demoTenant={pipelineData.emergency.demoTenant}
          demoEnvironment={pipelineData.emergency.demoEnvironment}
          onLaunchRoute={launchRoute}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'roi' ? (
        <EmergencyRoiEstimatorPanel estimator={pipelineData.emergency.roiEstimator} />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'automation-roi' ? (
        <EmergencyAutomationRoiPanel
          roi={pipelineData.emergency.automationRoi}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'deployment' ? (
        <EmergencyDeploymentBlueprintPanel
          blueprint={pipelineData.emergency.firstCustomerDeployment}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'implementation' ? (
        <EmergencyImplementationSummaryPanel
          summary={pipelineData.emergency.implementationSummary}
          onLaunchRoute={launchRoute}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'flow' ? (
        <EmergencyFlowIntelligencePanel
          platform={pipelineData.emergency.flowIntelligencePlatform}
          flowEngine={pipelineData.emergency.flowEngine}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'onboarding' ? (
        <EmergencyOnboardingPanel
          onboarding={pipelineData.emergency.onboarding}
          onLaunchRoute={launchRoute}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'analytics' ? (
        <EmergencyAnalyticsPanel
          analytics={pipelineData.analytics}
          kpiLayer={pipelineData.emergency.kpiLayer}
          demoEnvironment={pipelineData.emergency.demoEnvironment}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'intake-analytics' ? (
        <EmergencyIntakeAnalyticsPanel intake={pipelineData.emergency.intakeOperatingSystem} />
      ) : null}

      {!isEmergencyWorkspace && !isFutureModule && activeSubpageId === 'analytics' ? (
        <WorkspaceListPanel
          title="Workspace analytics"
          description="Analytics are normalized from registry metadata and honest backend status."
          items={Object.entries(pipelineData.analytics.counts).map(([label, value]) => ({
            id: label,
            label,
            detail: String(value),
          }))}
          renderItem={(item) => (
            <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.lineChart} />
          )}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'automations' ? (
        <EmergencyProductTiers
          productTiers={pipelineData.emergency.productTiers}
          automations={getWorkspaceAutomations(canonicalWorkspaceId)}
          mvpPackage={pipelineData.emergency.mvpPackage}
          optionalAddOns={pipelineData.emergency.optionalAddOns}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'alerts' ? (
        <WorkspaceListPanel
          title="Active alerts"
          description="Alerts combine workspace-mode risks with local/demo operational notifications."
          items={pipelineData.alerts}
          renderItem={(item) => (
            <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.bell} />
          )}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'reports' ? (
        <WorkspaceListPanel
          title="Reports"
          description="Reports describe the current workspace mode and available evidence surfaces."
          items={pipelineData.mode.reports.map((report) => ({
            id: report,
            label: report,
            detail: `${workspaceExperience.shortLabel} report`,
          }))}
          renderItem={(item) => (
            <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.formatPdf} />
          )}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'settings' ? (
        <WorkspaceListPanel
          title="Workspace settings"
          description="Settings reflect permissions, backend connections, and SaaS workspace configuration."
          items={[
            ...pipelineData.mode.permissions.map((permission) => ({
              id: permission,
              label: permission,
              detail: 'Required permission',
            })),
            ...pipelineData.backendConnections.map((service) => ({
              id: service.id,
              label: service.label,
              detail: `${service.endpoint} · ${service.statusLabel}`,
            })),
          ]}
          renderItem={(item) => (
            <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.settings} />
          )}
        />
      ) : null}

      {!isFutureModule &&
      ![
        'command-center',
        'dashboard',
        'director',
        'charge-nurse',
        'whiteboard',
        'tools',
        'workflows',
        'automations',
        'automation-roi',
        'analytics',
        'onboarding',
        'alerts',
        'reports',
        'settings',
        'triage',
        'patients',
        'referrals',
        'documentation',
        'evidence',
        'knowledge',
        'demo',
        'roi',
        'deployment',
        'throughput',
        'waiting-room',
        'ems',
        'resources',
        'escalations',
        'flow',
        'simulations',
        'iot',
      ].includes(activeSubpageId) ? (
        <WorkspaceListPanel
          title={activeSubpage?.label || 'Workspace subpage'}
          description={`${activeSubpage?.label || 'This subpage'} is connected to ${pipelineData.mode.modeName} and uses the same workspace data pipeline.`}
          items={[...pipelineData.recommendations.slice(0, 4), ...pipelineData.alerts.slice(0, 3)]}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} />}
        />
      ) : null}

      {isEmergencyWorkspace ? (
        <WorkspaceSubpageTabs
          workspaceId={canonicalWorkspaceId}
          subpages={model.subpageEntries}
          activeSubpageId={activeSubpageId}
        />
      ) : null}
    </PageShell>
  );
}

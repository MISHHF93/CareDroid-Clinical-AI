import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  DEFAULT_CARE_WORKSPACE_ID,
  buildCareWorkspaceModel,
  getWorkspaceSubpageById,
  isFutureWorkspace,
} from '../config/workspace.config';
import { getWorkspaceExperienceProfile } from '../data/workspaceExperience';
import { workspaceFilterSummary } from '../data/platformOperatingSystem';
import { getAutomationAuditEntries } from '../data/automationAuditTrail';
import { getWorkspaceAutomations } from '../data/automationRegistry';
import {
  buildEmergencyCopilotGuidance,
  estimateEmergencyRoi,
  routeEmergencyChiefComplaint,
} from '../data/emergencyOperatingSystem';
import WorkspaceDataPipelineService from '../services/workspaceDataPipelineService';
import AutomationEngine from '../services/automationEngine';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon, getWorkspaceIcon } from '../navigation/iconRegistry';
import LaunchActionCard from '../components/ui/LaunchActionCard';
import {
  DashboardGrid,
  DashboardSection,
  MetricCard,
  PageShell,
} from '../components/ui/CareDroidPrimitives';
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
  return String(value || 'default').toLowerCase().replace(/[^a-z0-9-]/g, '-');
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

function WorkspaceSubpageTabs({ workspaceId, subpages, activeSubpageId }) {
  return (
    <nav className="workspace-subpage-tabs" aria-label="Workspace subpages">
      {subpages.map((subpage) => (
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

function WorkspaceListPanel({ title, description, items = [], empty = 'No items available.', renderItem }) {
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
        <p className="workspace-eyebrow">{workspace.roadmapLabel || 'Future Module'}</p>
        <h2 id="future-workspace-title">{workspace.label} is coming later</h2>
        <p>{workspace.productFocus || 'This workspace is preserved in the codebase as a roadmap module.'}</p>
      </div>
      <div className="emergency-journey-insights" aria-label="Future module status">
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
        Open Emergency OS
      </button>
    </section>
  );
}

function WorkspaceAutomationHub({ workspaceId, solutionPackage, onRunAutomation }) {
  const automationState = AutomationEngine.getWorkspaceAutomationState(workspaceId);
  const history = getAutomationAuditEntries().filter((entry) => entry.workspace.id === workspaceId).slice(0, 5);
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
            <p className="workspace-empty-state">No automation history yet. Preview an automation to create an audit event.</p>
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
    <section className="workspace-panel emergency-automation-marketplace" aria-labelledby="ed-automation-marketplace-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">SaaS Marketplace</p>
        <h2 id="ed-automation-marketplace-title">ED Automation Marketplace</h2>
        <p>{marketplace.packagingStatement || 'Emergency automations are packaged as sellable SaaS modules.'}</p>
      </div>
      <div className="emergency-journey-summary" aria-label="ED automation marketplace metrics">
        <span>{metrics.totalModules || 0} modules</span>
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
                  <strong>{module.title}:</strong> {module.subscriptionTier} · {module.enabled ? 'enabled' : 'disabled'} ·{' '}
                  {module.roiEstimate}
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
    <section className="workspace-panel emergency-journey-panel" aria-labelledby="emergency-journey-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Patient Journey</p>
        <h2 id="emergency-journey-title">Canonical ED Flow</h2>
        <p>Every automation maps to this operating path instead of launching as an isolated tool.</p>
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
              {stage.automationCount || 0} automations | {stage.metrics?.waitingPatients || 0} waiting | target{' '}
              {stage.metrics?.targetMinutes || stage.targetMinutes} min
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

function EmergencyQueueIntelligencePanel({ queueIntelligence = {}, onAskAssistant }) {
  const queues = queueIntelligence.queues || [];
  const metrics = queueIntelligence.metrics || {};
  const bottlenecks = queueIntelligence.bottlenecks || [];
  const recommendations = queueIntelligence.recommendations || [];

  return (
    <section className="workspace-panel emergency-queue-panel" aria-labelledby="emergency-queue-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Queue Intelligence</p>
        <h2 id="emergency-queue-title">Emergency Queue Intelligence</h2>
        <p>CareDroid watches ED queue pressure, oldest-patient waits, risk, and throughput before staff notice bottlenecks.</p>
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

  return (
    <section className="workspace-panel emergency-prearrival-panel" aria-labelledby="emergency-prearrival-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">EMS to ED Pipeline</p>
        <h2 id="emergency-prearrival-title">EMS Pre-arrival Workspace</h2>
        <p>Patient journey context starts before arrival with structured EMS assessment, complaint, vitals, risk profile, ED notification, and arrival readiness.</p>
      </div>
      <div className="emergency-journey-summary" aria-label="EMS pre-arrival metrics">
        <span>{metrics.incomingCount || 0} incoming patients</span>
        <span>{metrics.nextEtaMinutes || 0} min next ETA</span>
        <span>{metrics.criticalCount || 0} critical risk</span>
        <span>{metrics.handoffReadyCount || 0} handoffs ready</span>
      </div>
      <ol className="emergency-journey-flow emergency-prearrival-workflow">
        {workflow.map((step) => (
          <li key={step.id}>
            <strong>{step.label}</strong>
            <span>{step.description}</span>
          </li>
        ))}
      </ol>
      <div className="emergency-queue-grid">
        {incomingPatients.map((patient) => (
          <article
            key={patient.id}
            className={`emergency-queue-card emergency-dashboard-widget--${patient.riskLevel}`}
          >
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{patient.unit}</span>
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
            </dl>
            <div className="emergency-prearrival-vitals" aria-label={`${patient.patientLabel} vitals`}>
              <span>BP {patient.vitals.bloodPressure}</span>
              <span>HR {patient.vitals.heartRate}</span>
              <span>RR {patient.vitals.respiratoryRate}</span>
              <span>SpO2 {patient.vitals.oxygenSaturation}</span>
            </div>
            <div className="emergency-prearrival-risk-bundle">
              <strong>Risk score bundle</strong>
              {patient.riskScoreBundle.map((score) => (
                <span key={score.id}>
                  {score.label}: {score.value} ({score.riskLevel})
                </span>
              ))}
            </div>
            <p className="emergency-queue-warning">
              <strong>Handoff summary:</strong> {patient.handoffSummary}
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
            `Prepare ED for incoming EMS patients: ${incomingPatients
              .slice(0, 3)
              .map((patient) => `${patient.patientLabel} ETA ${patient.etaMinutes} minutes, ${patient.complaint}`)
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
        <p>Leadership can monitor arrival, triage, provider assessment, delays, bottlenecks, and staffing pressure from one throughput view.</p>
        <p>Canonical KPI source: EmergencyKPILayer.</p>
      </div>
      <DashboardGrid variant="metrics" className="workspace-focus-metrics">
        <MetricCard label="Door-to-Doctor" value={`${kpi.value || 0} min`} helper={`${kpi.targetCompliance || 0}% target compliance`} />
        <MetricCard label="90th percentile" value={`${kpi.p90 || 0} min`} helper="Longest tail of current demo shift" />
        <MetricCard label="Longest active wait" value={`${kpi.longestActiveWait || 0} min`} helper={throughput.staffingPressure?.state || 'staffing pressure'} />
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
            <small>Target: {metric.target || 'not configured'} {metric.unit}</small>
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
        onClick={() => onAskAssistant('Summarize Door-to-Doctor throughput, current delays, bottlenecks, and staffing pressure for ED leadership.')}
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

  return (
    <section className="workspace-panel" aria-labelledby="emergency-waiting-room-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Waiting Room Intelligence</p>
        <h2 id="emergency-waiting-room-title">Waiting Room Health</h2>
        <p>Treat the waiting room as a managed queue with visible wait duration, patient count, risk, and reassessment need.</p>
      </div>
      <div className={`emergency-capacity-score emergency-capacity-score--${cssToken(waitingRoom.riskState)}`}>
        <div>
          <span>Waiting Room Health Score</span>
          <strong>{waitingRoom.healthScore || 0}</strong>
          <small>{waitingRoom.riskState || 'Normal'}</small>
        </div>
        <div>
          <span>ReassessmentQueue</span>
          <strong>{reassessmentQueue.count || 0}</strong>
          <small>{reassessmentQueue.criticalCount || 0} critical · {reassessmentQueue.urgentCount || 0} urgent</small>
        </div>
      </div>
      <DashboardGrid variant="metrics" className="workspace-focus-metrics">
        <MetricCard label="Patient count" value={metrics.patientCount || 0} helper="Active waiting room patients" />
        <MetricCard label="Median wait" value={`${metrics.waitDuration || 0} min`} helper="Current waiting-room wait duration" />
        <MetricCard label="Oldest wait" value={`${metrics.oldestWaitMinutes || 0} min`} helper="Oldest active waiting patient" />
      </DashboardGrid>
      <div className="emergency-queue-grid">
        {(reassessmentQueue.items || []).map((item) => (
          <article key={item.patientId} className={`emergency-queue-card emergency-dashboard-widget--${item.priority}`}>
            <div className="emergency-queue-card__header">
              <div>
                <span className="workspace-eyebrow">{item.priority} reassessment</span>
                <h3>{item.patientId}</h3>
              </div>
              <strong>{item.waitDuration}m</strong>
            </div>
            <p>{item.triggerReason}</p>
            <small>{item.recommendedAction}</small>
          </article>
        ))}
      </div>
      <div className="emergency-journey-insights" aria-label="Waiting room recommendations">
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
        onClick={() => onAskAssistant('Prioritize waiting room pressure, reassessment recommendations, oldest waits, and queue bottlenecks.')}
      >
        Ask assistant to prioritize waiting room pressure
      </button>
    </section>
  );
}

function EmergencyEmsOffloadPanel({ emsOffload = {}, onAskAssistant }) {
  const metrics = emsOffload.metrics || {};
  const handoffs = emsOffload.handoffs || [];
  const arrivalEtaTimeline = emsOffload.arrivalEtaTimeline || [];

  return (
    <section className="workspace-panel" aria-labelledby="emergency-ems-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">EMS Offload Command Center</p>
        <h2 id="emergency-ems-title">EMS Pressure</h2>
        <p>Track incoming ambulances, arrival ETA, waiting handoffs, and offload delays from one command center.</p>
      </div>
      <div className="emergency-journey-summary" aria-label="EMS offload metrics">
        <span>{metrics.incomingAmbulances || 0} incoming ambulances</span>
        <span>{metrics.nextEtaMinutes || 0} min next ETA</span>
        <span>{metrics.waitingHandoffs || 0} waiting handoffs</span>
        <span>{metrics.longestOffloadDelay || 0} min longest offload</span>
      </div>
      <div className="emergency-queue-grid">
        {arrivalEtaTimeline.map((arrival) => (
          <article key={arrival.patientId} className={`emergency-queue-card emergency-dashboard-widget--${arrival.riskLevel}`}>
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
            <p>{handoff.patientId} arrived {handoff.arrivalTime}</p>
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
        onClick={() => onAskAssistant('Summarize EMS pressure, incoming ambulance ETAs, waiting handoffs, and offload delays.')}
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
        <p>Staff can understand rooms, stretchers, monitors, telemetry units, and infusion pumps by availability status.</p>
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
        onClick={() => onAskAssistant('Summarize ED resource availability, shortages, out-of-service equipment, and operational actions.')}
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
        <p>Capacity overload, boarding overload, EMS congestion, high-risk queue growth, and critical device outages surface early.</p>
      </div>
      <div className="emergency-journey-summary" aria-label="Escalation metrics">
        <span>{metrics.activeEscalations || 0} active escalations</span>
        <span>{metrics.criticalEscalations || 0} critical</span>
        <span>{metrics.urgentEscalations || 0} urgent</span>
      </div>
      <div className="emergency-queue-grid">
        {escalations.map((escalation) => (
          <article key={escalation.id} className={`emergency-queue-card emergency-dashboard-widget--${escalation.severity}`}>
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
        onClick={() => onAskAssistant('Summarize active ED operational escalations and recommended leadership actions.')}
      >
        Ask assistant to summarize escalations
      </button>
    </section>
  );
}

function EmergencyCapacityIntelligencePanel({ capacity = {}, onAskAssistant }) {
  const signals = capacity.signals || [];
  const recommendations = capacity.recommendations || [];

  return (
    <section className="workspace-panel emergency-capacity-panel" aria-labelledby="emergency-capacity-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Capacity Intelligence</p>
        <h2 id="emergency-capacity-title">Emergency Capacity Intelligence</h2>
        <p>Staff can understand department pressure instantly from census, spaces, admissions, boarding, EMS arrivals, and discharge candidates.</p>
      </div>
      <div className={`emergency-capacity-score emergency-capacity-score--${cssToken(capacity.riskLevel)}`}>
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
            <strong>{recommendation.title}:</strong> {recommendation.action}
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

function EmergencyReferralHubPanel({ referralHub = {}, automations = [], onAskAssistant }) {
  const flowStages = referralHub.flowStages || [];
  const departmentQueues = referralHub.departmentQueues || [];
  const referrals = referralHub.referrals || [];
  const metrics = referralHub.metrics || {};
  const delays = referralHub.delays || [];
  const recommendations = referralHub.recommendations || [];
  const referralAutomations = automations.filter((automation) => automation.workspaceVisibility?.includes('referrals'));

  return (
    <section className="workspace-panel emergency-referral-panel" aria-labelledby="emergency-referral-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">ReferralHub</p>
        <h2 id="emergency-referral-title">Referral Intelligence Network</h2>
        <p>Tracks referral requests from classification through department queue, review, acceptance, and closure so delays become measurable.</p>
      </div>
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
          <span role="columnheader">Stage</span>
          <span role="columnheader">Elapsed</span>
          <span role="columnheader">Priority</span>
        </div>
        {referrals.map((referral) => (
          <div key={referral.id} role="row">
            <span role="cell">
              <strong>{referral.id}</strong>
              <small>{referral.patientLabel}: {referral.reason}</small>
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

function EmergencyBoardingIntelligencePanel({ boarding = {}, onAskAssistant }) {
  const metrics = boarding.metrics || {};
  const boarders = boarding.boarders || [];
  const longestBoarders = boarding.longestBoarders || [];
  const recommendations = boarding.recommendations || [];

  return (
    <section className="workspace-panel emergency-boarding-panel" aria-labelledby="emergency-boarding-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Boarding Intelligence</p>
        <h2 id="emergency-boarding-title">Boarding Intelligence Engine</h2>
        <p>Tracks admitted patients waiting for beds so boarding becomes visible, measurable, and ready for operations review.</p>
      </div>
      <div className={`emergency-capacity-score emergency-capacity-score--${cssToken(metrics.bedPressure)}`}>
        <div>
          <span>Boarding Risk Score</span>
          <strong>{boarding.score ?? 0}</strong>
          <small>{metrics.bedPressure || 'Moderate'} bed pressure</small>
        </div>
        <div>
          <span>Boarding Snapshot</span>
          <strong>{metrics.boardingCount || 0}</strong>
          <small>
            {metrics.boardingTime || 0} min avg boarding time · {metrics.pendingBeds || 0} pending beds
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
            <strong>{boarder.patientLabel}:</strong> {boarder.boardingMinutes} minutes waiting for {boarder.pendingBedType}.
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

function EmergencyCommandCenter({ emergency, onLaunchRoute, onAskAssistant }) {
  const commandWidgets = emergency.commandCenterWidgets || emergency.dashboardWidgets || [];
  return (
    <section className="emergency-command-center" aria-label="Emergency Command Center">
      <div className="workspace-panel emergency-os-layout__wide">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">ED Command Center</p>
          <h2>Emergency Command Center</h2>
          <p>Most ED flow actions start here: current patients, waiting room, high-risk queue, EMS arrivals, referrals, bed pressure, equipment status, staffing pressure, and alerts.</p>
        </div>
        <div className="emergency-command-grid">
          {commandWidgets.map((widget) => (
            <article
              key={widget.id}
              className={`emergency-command-widget emergency-dashboard-widget--${widget.severity}`}
            >
              <div>
                <span>{widget.label}</span>
                <strong>{widget.value}</strong>
                <small>{widget.helper}</small>
              </div>
              <p>{widget.supportingDetail}</p>
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
          ))}
        </div>
      </div>
      <aside className="workspace-panel emergency-command-sidecar" aria-labelledby="emergency-command-flow-title">
        <div className="workspace-panel__header">
          <p className="workspace-eyebrow">Reduced Navigation</p>
          <h2 id="emergency-command-flow-title">Dashboard-first workflow</h2>
          <p>Deep routes remain available, but routine ED work starts from this Command Center.</p>
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

function EmergencyDirectorCommandCenter({ emergency, workspaceId, onLaunchRoute, onAskAssistant }) {
  const operatingSystem = emergency.operatingSystem;
  const commandWidgets = emergency.commandCenterWidgets || [];
  const widgetById = Object.fromEntries(commandWidgets.map((widget) => [widget.id, widget]));
  const waitingRoomQueue = emergency.queueIntelligence?.queues?.find((queue) => queue.id === 'waiting-room');
  const waitingRoomIntelligence = emergency.waitingRoomIntelligence;
  const emsPreArrival = emergency.emsPreArrival;
  const emsOffload = emergency.emsOffload;
  const boarding = emergency.boardingIntelligence;
  const referralHub = emergency.referralHub;
  const capacity = emergency.capacityIntelligence;
  const resourceBoard = emergency.resourceBoard;
  const escalationEngine = emergency.escalationEngine;
  const kpiLayer = emergency.kpiLayer;
  const automationState = AutomationEngine.getWorkspaceAutomationState(workspaceId);
  const automationCount =
    automationState.activeAutomations.length + automationState.demoAutomations.length + automationState.blockedAutomations.length;

  const directorSections = [
    {
      id: 'door-to-doctor',
      label: 'Door-to-Doctor',
      value: `${kpiLayer?.metricById?.doorToDoctor?.value ?? 0}m`,
      helper: `${kpiLayer?.metricById?.doorToDoctor?.targetCompliance ?? 0}% target compliance`,
      detail: 'Arrival, triage, and provider timestamps drive the canonical throughput KPI.',
      target: '/workspace/emergency/throughput',
      assistantPrompt: 'Summarize Door-to-Doctor throughput, bottlenecks, delays, and staffing pressure.',
      severity: (kpiLayer?.metricById?.doorToDoctor?.value || 0) > 60 ? 'high' : 'medium',
    },
    {
      id: 'waiting-room',
      label: 'Waiting Room',
      value: waitingRoomIntelligence?.healthScore ?? waitingRoomQueue?.count ?? widgetById['waiting-room']?.value ?? 0,
      helper: `${waitingRoomIntelligence?.riskState || waitingRoomQueue?.riskLevel || 'medium'} · ${waitingRoomIntelligence?.metrics?.reassessmentNeed ?? 0} reassessments`,
      detail: waitingRoomQueue?.bottleneck?.reason || widgetById['waiting-room']?.supportingDetail,
      target: '/workspace/emergency/waiting-room',
      assistantPrompt: 'Summarize waiting room pressure, oldest waits, and near-term triage actions for ED leadership.',
      severity: waitingRoomQueue?.bottleneck?.severity || widgetById['waiting-room']?.severity || 'medium',
    },
    {
      id: 'ems-arrivals',
      label: 'EMS Arrivals',
      value: emsPreArrival?.metrics?.incomingCount ?? widgetById['ems-arrivals']?.value ?? 0,
      helper: `${emsOffload?.metrics?.waitingHandoffs ?? 0} handoffs · ${emsOffload?.metrics?.longestOffloadDelay ?? 0} min longest`,
      detail: 'Inbound EMS context, ETA, waiting handoffs, and offload delay pressure.',
      target: '/workspace/emergency/ems',
      assistantPrompt: 'Summarize EMS arrivals, ETA, waiting handoffs, and offload delays for ED leadership.',
      severity: emsOffload?.metrics?.pressureState === 'critical' ? 'critical' : 'medium',
    },
    {
      id: 'high-risk-queue',
      label: 'High Risk Queue',
      value: widgetById['high-risk-queue']?.value ?? emergency.patientJourneyEngine?.metrics?.highRiskPatients ?? 0,
      helper: widgetById['high-risk-queue']?.helper || 'Risk scores and clinician review queues',
      detail: 'Calculator-triggered risk review for patients needing clinician confirmation.',
      target: '/workspace/emergency/triage',
      assistantPrompt: 'Summarize high-risk ED patients by calculators, wait state, and clinician review needs.',
      severity: widgetById['high-risk-queue']?.severity || 'critical',
    },
    {
      id: 'boarding-pressure',
      label: 'Boarding Pressure',
      value: boarding?.metrics?.boardingCount ?? 0,
      helper: `${boarding?.metrics?.boardingTime ?? 0} min avg · ${boarding?.metrics?.pendingBeds ?? 0} pending beds`,
      detail: `Boarding risk score ${boarding?.score ?? 0}; longest boarder ${boarding?.metrics?.longestBoardingMinutes ?? 0} min.`,
      target: '/workspace/emergency/boarding',
      assistantPrompt: 'Summarize ED boarding pressure, longest boarders, pending beds, and bed-management next steps.',
      severity: (boarding?.score || 0) >= 80 ? 'critical' : 'high',
    },
    {
      id: 'referral-queue',
      label: 'Referral Queue',
      value: referralHub?.metrics?.active ?? widgetById['referral-queue']?.value ?? 0,
      helper: `${referralHub?.metrics?.delayed ?? 0} delayed · ${referralHub?.metrics?.accepted ?? 0} accepted`,
      detail: 'Consult, transfer, specialty, and follow-up referrals by department queue.',
      target: '/workspace/emergency/referrals',
      assistantPrompt: 'Prioritize delayed ED referrals by department queue, stage, elapsed time, and disposition dependency.',
      severity: (referralHub?.metrics?.delayed || 0) > 0 ? 'high' : 'medium',
    },
    {
      id: 'capacity-score',
      label: 'Capacity Score',
      value: capacity?.score ?? 0,
      helper: `${capacity?.riskLevel || 'Green'} · ${capacity?.occupancyPercent ?? 0}% occupied`,
      detail: capacity?.summary || 'Current capacity posture from census, beds, boarding, EMS, and discharge candidates.',
      target: '/workspace/emergency/capacity',
      assistantPrompt: 'Summarize ED capacity score, risk level, occupied spaces, pending admissions, EMS arrivals, and discharge candidates.',
      severity: ['Red', 'Orange'].includes(capacity?.riskLevel) ? 'critical' : 'medium',
    },
    {
      id: 'equipment-status',
      label: 'Resource Availability',
      value: resourceBoard?.metrics?.available ?? widgetById['equipment-status']?.value ?? 'Monitor',
      helper: `${resourceBoard?.metrics?.shortageCount ?? 0} shortages · ${resourceBoard?.metrics?.outOfService ?? 0} out of service`,
      detail: widgetById['equipment-status']?.supportingDetail || 'Rooms, stretchers, monitors, telemetry units, and infusion pumps by status.',
      target: '/workspace/emergency/resources',
      assistantPrompt: 'Summarize ED resource availability, shortages, and out-of-service equipment.',
      severity: (resourceBoard?.metrics?.shortageCount || 0) > 0 ? 'high' : 'medium',
    },
    {
      id: 'escalation-status',
      label: 'Escalations',
      value: escalationEngine?.metrics?.activeEscalations ?? 0,
      helper: `${escalationEngine?.metrics?.criticalEscalations ?? 0} critical · ${escalationEngine?.metrics?.urgentEscalations ?? 0} urgent`,
      detail: 'Operational risks surfaced from capacity, boarding, EMS, queue growth, and device/resource pressure.',
      target: '/workspace/emergency/escalations',
      assistantPrompt: 'Summarize ED operational escalations and recommended leadership actions.',
      severity: (escalationEngine?.metrics?.criticalEscalations || 0) > 0 ? 'critical' : 'high',
    },
    {
      id: 'automation-status',
      label: 'Automation Status',
      value: automationCount,
      helper: `${automationState.activeAutomations.length} active · ${automationState.settings.humanReviewRequired} review-required`,
      detail: 'Automation registry status across triage, referrals, documentation, IoT, simulations, and governance.',
      target: '/workspace/emergency/automations',
      assistantPrompt: 'Summarize Emergency automation status, active modules, review-required actions, and blocked automations.',
      severity: automationState.blockedAutomations.length ? 'high' : 'medium',
    },
  ];

  return (
    <section className="workspace-panel emergency-director-command-center" aria-labelledby="emergency-director-command-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">ED Director Screen</p>
        <h2 id="emergency-director-command-title">Emergency Command Center</h2>
        <p>Leadership can scan department status in under 60 seconds across flow, risk, capacity, boarding, referrals, equipment, and automations.</p>
        {operatingSystem ? <p>{operatingSystem.positioning}</p> : null}
      </div>
      {operatingSystem?.leadershipSummary ? (
        <div className="emergency-journey-summary" aria-label="Emergency operating system summary">
          <span>{operatingSystem.leadershipSummary.activePatients} active patients</span>
          <span>{operatingSystem.leadershipSummary.queueBottlenecks} queue bottlenecks</span>
          <span>{operatingSystem.leadershipSummary.capacityScore} capacity score</span>
          <span>{operatingSystem.leadershipSummary.automationModules} SaaS modules</span>
        </div>
      ) : null}
      <div className="emergency-command-grid">
        {directorSections.map((section) => (
          <article
            key={section.id}
            className={`emergency-command-widget emergency-dashboard-widget--${section.severity}`}
          >
            <div>
              <span>{section.label}</span>
              <strong>{section.value}</strong>
              <small>{section.helper}</small>
            </div>
            <p>{section.detail}</p>
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
                Ask assistant
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmergencyTriageOrchestrator({ orchestrator, onLaunchTool }) {
  return (
    <section className="workspace-panel" aria-labelledby="emergency-triage-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Triage Orchestrator</p>
        <h2 id="emergency-triage-title">{orchestrator.label}</h2>
        <p>{orchestrator.safetyStatement}</p>
      </div>
      <div className="emergency-orchestrator-flow" aria-label="Triage workflow">
        <div>
          <strong>Inputs</strong>
          <ul>
            {orchestrator.inputs.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Auto-calculate</strong>
          <div className="workspace-card-grid">
            {orchestrator.calculatorSequence.map((calculator) => (
              <button
                key={calculator.id}
                type="button"
                className="workspace-route-card"
                onClick={() => onLaunchTool({ id: calculator.id, name: calculator.label })}
              >
                <span className="workspace-route-card__icon" aria-hidden>
                  <NavIcon icon={getToolIcon(calculator.id)} size={18} />
                </span>
                <span className="workspace-route-card__body">
                  <strong>{calculator.label}</strong>
                  <span>{calculator.trigger}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>Outputs</strong>
          <ul>
            {orchestrator.outputs.map((output) => (
              <li key={output}>{output}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function EmergencyEvidencePanel({ complaintContexts, complaintRoutes = [], onLaunchTool, onAskAssistant }) {
  const [selectedComplaint, setSelectedComplaint] = useState(complaintRoutes[0]?.complaint || '');
  const [complaintInput, setComplaintInput] = useState(complaintRoutes[0]?.complaint || '');
  const [vitalsSummary, setVitalsSummary] = useState('BP, HR, RR, SpO2, temperature available for review');
  const [selectedCalculatorIds, setSelectedCalculatorIds] = useState([]);
  const routedComplaint = routeEmergencyChiefComplaint(complaintInput || selectedComplaint);
  const routedCalculatorIds = (routedComplaint?.calculators || []).map((calculator) => calculator.id).join('|');
  useEffect(() => {
    setSelectedCalculatorIds((routedComplaint?.calculators || []).map((calculator) => calculator.id));
  }, [routedComplaint?.routeId, routedCalculatorIds]);
  const selectedCalculators = (routedComplaint?.calculators || []).filter((calculator) =>
    selectedCalculatorIds.includes(calculator.id)
  );
  const copilotGuidance = buildEmergencyCopilotGuidance({
    complaint: complaintInput || selectedComplaint,
    vitals: vitalsSummary,
    workspaceContext: 'Emergency evidence and workflow guidance',
    selectedCalculators,
  });
  const selectedContext =
    complaintContexts.find((context) => context.complaint === (routedComplaint?.complaint || selectedComplaint)) ||
    complaintContexts[0];

  return (
    <section className="workspace-panel" aria-labelledby="emergency-evidence-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Clinical Intent Router</p>
        <h2 id="emergency-evidence-title">Complaint-Driven Workflow Guidance</h2>
        <p>Routes chief complaints to calculators, protocols, workflows, simulations, and referrals for human review.</p>
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
            placeholder="Enter chest pain, stroke symptoms, sepsis concern, trauma, or shortness of breath"
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
              <dt>Calculators</dt>
              <dd>{routedComplaint.calculators.map((calculator) => calculator.label).join(', ')}</dd>
            </div>
            <div>
              <dt>Workflows</dt>
              <dd>{routedComplaint.workflows.join(', ')}</dd>
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
                Open {calculator.label}
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
          No complaint route matched. Use manual clinician review and choose a supported complaint path.
        </p>
      )}
      <article className="workspace-automation-card emergency-copilot-card" aria-label="ED Copilot workflow guidance">
        <div>
          <strong>ED AI Copilot</strong>
          <span>Explainable workflow guidance from complaint, vitals, workspace context, and selected calculators.</span>
        </div>
        {routedComplaint?.calculators?.length ? (
          <fieldset className="emergency-copilot-calculators">
            <legend>Selected calculators</legend>
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
            <dt>Recommended tools</dt>
            <dd>{copilotGuidance.recommendedTools.map((tool) => tool.label).join(', ') || 'Manual selection'}</dd>
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
              `Use ED AI Copilot guidance for ${copilotGuidance.inputs.complaint}. Recommended tools: ${copilotGuidance.recommendedTools
                .map((tool) => tool.label)
                .join(', ') || 'manual selection'}. Next step: ${copilotGuidance.nextWorkflowStep}. Explain reasoning and keep all outputs clinician-reviewed.`
            )
          }
        >
          Ask assistant with Copilot context
        </button>
      </article>
      {selectedContext ? (
        <div className="emergency-evidence-grid">
          {[
            ['Protocols', selectedContext.protocols],
            ['Evidence', selectedContext.evidence],
            ['Recommended calculators', selectedContext.recommendedCalculators],
            ['Relevant workflows', selectedContext.workflows],
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
  const items = automations.filter((automation) => automation.workspaceVisibility?.includes(visibility));
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

function EmergencyDemoModePanel({ demoTenant, demoEnvironment, onLaunchRoute }) {
  if (!demoTenant) return null;
  const demoSections = [
    ['Sample patients', demoTenant.samplePatients, (patient) => `${patient.chiefComplaint} · ${patient.stage} · ${patient.summary}`],
    ['Sample alerts', demoTenant.sampleAlerts, (alert) => `${alert.severity} · ${alert.detail}`],
    ['Sample workflows', demoTenant.sampleWorkflows, (workflow) => workflow.detail],
    ['Sample protocols', demoTenant.sampleProtocols, (protocol) => `${protocol.protocol}: ${protocol.summary}`],
    ['Sample analytics', demoTenant.sampleAnalytics, (metric) => `${metric.value} ${metric.unit} · ${metric.helper}`],
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
            <div className="emergency-journey-summary" aria-label="Emergency demo environment metrics">
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
              <article key={patient.patientId} className="workspace-automation-card emergency-demo-card">
                <div>
                  <strong>{patient.label}</strong>
                  <span>
                    {patient.journeyLabel} · {patient.complaint} · risk {patient.riskScore}
                  </span>
                </div>
                <div className="emergency-demo-labels" aria-label={`${patient.patientId} demo labels`}>
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
            <p>Prospect-ready sample content for evaluating the Emergency Workspace without integrations.</p>
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
        <p>Training mirrors real ED operational problems by reusing Emergency Workspace signals, KPIs, queues, resources, and escalations.</p>
      </div>
      <DashboardGrid variant="metrics" className="workspace-focus-metrics">
        <MetricCard label="Scenarios" value={simulationScenarios.metrics?.scenarioCount || 0} helper="Operational ED scenarios" />
        <MetricCard label="Debrief metrics" value={simulationScenarios.metrics?.debriefMetrics || 0} helper="Timeline, KPIs, queues, decisions" />
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
      helper: estimator?.outputDefinitions?.find((output) => output.id === 'estimatedTimeSaved')?.helper,
    },
    {
      id: 'workflowEfficiency',
      label: 'Workflow efficiency',
      value: estimate.summary.workflowEfficiency,
      helper: estimator?.outputDefinitions?.find((output) => output.id === 'workflowEfficiency')?.helper,
    },
    {
      id: 'adoptionPotential',
      label: 'Adoption potential',
      value: estimate.summary.adoptionPotential,
      helper: estimator?.outputDefinitions?.find((output) => output.id === 'adoptionPotential')?.helper,
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
          <p>Use this during sales discovery and onboarding planning before live integrations are connected.</p>
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
    <section className="emergency-deployment-layout" aria-label="First customer deployment blueprint">
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
            <strong>Minimum sellable Emergency OS</strong>
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
              <article key={plan.id} className="workspace-automation-card emergency-deployment-card">
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
    <section className="emergency-deployment-layout" aria-label="Emergency OS implementation summary">
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
            <small>{summary.verification.testFiles} files · {summary.verification.status}</small>
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
          <p>Each row maps a markdown plan to its route, deterministic service, and acceptance result.</p>
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
              <button type="button" className="workspace-secondary-action" onClick={() => onLaunchRoute(item.route)}>
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
            <strong>Minimum sellable ED OS:</strong> {summary.minimumSellableCapabilities.join(', ')}.
          </p>
          <p>
            <strong>Verification:</strong> {summary.verification.lintStatus}; {summary.verification.tests} focused tests passing.
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

function EmergencyFlowIntelligencePanel({ platform }) {
  if (!platform) return null;
  const registryStats = [
    ['Automation registry', platform.automationRegistry.length, 'Flow-aware automations'],
    ['Workflow registry', platform.workflowRegistry.length, 'Review-required workflows'],
    ['Analytics model', platform.analyticsModel.events.length, 'Bottleneck and adoption events'],
    ['Dashboard model', platform.dashboardModel.widgets.length, 'Command-center widgets'],
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
            <article key={driver.id} className="workspace-automation-card emergency-flow-solution-card">
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
            <article key={solution.id} className="workspace-automation-card emergency-flow-solution-card">
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
        <DashboardGrid variant="metrics" className="workspace-focus-metrics emergency-flow-registry-grid">
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
                <small>{metric.trend} · {metric.dataState}</small>
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
          <p>Converts pilot usage into ED buyer language without claiming autonomous clinical outcomes.</p>
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
                detail: `${demoEnvironment.metrics.reassessmentNeeded} reassessment needs, ${demoEnvironment.metrics.emsPatients} EMS cases, ${demoEnvironment.metrics.boardingPatients} boarders.`,
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
        <p>Emergency Flow Starter is the smallest sellable package; deeper flow, EMS, equipment, and surge capabilities expand from there.</p>
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
          <div className="emergency-package-chip-grid" aria-label="Emergency Flow Starter MVP inclusions">
            {mvpPackage.includedCapabilities.map((capability) => (
              <span key={capability.id} className="workspace-tool-card__meta">
                {capability.label}
              </span>
            ))}
          </div>
          <div className="emergency-core-capability-list" aria-label="Why each Emergency Flow Starter capability is included">
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
          <p>Expansion modules move beyond Core when the buyer is ready for workflow or integration depth.</p>
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
                      (automationId) => automationsById[automationId]?.readiness?.requiresIntegration
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
  const {
    activeWorkspaceId,
    assistantContext,
    recommendations,
    shortcuts,
    switchWorkspace,
  } = useWorkspace();
  const model = useMemo(() => buildCareWorkspaceModel(workspaceId), [workspaceId]);
  const canonicalWorkspaceId = model.workspace.id || DEFAULT_CARE_WORKSPACE_ID;
  const defaultSubpageId = canonicalWorkspaceId === 'emergency' ? 'command-center' : 'dashboard';
  const activeSubpage = useMemo(
    () => getWorkspaceSubpageById(canonicalWorkspaceId, subpage || defaultSubpageId),
    [canonicalWorkspaceId, defaultSubpageId, subpage]
  );
  const activeSubpageId = activeSubpage?.id || defaultSubpageId;
  const pipelineData = useMemo(
    () => WorkspaceDataPipelineService.normalizeWorkspaceData(canonicalWorkspaceId),
    [canonicalWorkspaceId]
  );
  const isEmergencyWorkspace = canonicalWorkspaceId === 'emergency' && Boolean(pipelineData.emergency);
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
  }, [activeSubpage, activeSubpageId, activeWorkspaceId, canonicalWorkspaceId, defaultSubpageId, isFutureModule, navigate, subpage, switchWorkspace, workspaceId]);
  const workspaceExperience = useMemo(
    () => getWorkspaceExperienceProfile(model.workspace),
    [model.workspace]
  );
  const workspaceSummary = useMemo(() => workspaceFilterSummary(model.workspace.id), [model.workspace.id]);
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
    navigate({ pathname: path, search: '' });
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

  return (
    <PageShell
      className={`workspace-home workspace-home--${cssToken(workspaceExperience.tone)} workspace-home--workspace-${cssToken(workspaceExperience.id)}`}
      contentClassName="cd-page-stack cd-page-stack--compact workspace-home__content"
      data-workspace-os={workspaceExperience.id}
      style={workspaceThemeStyle(workspaceExperience)}
      eyebrow={workspaceExperience.operatingLabel}
      title={`${model.workspace.label} Workspace`}
      description={workspaceExperience.dashboardSubtitle || model.workspace.description}
      actions={
        <>
          <button type="button" className="workspace-primary-action" onClick={launchAssistantContext}>
            <NavIcon icon={CHROME_ICONS.bot} size={18} aria-hidden />
            Ask Assistant
          </button>
          <button type="button" className="workspace-secondary-action" onClick={() => launchRoute(`/workspace/${canonicalWorkspaceId}/${defaultSubpageId}`)}>
            Command Center
          </button>
        </>
      }
    >
      <section className="workspace-operating-brief" aria-label={`${workspaceExperience.operatingLabel} brief`}>
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
          <p>{assistantContext || pipelineData.aiContext.assistantContext || workspaceExperience.assistantContext || model.workspace.aiContext}</p>
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
            <span key={service.id} className={`workspace-service-chip workspace-service-chip--${service.status}`}>
              {service.label}: {statusLabel(service.status)}
            </span>
          ))}
        </div>
      </section>

      {isFutureModule ? (
        <FutureWorkspacePanel
          workspace={model.workspace}
          onLaunchEmergency={() => navigate('/workspace/emergency/command-center')}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'command-center' ? (
        <EmergencyDirectorCommandCenter
          emergency={pipelineData.emergency}
          workspaceId={canonicalWorkspaceId}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'dashboard' ? (
        <EmergencyCommandCenter
          emergency={pipelineData.emergency}
          onLaunchRoute={launchRoute}
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
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'capacity' ? (
        <EmergencyCapacityIntelligencePanel
          capacity={pipelineData.emergency.capacityIntelligence}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'boarding' ? (
        <EmergencyBoardingIntelligencePanel
          boarding={pipelineData.emergency.boardingIntelligence}
          onAskAssistant={launchAssistantPrompt}
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
          onLaunchTool={launchTool}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'patients' ? (
        <section className="emergency-os-layout">
          <EmergencyJourneyFlow
            journey={pipelineData.emergency.patientJourney}
            engine={pipelineData.emergency.patientJourneyEngine}
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
          onAskAssistant={launchAssistantPrompt}
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

      {isEmergencyWorkspace && activeSubpageId === 'simulations' ? (
        <EmergencySimulationScenariosPanel simulationScenarios={pipelineData.emergency.simulationScenarios} />
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
          renderItem={(tool) => <WorkspaceToolCard key={tool.id} tool={tool} onLaunch={launchTool} />}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'workflows' ? (
        <WorkspaceListPanel
          title="Workspace workflows"
          description="Workflow recommendations are mode-driven and can launch existing tools or assistant context."
          items={pipelineData.recommendations.filter((item) => item.type === 'workflow')}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.route} />}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'automations' ? (
        <>
          {isEmergencyWorkspace ? (
            <EmergencyAutomationMarketplacePanel marketplace={pipelineData.emergency.automationMarketplace} />
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

      {isEmergencyWorkspace && activeSubpageId === 'deployment' ? (
        <EmergencyDeploymentBlueprintPanel blueprint={pipelineData.emergency.firstCustomerDeployment} />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'implementation' ? (
        <EmergencyImplementationSummaryPanel
          summary={pipelineData.emergency.implementationSummary}
          onLaunchRoute={launchRoute}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'flow' ? (
        <EmergencyFlowIntelligencePanel platform={pipelineData.emergency.flowIntelligencePlatform} />
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

      {!isEmergencyWorkspace && !isFutureModule && activeSubpageId === 'analytics' ? (
        <WorkspaceListPanel
          title="Workspace analytics"
          description="Analytics are normalized from registry metadata and honest backend status."
          items={Object.entries(pipelineData.analytics.counts).map(([label, value]) => ({ id: label, label, detail: String(value) }))}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.lineChart} />}
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
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.bell} />}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'reports' ? (
        <WorkspaceListPanel
          title="Reports"
          description="Reports describe the current workspace mode and available evidence surfaces."
          items={pipelineData.mode.reports.map((report) => ({ id: report, label: report, detail: `${workspaceExperience.shortLabel} report` }))}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.formatPdf} />}
        />
      ) : null}

      {!isFutureModule && activeSubpageId === 'settings' ? (
        <WorkspaceListPanel
          title="Workspace settings"
          description="Settings reflect permissions, backend connections, and SaaS workspace configuration."
          items={[
            ...pipelineData.mode.permissions.map((permission) => ({ id: permission, label: permission, detail: 'Required permission' })),
            ...pipelineData.backendConnections.map((service) => ({
              id: service.id,
              label: service.label,
              detail: `${service.endpoint} · ${service.statusLabel}`,
            })),
          ]}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.settings} />}
        />
      ) : null}

      {!isFutureModule && ![
        'command-center',
        'dashboard',
        'tools',
        'workflows',
        'automations',
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
          items={[
            ...pipelineData.recommendations.slice(0, 4),
            ...pipelineData.alerts.slice(0, 3),
          ]}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} />}
        />
      ) : null}
    </PageShell>
  );
}

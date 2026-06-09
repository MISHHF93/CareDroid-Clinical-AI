import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  DEFAULT_CARE_WORKSPACE_ID,
  buildCareWorkspaceModel,
  getWorkspaceSubpageById,
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

function EmergencyJourneyFlow({ journey = [] }) {
  return (
    <section className="workspace-panel emergency-journey-panel" aria-labelledby="emergency-journey-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">Patient Journey</p>
        <h2 id="emergency-journey-title">Canonical ED Flow</h2>
        <p>Every automation maps to this operating path instead of launching as an isolated tool.</p>
      </div>
      <ol className="emergency-journey-flow">
        {journey.map((stage) => (
          <li key={stage.id}>
            <strong>{stage.label}</strong>
            <span>{stage.description}</span>
          </li>
        ))}
      </ol>
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
        <p className="workspace-eyebrow">Chief Complaint Router</p>
        <h2 id="emergency-evidence-title">Complaint-Driven Workflow Guidance</h2>
        <p>Routes chief complaints to calculators, workflows, protocols, and referrals for human review.</p>
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
            placeholder="Enter chest pain, stroke symptoms, sepsis concern, or shortness of breath"
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

function EmergencyDemoModePanel({ demoTenant, onLaunchRoute }) {
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
        </div>
      </div>

      {demoSections.map(([title, items, detailForItem]) => (
        <div key={title} className="workspace-panel">
          <div className="workspace-panel__header">
            <p className="workspace-eyebrow">Demo data</p>
            <h2>{title}</h2>
            <p>Prospect-ready sample content for evaluating the Emergency Workspace without integrations.</p>
          </div>
          <div className="workspace-card-grid emergency-demo-grid">
            {items.map((item) => (
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

function EmergencyAnalyticsPanel({ analytics }) {
  const emergencyAnalytics = analytics?.emergency || {};
  const metrics = emergencyAnalytics.metrics || [];
  const roiSummary = emergencyAnalytics.roiSummary || {};
  return (
    <section className="emergency-analytics-layout" aria-label="Emergency analytics MVP">
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
  const activeSubpage = useMemo(
    () => getWorkspaceSubpageById(canonicalWorkspaceId, subpage || 'dashboard'),
    [canonicalWorkspaceId, subpage]
  );
  const activeSubpageId = activeSubpage?.id || 'dashboard';
  const pipelineData = useMemo(
    () => WorkspaceDataPipelineService.normalizeWorkspaceData(canonicalWorkspaceId),
    [canonicalWorkspaceId]
  );
  const isEmergencyWorkspace = canonicalWorkspaceId === 'emergency' && Boolean(pipelineData.emergency);

  useEffect(() => {
    if (workspaceId !== canonicalWorkspaceId) {
      navigate(`/workspace/${canonicalWorkspaceId}/${activeSubpageId}`, { replace: true });
      return;
    }
    if (subpage && !activeSubpage) {
      navigate(`/workspace/${canonicalWorkspaceId}/dashboard`, { replace: true });
      return;
    }
    if (activeWorkspaceId !== canonicalWorkspaceId) {
      void switchWorkspace(canonicalWorkspaceId);
    }
  }, [activeSubpage, activeSubpageId, activeWorkspaceId, canonicalWorkspaceId, navigate, subpage, switchWorkspace, workspaceId]);
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
          <button type="button" className="workspace-secondary-action" onClick={() => launchRoute('/dashboard')}>
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

      {isEmergencyWorkspace && activeSubpageId === 'dashboard' ? (
        <EmergencyCommandCenter
          emergency={pipelineData.emergency}
          onLaunchRoute={launchRoute}
          onAskAssistant={launchAssistantPrompt}
        />
      ) : null}

      {!isEmergencyWorkspace && activeSubpageId === 'dashboard' ? (
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

      {isEmergencyWorkspace && activeSubpageId === 'triage' ? (
        <EmergencyTriageOrchestrator
          orchestrator={pipelineData.emergency.triageOrchestrator}
          onLaunchTool={launchTool}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'patients' ? (
        <section className="emergency-os-layout">
          <EmergencyJourneyFlow journey={pipelineData.emergency.patientJourney} />
          <EmergencyAutomationList
            title="Patient operating queues"
            description="Patient-facing ED automations stay attached to journey stages and clinician review."
            automations={getWorkspaceAutomations(canonicalWorkspaceId)}
            visibility="patients"
          />
        </section>
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'referrals' ? (
        <EmergencyAutomationList
          title="Referral Queue"
          description="Referral, consult, transfer, and prior authorization work routed from ED disposition."
          automations={getWorkspaceAutomations(canonicalWorkspaceId)}
          visibility="referrals"
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
        <EmergencyAutomationList
          title="Simulation Academy"
          description="Complaint and workflow gaps map to ED simulations and debriefs."
          automations={getWorkspaceAutomations(canonicalWorkspaceId)}
          visibility="simulations"
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

      {activeSubpageId === 'tools' ? (
        <WorkspaceListPanel
          title={`${workspaceExperience.shortLabel} tools`}
          description="Workspace assets stay inside the page model rather than the sidebar."
          items={model.toolEntries}
          renderItem={(tool) => <WorkspaceToolCard key={tool.id} tool={tool} onLaunch={launchTool} />}
        />
      ) : null}

      {activeSubpageId === 'workflows' ? (
        <WorkspaceListPanel
          title="Workspace workflows"
          description="Workflow recommendations are mode-driven and can launch existing tools or assistant context."
          items={pipelineData.recommendations.filter((item) => item.type === 'workflow')}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.route} />}
        />
      ) : null}

      {activeSubpageId === 'automations' ? (
        <WorkspaceAutomationHub
          workspaceId={canonicalWorkspaceId}
          solutionPackage={pipelineData.analytics.solutionPackage}
          onRunAutomation={previewAutomation}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'demo' ? (
        <EmergencyDemoModePanel
          demoTenant={pipelineData.emergency.demoTenant}
          onLaunchRoute={launchRoute}
        />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'roi' ? (
        <EmergencyRoiEstimatorPanel estimator={pipelineData.emergency.roiEstimator} />
      ) : null}

      {isEmergencyWorkspace && activeSubpageId === 'deployment' ? (
        <EmergencyDeploymentBlueprintPanel blueprint={pipelineData.emergency.firstCustomerDeployment} />
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
        <EmergencyAnalyticsPanel analytics={pipelineData.analytics} />
      ) : null}

      {!isEmergencyWorkspace && activeSubpageId === 'analytics' ? (
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

      {activeSubpageId === 'alerts' ? (
        <WorkspaceListPanel
          title="Active alerts"
          description="Alerts combine workspace-mode risks with local/demo operational notifications."
          items={pipelineData.alerts}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.bell} />}
        />
      ) : null}

      {activeSubpageId === 'reports' ? (
        <WorkspaceListPanel
          title="Reports"
          description="Reports describe the current workspace mode and available evidence surfaces."
          items={pipelineData.mode.reports.map((report) => ({ id: report, label: report, detail: `${workspaceExperience.shortLabel} report` }))}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.formatPdf} />}
        />
      ) : null}

      {activeSubpageId === 'settings' ? (
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

      {![
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

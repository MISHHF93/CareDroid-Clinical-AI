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
  routeEmergencyChiefComplaint,
} from '../data/emergencyOperatingSystem';
import WorkspaceDataPipelineService from '../services/workspaceDataPipelineService';
import AutomationEngine from '../services/automationEngine';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon, getWorkspaceIcon } from '../navigation/iconRegistry';
import LaunchActionCard from '../components/ui/LaunchActionCard';
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
    <section className="workspace-panel">
      <div className="workspace-panel__header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="workspace-card-grid">
        {items.length ? items.map(renderItem) : <p className="workspace-empty-state">{empty}</p>}
      </div>
    </section>
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
          <p>Most ED actions start here: waiting patients, high-risk review, alerts, assessments, recommended actions, and protocol guidance.</p>
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

function EmergencyAnalyticsPanel({ analytics }) {
  const metrics = analytics?.emergency || {};
  return (
    <section className="workspace-panel" aria-labelledby="emergency-analytics-title">
      <div className="workspace-panel__header">
        <p className="workspace-eyebrow">ED Analytics</p>
        <h2 id="emergency-analytics-title">Emergency Operating Metrics</h2>
        <p>Tracks the ED SaaS operating model, not unrelated enterprise widgets.</p>
      </div>
      <div className="workspace-focus-metrics emergency-analytics-grid">
        <div>
          <span>Triage volume</span>
          <strong>{metrics.triageVolume}</strong>
          <small>Encounters</small>
        </div>
        <div>
          <span>Calculator utilization</span>
          <strong>{metrics.calculatorUtilization}</strong>
          <small>qSOFA, NEWS2, HEART, Wells, Shock Index</small>
        </div>
        <div>
          <span>Referral volume</span>
          <strong>{metrics.referralVolume}</strong>
          <small>Queue items</small>
        </div>
        <div>
          <span>Documentation drafts</span>
          <strong>{metrics.documentationDrafts}</strong>
          <small>Review required</small>
        </div>
        <div>
          <span>AI acceptance</span>
          <strong>{Math.round((metrics.aiRecommendationAcceptance || 0) * 100)}%</strong>
          <small>Accepted recommendations</small>
        </div>
        <div>
          <span>Automation execution</span>
          <strong>{metrics.automationExecution}</strong>
          <small>Registered ED modules</small>
        </div>
        <div>
          <span>Simulation completion</span>
          <strong>{metrics.simulationCompletion}</strong>
          <small>Academy completions</small>
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
        <h2 id="emergency-products-title">Emergency Department Solution</h2>
        <p>Emergency Core is the smallest sellable package; everything else is an add-on.</p>
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
          <div className="emergency-package-chip-grid" aria-label="Emergency Core MVP inclusions">
            {mvpPackage.includedCapabilities.map((capability) => (
              <span key={capability.id} className="workspace-tool-card__meta">
                {capability.label}
              </span>
            ))}
          </div>
          <div className="emergency-core-capability-list" aria-label="Why each Emergency Core capability is included">
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
    <main
      className={`workspace-home workspace-home--${cssToken(workspaceExperience.tone)} workspace-home--workspace-${cssToken(workspaceExperience.id)}`}
      data-workspace-os={workspaceExperience.id}
      style={workspaceThemeStyle(workspaceExperience)}
    >
      <section className="workspace-hero" aria-labelledby="workspace-title">
        <div className="workspace-hero__icon" aria-hidden>
          <NavIcon icon={WorkspaceIcon} size={34} />
        </div>
        <div className="workspace-hero__content">
          <p className="workspace-eyebrow">{workspaceExperience.operatingLabel}</p>
          <h1 id="workspace-title">{model.workspace.label} Workspace</h1>
          <p>{workspaceExperience.dashboardSubtitle || model.workspace.description}</p>
        </div>
        <div className="workspace-hero__actions">
          <button type="button" className="workspace-primary-action" onClick={launchAssistantContext}>
            <NavIcon icon={CHROME_ICONS.bot} size={18} aria-hidden />
            Ask Assistant
          </button>
          <button type="button" className="workspace-secondary-action" onClick={() => launchRoute('/dashboard')}>
            Command Center
          </button>
        </div>
      </section>

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
        <div className="workspace-focus-metrics">
          {(workspaceExperience.focusMetrics || []).slice(0, 2).map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.helper}</small>
            </div>
          ))}
        </div>
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
        <section className="workspace-content-grid">
          <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2>Context Panels</h2>
            <p>Dashboards, maps, and settings that belong to this workspace.</p>
          </div>
          <div className="workspace-card-grid">
            {visibleRouteEntries.map((route) => (
              <WorkspaceRouteCard key={route.id} route={route} onLaunch={launchRoute} />
            ))}
          </div>
          </div>

          <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2>Recommended Tools</h2>
            <p>Inventory-backed actions surfaced by context instead of sidebar sprawl.</p>
          </div>
          <div className="workspace-card-grid">
            {visibleToolEntries.map((tool) => (
              <WorkspaceToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
          </div>

          <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2>Notifications</h2>
            <p>Workspace-filtered operational inbox items.</p>
          </div>
          <div className="workspace-card-grid">
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
          </div>
          </div>
        </section>
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
        'alerts',
        'reports',
        'settings',
        'triage',
        'patients',
        'referrals',
        'documentation',
        'evidence',
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
    </main>
  );
}

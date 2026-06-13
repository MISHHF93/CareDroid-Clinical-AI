import React, { useEffect, useMemo, useState } from 'react';
import { useEmergencyStore } from '../../../store/emergencyStore';
import { useEmergencyStore as useShellEmergencyStore } from '../../store/emergencyStore';
import { FIRST_CUSTOMER_DEMO_MODE } from '../../data/firstCustomerDemoMode';
import {
  fetchEmergencyOsSettings,
  saveEmergencyOsSettings,
} from '../../services/emergencySettingsApi';
import { fetchEmergencyWorkflowLogs } from '../../services/emergencyOsApi';
import './EmergencySettings.css';

const SEVERITIES = ['Info', 'Warning', 'Critical'];
const WORKSPACE_OPTIONS = [
  ['emergency-whiteboard', 'Emergency Whiteboard'],
  ['smart-intake', 'Smart Intake'],
  ['ems-pipeline', 'EMS Pipeline'],
  ['capacity-command', 'Capacity Command'],
  ['analytics', 'Emergency Analytics'],
  ['settings', 'Settings'],
];

const SETTING_GROUP_LABELS = {
  identity: 'Identity and Modules',
  ai: 'AI Settings',
  integrations: 'Integration Settings',
  provincial: 'Provincial Health Settings',
  notifications: 'Notification Settings',
  reassessment: 'Reassessment Thresholds',
  capacity: 'Capacity Thresholds',
  ems: 'EMS Thresholds',
  boarding: 'Boarding Thresholds',
  alerts: 'Alert Rules',
};

function Section({ id, title, subtitle, children, action }) {
  return (
    <section id={id} className="emergency-settings__section">
      <header>
        <div>
          <span>{title}</span>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function payloadFromEnvelope(result) {
  return result?.data?.data || result?.data || result;
}

function mergeSettings(base, patch = {}) {
  return {
    ...base,
    ...patch,
    enabledModules: patch.enabledModules || base.enabledModules || [],
    aiSettings: { ...(base.aiSettings || {}), ...(patch.aiSettings || {}) },
    integrationSettings: { ...(base.integrationSettings || {}), ...(patch.integrationSettings || {}) },
    provincialHealthSettings: {
      ...(base.provincialHealthSettings || {}),
      ...(patch.provincialHealthSettings || {}),
    },
    notificationSettings: { ...(base.notificationSettings || {}), ...(patch.notificationSettings || {}) },
    reassessmentThresholds: {
      ...(base.reassessmentThresholds || {}),
      ...(patch.reassessmentThresholds || {}),
    },
    capacityThresholds: { ...(base.capacityThresholds || {}), ...(patch.capacityThresholds || {}) },
    emsThresholds: { ...(base.emsThresholds || {}), ...(patch.emsThresholds || {}) },
    boardingThresholds: { ...(base.boardingThresholds || {}), ...(patch.boardingThresholds || {}) },
    thresholds: {
      ...(base.thresholds || {}),
      ...(patch.thresholds || {}),
      reassessmentIntervals: {
        ...(base.thresholds?.reassessmentIntervals || {}),
        ...(patch.thresholds?.reassessmentIntervals || {}),
      },
    },
    alertRules: { ...(base.alertRules || {}), ...(patch.alertRules || {}) },
  };
}

function normalizePatchForStore(patch) {
  const capacityThresholds = patch.capacityThresholds || {};
  const reassessmentThresholds = patch.reassessmentThresholds || {};
  const emsThresholds = patch.emsThresholds || {};

  return {
    ...patch,
    departmentCapacityTarget:
      capacityThresholds.departmentCapacityTarget ?? patch.departmentCapacityTarget,
    thresholds: {
      ...(patch.thresholds || {}),
      ...(capacityThresholds.warningPercent !== undefined
        ? { capacityWarningPercent: Number(capacityThresholds.warningPercent) }
        : {}),
      ...(emsThresholds.offloadTargetMinutes !== undefined
        ? { emsOffloadTargetMinutes: Number(emsThresholds.offloadTargetMinutes) }
        : {}),
      ...(Object.keys(reassessmentThresholds).length
        ? {
            reassessmentIntervals: Object.fromEntries(
              ['P1', 'P2', 'P3', 'P4', 'P5']
                .filter((priority) => reassessmentThresholds[priority] !== undefined)
                .map((priority) => [priority, Number(reassessmentThresholds[priority])])
            ),
          }
        : {}),
    },
  };
}

function SettingsField({ label, value, type = 'text', onChange, options }) {
  if (type === 'checkbox') {
    return (
      <label className="emergency-settings__check">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        {label}
      </label>
    );
  }

  if (options) {
    return (
      <label>
        {label}
        <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      {label}
      <input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)}
      />
    </label>
  );
}

export default function EmergencySettings() {
  const storeSettings = useEmergencyStore((state) => state.emergencySettings);
  const rootWorkflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const saveEmergencySettings = useEmergencyStore((state) => state.saveEmergencySettings);
  const activeScenario = useEmergencyStore((state) => state.activeScenario);
  const setRootActiveScenario = useEmergencyStore((state) => state.setActiveScenario);
  const setShellActiveScenario = useShellEmergencyStore((state) => state.setActiveScenario);
  const shellWorkflowLogs = useShellEmergencyStore((state) => state.workflowLogs);

  const [draft, setDraft] = useState(() => mergeSettings(storeSettings));
  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] = useState('');
  const [auditStatus, setAuditStatus] = useState('loading');
  const [auditError, setAuditError] = useState('');
  const [backendWorkflowLogs, setBackendWorkflowLogs] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchEmergencyOsSettings()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setError(result.message || 'Backend settings unavailable. Local settings remain editable.');
          setDraft(mergeSettings(storeSettings));
          return;
        }
        const nextSettings = mergeSettings(storeSettings, payloadFromEnvelope(result));
        setDraft(nextSettings);
        saveEmergencySettings(normalizePatchForStore(nextSettings));
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError?.message || 'Backend settings unavailable. Local settings remain editable.');
          setDraft(mergeSettings(storeSettings));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [saveEmergencySettings]);

  useEffect(() => {
    let cancelled = false;
    setAuditStatus('loading');
    setAuditError('');

    fetchEmergencyWorkflowLogs()
      .then((result) => {
        if (cancelled) return;
        const logs = result?.data?.logs || result?.data?.workflowLogs || [];
        setBackendWorkflowLogs(Array.isArray(logs) ? logs : []);
        setAuditStatus('ready');
      })
      .catch((loadError) => {
        if (cancelled) return;
        setAuditError(loadError?.message || 'Workflow audit logs unavailable.');
        setAuditStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const enabledCount = useMemo(
    () => draft.enabledModules.filter((module) => module.enabled).length,
    [draft.enabledModules]
  );
  const auditLogs = useMemo(() => {
    const byId = new Map();
    [
      ...(Array.isArray(backendWorkflowLogs) ? backendWorkflowLogs : []),
      ...(Array.isArray(rootWorkflowLogs) ? rootWorkflowLogs : []),
      ...(Array.isArray(shellWorkflowLogs) ? shellWorkflowLogs : []),
    ].forEach((log) => {
      if (log?.id) byId.set(log.id, log);
    });
    return [...byId.values()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [backendWorkflowLogs, rootWorkflowLogs, shellWorkflowLogs]);

  const updateDraft = (patch) => {
    setDraft((current) => mergeSettings(current, patch));
  };

  const updateNested = (section, key, value) => {
    setDraft((current) =>
      mergeSettings(current, {
        [section]: {
          ...(current[section] || {}),
          [key]: value,
        },
      })
    );
  };

  const updateModule = (moduleId, enabled) => {
    setDraft((current) =>
      mergeSettings(current, {
        enabledModules: current.enabledModules.map((module) =>
          module.id === moduleId ? { ...module, enabled } : module
        ),
      })
    );
  };

  const updateAlertRule = (rule, patch) => {
    setDraft((current) =>
      mergeSettings(current, {
        alertRules: {
          ...current.alertRules,
          [rule]: { ...current.alertRules[rule], ...patch },
        },
      })
    );
  };

  const saveGroup = async (group, patch) => {
    const storePatch = normalizePatchForStore(patch);
    setSavingGroup(group);
    setStatus('');
    setError('');

    const result = await saveEmergencyOsSettings(patch);
    if (result.ok) {
      const nextSettings = mergeSettings(draft, payloadFromEnvelope(result));
      setDraft(nextSettings);
      saveEmergencySettings(normalizePatchForStore(nextSettings));
      setStatus(`${SETTING_GROUP_LABELS[group]} saved.`);
    } else {
      saveEmergencySettings(storePatch);
      setDraft((current) => mergeSettings(current, patch));
      setError(`${SETTING_GROUP_LABELS[group]} saved locally only: ${result.message}`);
    }

    setSavingGroup('');
  };

  const isEmpty = !loading && !draft.enabledModules.length;
  const isFirstCustomerDemoActive = activeScenario?.id === FIRST_CUSTOMER_DEMO_MODE.id;

  const loadFirstCustomerDemo = () => {
    setShellActiveScenario(FIRST_CUSTOMER_DEMO_MODE.id);
    setRootActiveScenario(FIRST_CUSTOMER_DEMO_MODE.id);
    setStatus('First Customer Demo Mode loaded locally for the live walkthrough.');
    setError('');
  };

  const resetDemoScenario = () => {
    setShellActiveScenario('normal-day');
    setRootActiveScenario('normal-day');
    setStatus('Demo scenario reset to Normal day.');
    setError('');
  };

  return (
    <section className="emergency-settings" aria-label="Emergency OS settings">
      <header className="emergency-settings__hero">
        <div>
          <span>Emergency OS Admin</span>
          <h1>Emergency OS Settings</h1>
          <p>
            Tenant identity, modules, AI, integrations, provincial health, notifications,
            and operational thresholds.
          </p>
        </div>
        <strong>{loading ? 'Loading settings...' : `${enabledCount} modules enabled`}</strong>
      </header>

      {status ? <div className="emergency-settings__banner">{status}</div> : null}
      {error ? <div className="emergency-settings__banner emergency-settings__banner--error">{error}</div> : null}
      {isEmpty ? <div className="emergency-settings__empty">No settings were returned. Local defaults are ready to edit.</div> : null}

      <Section
        id="first-customer-demo"
        title="First Customer Demo Mode"
        subtitle="Loads a deterministic 100-patient/day ED scenario for sales walkthroughs without backend dependencies."
        action={
          <button type="button" onClick={loadFirstCustomerDemo}>
            {isFirstCustomerDemoActive ? 'Reload Demo' : 'Load Demo'}
          </button>
        }
      >
        <div className="emergency-settings__demo-card">
          <div>
            <strong>{isFirstCustomerDemoActive ? 'Demo mode active' : 'Demo mode inactive'}</strong>
            <p>
              {FIRST_CUSTOMER_DEMO_MODE.tenantName} populates the whiteboard, EMS inbound,
              waiting and high-risk queues, reassessments, capacity pressure, boarders,
              analytics KPIs, and ED Copilot context.
            </p>
          </div>
          <div className="emergency-settings__demo-metrics" aria-label="First Customer Demo Mode metrics">
            <span>100 patients/day</span>
            <span>42 active census</span>
            <span>Local fixture</span>
          </div>
          <button type="button" onClick={resetDemoScenario} disabled={!isFirstCustomerDemoActive}>
            Reset to Normal Day
          </button>
        </div>
      </Section>

      <Section
        id="workflow-audit"
        title="Workflow Action Audit"
        subtitle="Normalized action logs across patient flow, EMS, reassessment, referrals, capacity, Copilot, provincial data, and integrations."
      >
        <div className="emergency-settings__audit-summary" aria-label="Workflow audit summary">
          <strong>{auditLogs.length}</strong>
          <span>workflow action logs</span>
          <small>
            {auditStatus === 'ready'
              ? 'Backend audit loaded'
              : auditStatus === 'loading'
                ? 'Loading backend audit...'
                : 'Local fallback active'}
          </small>
        </div>
        {auditStatus === 'loading' ? (
          <p className="emergency-settings__audit-state" role="status">Loading workflow audit logs...</p>
        ) : null}
        {auditStatus === 'error' ? (
          <p className="emergency-settings__audit-state emergency-settings__audit-state--error" role="alert">
            {auditError}. Showing local workflow logs.
          </p>
        ) : null}
        {!auditLogs.length && auditStatus !== 'loading' ? (
          <p className="emergency-settings__audit-state">No workflow action logs recorded yet.</p>
        ) : null}
        {auditLogs.length ? (
          <div className="emergency-settings__audit-list" aria-label="Workflow action audit logs">
            {auditLogs.slice(0, 12).map((log) => (
              <article key={log.id}>
                <div>
                  <strong>{log.title || log.type}</strong>
                  <p>{log.summary}</p>
                  <small>{log.source} · {log.patientId || 'department'}</small>
                </div>
                <div>
                  <span>{log.severity || 'Info'}</span>
                  <time dateTime={log.timestamp}>{new Date(log.timestamp).toLocaleString()}</time>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Section>

      <Section
        id="identity"
        title="Identity and Modules"
        subtitle="Tenant name, default workspace, and enabled Emergency OS modules."
        action={
          <button
            type="button"
            disabled={savingGroup === 'identity'}
            onClick={() =>
              saveGroup('identity', {
                tenantName: draft.tenantName,
                defaultWorkspace: draft.defaultWorkspace,
                enabledModules: draft.enabledModules,
              })
            }
          >
            Save Identity
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField label="Tenant name" value={draft.tenantName} onChange={(value) => updateDraft({ tenantName: value })} />
          <SettingsField
            label="Default workspace"
            value={draft.defaultWorkspace}
            options={WORKSPACE_OPTIONS}
            onChange={(value) => updateDraft({ defaultWorkspace: value })}
          />
        </div>
        <div className="emergency-settings__rules">
          {draft.enabledModules.map((module) => (
            <article key={module.id}>
              <SettingsField
                type="checkbox"
                label={module.label}
                value={module.enabled}
                onChange={(enabled) => updateModule(module.id, enabled)}
              />
              <small>{module.id}</small>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="ai"
        title="AI Settings"
        subtitle="Clinical AI availability, model routing, and human-review controls."
        action={
          <button type="button" disabled={savingGroup === 'ai'} onClick={() => saveGroup('ai', { aiSettings: draft.aiSettings })}>
            Save AI
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField type="checkbox" label="AI enabled" value={draft.aiSettings.enabled} onChange={(value) => updateNested('aiSettings', 'enabled', value)} />
          <SettingsField label="Provider" value={draft.aiSettings.provider} onChange={(value) => updateNested('aiSettings', 'provider', value)} />
          <SettingsField label="Model" value={draft.aiSettings.model} onChange={(value) => updateNested('aiSettings', 'model', value)} />
          <SettingsField type="checkbox" label="Triage assist" value={draft.aiSettings.triageAssistEnabled} onChange={(value) => updateNested('aiSettings', 'triageAssistEnabled', value)} />
          <SettingsField type="checkbox" label="Summarization" value={draft.aiSettings.summarizationEnabled} onChange={(value) => updateNested('aiSettings', 'summarizationEnabled', value)} />
          <SettingsField type="checkbox" label="Human review required" value={draft.aiSettings.humanReviewRequired} onChange={(value) => updateNested('aiSettings', 'humanReviewRequired', value)} />
        </div>
      </Section>

      <Section
        id="integrations"
        title="Integration Settings"
        subtitle="EHR, FHIR, HL7, and device telemetry configuration."
        action={
          <button
            type="button"
            disabled={savingGroup === 'integrations'}
            onClick={() => saveGroup('integrations', { integrationSettings: draft.integrationSettings })}
          >
            Save Integrations
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField type="checkbox" label="EHR enabled" value={draft.integrationSettings.ehrEnabled} onChange={(value) => updateNested('integrationSettings', 'ehrEnabled', value)} />
          <SettingsField label="FHIR endpoint" value={draft.integrationSettings.fhirEndpoint} onChange={(value) => updateNested('integrationSettings', 'fhirEndpoint', value)} />
          <SettingsField label="HL7 interface ID" value={draft.integrationSettings.hl7InterfaceId} onChange={(value) => updateNested('integrationSettings', 'hl7InterfaceId', value)} />
          <SettingsField type="checkbox" label="Device telemetry" value={draft.integrationSettings.deviceTelemetryEnabled} onChange={(value) => updateNested('integrationSettings', 'deviceTelemetryEnabled', value)} />
        </div>
      </Section>

      <Section
        id="provincial-health"
        title="Provincial Health Settings"
        subtitle="Provincial connector jurisdiction, lookup mode, and health-card validation."
        action={
          <button
            type="button"
            disabled={savingGroup === 'provincial'}
            onClick={() => saveGroup('provincial', { provincialHealthSettings: draft.provincialHealthSettings })}
          >
            Save Provincial Health
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField type="checkbox" label="Connector enabled" value={draft.provincialHealthSettings.connectorEnabled} onChange={(value) => updateNested('provincialHealthSettings', 'connectorEnabled', value)} />
          <SettingsField label="Jurisdiction" value={draft.provincialHealthSettings.jurisdiction} onChange={(value) => updateNested('provincialHealthSettings', 'jurisdiction', value)} />
          <SettingsField
            label="Lookup mode"
            value={draft.provincialHealthSettings.lookupMode}
            options={[
              ['manual-review', 'Manual review'],
              ['verify-only', 'Verify only'],
              ['auto-lookup', 'Auto lookup'],
            ]}
            onChange={(value) => updateNested('provincialHealthSettings', 'lookupMode', value)}
          />
          <SettingsField type="checkbox" label="Health-card validation" value={draft.provincialHealthSettings.healthCardValidation} onChange={(value) => updateNested('provincialHealthSettings', 'healthCardValidation', value)} />
        </div>
      </Section>

      <Section
        id="notifications"
        title="Notification Settings"
        subtitle="Channels, escalation delay, and quiet-hour windows."
        action={
          <button
            type="button"
            disabled={savingGroup === 'notifications'}
            onClick={() => saveGroup('notifications', { notificationSettings: draft.notificationSettings })}
          >
            Save Notifications
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField type="checkbox" label="In-app notifications" value={draft.notificationSettings.inAppEnabled} onChange={(value) => updateNested('notificationSettings', 'inAppEnabled', value)} />
          <SettingsField type="checkbox" label="Email notifications" value={draft.notificationSettings.emailEnabled} onChange={(value) => updateNested('notificationSettings', 'emailEnabled', value)} />
          <SettingsField type="checkbox" label="SMS notifications" value={draft.notificationSettings.smsEnabled} onChange={(value) => updateNested('notificationSettings', 'smsEnabled', value)} />
          <SettingsField type="number" label="Escalation minutes" value={draft.notificationSettings.escalationMinutes} onChange={(value) => updateNested('notificationSettings', 'escalationMinutes', value)} />
          <SettingsField type="time" label="Quiet hours start" value={draft.notificationSettings.quietHoursStart} onChange={(value) => updateNested('notificationSettings', 'quietHoursStart', value)} />
          <SettingsField type="time" label="Quiet hours end" value={draft.notificationSettings.quietHoursEnd} onChange={(value) => updateNested('notificationSettings', 'quietHoursEnd', value)} />
        </div>
      </Section>

      <Section
        id="reassessment"
        title="Reassessment Thresholds"
        subtitle="Priority-based reassessment cadence plus overdue grace time."
        action={
          <button
            type="button"
            disabled={savingGroup === 'reassessment'}
            onClick={() => saveGroup('reassessment', { reassessmentThresholds: draft.reassessmentThresholds })}
          >
            Save Reassessment
          </button>
        }
      >
        <div className="emergency-settings__grid">
          {['P1', 'P2', 'P3', 'P4', 'P5'].map((priority) => (
            <SettingsField
              key={priority}
              type="number"
              label={`${priority} interval minutes`}
              value={draft.reassessmentThresholds[priority]}
              onChange={(value) => updateNested('reassessmentThresholds', priority, value)}
            />
          ))}
          <SettingsField type="number" label="Overdue grace minutes" value={draft.reassessmentThresholds.overdueGraceMinutes} onChange={(value) => updateNested('reassessmentThresholds', 'overdueGraceMinutes', value)} />
        </div>
      </Section>

      <Section
        id="capacity"
        title="Capacity Thresholds"
        subtitle="Department target, occupancy bands, and queue wait limits used by local capacity calculations."
        action={
          <button
            type="button"
            disabled={savingGroup === 'capacity'}
            onClick={() =>
              saveGroup('capacity', {
                capacityThresholds: draft.capacityThresholds,
                thresholds: {
                  waitWarningMinutes: draft.thresholds.waitWarningMinutes,
                  waitCriticalMinutes: draft.thresholds.waitCriticalMinutes,
                },
              })
            }
          >
            Save Capacity
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField type="number" label="Department capacity target" value={draft.capacityThresholds.departmentCapacityTarget} onChange={(value) => updateNested('capacityThresholds', 'departmentCapacityTarget', value)} />
          <SettingsField type="number" label="Capacity warning %" value={draft.capacityThresholds.warningPercent} onChange={(value) => updateNested('capacityThresholds', 'warningPercent', value)} />
          <SettingsField type="number" label="Capacity critical %" value={draft.capacityThresholds.criticalPercent} onChange={(value) => updateNested('capacityThresholds', 'criticalPercent', value)} />
          <SettingsField type="number" label="Max waiting patients" value={draft.capacityThresholds.maxWaitingPatients} onChange={(value) => updateNested('capacityThresholds', 'maxWaitingPatients', value)} />
          <SettingsField type="number" label="Wait warning minutes" value={draft.thresholds.waitWarningMinutes} onChange={(value) => updateDraft({ thresholds: { ...draft.thresholds, waitWarningMinutes: value } })} />
          <SettingsField type="number" label="Wait critical minutes" value={draft.thresholds.waitCriticalMinutes} onChange={(value) => updateDraft({ thresholds: { ...draft.thresholds, waitCriticalMinutes: value } })} />
        </div>
      </Section>

      <Section
        id="ems"
        title="EMS Thresholds"
        subtitle="Offload targets and inbound critical ETA controls."
        action={
          <button type="button" disabled={savingGroup === 'ems'} onClick={() => saveGroup('ems', { emsThresholds: draft.emsThresholds })}>
            Save EMS
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField type="number" label="Offload target minutes" value={draft.emsThresholds.offloadTargetMinutes} onChange={(value) => updateNested('emsThresholds', 'offloadTargetMinutes', value)} />
          <SettingsField type="number" label="Critical ETA minutes" value={draft.emsThresholds.criticalEtaMinutes} onChange={(value) => updateNested('emsThresholds', 'criticalEtaMinutes', value)} />
          <SettingsField type="checkbox" label="Auto-create arrival" value={draft.emsThresholds.autoCreateArrival} onChange={(value) => updateNested('emsThresholds', 'autoCreateArrival', value)} />
        </div>
      </Section>

      <Section
        id="boarding"
        title="Boarding Thresholds"
        subtitle="Admission boarding escalation, critical boarding, and inpatient notification triggers."
        action={
          <button type="button" disabled={savingGroup === 'boarding'} onClick={() => saveGroup('boarding', { boardingThresholds: draft.boardingThresholds })}>
            Save Boarding
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField type="number" label="Escalation minutes" value={draft.boardingThresholds.escalationMinutes} onChange={(value) => updateNested('boardingThresholds', 'escalationMinutes', value)} />
          <SettingsField type="number" label="Critical minutes" value={draft.boardingThresholds.criticalMinutes} onChange={(value) => updateNested('boardingThresholds', 'criticalMinutes', value)} />
          <SettingsField type="number" label="Max boarders" value={draft.boardingThresholds.maxBoarders} onChange={(value) => updateNested('boardingThresholds', 'maxBoarders', value)} />
          <SettingsField type="number" label="Inpatient notify minutes" value={draft.boardingThresholds.inpatientNotifyMinutes} onChange={(value) => updateNested('boardingThresholds', 'inpatientNotifyMinutes', value)} />
        </div>
      </Section>

      <Section
        id="alerts"
        title="Alert Rules"
        subtitle="Notification alert enablement and severity overrides."
        action={
          <button type="button" disabled={savingGroup === 'alerts'} onClick={() => saveGroup('alerts', { alertRules: draft.alertRules })}>
            Save Alerts
          </button>
        }
      >
        <div className="emergency-settings__rules">
          {Object.entries(draft.alertRules).map(([rule, config]) => (
            <article key={rule}>
              <SettingsField type="checkbox" label={rule} value={config.enabled} onChange={(enabled) => updateAlertRule(rule, { enabled })} />
              <select value={config.severity} onChange={(event) => updateAlertRule(rule, { severity: event.target.value })}>
                {SEVERITIES.map((severity) => (
                  <option key={severity}>{severity}</option>
                ))}
              </select>
            </article>
          ))}
        </div>
      </Section>
    </section>
  );
}

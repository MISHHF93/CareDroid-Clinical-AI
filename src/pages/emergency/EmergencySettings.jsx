import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_EMERGENCY_THRESHOLDS,
  useEmergencyStore,
  useEmergencyStore as useShellEmergencyStore,
} from '../../store/emergencyStore';
import { FIRST_CUSTOMER_DEMO_MODE } from '../../data/firstCustomerDemoMode';
import {
  DEFAULT_CENTRAL_CONTROL_SETTINGS,
  EMERGENCY_CTAS_PRIORITIES as CTAS_PRIORITIES,
  EMERGENCY_SETTINGS_GROUP_LABELS as SETTING_GROUP_LABELS,
  EMERGENCY_WORKSPACE_OPTIONS as WORKSPACE_OPTIONS,
  buildEmergencySettingsPatchFromThresholds,
} from '../../config/emergencySettings.config';
import {
  fetchEmergencyOsSettings,
  saveEmergencyOsSettings,
} from '../../services/emergencySettingsApi';
import { fetchEmergencyWorkflowLogs } from '../../services/emergencyOsApi';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import './EmergencySettings.css';

const SEVERITIES = ['Info', 'Warning', 'Critical'];

function csvCell(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function auditLogToCsv(logs) {
  const rows = [
    ['Time', 'Action', 'Patient', 'Staff', 'Details'],
    ...logs.map((log) => [
      log.timestamp,
      log.action,
      log.patientId || '',
      log.staffId || 'system',
      log.details || {},
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

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

function mergeSettings(base = {}, patch = {}) {
  return {
    ...base,
    ...patch,
    enabledModules: patch.enabledModules || base.enabledModules || [],
    aiSettings: { ...(base.aiSettings || {}), ...(patch.aiSettings || {}) },
    integrationSettings: {
      ...(base.integrationSettings || {}),
      ...(patch.integrationSettings || {}),
    },
    provincialHealthSettings: {
      ...(base.provincialHealthSettings || {}),
      ...(patch.provincialHealthSettings || {}),
    },
    notificationSettings: {
      ...(base.notificationSettings || {}),
      ...(patch.notificationSettings || {}),
    },
    reassessmentThresholds: {
      ...(base.reassessmentThresholds || {}),
      ...(patch.reassessmentThresholds || {}),
    },
    capacityThresholds: { ...(base.capacityThresholds || {}), ...(patch.capacityThresholds || {}) },
    emsThresholds: { ...(base.emsThresholds || {}), ...(patch.emsThresholds || {}) },
    boardingThresholds: { ...(base.boardingThresholds || {}), ...(patch.boardingThresholds || {}) },
    ctasThresholds: {
      ...(base.ctasThresholds || base.thresholds?.ctasTargets || {}),
      ...(patch.ctasThresholds || patch.thresholds?.ctasTargets || {}),
    },
    thresholds: {
      ...(base.thresholds || {}),
      ...(patch.thresholds || {}),
      reassessmentIntervals: {
        ...(base.thresholds?.reassessmentIntervals || {}),
        ...(patch.thresholds?.reassessmentIntervals || {}),
      },
      ctasTargets: {
        ...(base.thresholds?.ctasTargets || base.ctasThresholds || {}),
        ...(patch.thresholds?.ctasTargets || patch.ctasThresholds || {}),
      },
    },
    alertRules: { ...(base.alertRules || {}), ...(patch.alertRules || {}) },
    centralControl: {
      ...DEFAULT_CENTRAL_CONTROL_SETTINGS,
      ...(base.centralControl || {}),
      ...(patch.centralControl || {}),
    },
  };
}

function normalizePatchForStore(patch) {
  const capacityThresholds = patch.capacityThresholds || {};
  const reassessmentThresholds = patch.reassessmentThresholds || {};
  const emsThresholds = patch.emsThresholds || {};
  const ctasThresholds = patch.ctasThresholds || patch.thresholds?.ctasTargets || {};

  return {
    ...patch,
    departmentCapacityTarget:
      capacityThresholds.departmentCapacityTarget ?? patch.departmentCapacityTarget,
    thresholds: {
      ...(patch.thresholds || {}),
      ...(capacityThresholds.warningPercent !== undefined
        ? { capacityOrangePercent: Number(capacityThresholds.warningPercent) }
        : {}),
      ...(capacityThresholds.criticalPercent !== undefined
        ? { capacityRedPercent: Number(capacityThresholds.criticalPercent) }
        : {}),
      ...(emsThresholds.offloadTargetMinutes !== undefined
        ? { emsOffloadTargetMinutes: Number(emsThresholds.offloadTargetMinutes) }
        : {}),
      ...(Object.keys(ctasThresholds).length
        ? {
            ctasTargets: Object.fromEntries(
              CTAS_PRIORITIES.filter((priority) => ctasThresholds[priority] !== undefined).map(
                (priority) => [priority, Number(ctasThresholds[priority])],
              ),
            ),
          }
        : {}),
      ...(Object.keys(reassessmentThresholds).length
        ? {
            reassessmentIntervals: Object.fromEntries(
              CTAS_PRIORITIES.filter(
                (priority) => reassessmentThresholds[priority] !== undefined,
              ).map((priority) => [priority, Number(reassessmentThresholds[priority])]),
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
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
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
        onChange={(event) =>
          onChange(type === 'number' ? Number(event.target.value) : event.target.value)
        }
      />
    </label>
  );
}

function governedRuleLabel(ruleGroup) {
  return {
    'scenario-selection': 'department operating mode',
    'patient-intake': 'patient intake',
    'capacity-thresholds': 'capacity thresholds',
    'reassessment-rules': 'reassessment rules',
    'ems-routing': 'EMS routing',
    'referral-routing': 'referral routing',
  }[ruleGroup] || ruleGroup.replace(/-/g, ' ');
}

function patientAuditLabel(patientId, patients) {
  if (!patientId) return 'Department';
  const patientList = Array.isArray(patients) ? patients : [];
  const patient = patientList.find((candidate) => candidate.id === patientId);
  if (!patient) return 'Patient record';
  return `${patient.firstName} ${patient.lastName} (${patient.mrn})`;
}

function auditDetailSummary(details = {}) {
  const entries = Object.entries(details).filter(
    ([key]) => !/patientId|staffId|id/i.test(key),
  );
  if (!entries.length) return 'Action metadata recorded';
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1')}: ${String(value)}`)
    .join(' | ');
}

export default function EmergencySettings() {
  const storeSettings = useEmergencyStore((state) => state.emergencySettings);
  const patients = useEmergencyStore((state) => state.patients);
  const rootWorkflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const saveEmergencySettings = useEmergencyStore((state) => state.saveEmergencySettings);
  const activeScenario = useEmergencyStore((state) => state.activeScenario);
  const setRootActiveScenario = useEmergencyStore((state) => state.setActiveScenario);
  const rootAuditLog = useEmergencyStore((state) => state.auditLog || []);
  const setShellActiveScenario = useShellEmergencyStore((state) => state.setActiveScenario);
  const shellWorkflowLogs = useShellEmergencyStore((state) => state.workflowLogs);
  const shellAuditLog = useShellEmergencyStore((state) => state.auditLog || []);
  const thresholds = useShellEmergencyStore(
    (state) => state.thresholds || DEFAULT_EMERGENCY_THRESHOLDS,
  );
  const setThreshold = useShellEmergencyStore((state) => state.setThreshold);
  const resetThresholds = useShellEmergencyStore((state) => state.resetThresholds);

  const [draft, setDraft] = useState(() => mergeSettings(storeSettings));
  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] = useState('');
  const [auditStatus, setAuditStatus] = useState('loading');
  const [auditError, setAuditError] = useState('');
  const [auditFilters, setAuditFilters] = useState({
    action: 'all',
    staff: 'all',
    from: '',
    to: '',
  });
  const [backendWorkflowLogs, setBackendWorkflowLogs] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const thresholdTimersRef = useRef({});
  const savedFlashTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchEmergencyOsSettings()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setError(
            'Live settings service unavailable. Local settings remain editable.',
          );
          setDraft(mergeSettings(storeSettings));
          return;
        }
        const nextSettings = mergeSettings(storeSettings, payloadFromEnvelope(result));
        setDraft(nextSettings);
        saveEmergencySettings?.(normalizePatchForStore(nextSettings));
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'Live settings service unavailable. Local settings remain editable.',
          );
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

  useEffect(
    () => () => {
      Object.values(thresholdTimersRef.current).forEach((timer) => clearTimeout(timer));
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    },
    [],
  );

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
      .catch(() => {
        if (cancelled) return;
        setAuditError('Workflow audit logs are temporarily unavailable.');
        setAuditStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const enabledCount = useMemo(
    () => draft.enabledModules.filter((module) => module.enabled).length,
    [draft.enabledModules],
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
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [backendWorkflowLogs, rootWorkflowLogs, shellWorkflowLogs]);
  const storeAuditLogs = useMemo(() => {
    const byId = new Map();
    [
      ...(Array.isArray(rootAuditLog) ? rootAuditLog : []),
      ...(Array.isArray(shellAuditLog) ? shellAuditLog : []),
    ].forEach((log) => {
      if (log?.id) byId.set(log.id, log);
    });
    return [...byId.values()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [rootAuditLog, shellAuditLog]);
  const auditActionOptions = useMemo(
    () => [...new Set(storeAuditLogs.map((log) => log.action).filter(Boolean))].sort(),
    [storeAuditLogs],
  );
  const auditStaffOptions = useMemo(
    () => [...new Set(storeAuditLogs.map((log) => log.staffId || 'system').filter(Boolean))].sort(),
    [storeAuditLogs],
  );
  const filteredAuditLogs = useMemo(() => {
    const from = auditFilters.from
      ? new Date(auditFilters.from).getTime()
      : Number.NEGATIVE_INFINITY;
    const to = auditFilters.to ? new Date(auditFilters.to).getTime() : Number.POSITIVE_INFINITY;
    return storeAuditLogs
      .filter((log) => auditFilters.action === 'all' || log.action === auditFilters.action)
      .filter(
        (log) => auditFilters.staff === 'all' || (log.staffId || 'system') === auditFilters.staff,
      )
      .filter((log) => {
        const timestamp = new Date(log.timestamp).getTime();
        return timestamp >= from && timestamp <= to;
      })
      .slice(0, 50);
  }, [auditFilters, storeAuditLogs]);

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
      }),
    );
  };

  const updateModule = (moduleId, enabled) => {
    setDraft((current) =>
      mergeSettings(current, {
        enabledModules: current.enabledModules.map((module) =>
          module.id === moduleId ? { ...module, enabled } : module,
        ),
      }),
    );
  };

  const updateAlertRule = (rule, patch) => {
    setDraft((current) =>
      mergeSettings(current, {
        alertRules: {
          ...current.alertRules,
          [rule]: { ...current.alertRules[rule], ...patch },
        },
      }),
    );
  };

  const updateAuditFilter = (key, value) => {
    setAuditFilters((current) => ({ ...current, [key]: value }));
  };

  const flashSaved = () => {
    setStatus('Saved');
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    savedFlashTimerRef.current = setTimeout(() => setStatus(''), 1200);
  };

  const updateThreshold = (key, value, patch = {}) => {
    updateDraft(patch);
    if (thresholdTimersRef.current[key]) clearTimeout(thresholdTimersRef.current[key]);
    thresholdTimersRef.current[key] = setTimeout(() => {
      setThreshold(key, Number(value));
      flashSaved();
    }, 500);
  };

  const resetAllThresholds = () => {
    Object.values(thresholdTimersRef.current).forEach((timer) => clearTimeout(timer));
    thresholdTimersRef.current = {};
    resetThresholds();
    setDraft((current) =>
      mergeSettings(
        current,
        buildEmergencySettingsPatchFromThresholds(DEFAULT_EMERGENCY_THRESHOLDS),
      ),
    );
    flashSaved();
  };

  const exportAuditCsv = () => {
    const csv = auditLogToCsv(filteredAuditLogs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emergency-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      saveEmergencySettings?.(normalizePatchForStore(nextSettings));
      setStatus(`${SETTING_GROUP_LABELS[group]} saved.`);
    } else {
      saveEmergencySettings?.(storePatch);
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
    setStatus('Department walkthrough dataset loaded for the live customer walkthrough.');
    setError('');
  };

  const resetDemoScenario = () => {
    setShellActiveScenario('normal-day');
    setRootActiveScenario('normal-day');
    setStatus('Department walkthrough dataset reset to normal operations.');
    setError('');
  };

  return (
    <section className="emergency-settings" aria-label="Emergency OS settings">
      <header className="emergency-settings__hero">
        <div>
          <span>{EMERGENCY_OS_BRANDING.platformLine} Admin</span>
          <h1>Emergency OS Settings</h1>
          <p>
            Tenant identity, modules, {EMERGENCY_OS_BRANDING.aiiosName} controls, integrations,
            provincial health, notifications, and operational thresholds.{' '}
            {EMERGENCY_OS_BRANDING.safetyLine}
          </p>
        </div>
        <strong>
          {loading ? 'Loading department data...' : `${enabledCount} modules enabled`}
        </strong>
      </header>

      {status ? <div className="emergency-settings__banner">{status}</div> : null}
      {error ? (
        <div className="emergency-settings__banner emergency-settings__banner--error">{error}</div>
      ) : null}
      {isEmpty ? (
        <div className="emergency-settings__empty">
          No settings were returned. Local defaults are ready to edit.
        </div>
      ) : null}

      <Section
        id="first-customer-demo"
        title="Department Walkthrough Dataset"
        subtitle="Loads a stable high-volume department picture for customer walkthroughs without changing the pilot dashboard surface."
        action={
          <button type="button" onClick={loadFirstCustomerDemo}>
            {isFirstCustomerDemoActive ? 'Reload Dataset' : 'Load Dataset'}
          </button>
        }
      >
        <div className="emergency-settings__demo-card">
          <div>
            <strong>
              {isFirstCustomerDemoActive ? 'Walkthrough data active' : 'Walkthrough data inactive'}
            </strong>
            <p>
              {FIRST_CUSTOMER_DEMO_MODE.tenantName} populates the whiteboard, EMS inbound, waiting
              and high-risk queues, reassessments, capacity pressure, boarders, analytics KPIs, and
              ED Copilot context.
            </p>
          </div>
          <div
            className="emergency-settings__demo-metrics"
            aria-label="Department walkthrough dataset metrics"
          >
            <span>100 patients/day</span>
            <span>42 active census</span>
            <span>Walkthrough dataset</span>
          </div>
          <button type="button" onClick={resetDemoScenario} disabled={!isFirstCustomerDemoActive}>
            Reset Dataset
          </button>
        </div>
      </Section>

      <Section
        id="central-control"
        title="Central Control Node"
        subtitle="Central policy owns dashboard decisions and scenario selection. Staff roles contribute unified inputs only unless they are central controllers."
        action={
          <button
            type="button"
            disabled={savingGroup === 'central'}
            onClick={() =>
              saveGroup('central', {
                centralControl: draft.centralControl,
                defaultScreenMode: draft.defaultScreenMode,
                enabledScreenModes: draft.enabledScreenModes,
                readOnlyDisplayMode: draft.readOnlyDisplayMode,
                commandCenterMode: draft.commandCenterMode,
                wallDisplayRefreshInterval: draft.wallDisplayRefreshInterval,
              })
            }
          >
            Save Central Node
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="checkbox"
            label="Central control enabled"
            value={draft.centralControl.enabled}
            onChange={(value) =>
              updateDraft({ centralControl: { ...draft.centralControl, enabled: value } })
            }
          />
          <SettingsField
            label="Dashboard authority"
            value={draft.centralControl.dashboardAuthority}
            options={[
              ['central-node', 'Central Node'],
              ['local-role', 'Local role override'],
            ]}
            onChange={(value) =>
              updateDraft({
                centralControl: { ...draft.centralControl, dashboardAuthority: value },
              })
            }
          />
          <SettingsField
            label="Scenario authority"
            value={draft.centralControl.scenarioAuthority}
            options={[
              ['central-node', 'Central Node'],
              ['local-role', 'Local role override'],
            ]}
            onChange={(value) =>
              updateDraft({ centralControl: { ...draft.centralControl, scenarioAuthority: value } })
            }
          />
          <SettingsField
            label="User input mode"
            value={draft.centralControl.userInputMode}
            options={[
              ['central-escalation-input', 'Central escalation input'],
              ['unified-input-only', 'Unified input only'],
              ['controller-assisted', 'Controller assisted'],
            ]}
            onChange={(value) =>
              updateDraft({ centralControl: { ...draft.centralControl, userInputMode: value } })
            }
          />
          <SettingsField
            type="number"
            label="Dashboard decision interval (seconds)"
            value={draft.centralControl.dashboardDecisionIntervalSeconds}
            onChange={(value) =>
              updateDraft({
                centralControl: {
                  ...draft.centralControl,
                  dashboardDecisionIntervalSeconds: Number(value),
                },
              })
            }
          />
          <SettingsField
            type="number"
            label="Rules review interval (minutes)"
            value={draft.centralControl.rulesReviewIntervalMinutes}
            onChange={(value) =>
              updateDraft({
                centralControl: {
                  ...draft.centralControl,
                  rulesReviewIntervalMinutes: Number(value),
                },
              })
            }
          />
          <SettingsField
            label="Default screen mode"
            value={draft.defaultScreenMode}
            options={[
              ['TRIAGE_SCREEN', 'Triage screen'],
              ['REGISTRATION_SCREEN', 'Registration screen'],
              ['CHARGE_NURSE_SCREEN', 'Charge nurse screen'],
              ['PHYSICIAN_SCREEN', 'Physician screen'],
              ['EMS_SCREEN', 'EMS screen'],
              ['WAITING_ROOM_DISPLAY', 'Waiting room display'],
              ['COMMAND_CENTER_DISPLAY', 'Command center display'],
              ['ADMIN_SCREEN', 'Admin screen'],
              ['READ_ONLY_DISPLAY', 'Read-only display'],
            ]}
            onChange={(value) => updateDraft({ defaultScreenMode: value })}
          />
          <SettingsField
            type="checkbox"
            label="Command center mode"
            value={draft.commandCenterMode}
            onChange={(value) => updateDraft({ commandCenterMode: value })}
          />
          <SettingsField
            type="checkbox"
            label="Read-only display mode"
            value={draft.readOnlyDisplayMode}
            onChange={(value) => updateDraft({ readOnlyDisplayMode: value })}
          />
          <SettingsField
            type="number"
            label="Wall display refresh interval (ms)"
            value={draft.wallDisplayRefreshInterval}
            onChange={(value) => updateDraft({ wallDisplayRefreshInterval: Number(value) })}
          />
        </div>
        <div className="emergency-settings__rules" aria-label="Central node governed rule groups">
          {draft.centralControl.governedRuleGroups.map((ruleGroup) => (
            <article key={ruleGroup}>
              <strong>{governedRuleLabel(ruleGroup)}</strong>
              <small>central policy</small>
            </article>
          ))}
        </div>
        <div className="emergency-settings__rules" aria-label="Unified input channels">
          {draft.centralControl.inputChannels.map((channel) => (
            <article key={channel}>
              <strong>{channel.replace(/-/g, ' ')}</strong>
              <small>input only</small>
            </article>
          ))}
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
              ? 'Workflow audit loaded'
              : auditStatus === 'loading'
                ? 'Loading department data...'
                : 'Local audit log active'}
          </small>
        </div>
        {auditStatus === 'loading' ? (
          <p className="emergency-settings__audit-state" role="status">
            Loading department data...
          </p>
        ) : null}
        {auditStatus === 'error' ? (
          <p
            className="emergency-settings__audit-state emergency-settings__audit-state--error"
            role="alert"
          >
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
                  <small>
                    {log.source} · {patientAuditLabel(log.patientId, patients)}
                  </small>
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
        id="audit-log"
        title="Audit Log"
        subtitle="Last 50 local actions with timestamps, patient context, staff attribution, and compact details."
        action={
          <button type="button" onClick={exportAuditCsv} disabled={!filteredAuditLogs.length}>
            Export CSV
          </button>
        }
      >
        <div className="emergency-settings__inline">
          <SettingsField
            label="Action type"
            value={auditFilters.action}
            options={[
              ['all', 'All actions'],
              ...auditActionOptions.map((action) => [action, action]),
            ]}
            onChange={(value) => updateAuditFilter('action', value)}
          />
          <SettingsField
            label="Staff"
            value={auditFilters.staff}
            options={[
              ['all', 'All staff'],
              ...auditStaffOptions.map((staffId) => [staffId, staffId]),
            ]}
            onChange={(value) => updateAuditFilter('staff', value)}
          />
          <SettingsField
            type="datetime-local"
            label="From"
            value={auditFilters.from}
            onChange={(value) => updateAuditFilter('from', value)}
          />
          <SettingsField
            type="datetime-local"
            label="To"
            value={auditFilters.to}
            onChange={(value) => updateAuditFilter('to', value)}
          />
        </div>
        <div
          className="emergency-settings__audit-table"
          role="table"
          aria-label="Local action audit log"
        >
          <div role="row" className="emergency-settings__audit-table-head">
            <span role="columnheader">Time</span>
            <span role="columnheader">Action</span>
            <span role="columnheader">Patient</span>
            <span role="columnheader">Staff</span>
            <span role="columnheader">Details</span>
          </div>
          {filteredAuditLogs.length ? (
            filteredAuditLogs.map((log) => (
              <div role="row" key={log.id}>
                <time role="cell" dateTime={log.timestamp}>
                  {new Date(log.timestamp).toLocaleString()}
                </time>
                <span role="cell">{log.action}</span>
                <span role="cell">{patientAuditLabel(log.patientId, patients)}</span>
                <span role="cell">{log.staffId || 'system'}</span>
                <span role="cell">{auditDetailSummary(log.details)}</span>
              </div>
            ))
          ) : (
            <p className="emergency-settings__audit-state">
              No local actions match the current filters.
            </p>
          )}
        </div>
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
          <SettingsField
            label="Tenant name"
            value={draft.tenantName}
            onChange={(value) => updateDraft({ tenantName: value })}
          />
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
              <small>Configured module</small>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="ai"
        title="AI Settings"
        subtitle="AIIOS routing, context, evidence, workflow support, and human-review controls."
        action={
          <button
            type="button"
            disabled={savingGroup === 'ai'}
            onClick={() => saveGroup('ai', { aiSettings: draft.aiSettings })}
          >
            Save AI
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="checkbox"
            label="AI enabled"
            value={draft.aiSettings.enabled}
            onChange={(value) => updateNested('aiSettings', 'enabled', value)}
          />
          <SettingsField
            label="Provider"
            value={draft.aiSettings.provider}
            onChange={(value) => updateNested('aiSettings', 'provider', value)}
          />
          <SettingsField
            label="Model"
            value={draft.aiSettings.model}
            onChange={(value) => updateNested('aiSettings', 'model', value)}
          />
          <SettingsField
            type="checkbox"
            label="Triage assist"
            value={draft.aiSettings.triageAssistEnabled}
            onChange={(value) => updateNested('aiSettings', 'triageAssistEnabled', value)}
          />
          <SettingsField
            type="checkbox"
            label="Summarization"
            value={draft.aiSettings.summarizationEnabled}
            onChange={(value) => updateNested('aiSettings', 'summarizationEnabled', value)}
          />
          <SettingsField
            type="checkbox"
            label="Human review required"
            value={draft.aiSettings.humanReviewRequired}
            onChange={(value) => updateNested('aiSettings', 'humanReviewRequired', value)}
          />
        </div>
      </Section>

      <Section
        id="integrations"
        title="Integration Settings"
        subtitle="Dispatcher, EMS, EHR, FHIR, HL7, and device telemetry inputs for the shared command center picture."
        action={
          <button
            type="button"
            disabled={savingGroup === 'integrations'}
            onClick={() =>
              saveGroup('integrations', { integrationSettings: draft.integrationSettings })
            }
          >
            Save Integrations
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="checkbox"
            label="EHR enabled"
            value={draft.integrationSettings.ehrEnabled}
            onChange={(value) => updateNested('integrationSettings', 'ehrEnabled', value)}
          />
          <SettingsField
            label="FHIR endpoint"
            value={draft.integrationSettings.fhirEndpoint}
            onChange={(value) => updateNested('integrationSettings', 'fhirEndpoint', value)}
          />
          <SettingsField
            label="HL7 interface ID"
            value={draft.integrationSettings.hl7InterfaceId}
            onChange={(value) => updateNested('integrationSettings', 'hl7InterfaceId', value)}
          />
          <SettingsField
            type="checkbox"
            label="Device telemetry"
            value={draft.integrationSettings.deviceTelemetryEnabled}
            onChange={(value) =>
              updateNested('integrationSettings', 'deviceTelemetryEnabled', value)
            }
          />
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
            onClick={() =>
              saveGroup('provincial', { provincialHealthSettings: draft.provincialHealthSettings })
            }
          >
            Save Provincial Health
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="checkbox"
            label="Connector enabled"
            value={draft.provincialHealthSettings.connectorEnabled}
            onChange={(value) =>
              updateNested('provincialHealthSettings', 'connectorEnabled', value)
            }
          />
          <SettingsField
            label="Jurisdiction"
            value={draft.provincialHealthSettings.jurisdiction}
            onChange={(value) => updateNested('provincialHealthSettings', 'jurisdiction', value)}
          />
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
          <SettingsField
            type="checkbox"
            label="Health-card validation"
            value={draft.provincialHealthSettings.healthCardValidation}
            onChange={(value) =>
              updateNested('provincialHealthSettings', 'healthCardValidation', value)
            }
          />
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
            onClick={() =>
              saveGroup('notifications', { notificationSettings: draft.notificationSettings })
            }
          >
            Save Notifications
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="checkbox"
            label="In-app notifications"
            value={draft.notificationSettings.inAppEnabled}
            onChange={(value) => updateNested('notificationSettings', 'inAppEnabled', value)}
          />
          <SettingsField
            type="checkbox"
            label="Email notifications"
            value={draft.notificationSettings.emailEnabled}
            onChange={(value) => updateNested('notificationSettings', 'emailEnabled', value)}
          />
          <SettingsField
            type="checkbox"
            label="SMS notifications"
            value={draft.notificationSettings.smsEnabled}
            onChange={(value) => updateNested('notificationSettings', 'smsEnabled', value)}
          />
          <SettingsField
            type="number"
            label="Escalation minutes"
            value={draft.notificationSettings.escalationMinutes}
            onChange={(value) => updateNested('notificationSettings', 'escalationMinutes', value)}
          />
          <SettingsField
            type="time"
            label="Quiet hours start"
            value={draft.notificationSettings.quietHoursStart}
            onChange={(value) => updateNested('notificationSettings', 'quietHoursStart', value)}
          />
          <SettingsField
            type="time"
            label="Quiet hours end"
            value={draft.notificationSettings.quietHoursEnd}
            onChange={(value) => updateNested('notificationSettings', 'quietHoursEnd', value)}
          />
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
            onClick={() =>
              saveGroup('reassessment', { reassessmentThresholds: draft.reassessmentThresholds })
            }
          >
            Save Reassessment
          </button>
        }
      >
        <div className="emergency-settings__grid">
          {[
            ['P1', 'reassessP1Min'],
            ['P2', 'reassessP2Min'],
            ['P3', 'reassessP3Min'],
            ['P4', 'reassessP4Min'],
            ['P5', 'reassessP5Min'],
          ].map(([priority, key]) => (
            <SettingsField
              key={priority}
              type="number"
              label={`${priority} interval minutes`}
              value={thresholds[key]}
              onChange={(value) =>
                updateThreshold(key, value, {
                  reassessmentThresholds: { ...draft.reassessmentThresholds, [priority]: value },
                  thresholds: {
                    ...draft.thresholds,
                    reassessmentIntervals: {
                      ...(draft.thresholds?.reassessmentIntervals || {}),
                      [priority]: value,
                    },
                  },
                })
              }
            />
          ))}
          <SettingsField
            type="number"
            label="Overdue grace minutes"
            value={draft.reassessmentThresholds.overdueGraceMinutes}
            onChange={(value) =>
              updateNested('reassessmentThresholds', 'overdueGraceMinutes', value)
            }
          />
        </div>
      </Section>

      <Section
        id="ctas-thresholds"
        title="CTAS Wait Thresholds"
        subtitle="Priority-based wait targets used by long-wait rescue, LWBS risk alerts, Copilot, and shift metrics."
        action={
          <button
            type="button"
            disabled={savingGroup === 'ctas'}
            onClick={() =>
              saveGroup('ctas', {
                ctasThresholds: draft.ctasThresholds,
                thresholds: { ctasTargets: draft.ctasThresholds },
              })
            }
          >
            Save CTAS Thresholds
          </button>
        }
      >
        <div className="emergency-settings__grid">
          {CTAS_PRIORITIES.map((priority) => (
            <SettingsField
              key={priority}
              type="number"
              label={`${priority} wait target minutes`}
              value={draft.ctasThresholds?.[priority] ?? draft.thresholds?.ctasTargets?.[priority]}
              onChange={(value) => updateNested('ctasThresholds', priority, value)}
            />
          ))}
        </div>
      </Section>

      <Section
        id="capacity"
        title="Capacity Thresholds"
        subtitle="Department target, occupancy bands, and queue wait limits used by local capacity calculations."
        action={
          <div className="emergency-settings__actions">
            <button type="button" onClick={resetAllThresholds}>
              Reset Thresholds
            </button>
            <button
              type="button"
              disabled={savingGroup === 'capacity'}
              onClick={() =>
                saveGroup('capacity', {
                  capacityThresholds: draft.capacityThresholds,
                  thresholds: {
                    waitWarningMinutes: draft.thresholds.waitWarningMinutes,
                    waitCriticalMinutes: draft.thresholds.waitCriticalMinutes,
                    capacityWarningPercent: draft.thresholds.capacityWarningPercent,
                    capacityOrangePercent: draft.thresholds.capacityOrangePercent,
                    capacityRedPercent: draft.thresholds.capacityRedPercent,
                  },
                })
              }
            >
              Save Capacity
            </button>
          </div>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="number"
            label="Department capacity target"
            value={draft.capacityThresholds.departmentCapacityTarget}
            onChange={(value) =>
              updateNested('capacityThresholds', 'departmentCapacityTarget', value)
            }
          />
          <SettingsField
            type="number"
            label="Capacity warning %"
            value={Math.round(thresholds.capacityWarningPct * 100)}
            onChange={(value) =>
              updateThreshold('capacityWarningPct', value / 100, {
                thresholds: { ...draft.thresholds, capacityWarningPercent: value },
              })
            }
          />
          <SettingsField
            type="number"
            label="Capacity orange %"
            value={Math.round(thresholds.capacityOrangePct * 100)}
            onChange={(value) =>
              updateThreshold('capacityOrangePct', value / 100, {
                capacityThresholds: { ...draft.capacityThresholds, warningPercent: value },
                thresholds: { ...draft.thresholds, capacityOrangePercent: value },
              })
            }
          />
          <SettingsField
            type="number"
            label="Capacity critical %"
            value={Math.round(thresholds.capacityRedPct * 100)}
            onChange={(value) =>
              updateThreshold('capacityRedPct', value / 100, {
                capacityThresholds: { ...draft.capacityThresholds, criticalPercent: value },
                thresholds: { ...draft.thresholds, capacityRedPercent: value },
              })
            }
          />
          <SettingsField
            type="number"
            label="Max waiting patients"
            value={draft.capacityThresholds.maxWaitingPatients}
            onChange={(value) => updateNested('capacityThresholds', 'maxWaitingPatients', value)}
          />
          <SettingsField
            type="number"
            label="Wait warning minutes"
            value={thresholds.waitTimeWarningMin}
            onChange={(value) =>
              updateThreshold('waitTimeWarningMin', value, {
                thresholds: { ...draft.thresholds, waitWarningMinutes: value },
              })
            }
          />
          <SettingsField
            type="number"
            label="Wait critical minutes"
            value={thresholds.waitTimeCtiticalMin}
            onChange={(value) =>
              updateThreshold('waitTimeCtiticalMin', value, {
                thresholds: { ...draft.thresholds, waitCriticalMinutes: value },
              })
            }
          />
        </div>
      </Section>

      <Section
        id="ems"
        title="EMS Thresholds"
        subtitle="Offload targets and inbound critical ETA controls."
        action={
          <button
            type="button"
            disabled={savingGroup === 'ems'}
            onClick={() => saveGroup('ems', { emsThresholds: draft.emsThresholds })}
          >
            Save EMS
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="number"
            label="Offload target minutes"
            value={thresholds.emsOffloadTargetMin}
            onChange={(value) =>
              updateThreshold('emsOffloadTargetMin', value, {
                emsThresholds: { ...draft.emsThresholds, offloadTargetMinutes: value },
                thresholds: { ...draft.thresholds, emsOffloadTargetMinutes: value },
              })
            }
          />
          <SettingsField
            type="number"
            label="Critical ETA minutes"
            value={draft.emsThresholds.criticalEtaMinutes}
            onChange={(value) => updateNested('emsThresholds', 'criticalEtaMinutes', value)}
          />
          <SettingsField
            type="checkbox"
            label="Auto-create arrival"
            value={draft.emsThresholds.autoCreateArrival}
            onChange={(value) => updateNested('emsThresholds', 'autoCreateArrival', value)}
          />
        </div>
      </Section>

      <Section
        id="boarding"
        title="Boarding Thresholds"
        subtitle="Admission boarding escalation, critical boarding, and inpatient notification triggers."
        action={
          <button
            type="button"
            disabled={savingGroup === 'boarding'}
            onClick={() => saveGroup('boarding', { boardingThresholds: draft.boardingThresholds })}
          >
            Save Boarding
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="number"
            label="Escalation minutes"
            value={draft.boardingThresholds.escalationMinutes}
            onChange={(value) => updateNested('boardingThresholds', 'escalationMinutes', value)}
          />
          <SettingsField
            type="number"
            label="Critical minutes"
            value={draft.boardingThresholds.criticalMinutes}
            onChange={(value) => updateNested('boardingThresholds', 'criticalMinutes', value)}
          />
          <SettingsField
            type="number"
            label="Max boarders"
            value={draft.boardingThresholds.maxBoarders}
            onChange={(value) => updateNested('boardingThresholds', 'maxBoarders', value)}
          />
          <SettingsField
            type="number"
            label="Inpatient notify minutes"
            value={draft.boardingThresholds.inpatientNotifyMinutes}
            onChange={(value) =>
              updateNested('boardingThresholds', 'inpatientNotifyMinutes', value)
            }
          />
        </div>
      </Section>

      <Section
        id="alerts"
        title="Alert Rules"
        subtitle="Notification alert enablement and severity overrides."
        action={
          <button
            type="button"
            disabled={savingGroup === 'alerts'}
            onClick={() => saveGroup('alerts', { alertRules: draft.alertRules })}
          >
            Save Alerts
          </button>
        }
      >
        <div className="emergency-settings__rules">
          {Object.entries(draft.alertRules).map(([rule, config]) => (
            <article key={rule}>
              <SettingsField
                type="checkbox"
                label={rule}
                value={config.enabled}
                onChange={(enabled) => updateAlertRule(rule, { enabled })}
              />
              <select
                value={config.severity}
                onChange={(event) => updateAlertRule(rule, { severity: event.target.value })}
              >
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

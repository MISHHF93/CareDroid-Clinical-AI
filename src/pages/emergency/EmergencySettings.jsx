import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_EMERGENCY_THRESHOLDS,
  useEmergencyStore,
} from '../../store/emergencyStore';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { FIRST_CUSTOMER_DEMO_MODE } from '../../data/firstCustomerDemoMode';
import {
  DEFAULT_CENTRAL_CONTROL_SETTINGS,
  DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
  EMERGENCY_CTAS_PRIORITIES as CTAS_PRIORITIES,
  EMERGENCY_SETTINGS_GROUP_LABELS as SETTING_GROUP_LABELS,
  EMERGENCY_WORKSPACE_OPTIONS as WORKSPACE_OPTIONS,
  buildEmergencySettingsPatchFromThresholds,
} from '../../config/emergencySettings.config';
import {
  fetchEmergencyOsSettings,
  fetchOrganizationEmergencyOsSettings,
  saveOrganizationEmergencyOsSettings,
} from '../../services/emergencySettingsApi';
import {
  fetchEmergencyAiGovernanceCompliance,
  fetchEmergencyAiGovernanceRegistry,
  fetchEmergencyWorkflowLogs,
  fetchIntegrationHub,
  fetchProvincialHealth,
  validateEmergencyAiGovernancePrompts,
} from '../../services/emergencyOsApi';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { listScreenModesForSettings } from '../../config/careDroidScreenModes';
import {
  PUBLIC_DISPLAY_PRIVACY_OPTIONS,
  SCREEN_MODE_ROLE_OPTIONS,
  buildDefaultAllowedRolesByScreenMode,
  listConfigurableScreenModes,
  normalizeCareDroidScreenModeSettings,
} from '../../config/careDroidScreenModeSettingsModel';
import {
  EMERGENCY_SCREEN_KPI_LABELS,
  EMERGENCY_SCREEN_KPI_POLICY,
} from '../../config/emergencyScreenKpiPolicy';
import { WALL_DISPLAY_MONITOR_PRIVACY_OPTIONS } from '../../config/wallDisplayMonitorPrivacyModel';
import IntegrationStatusPanel from '../../components/integrations/IntegrationStatusPanel';
import IntegrationStatusBadge from '../../components/integrations/IntegrationStatusBadge';
import { INTEGRATION_STATUS } from '../../config/integrationStatusModel';
import OperationalHistoryPanel from '../../components/audit/OperationalHistoryPanel';
import DeviceContextPanel from '../../components/emergency/DeviceContextPanel';
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
    allowedRolesByScreenMode: {
      ...(base.allowedRolesByScreenMode || {}),
      ...(patch.allowedRolesByScreenMode || {}),
    },
    screenModeKpiVisibility: {
      ...(base.screenModeKpiVisibility || {}),
      ...(patch.screenModeKpiVisibility || {}),
    },
    centralControl: {
      ...DEFAULT_CENTRAL_CONTROL_SETTINGS,
      ...(base.centralControl || {}),
      ...(patch.centralControl || {}),
    },
    operationalIntelligenceSettings: {
      ...DEFAULT_OPERATIONAL_INTELLIGENCE_SETTINGS,
      ...(base.operationalIntelligenceSettings || {}),
      ...(patch.operationalIntelligenceSettings || {}),
      humanReviewRequired: true,
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

function countByStatus(services = []) {
  return services.reduce((counts, [, service]) => {
    const status = service?.status || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function promptValidationIssues(validation = {}) {
  return Object.values(validation).flatMap((result) => result?.issues || []);
}

export default function EmergencySettings() {
  const storeSettings = useEmergencyStore((state) => state.emergencySettings);
  const patients = useEmergencyStore((state) => state.patients);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const saveEmergencySettings = useEmergencyStore((state) => state.saveEmergencySettings);
  const activeScenario = useEmergencyStore((state) => state.activeScenario);
  const setActiveScenario = useEmergencyStore((state) => state.setActiveScenario);
  const auditLog = useEmergencyStore((state) => state.auditLog || []);
  const thresholds = useEmergencyStore(
    (state) => state.thresholds || DEFAULT_EMERGENCY_THRESHOLDS,
  );
  const setThreshold = useEmergencyStore((state) => state.setThreshold);
  const resetThresholds = useEmergencyStore((state) => state.resetThresholds);

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
  const [aiGovernanceStatus, setAiGovernanceStatus] = useState('loading');
  const [aiGovernanceError, setAiGovernanceError] = useState('');
  const [aiGovernanceRegistry, setAiGovernanceRegistry] = useState(null);
  const [aiGovernanceCompliance, setAiGovernanceCompliance] = useState(null);
  const [aiPromptValidation, setAiPromptValidation] = useState({});
  const [integrationHubStatus, setIntegrationHubStatus] = useState('loading');
  const [integrationHubError, setIntegrationHubError] = useState('');
  const [integrationHubEnvelope, setIntegrationHubEnvelope] = useState(null);
  const [provincialHealthStatus, setProvincialHealthStatus] = useState('loading');
  const [provincialHealthError, setProvincialHealthError] = useState('');
  const [provincialHealthEnvelope, setProvincialHealthEnvelope] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const thresholdTimersRef = useRef({});
  const savedFlashTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchOrganizationEmergencyOsSettings()
      .then((orgResult) => {
        if (cancelled || !orgResult.ok || !orgResult.data) return null;
        return orgResult.data;
      })
      .then((orgEmergencyOs) =>
        fetchEmergencyOsSettings().then((result) => ({ result, orgEmergencyOs })),
      )
      .then(({ result, orgEmergencyOs }) => {
        if (cancelled) return;
        if (!result.ok && !orgEmergencyOs) {
          setError(
            'Live settings service unavailable. Local settings remain editable.',
          );
          setDraft(mergeSettings(storeSettings));
          return;
        }
        const nextSettings = mergeSettings(
          storeSettings,
          orgEmergencyOs || {},
          result.ok ? payloadFromEnvelope(result) : {},
        );
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

  useEffect(() => {
    let cancelled = false;
    setIntegrationHubStatus('loading');
    setIntegrationHubError('');

    fetchIntegrationHub()
      .then((result) => {
        if (cancelled) return;
        setIntegrationHubEnvelope(result);
        setIntegrationHubStatus(result?.remainingGaps?.length ? 'partial' : 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        setIntegrationHubError('Integration Hub status is temporarily unavailable.');
        setIntegrationHubStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProvincialHealthStatus('loading');
    setProvincialHealthError('');

    fetchProvincialHealth()
      .then((result) => {
        if (cancelled) return;
        setProvincialHealthEnvelope(result);
        setProvincialHealthStatus(result?.remainingGaps?.length ? 'partial' : 'ready');
      })
      .catch(() => {
        if (cancelled) return;
        setProvincialHealthError('Provincial Health connector status is temporarily unavailable.');
        setProvincialHealthStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAiGovernanceStatus('loading');
    setAiGovernanceError('');

    Promise.allSettled([
      fetchEmergencyAiGovernanceRegistry(),
      fetchEmergencyAiGovernanceCompliance(30),
      validateEmergencyAiGovernancePrompts(),
    ]).then(([registryResult, complianceResult, validationResult]) => {
      if (cancelled) return;

      const registry =
        registryResult.status === 'fulfilled' ? registryResult.value : null;
      const compliance =
        complianceResult.status === 'fulfilled' ? complianceResult.value : null;
      const validation =
        validationResult.status === 'fulfilled' ? validationResult.value : null;

      if (registry) setAiGovernanceRegistry(registry);
      if (compliance) setAiGovernanceCompliance(compliance);
      if (validation) setAiPromptValidation(validation);

      const failed = [registryResult, complianceResult, validationResult].find(
        (result) => result.status === 'rejected',
      );
      if (failed) {
        setAiGovernanceError('AI governance status is partially unavailable.');
        setAiGovernanceStatus('partial');
        return;
      }

      setAiGovernanceStatus('ready');
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
      ...(Array.isArray(workflowLogs) ? workflowLogs : []),
    ].forEach((log) => {
      if (log?.id) byId.set(log.id, log);
    });
    return [...byId.values()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [backendWorkflowLogs, workflowLogs]);
  const storeAuditLogs = useMemo(() => {
    const byId = new Map();
    (Array.isArray(auditLog) ? auditLog : []).forEach((log) => {
      if (log?.id) byId.set(log.id, log);
    });
    return [...byId.values()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [auditLog]);
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
  const aiServiceEntries = useMemo(
    () => Object.entries(aiGovernanceRegistry?.services || {}),
    [aiGovernanceRegistry],
  );
  const aiStatusCounts = useMemo(() => countByStatus(aiServiceEntries), [aiServiceEntries]);
  const aiHumanReviewCount = useMemo(
    () => aiServiceEntries.filter(([, service]) => service?.requiresHumanReview).length,
    [aiServiceEntries],
  );
  const aiBlockedActions = useMemo(
    () => aiGovernanceRegistry?.safetyRules?.disallowedAutonomousActions || [],
    [aiGovernanceRegistry],
  );
  const aiRequiredDisclaimers = useMemo(
    () => aiGovernanceRegistry?.safetyRules?.requiredDisclaimers || [],
    [aiGovernanceRegistry],
  );
  const aiValidationIssues = useMemo(
    () => promptValidationIssues(aiPromptValidation),
    [aiPromptValidation],
  );
  const aiGovernanceFrameworks = aiGovernanceRegistry?.governanceFrameworks || [];
  const copilotService = aiGovernanceRegistry?.services?.copilot || {};
  const deteriorationService = aiGovernanceRegistry?.services?.deteriorationPrediction || {};
  const federatedEmsService = aiGovernanceRegistry?.services?.federatedEmsTriage || {};
  const integrationHubData = integrationHubEnvelope?.data || {};
  const integrationSources = integrationHubData.sources || [];
  const integrationReviewQueue = integrationHubData.reviewQueue || [];
  const provincialHealthData = provincialHealthEnvelope?.data || {};
  const provincialRecords = provincialHealthData.records || [];

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

  const screenModeSettings = useMemo(
    () => normalizeCareDroidScreenModeSettings(draft),
    [draft],
  );

  const configurableScreenModes = useMemo(
    () => listConfigurableScreenModes(draft),
    [draft],
  );

  const toggleEnabledScreenMode = (screenModeId, enabled) => {
    const enabledModes = new Set(draft.enabledScreenModes || []);
    if (enabled) enabledModes.add(screenModeId);
    else enabledModes.delete(screenModeId);
    updateDraft({ enabledScreenModes: [...enabledModes] });
  };

  const toggleAllowedRole = (screenModeId, roleId, enabled) => {
    const normalized = normalizeCareDroidScreenModeSettings(draft);
    const roles = new Set(normalized.allowedRolesByScreenMode[screenModeId] || []);
    if (enabled) roles.add(roleId);
    else roles.delete(roleId);
    updateDraft({
      allowedRolesByScreenMode: {
        ...normalized.allowedRolesByScreenMode,
        [screenModeId]: [...roles],
      },
    });
  };

  const toggleScreenModeKpi = (screenModeId, kpiId, enabled) => {
    const normalized = normalizeCareDroidScreenModeSettings(draft);
    const available = EMERGENCY_SCREEN_KPI_POLICY[screenModeId] || [];
    const current = new Set(
      normalized.screenModeKpiVisibility[screenModeId]?.length
        ? normalized.screenModeKpiVisibility[screenModeId]
        : available,
    );
    if (enabled) current.add(kpiId);
    else current.delete(kpiId);
    updateDraft({
      screenModeKpiVisibility: {
        ...normalized.screenModeKpiVisibility,
        [screenModeId]: available.filter((id) => current.has(id)),
      },
    });
  };

  const resetScreenModeRoles = (screenModeId) => {
    const defaults = buildDefaultAllowedRolesByScreenMode();
    updateDraft({
      allowedRolesByScreenMode: {
        ...normalizeCareDroidScreenModeSettings(draft).allowedRolesByScreenMode,
        [screenModeId]: [...(defaults[screenModeId] || [])],
      },
    });
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

    const result = await saveOrganizationEmergencyOsSettings(patch);
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
    setActiveScenario(FIRST_CUSTOMER_DEMO_MODE.id);
    setStatus('Department walkthrough dataset loaded for the live customer walkthrough.');
    setError('');
  };

  const resetDemoScenario = () => {
    setActiveScenario('normal-day');
    setStatus('Department walkthrough dataset reset to normal operations.');
    setError('');
  };

  return (
    <section className="emergency-settings" aria-label="CareDroid settings">
      <header className="emergency-settings__hero">
        <div>
          <span>{EMERGENCY_OS_BRANDING.platformLine} Admin</span>
          <h1>CareDroid Settings</h1>
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
              })
            }
          >
            Save Central Node
          </button>
        }
      >
        <div className="emergency-settings__cards" aria-label="Integration Hub runtime status">
          <article>
            <div>
              <strong>Backend status</strong>
              <p>
                {integrationHubStatus === 'loading'
                  ? 'Loading Integration Hub status...'
                  : integrationHubStatus === 'error'
                    ? integrationHubError
                    : `${integrationSources.length} source(s) reported by ${integrationHubEnvelope?.module || 'Integration Hub'}.`}
              </p>
              <small>{integrationHubEnvelope?.source || 'local settings fallback'}</small>
              <p>
                <Link to={CANONICAL_ROUTES.integrationHub}>Open Integration Hub dashboard</Link>
                {' · '}
                <Link to={CANONICAL_ROUTES.cosmosViewer}>Cosmos Viewer</Link>
              </p>
            </div>
          </article>
          <article>
            <div>
              <strong>Review queue</strong>
              <p>
                {integrationReviewQueue.length
                  ? `${integrationReviewQueue.length} integration review item(s) require staff awareness.`
                  : 'No integration review items returned.'}
              </p>
              <small>
                {(integrationHubEnvelope?.remainingGaps || ['Live connector credentials remain optional.'])
                  .slice(0, 1)
                  .join(' ')}
              </small>
            </div>
          </article>
        </div>
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
        <DeviceContextPanel className="emergency-settings__device-context" />
      </Section>

      <Section
        id="screen-modes"
        title="Screen Modes"
        subtitle="Tenant defaults for CareDroid screen modes, hallway displays, role access, privacy tiers, refresh cadence, and KPI visibility."
        action={
          <button
            type="button"
            disabled={savingGroup === 'screen-modes'}
            onClick={() =>
              saveGroup('screen-modes', {
                defaultScreenMode: draft.defaultScreenMode,
                enabledScreenModes: draft.enabledScreenModes,
                allowedRolesByScreenMode: draft.allowedRolesByScreenMode,
                publicDisplayPrivacy: draft.publicDisplayPrivacy || 'standard',
                wallDisplayMonitorPrivacy: draft.wallDisplayMonitorPrivacy,
                wallDisplayRefreshInterval: draft.wallDisplayRefreshInterval,
                screenModeKpiVisibility: draft.screenModeKpiVisibility,
                readOnlyDisplayMode: draft.readOnlyDisplayMode,
                commandCenterMode: draft.commandCenterMode,
              })
            }
          >
            Save Screen Modes
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            label="Default screen mode"
            value={screenModeSettings.defaultScreenMode}
            options={listScreenModesForSettings()
              .filter((mode) => screenModeSettings.enabledScreenModes.includes(mode.id))
              .map((mode) => [mode.id, mode.label])}
            onChange={(value) => updateDraft({ defaultScreenMode: value })}
          />
          <SettingsField
            type="number"
            label="Wall display auto-refresh interval (ms)"
            value={screenModeSettings.wallDisplayRefreshInterval}
            onChange={(value) => updateDraft({ wallDisplayRefreshInterval: Number(value) })}
          />
          <SettingsField
            label="Public display privacy level"
            value={draft.publicDisplayPrivacy || 'standard'}
            options={PUBLIC_DISPLAY_PRIVACY_OPTIONS.map((option) => [
              option.id,
              `${option.label} — ${option.description}`,
            ])}
            onChange={(value) => updateDraft({ publicDisplayPrivacy: value })}
          />
          <SettingsField
            label="Read-only whiteboard privacy level"
            value={draft.wallDisplayMonitorPrivacy || 'operational'}
            options={WALL_DISPLAY_MONITOR_PRIVACY_OPTIONS.map((option) => [
              option.id,
              `${option.label} — ${option.description}`,
            ])}
            onChange={(value) => updateDraft({ wallDisplayMonitorPrivacy: value })}
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
        </div>
        <div className="emergency-settings__rules" aria-label="Enabled screen modes">
          {listScreenModesForSettings().map((mode) => (
            <article key={mode.id}>
              <SettingsField
                type="checkbox"
                label={mode.label}
                value={screenModeSettings.enabledScreenModes.includes(mode.id)}
                onChange={(enabled) => toggleEnabledScreenMode(mode.id, enabled)}
              />
              <small>{mode.id}</small>
            </article>
          ))}
        </div>
        {configurableScreenModes.map((screenMode) => {
          const availableKpis = EMERGENCY_SCREEN_KPI_POLICY[screenMode.id] || [];
          const enabledKpis = new Set(screenMode.kpiIds);
          const enabledRoles = new Set(screenMode.allowedRoles);
          return (
            <div key={screenMode.id} className="emergency-settings__screen-mode-card">
              <header>
                <strong>{screenMode.label}</strong>
                <button type="button" onClick={() => resetScreenModeRoles(screenMode.id)}>
                  Reset allowed roles
                </button>
              </header>
              <div className="emergency-settings__rules" aria-label={`${screenMode.label} allowed roles`}>
                {SCREEN_MODE_ROLE_OPTIONS.map((role) => (
                  <article key={`${screenMode.id}-${role.id}`}>
                    <SettingsField
                      type="checkbox"
                      label={role.label}
                      value={enabledRoles.has(role.id)}
                      onChange={(enabled) => toggleAllowedRole(screenMode.id, role.id, enabled)}
                    />
                    <small>Allowed role</small>
                  </article>
                ))}
              </div>
              {availableKpis.length ? (
                <div
                  className="emergency-settings__rules"
                  aria-label={`${screenMode.label} KPI visibility`}
                >
                  {availableKpis.map((kpiId) => (
                    <article key={`${screenMode.id}-${kpiId}`}>
                      <SettingsField
                        type="checkbox"
                        label={EMERGENCY_SCREEN_KPI_LABELS[kpiId] || kpiId}
                        value={enabledKpis.has(kpiId)}
                        onChange={(enabled) => toggleScreenModeKpi(screenMode.id, kpiId, enabled)}
                      />
                      <small>KPI visibility</small>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
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
          <OperationalHistoryPanel
            logs={auditLogs}
            title="Operational history by domain"
            description="Patient actions, queue moves, reassessments, and referrals from workflow audit data."
            limit={12}
          />
        ) : null}
        {auditLogs.length ? (
          <details className="emergency-settings__audit-details">
            <summary>Raw workflow log entries</summary>
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
          </details>
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
        subtitle="Tenant name, default workspace, and enabled CareDroid modules."
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
        id="operational-intelligence"
        title="Operational Intelligence"
        subtitle="Always-on advisory layer for capacity, queues, EMS, boarding, data freshness, and model health."
        action={
          <button
            type="button"
            disabled={savingGroup === 'operational-intelligence'}
            onClick={() =>
              saveGroup('operational-intelligence', {
                operationalIntelligenceSettings: draft.operationalIntelligenceSettings,
              })
            }
          >
            Save Operational Intelligence
          </button>
        }
      >
        <p className="emergency-settings__notice">
          Operational intelligence is advisory. Human review required. This layer does not diagnose,
          prescribe, triage, discharge, or override staff.
        </p>
        <div className="emergency-settings__grid">
          <SettingsField
            type="checkbox"
            label="Operational intelligence enabled"
            value={draft.operationalIntelligenceSettings?.operationalIntelligenceEnabled ?? true}
            onChange={(value) =>
              updateNested('operationalIntelligenceSettings', 'operationalIntelligenceEnabled', value)
            }
          />
          <SettingsField
            label="Mode"
            value={draft.operationalIntelligenceSettings?.operationalIntelligenceMode || 'rule_based'}
            onChange={(value) =>
              updateNested('operationalIntelligenceSettings', 'operationalIntelligenceMode', value)
            }
          />
          <SettingsField
            type="checkbox"
            label="Model monitoring enabled"
            value={draft.operationalIntelligenceSettings?.modelMonitoringEnabled ?? true}
            onChange={(value) =>
              updateNested('operationalIntelligenceSettings', 'modelMonitoringEnabled', value)
            }
          />
          <SettingsField
            type="checkbox"
            label="Drift monitoring enabled"
            value={draft.operationalIntelligenceSettings?.driftMonitoringEnabled ?? false}
            onChange={(value) =>
              updateNested('operationalIntelligenceSettings', 'driftMonitoringEnabled', value)
            }
          />
          <SettingsField
            type="checkbox"
            label="Recommendations enabled"
            value={draft.operationalIntelligenceSettings?.recommendationsEnabled ?? true}
            onChange={(value) =>
              updateNested('operationalIntelligenceSettings', 'recommendationsEnabled', value)
            }
          />
          <SettingsField
            type="checkbox"
            label="Auto alerting enabled"
            value={draft.operationalIntelligenceSettings?.autoAlertingEnabled ?? true}
            onChange={(value) =>
              updateNested('operationalIntelligenceSettings', 'autoAlertingEnabled', value)
            }
          />
          <SettingsField
            type="checkbox"
            label="Data freshness visible"
            value={draft.operationalIntelligenceSettings?.dataFreshnessVisible ?? true}
            onChange={(value) =>
              updateNested('operationalIntelligenceSettings', 'dataFreshnessVisible', value)
            }
          />
          <SettingsField
            type="number"
            label="Polling interval (ms)"
            value={draft.operationalIntelligenceSettings?.operationalIntelligencePollingInterval ?? 30000}
            onChange={(value) =>
              updateNested(
                'operationalIntelligenceSettings',
                'operationalIntelligencePollingInterval',
                Number(value),
              )
            }
          />
        </div>
      </Section>

      <Section
        id="ai"
        title="AI Settings"
        subtitle="CareDroid Copilot routing, context, evidence, workflow support, and human-review controls."
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
        <div className="emergency-settings__cards" aria-label="Provincial Health runtime status">
          <article>
            <div>
              <strong>
                Connector status{' '}
                <IntegrationStatusBadge status={INTEGRATION_STATUS.PLACEHOLDER} />
              </strong>
              <p>
                {provincialHealthStatus === 'loading'
                  ? 'Loading Provincial Health status...'
                  : provincialHealthStatus === 'error'
                    ? provincialHealthError
                    : provincialHealthData.connectorStatus || 'Connector status unavailable'}
              </p>
              <small>{provincialHealthData.jurisdiction || draft.provincialHealthSettings.jurisdiction}</small>
            </div>
          </article>
          <article>
            <div>
              <strong>Records reviewed</strong>
              <p>
                {provincialRecords.length
                  ? `${provincialRecords.length} placeholder record(s) are visible for manual review.`
                  : 'No provincial records returned.'}
              </p>
              <small>
                {provincialHealthData.disclaimer || 'External data requires manual review before use.'}
              </small>
            </div>
          </article>
        </div>
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
        <div className="emergency-settings__audit-summary" aria-label="AI governance configuration status">
          <strong>{aiServiceEntries.length || 0}</strong>
          <span>governed AI services</span>
          <small>
            {aiGovernanceStatus === 'ready'
              ? `Backend registry loaded from ${aiGovernanceRegistry?.storageMode || 'governance service'}`
              : aiGovernanceStatus === 'loading'
                ? 'Loading AI governance registry...'
                : aiGovernanceError || 'AI governance registry partially available'}
          </small>
        </div>
        <div className="emergency-settings__cards" aria-label="AI governance registry status">
          <article>
            <div>
              <strong>Human review coverage</strong>
              <p>
                {aiHumanReviewCount}/{aiServiceEntries.length || 0} governed services require human
                review before clinical or operational action.
              </p>
              <small>
                Required disclaimer: {aiRequiredDisclaimers[0] || 'Human review required'}
              </small>
            </div>
          </article>
          <article>
            <div>
              <strong>Blocked autonomous actions</strong>
              <p>
                {(aiBlockedActions.length ? aiBlockedActions : ['diagnose', 'prescribe', 'disposition patients'])
                  .slice(0, 4)
                  .join(', ')}
              </p>
              <small>No autonomous diagnosis, prescribing, disposition, or patient matching.</small>
            </div>
          </article>
          <article>
            <div>
              <strong>Compliance and audit</strong>
              <p>
                {aiGovernanceCompliance?.totalInteractions ?? 0} audited interactions ·{' '}
                {Math.round((aiGovernanceCompliance?.humanReviewRate || 0) * 100)}% human review rate
              </p>
              <small>
                Storage: {aiGovernanceCompliance?.storageMode || aiGovernanceRegistry?.storageMode || 'backend fixture'}
              </small>
            </div>
          </article>
          <article>
            <div>
              <strong>Prompt validation</strong>
              <p>
                {aiValidationIssues.length
                  ? `${aiValidationIssues.length} prompt issue(s) require review.`
                  : 'All registered prompt templates validate with required disclaimers.'}
              </p>
              <small>{aiGovernanceFrameworks.join(', ') || 'NIST AI RMF, WHO, HIPAA, FDA SaMD'}</small>
            </div>
          </article>
          <article>
            <div>
              <strong>Copilot runtime config</strong>
              <p>
                {copilotService.provider || draft.aiSettings.provider} ·{' '}
                {copilotService.model || draft.aiSettings.model}
              </p>
              <small>
                {copilotService.auditLevel || 'full'} audit · {copilotService.status || 'settings'} status
              </small>
            </div>
          </article>
          <article>
            <div>
              <strong>ML model governance</strong>
              <p>
                Deterioration: {deteriorationService.status || 'future'} · Federated EMS:{' '}
                {federatedEmsService.status || 'future'}
              </p>
              <small>
                {aiStatusCounts.active || 0} active · {aiStatusCounts.future || 0} future ·{' '}
                {aiStatusCounts['local-deterministic'] || 0} deterministic
              </small>
            </div>
          </article>
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
        <IntegrationStatusPanel
          liveSources={integrationSources}
          showDetailTable={false}
          className="emergency-settings__integration-status"
        />
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
        id="intake"
        title="Intake Settings"
        subtitle="Automatic encounter creation after successful patient intake."
        action={
          <button
            type="button"
            disabled={savingGroup === 'intake'}
            onClick={() => saveGroup('intake', { intakeSettings: draft.intakeSettings })}
          >
            Save Intake
          </button>
        }
      >
        <div className="emergency-settings__grid">
          <SettingsField
            type="checkbox"
            label="Auto-create encounter after intake"
            value={draft.intakeSettings?.autoCreateEncounter ?? true}
            onChange={(value) => updateNested('intakeSettings', 'autoCreateEncounter', value)}
          />
          <SettingsField
            type="checkbox"
            label="Auto-assign triage queue after intake"
            value={draft.intakeSettings?.autoAssignTriageQueue ?? true}
            onChange={(value) => updateNested('intakeSettings', 'autoAssignTriageQueue', value)}
          />
          <SettingsField
            type="checkbox"
            label="Sync waiting queue on triage completion"
            value={draft.intakeSettings?.autoAssignWaitingQueue ?? true}
            onChange={(value) => updateNested('intakeSettings', 'autoAssignWaitingQueue', value)}
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

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  Calculator,
  ChevronDown,
  ChevronRight,
  Database,
  Lock,
  Plug,
  Settings,
  Stethoscope,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { FEATURE_REGISTRY, FEATURE_REGISTRY_BY_ID } from '../../../lib/features/featureRegistry';
import { getSuiteById } from '../../../lib/features/suiteRegistry';
import { useEmergencyStore } from '../../store/emergencyStore';
import { FEATURE_TOGGLE_BACKEND_QUEUE } from '../../data/featureToggleBackendQueue';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import './FeatureManagement.css';

const CATEGORY_TABS = ['All', 'Clinical', 'Operational', 'AI', 'Backend', 'Admin'];
const STATUS_FILTERS = ['All', 'Enabled', 'Disabled', 'Beta', 'Preview'];
const DEFAULT_EXPANDED = new Set(['Operational', 'Clinical']);
const BACKEND_FEATURE_IDS = new Set([
  'vitals_history_chart',
  'lab_results_panel',
  'imaging_orders',
  'medication_history',
  'visit_history',
  'shift_analytics',
  'audit_log',
  'ems_diversion',
  'inter_facility_transfer',
  'icd10_lookup',
  'export_shift_report',
]);

const BACKEND_SURFACING_QUEUE = [
  {
    featureId: 'vitals_history_chart',
    method: 'GET',
    path: '/api/patients/:patientId/source-data',
    surfacesIn: 'Patient detail panel',
    effort: 'Low',
    checklist: [
      ['Backend endpoint exists', true],
      ['Patient store wired', true],
      ['Chart component built', true],
      ['Patient detail section gated', true],
    ],
  },
  {
    featureId: 'lab_results_panel',
    method: 'POST',
    path: '/api/patients/:patientId/import/labs',
    surfacesIn: 'Patient detail panel',
    effort: 'Low',
    checklist: [
      ['Backend endpoint exists', true],
      ['Patient import workflow wired', true],
      ['Lab results section gated', true],
      ['Abnormal and critical states reviewed', false],
    ],
  },
  {
    featureId: 'imaging_orders',
    method: 'GET',
    path: '/api/patients/:patientId/source-data',
    surfacesIn: 'Patient detail panel',
    effort: 'Medium',
    checklist: [
      ['Backend endpoint exists', true],
      ['Patient source-data payload available', true],
      ['Imaging result display mapped', false],
      ['Empty and pending order states designed', false],
    ],
  },
  {
    featureId: 'medication_history',
    method: 'POST',
    path: '/api/patients/:patientId/import/medications',
    surfacesIn: 'Patient detail panel',
    effort: 'Low',
    checklist: [
      ['Backend endpoint exists', true],
      ['Medication import workflow wired', true],
      ['Medication history section gated', true],
      ['Reconciliation status labels reviewed', false],
    ],
  },
  {
    featureId: 'visit_history',
    method: 'GET',
    path: '/api/patients/:patientId/timeline',
    surfacesIn: 'Patient detail panel',
    effort: 'Medium',
    checklist: [
      ['Backend endpoint exists', true],
      ['Timeline source available', true],
      ['Encounter history layout mapped', false],
      ['Cross-encounter privacy copy reviewed', false],
    ],
  },
  {
    featureId: 'audit_log',
    method: 'GET',
    path: '/api/audit/my-logs',
    surfacesIn: 'Profile or admin audit surface',
    effort: 'Medium',
    checklist: [
      ['Backend endpoint exists', true],
      ['Feature flag registered', true],
      ['Audit list page linked', false],
      ['Export and filter permissions reviewed', false],
    ],
  },
  {
    featureId: 'ems_diversion',
    method: 'GET',
    path: '/api/emergency/diversion/status',
    surfacesIn: 'EMS Pipeline',
    effort: 'Medium',
    checklist: [
      ['Backend endpoint exists', false],
      ['EMS Pipeline dependency declared', true],
      ['Diversion status control designed', false],
      ['Escalation and audit copy reviewed', false],
    ],
  },
  {
    featureId: 'inter_facility_transfer',
    method: 'PATCH',
    path: '/api/emergency/transfers/:referralId/status',
    surfacesIn: 'Referral panel',
    effort: 'Medium',
    checklist: [
      ['Backend endpoint exists', false],
      ['Referral dependency declared', true],
      ['Transfer status UI added', false],
      ['Receiving facility workflow reviewed', false],
    ],
  },
  {
    featureId: 'icd10_lookup',
    method: 'GET',
    path: '/api/tools/icd10/lookup',
    surfacesIn: 'Clinical tools or documentation workflow',
    effort: 'High',
    checklist: [
      ['Backend endpoint exists', false],
      ['Feature flag registered', true],
      ['Lookup search UI built', false],
      ['Coding guidance and disclaimers reviewed', false],
    ],
  },
  {
    featureId: 'export_shift_report',
    method: 'GET',
    path: '/api/emergency/shift/report/export',
    surfacesIn: 'Shift Summary',
    effort: 'Medium',
    checklist: [
      ['Backend endpoint exists', false],
      ['Shift summary source data available', true],
      ['Export button added', false],
      ['Download format and audit event verified', false],
    ],
  },
  ...FEATURE_TOGGLE_BACKEND_QUEUE.map((item) => ({
    featureId: item.category === 'clinical' ? 'clinical_calculator_hub' : 'emergency_whiteboard',
    method: item.method,
    path: item.path,
    surfacesIn: item.targetSurface,
    effort: 'Medium',
    checklist: [
      ['Backend endpoint exists', true],
      ['Data-layer owner identified', true],
      [item.reason, false],
      ['Feature surface reviewed', false],
    ],
  })),
];

const SECTION_ORDER = ['Operational', 'Clinical', 'AI', 'Backend', 'Admin'];
const CATEGORY_ICON = {
  Clinical: Stethoscope,
  Operational: Activity,
  AI: Bot,
  Backend: Database,
  Admin: Settings,
};

function displayGroup(feature) {
  if (BACKEND_FEATURE_IDS.has(feature.id)) return 'Backend';
  if (feature.category === 'ai') return 'AI';
  if (feature.category === 'admin') return 'Admin';
  if (feature.category === 'clinical') return 'Clinical';
  return 'Operational';
}

function tierLabel(tier) {
  return String(tier || '').replace(/^\w/, (char) => char.toUpperCase());
}

function dependencyLabels(feature) {
  return feature.dependencies.map((id) => FEATURE_REGISTRY_BY_ID[id]?.label || id);
}

function getRawFlag(feature, flags, overrides) {
  if (Object.prototype.hasOwnProperty.call(overrides, feature.id)) return overrides[feature.id];
  if (Object.prototype.hasOwnProperty.call(flags, feature.id)) return flags[feature.id];
  return feature.defaultEnabled;
}

function collectDependentFeatures(featureId, isEnabled, visited = new Set()) {
  if (visited.has(featureId)) return [];
  visited.add(featureId);
  return FEATURE_REGISTRY.flatMap((feature) => {
    if (!feature.dependencies.includes(featureId) || !isEnabled(feature.id)) return [];
    return [feature, ...collectDependentFeatures(feature.id, isEnabled, visited)];
  });
}

function docsTooltip(feature) {
  const examples = [
    feature.sidebarRoute ? `Route: ${feature.sidebarRoute}` : '',
    feature.backendEndpoint ? `Backend: ${feature.backendEndpoint}` : '',
    feature.relatedTools?.length ? `Tools: ${feature.relatedTools.join(', ')}` : '',
  ].filter(Boolean);
  return `${feature.description}${examples.length ? `\n\nExample:\n${examples.join('\n')}` : ''}`;
}

function Spinner() {
  return <span className="feature-toggle-panel__spinner" aria-hidden />;
}

function FeatureToggle({ checked, disabled, pending, onClick, title }) {
  return (
    <button
      type="button"
      className={[
        'feature-toggle',
        checked ? 'feature-toggle--on' : '',
        disabled ? 'feature-toggle--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props -- aria-checked is always set via the conditional spread below, the linter can't trace it statically
      role="switch"
      {...((checked) ? { 'aria-checked': 'true' as const } : { 'aria-checked': 'false' as const })}
      disabled={disabled || pending}
      title={title}
      onClick={onClick}
    >
      <span>{pending ? <Spinner /> : null}</span>
    </button>
  );
}

export default function FeatureManagement() {
  const flags = useEmergencyStore((state) => state.flags);
  const overrides = useEmergencyStore((state) => state.overrides);
  const tier = useEmergencyStore((state) => state.tier);
  const loading = useEmergencyStore((state) => state.loading);
  const backendAvailable = useEmergencyStore((state) => state.backendAvailable);
  const persistenceMode = useEmergencyStore((state) => state.persistenceMode);
  const initializeFlags = useEmergencyStore((state) => state.initializeFlags);
  const toggleFeature = useEmergencyStore((state) => state.toggleFeature);
  const setTier = useEmergencyStore((state) => state.setTier);
  const isEnabled = useEmergencyStore((state) => state.isEnabled);
  const getDependencyWarning = useEmergencyStore((state) => state.getDependencyWarning);
  const { success, error: notifyError, warning: notifyWarning } = useNotificationActions();
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedSections, setExpandedSections] = useState(DEFAULT_EXPANDED);
  const [pendingFeatureIds, setPendingFeatureIds] = useState(new Set());
  const [confirmToggle, setConfirmToggle] = useState<any>(null);

  const enabledCount = useMemo(
    () => FEATURE_REGISTRY.filter((feature) => isEnabled(feature.id)).length,
    [flags, overrides, tier, isEnabled]
  );

  const rows = useMemo(
    () =>
      FEATURE_REGISTRY.map((feature) => {
        const enabled = isEnabled(feature.id);
        const rawEnabled = getRawFlag(feature, flags, overrides);
        const unmetDeps = feature.dependencies.filter((dependencyId) => !isEnabled(dependencyId));
        return {
          feature,
          group: displayGroup(feature),
          enabled,
          rawEnabled,
          unmetDeps,
          dependencyLocked: !enabled && unmetDeps.length > 0,
        };
      }),
    [flags, overrides, tier, isEnabled]
  );

  const backendSurfacingRows = useMemo(
    () =>
      BACKEND_SURFACING_QUEUE.map((item) => {
        const feature = FEATURE_REGISTRY_BY_ID[item.featureId];
        if (!feature) return null;
        const unmetDeps = feature.dependencies.filter((dependencyId) => !isEnabled(dependencyId));
        return {
          ...item,
          feature,
          enabled: isEnabled(feature.id),
          unmetDeps,
          dependencyLocked: unmetDeps.length > 0,
        };
      }).filter((r): r is NonNullable<typeof r> => r !== null),
    [flags, overrides, tier, isEnabled]
  );

  const filteredRows = rows.filter((row) => {
    if (categoryFilter !== 'All' && row.group !== categoryFilter) return false;
    if (statusFilter === 'Enabled' && !row.enabled) return false;
    if (statusFilter === 'Disabled' && row.enabled) return false;
    if (statusFilter === 'Beta' && row.feature.status !== 'beta') return false;
    if (statusFilter === 'Preview' && row.feature.status !== 'preview') return false;
    return true;
  });

  const groupedRows = SECTION_ORDER.map((section) => ({
    section,
    rows: filteredRows.filter((row) => row.group === section),
  })).filter((section) => section.rows.length);

  const runToggle = async (feature, enabled) => {
    setPendingFeatureIds((current) => new Set(current).add(feature.id));
    try {
      const updated = await toggleFeature(feature.id, enabled);
      if (!updated) {
        notifyWarning(
          'Feature not changed',
          'Check tier eligibility and dependencies before enabling this feature.'
        );
        return false;
      }
      success('Feature updated', `${feature.label} ${enabled ? 'enabled' : 'disabled'}.`);
      return true;
    } catch (err: any) {
      notifyError('Feature update failed', err instanceof Error ? err.message : 'Unable to update feature.');
      return false;
    } finally {
      setPendingFeatureIds((current) => {
        const next = new Set(current);
        next.delete(feature.id);
        return next;
      });
    }
  };

  const requestToggle = (row) => {
    const { feature, enabled, dependencyLocked } = row;
    if (feature.tier === 'core' && enabled) {
      notifyWarning('Core feature', 'Core features are always enabled.');
      return;
    }
    if (dependencyLocked) {
      notifyWarning('Dependency required', `Requires: ${dependencyLabels(feature).join(', ')}`);
      return;
    }
    const nextEnabled = !enabled;
    if (!nextEnabled) {
      const warning = getDependencyWarning(feature.id);
      if (warning) {
        const dependents = collectDependentFeatures(feature.id, isEnabled);
        setConfirmToggle({ feature, dependents, warning });
        return;
      }
    }
    void runToggle(feature, nextEnabled);
  };

  const enableBackendSurface = async (row) => {
    if (row.enabled) return;
    if (row.dependencyLocked) {
      notifyWarning(
        'Dependency required',
        `Requires: ${row.unmetDeps.map((id) => FEATURE_REGISTRY_BY_ID[id]?.label || id).join(', ')}`
      );
      return;
    }

    setPendingFeatureIds((current) => new Set(current).add(row.feature.id));
    try {
      const updated = await toggleFeature(row.feature.id, true);
      if (!updated) {
        notifyWarning(
          'Feature not changed',
          'Check tier eligibility and dependencies before enabling this backend function.'
        );
        return;
      }

      success(`${row.feature.label} enabled`, `Visible in ${row.surfacesIn}.`);
      if (row.effort === 'Medium' || row.effort === 'High') {
        notifyWarning(
          'Setup required',
          'This feature requires additional configuration. Review the setup checklist.'
        );
      }
    } catch (err: any) {
      notifyError('Feature update failed', err instanceof Error ? err.message : 'Unable to update feature.');
    } finally {
      setPendingFeatureIds((current) => {
        const next = new Set(current);
        next.delete(row.feature.id);
        return next;
      });
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const enableAllCore = () => {
    success('Core enabled', 'Core features are always enabled and cannot be turned off.');
  };

  const enableProfessionalTier = () => {
    setTier('professional');
    success('Professional tier enabled', 'Professional defaults were applied.');
  };

  const resetDefaults = () => {
    setTier(tier);
    success('Defaults restored', `${tierLabel(tier)} tier defaults were restored.`);
  };

  return (
    <section className="feature-toggle-panel" aria-label="Feature management">
      <header className="feature-toggle-panel__header">
        <div>
          <span className="feature-toggle-panel__eyebrow">CareDroid</span>
          <h1>Feature Management</h1>
          <p>Surface backend functions, enable modules, and manage rollout dependencies.</p>
        </div>
        <div className="feature-toggle-panel__header-meta">
          <span className="feature-toggle-panel__tier">{tierLabel(tier)} tier</span>
          <strong>
            {enabledCount} of {FEATURE_REGISTRY.length} features enabled
          </strong>
          <button type="button" onClick={() => void initializeFlags()} disabled={loading}>
            {loading ? 'Syncing...' : 'Sync flags'}
          </button>
        </div>
      </header>

      {tier === 'core' && backendAvailable ? (
        <section className="feature-toggle-panel__plan-banner" role="status">
          <div>
            <strong>Professional features are disabled on your plan</strong>
            <p>Upgrade to enable professional and enterprise CareDroid modules across devices.</p>
          </div>
          <a href="/billing">Upgrade plan</a>
        </section>
      ) : null}

      {persistenceMode === 'simulation' ? (
        <section className="feature-toggle-panel__fallback-banner" role="status">
          Simulation mode is active. Feature settings use mock training data and are not written to
          live patient systems.
        </section>
      ) : persistenceMode === 'local' ? (
        <section className="feature-toggle-panel__fallback-banner" role="status">
          Feature settings backend is unavailable. Changes are saved locally on this device only.
        </section>
      ) : null}

      <section className="feature-toggle-panel__surfacing-queue" aria-labelledby="backend-surfacing-title">
        <header className="feature-toggle-panel__surfacing-header">
          <div>
            <span className="feature-toggle-panel__eyebrow">Backend Surfacing Queue</span>
            <h2 id="backend-surfacing-title">Unmapped Backend Functions</h2>
            <p>
              These features exist in your backend but are not yet surfaced in the UI. Enable to
              activate.
            </p>
          </div>
          <span>{backendSurfacingRows.length} available</span>
        </header>

        <div className="feature-toggle-panel__surfacing-grid">
          {backendSurfacingRows.map((row) => {
            const pending = pendingFeatureIds.has(row.feature.id);
            const requiresText = row.unmetDeps
              .map((dependencyId) => FEATURE_REGISTRY_BY_ID[dependencyId]?.label || dependencyId)
              .join(', ');
            return (
              <article
                key={`${row.feature.id}-${row.method}-${row.path}`}
                className={[
                  'feature-toggle-panel__surfacing-card',
                  row.enabled ? 'feature-toggle-panel__surfacing-card--enabled' : '',
                  row.dependencyLocked ? 'feature-toggle-panel__surfacing-card--locked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="feature-toggle-panel__surfacing-title">
                  <span className="feature-toggle-panel__surfacing-icon" aria-hidden>
                    <Plug size={18} />
                  </span>
                  <strong>{row.feature.label}</strong>
                  <button
                    type="button"
                    disabled={row.enabled || pending}
                    title={row.dependencyLocked ? `Requires: ${requiresText}` : `Enable ${row.feature.label}`}
                    onClick={() => void enableBackendSurface(row)}
                  >
                    {pending ? 'Enabling...' : row.enabled ? 'Enabled' : 'Enable'}
                  </button>
                </div>

                <dl className="feature-toggle-panel__surfacing-meta">
                  <div>
                    <dt>Backend</dt>
                    <dd>
                      {row.method} {row.path}
                    </dd>
                  </div>
                  <div>
                    <dt>Surfaces in</dt>
                    <dd>{row.surfacesIn}</dd>
                  </div>
                  <div>
                    <dt>Effort to enable</dt>
                    <dd>
                      <span
                        className={`feature-toggle-panel__effort feature-toggle-panel__effort--${row.effort.toLowerCase()}`}
                      >
                        {row.effort}
                      </span>
                    </dd>
                  </div>
                  {row.dependencyLocked ? (
                    <div>
                      <dt>Requires</dt>
                      <dd>{requiresText}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="feature-toggle-panel__setup-checklist" aria-label={`${row.feature.label} setup checklist`}>
                  <span>Setup checklist</span>
                  <ul>
                    {(row.checklist as [string, boolean][]).map(([label, complete]) => (
                      <li
                        key={label}
                        className={complete ? 'feature-toggle-panel__setup-checklist-item--done' : ''}
                      >
                        <span aria-hidden>{complete ? 'Done' : 'Todo'}</span>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="feature-toggle-panel__filters" aria-label="Feature filters">
        <div>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={categoryFilter === tab ? 'feature-toggle-panel__filter--active' : ''}
              onClick={() => setCategoryFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={statusFilter === filter ? 'feature-toggle-panel__filter--active' : ''}
              onClick={() => setStatusFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="feature-toggle-panel__bulk" aria-label="Bulk feature actions">
        <button type="button" onClick={enableAllCore}>
          Enable All Core
        </button>
        <button type="button" onClick={enableProfessionalTier}>
          Enable Professional Tier
        </button>
        <button type="button" onClick={resetDefaults}>
          Reset to Defaults
        </button>
      </section>

      <section className="feature-toggle-panel__sections">
        {groupedRows.map(({ section, rows: sectionRows }) => {
          const Icon = CATEGORY_ICON[section] || Wrench;
          const expanded = expandedSections.has(section);
          return (
            <article key={section} className="feature-toggle-panel__section">
              <button
                type="button"
                className="feature-toggle-panel__section-toggle"
                onClick={() => toggleSection(section)}
                {...((expanded) ? { 'aria-expanded': 'true' as const } : { 'aria-expanded': 'false' as const })}
              >
                {expanded ? <ChevronDown size={17} aria-hidden /> : <ChevronRight size={17} aria-hidden />}
                <Icon size={18} aria-hidden />
                <span>{section}</span>
                <small>{sectionRows.length}</small>
              </button>

              {expanded ? (
                <div className="feature-toggle-panel__list">
                  {sectionRows.map((row) => {
                    const { feature, enabled, unmetDeps, dependencyLocked } = row;
                    const IconForRow =
                      feature.relatedTools?.includes('calculators') || feature.sidebarIcon === 'calculators'
                        ? Calculator
                        : CATEGORY_ICON[row.group] || Wrench;
                    const pending = pendingFeatureIds.has(feature.id);
                    const requiresText = unmetDeps
                      .map((dependencyId) => FEATURE_REGISTRY_BY_ID[dependencyId]?.label || dependencyId)
                      .join(', ');
                    return (
                      <article
                        id={`feature-${feature.id}`}
                        key={feature.id}
                        className={[
                          'feature-toggle-panel__row',
                          enabled ? 'feature-toggle-panel__row--on' : 'feature-toggle-panel__row--off',
                          dependencyLocked ? 'feature-toggle-panel__row--locked' : '',
                          feature.status === 'deprecated' ? 'feature-toggle-panel__row--deprecated' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={docsTooltip(feature)}
                      >
                        <div className="feature-toggle-panel__row-icon">
                          <IconForRow size={18} aria-hidden />
                        </div>
                        <div className="feature-toggle-panel__row-main">
                          <div className="feature-toggle-panel__row-title">
                            <strong>{feature.label}</strong>
                            {feature.suiteId ? (
                              <span
                                className="feature-toggle-panel__suite-badge"
                                title={getSuiteById(feature.suiteId)?.description || feature.suiteId}
                              >
                                {getSuiteById(feature.suiteId)?.label || feature.suiteId}
                              </span>
                            ) : null}
                            {feature.status === 'beta' ? <span>Beta</span> : null}
                            {feature.status === 'preview' ? <span>Preview</span> : null}
                            {feature.status === 'deprecated' ? (
                              <span className="feature-toggle-panel__badge--warning">
                                <TriangleAlert size={13} aria-hidden />
                                Deprecated
                              </span>
                            ) : null}
                            {dependencyLocked ? (
                              <span className="feature-toggle-panel__badge--locked" title={`Requires: ${requiresText}`}>
                                <Lock size={13} aria-hidden />
                                Locked
                              </span>
                            ) : null}
                          </div>
                          <p>{feature.description}</p>
                          <div className="feature-toggle-panel__row-meta">
                            <span>Tier: {tierLabel(feature.tier)}</span>
                            <span>
                              Deps:{' '}
                              {feature.dependencies.length ? feature.dependencies.join(', ') : 'none'}
                            </span>
                            {feature.backendEndpoint ? <span>Backend: {feature.backendEndpoint}</span> : null}
                            <a href={`#feature-${feature.id}`} title={docsTooltip(feature)}>
                              Docs
                            </a>
                          </div>
                        </div>
                        <FeatureToggle
                          checked={enabled}
                          disabled={(feature.tier === 'core' && enabled) || dependencyLocked}
                          pending={pending}
                          title={
                            dependencyLocked
                              ? `Requires: ${requiresText}`
                              : feature.tier === 'core' && enabled
                                ? 'Core features cannot be disabled.'
                                : `${enabled ? 'Disable' : 'Enable'} ${feature.label}`
                          }
                          onClick={() => requestToggle(row)}
                        />
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {confirmToggle ? (
        <div className="feature-toggle-panel__modal-backdrop" role="presentation">
          <section
            className="feature-toggle-panel__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feature-toggle-confirm-title"
          >
            <h2 id="feature-toggle-confirm-title">Disable dependent features?</h2>
            <p>
              Disabling {confirmToggle.feature.label} will also disable{' '}
              {confirmToggle.dependents.map((feature) => feature.label).join(', ')}. Continue?
            </p>
            <div className="feature-toggle-panel__modal-actions">
              <button type="button" onClick={() => setConfirmToggle(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="feature-toggle-panel__danger"
                onClick={() => {
                  const feature = confirmToggle.feature;
                  setConfirmToggle(null);
                  void runToggle(feature, false);
                }}
              >
                Continue
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useEmergencyStore } from '../../../store/emergencyStore';
import {
  fetchIntegrationStatuses,
  fetchOrganizationFeatureFlags,
  fetchProtocolsAdmin,
  saveAlertRuleSettings,
  saveDepartmentSettings,
  saveStaffSettings,
  saveThresholdSettings,
  testIntegrationConnection,
  updateOrganizationFeatureFlag,
  updateProtocolAdmin,
} from '../../services/emergencySettingsApi';
import './EmergencySettings.css';

const ROOM_TYPES = ['Triage', 'Waiting', 'Assessment', 'Resuscitation', 'Observation', 'Isolation'];
const ROOM_STATUSES = ['Available', 'Occupied', 'Cleaning', 'Blocked', 'Reserved'];
const STAFF_ROLES = ['Attending', 'Resident', 'Nurse', 'TriageNurse', 'ChargeNurse', 'Paramedic', 'Technician', 'Clerk', 'Consultant', 'Administrator'];
const STAFF_STATUSES = ['OnShift', 'Break', 'Unavailable', 'OffShift'];
const SEVERITIES = ['Info', 'Warning', 'Critical'];
const FEATURE_FLAG_IDS = {
  simulationMode: 'simulation-suite',
  emsModule: 'fleet-command',
  referralModule: 'referral-ai',
  analytics: 'operational-analytics',
};

function statusTone(status = '') {
  const lower = String(status).toLowerCase();
  if (/connected|active|enabled|ok|ready/.test(lower)) return 'green';
  if (/degraded|warning|demo|pending|stale/.test(lower)) return 'yellow';
  return 'red';
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.connections)) return value.connections;
  if (Array.isArray(value?.interfaces)) return value.interfaces;
  return [];
}

function Section({ title, subtitle, children, action }) {
  return (
    <section className="emergency-settings__section">
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

export default function EmergencySettings() {
  const rooms = useEmergencyStore((state) => state.rooms);
  const staff = useEmergencyStore((state) => state.staff);
  const settings = useEmergencyStore((state) => state.emergencySettings);
  const saveEmergencySettings = useEmergencyStore((state) => state.saveEmergencySettings);
  const upsertRoom = useEmergencyStore((state) => state.upsertRoom);
  const deactivateRoom = useEmergencyStore((state) => state.deactivateRoom);
  const upsertStaffMember = useEmergencyStore((state) => state.upsertStaffMember);

  const [localRooms, setLocalRooms] = useState(rooms);
  const [capacityTarget, setCapacityTarget] = useState(settings.departmentCapacityTarget);
  const [thresholds, setThresholds] = useState(settings.thresholds);
  const [alertRules, setAlertRules] = useState(settings.alertRules);
  const [featureFlags, setFeatureFlags] = useState(settings.featureFlags);
  const [localStaff, setLocalStaff] = useState(staff);
  const [integrations, setIntegrations] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => setLocalRooms(rooms), [rooms]);
  useEffect(() => setLocalStaff(staff), [staff]);

  useEffect(() => {
    let cancelled = false;
    fetchIntegrationStatuses().then((result) => {
      if (cancelled) return;
      const fhir = asArray(result.fhir?.data?.data || result.fhir?.data).map((item) => ({ ...item, kind: 'FHIR' }));
      const hl7 = asArray(result.hl7?.data?.data || result.hl7?.data).map((item) => ({ ...item, kind: 'HL7' }));
      setIntegrations([...fhir, ...hl7]);
    });
    fetchProtocolsAdmin().then((result) => {
      if (!cancelled && result.ok) setProtocols(asArray(result.data));
    });
    fetchOrganizationFeatureFlags().then((result) => {
      if (cancelled || !result.ok) return;
      const backendFlags = Array.isArray(result.data?.flags) ? result.data.flags : [];
      setFeatureFlags((current) => ({
        ...current,
        simulationMode: backendFlags.find((flag) => flag.id === FEATURE_FLAG_IDS.simulationMode)?.state !== 'disabled',
        emsModule: backendFlags.find((flag) => flag.id === FEATURE_FLAG_IDS.emsModule)?.state !== 'disabled',
        referralModule: backendFlags.find((flag) => flag.id === FEATURE_FLAG_IDS.referralModule)?.state !== 'disabled',
        analytics: backendFlags.find((flag) => flag.id === FEATURE_FLAG_IDS.analytics)?.state !== 'disabled',
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const roomSummary = useMemo(
    () => `${localRooms.filter((room) => room.status !== 'Blocked').length} active rooms`,
    [localRooms]
  );

  const saveDepartment = async () => {
    const result = await saveDepartmentSettings({ rooms: localRooms, capacityTarget });
    setStatus(result.ok ? 'Department setup saved.' : result.message);
    if (!result.ok) return;
    saveEmergencySettings({ departmentCapacityTarget: Number(capacityTarget) || 30 });
    localRooms.forEach((room) => upsertRoom(room));
  };

  const saveThresholds = async () => {
    const result = await saveThresholdSettings(thresholds);
    setStatus(result.ok ? 'Thresholds saved.' : result.message);
    if (result.ok) saveEmergencySettings({ thresholds });
  };

  const saveAlerts = async () => {
    const result = await saveAlertRuleSettings(alertRules);
    setStatus(result.ok ? 'Alert rules saved.' : result.message);
    if (result.ok) saveEmergencySettings({ alertRules });
  };

  const saveStaff = async () => {
    const result = await saveStaffSettings(localStaff);
    setStatus(result.ok ? 'Staff configuration saved.' : result.message);
    if (!result.ok) return;
    localStaff.forEach((member) => upsertStaffMember(member));
  };

  const saveFeatureFlags = async () => {
    const results = await Promise.all(
      Object.entries(featureFlags).map(([key, enabled]) =>
        updateOrganizationFeatureFlag({
          scope: 'tenant',
          flagId: FEATURE_FLAG_IDS[key],
          state: enabled ? 'enabled' : 'disabled',
        })
      )
    );
    const failed = results.find((result) => !result.ok);
    setStatus(failed ? failed.message : 'Feature flags saved.');
    if (!failed) saveEmergencySettings({ featureFlags });
  };

  const addRoom = () => {
    setLocalRooms((current) => [
      ...current,
      {
        id: `room-draft-${Date.now()}`,
        name: `Room ${current.length + 1}`,
        type: 'Assessment',
        status: 'Available',
        currentPatientId: null,
        isIsolationCapable: false,
      },
    ]);
  };

  const addStaff = () => {
    setLocalStaff((current) => [
      ...current,
      {
        id: `staff-draft-${Date.now()}`,
        firstName: 'New',
        lastName: 'Staff',
        role: 'Nurse',
        status: 'OffShift',
        shiftId: null,
        assignedPatientIds: [],
      },
    ]);
  };

  return (
    <main className="emergency-settings" aria-label="Emergency OS settings">
      <header className="emergency-settings__hero">
        <div>
          <span>Emergency OS Admin</span>
          <h1>Settings</h1>
          <p>Department setup, thresholds, alert rules, staff, integrations, protocols, and feature flags.</p>
        </div>
        {status ? <strong>{status}</strong> : null}
      </header>

      <Section
        title="Department Setup"
        subtitle={`Room management and department capacity target. ${roomSummary}.`}
        action={<button type="button" onClick={saveDepartment}>Save Department</button>}
      >
        <div className="emergency-settings__inline">
          <label>
            Department capacity target
            <input type="number" min="1" value={capacityTarget} onChange={(event) => setCapacityTarget(Number(event.target.value))} />
          </label>
          <button type="button" onClick={addRoom}>Add Room</button>
        </div>
        <div className="emergency-settings__table">
          {localRooms.map((room, index) => (
            <article key={room.id}>
              <input value={room.name} onChange={(event) => setLocalRooms((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
              <select value={room.type} onChange={(event) => setLocalRooms((current) => current.map((item, i) => i === index ? { ...item, type: event.target.value } : item))}>
                {ROOM_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
              <select value={room.status} onChange={(event) => setLocalRooms((current) => current.map((item, i) => i === index ? { ...item, status: event.target.value } : item))}>
                {ROOM_STATUSES.map((roomStatus) => <option key={roomStatus}>{roomStatus}</option>)}
              </select>
              <button type="button" onClick={() => {
                setLocalRooms((current) => current.map((item, i) => i === index ? { ...item, status: 'Blocked', currentPatientId: null } : item));
                deactivateRoom(room.id);
              }}>
                Deactivate
              </button>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Thresholds" subtitle="CapacityEngine, ReassessmentEngine, queue pressure, and EMS offload targets." action={<button type="button" onClick={saveThresholds}>Save Thresholds</button>}>
        <div className="emergency-settings__grid">
          {[
            ['waitWarningMinutes', 'Wait warning threshold (min)'],
            ['waitCriticalMinutes', 'Wait critical threshold (min)'],
            ['capacityWarningPercent', 'Capacity warning %'],
            ['emsOffloadTargetMinutes', 'EMS offload target (min)'],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input type="number" value={thresholds[key]} onChange={(event) => setThresholds((current) => ({ ...current, [key]: Number(event.target.value) }))} />
            </label>
          ))}
          {['P1', 'P2', 'P3'].map((priority) => (
            <label key={priority}>
              {priority} reassessment interval (min)
              <input
                type="number"
                value={thresholds.reassessmentIntervals[priority]}
                onChange={(event) => setThresholds((current) => ({
                  ...current,
                  reassessmentIntervals: { ...current.reassessmentIntervals, [priority]: Number(event.target.value) },
                }))}
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Alert Rules" subtitle="Toggle individual alert types and override severity." action={<button type="button" onClick={saveAlerts}>Save Alert Rules</button>}>
        <div className="emergency-settings__rules">
          {Object.entries(alertRules).map(([rule, config]) => (
            <article key={rule}>
              <label>
                <input type="checkbox" checked={config.enabled} onChange={(event) => setAlertRules((current) => ({ ...current, [rule]: { ...config, enabled: event.target.checked } }))} />
                {rule}
              </label>
              <select value={config.severity} onChange={(event) => setAlertRules((current) => ({ ...current, [rule]: { ...config, severity: event.target.value } }))}>
                {SEVERITIES.map((severity) => <option key={severity}>{severity}</option>)}
              </select>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Staff Management" subtitle="Local staff roster mapped to backend staff settings when available." action={<button type="button" onClick={saveStaff}>Save Staff</button>}>
        <div className="emergency-settings__inline">
          <button type="button" onClick={addStaff}>Add Staff</button>
        </div>
        <div className="emergency-settings__table emergency-settings__table--staff">
          {localStaff.map((member, index) => (
            <article key={member.id}>
              <input value={member.firstName} onChange={(event) => setLocalStaff((current) => current.map((item, i) => i === index ? { ...item, firstName: event.target.value } : item))} />
              <input value={member.lastName} onChange={(event) => setLocalStaff((current) => current.map((item, i) => i === index ? { ...item, lastName: event.target.value } : item))} />
              <select value={member.role} onChange={(event) => setLocalStaff((current) => current.map((item, i) => i === index ? { ...item, role: event.target.value } : item))}>
                {STAFF_ROLES.map((role) => <option key={role}>{role}</option>)}
              </select>
              <select value={member.status} onChange={(event) => setLocalStaff((current) => current.map((item, i) => i === index ? { ...item, status: event.target.value } : item))}>
                {STAFF_STATUSES.map((staffStatus) => <option key={staffStatus}>{staffStatus}</option>)}
              </select>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Integrations" subtitle="Read-only EHR, FHIR, and HL7 backend status panel.">
        <div className="emergency-settings__cards">
          {integrations.length ? integrations.map((integration) => {
            const id = integration.id || integration.connectionId || integration.interfaceId || integration.name || integration.kind;
            const label = integration.name || integration.label || id;
            const tone = statusTone(integration.status || integration.health || integration.state || 'demo');
            return (
              <article key={`${integration.kind}-${id}`}>
                <span className={`emergency-settings__status emergency-settings__status--${tone}`} />
                <strong>{label}</strong>
                <small>{integration.kind} · {integration.status || integration.health || integration.state || 'Demo backend'}</small>
                <button type="button" onClick={() => testIntegrationConnection(integration.kind, id).then((result) => setStatus(result.ok ? `${label} test sent.` : result.message))}>
                  Test Connection
                </button>
              </article>
            );
          }) : <p>No FHIR/HL7 connections returned by backend.</p>}
        </div>
      </Section>

      <Section title="Protocol Activation" subtitle="Existing protocol admin endpoints are available for activation/deactivation.">
        <div className="emergency-settings__cards">
          {protocols.slice(0, 8).map((protocol) => {
            const id = protocol.id || protocol._id || protocol.name;
            const active = protocol.active ?? protocol.isActive ?? protocol.status !== 'inactive';
            return (
              <article key={id}>
                <strong>{protocol.name || protocol.title || id}</strong>
                <small>{active ? 'Active' : 'Inactive'}</small>
                <button type="button" onClick={() => updateProtocolAdmin(id, { ...protocol, active: !active, isActive: !active }).then((result) => {
                  setStatus(result.ok ? 'Protocol updated.' : result.message);
                  if (result.ok) setProtocols((current) => current.map((item) => (item === protocol ? { ...item, active: !active, isActive: !active } : item)));
                })}>
                  {active ? 'Deactivate' : 'Activate'}
                </button>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="Feature Flags" subtitle="Tenant feature flags when organization context is available." action={<button type="button" onClick={saveFeatureFlags}>Save Feature Flags</button>}>
        <div className="emergency-settings__rules">
          {Object.entries(featureFlags).map(([flag, enabled]) => (
            <article key={flag}>
              <label>
                <input type="checkbox" checked={enabled} onChange={(event) => setFeatureFlags((current) => ({ ...current, [flag]: event.target.checked }))} />
                {flag.replace(/([A-Z])/g, ' $1')}
              </label>
              <small>{FEATURE_FLAG_IDS[flag]}</small>
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}

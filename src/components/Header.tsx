import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell, IconSearch } from '@tabler/icons-react';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientFlag, type CapacitySnapshot } from '../types/emergency';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { getCentralControlPolicy } from '../config/centralControl.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import StaffWorkloadPanel from './StaffWorkloadPanel';
import './ReassessmentDrawer.css';
import './Header.css';

const capacityColors: Record<CapacitySnapshot['band'], string> = {
  Green: '#10B981',
  Yellow: '#F59E0B',
  Orange: '#F97316',
  Red: '#EF4444',
};

const reassessmentBadgeFlags = new Set<string>([
  PatientFlag.ReassessmentDue,
  PatientFlag.DeteriorationRisk,
  PatientFlag.HighRisk,
  PatientFlag.SepsisAlert,
]);

function getHeaderFlagValue(flag: unknown): string {
  if (typeof flag === 'object' && flag !== null && 'type' in flag) {
    const typedFlag = flag as { type?: unknown };
    return typeof typedFlag.type === 'string' ? typedFlag.type : '';
  }

  return typeof flag === 'string' ? flag : '';
}

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        color: '#9CA3AF',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
      }}
    >
      {now.toLocaleTimeString()}
    </span>
  );
}

function CapacityBadge({ capacity, canOpen }: { capacity: CapacitySnapshot; canOpen: boolean }) {
  const navigate = useNavigate();
  const color = capacityColors[capacity.band];

  return (
    <button
      type="button"
      onClick={() => {
        if (canOpen) navigate(CANONICAL_ROUTES.emergencyCapacity);
      }}
      disabled={!canOpen}
      style={{
        border: `1px solid ${color}`,
        background: `${color}1F`,
        color,
        borderRadius: 999,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 700,
        cursor: canOpen ? 'pointer' : 'not-allowed',
        opacity: canOpen ? 1 : 0.6,
        transition: 'background 180ms ease, border-color 180ms ease, color 180ms ease',
      }}
    >
      Capacity: {capacity.score} {capacity.band}
    </button>
  );
}

export function Header() {
  const emergencyRole = useEmergencyRolePermissions();
  const capacity = useEmergencyStore((store) => store.capacity);
  const alerts = useEmergencyStore((store) => store.alerts);
  const patients = useEmergencyStore((store) => store.patients);
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const centralControlSettings = useEmergencyStore(
    (store) => store.emergencySettings.centralControl,
  );
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);
  const [staffWorkloadOpen, setStaffWorkloadOpen] = useState(false);
  const canManageWorkload = emergencyRole.can(EMERGENCY_ACTIONS.reassignWorkload);
  const centralControl = useMemo(
    () =>
      getCentralControlPolicy({
        role: emergencyRole.role,
        can: emergencyRole.can,
        settings: centralControlSettings,
      }),
    [centralControlSettings, emergencyRole],
  );

  const unreadAlertCount = useMemo(
    () => alerts.filter((alert) => !alert.dismissed).length,
    [alerts],
  );

  const reassessmentAttentionCount = useMemo(
    () =>
      patients.filter((patient) =>
        ((patient.flags ?? []) as unknown[]).some((flag) =>
          reassessmentBadgeFlags.has(getHeaderFlagValue(flag)),
        ),
      ).length,
    [patients],
  );

  useEffect(() => {
    const closePanels = () => {
      setAlertDrawerOpen(false);
      setStaffWorkloadOpen(false);
    };
    document.addEventListener('close-all-panels', closePanels);
    return () => document.removeEventListener('close-all-panels', closePanels);
  }, []);

  return (
    <header
      className="emergency-os-header"
      style={{
        height: 48,
        width: '100%',
        background: '#0D1117',
        borderBottom: '1px solid #1F2937',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 16,
        flexShrink: 0,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span
          className="emergency-os-header__wordmark"
          style={{ fontSize: 14, fontWeight: 500, color: '#F9FAFB' }}
        >
          Emergency OS
        </span>
        <Clock />
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          className="emergency-os-header__central-node"
          title={`${centralControl.statusLabel}. ${centralControl.dashboardControlLabel}. ${centralControl.inputProfile.label}. ${centralControl.contributorMode ? 'Users submit inputs only.' : 'This role can operate central controls.'}`}
        >
          {centralControl.label}: {centralControl.contributorMode ? 'Input only' : 'Controller'} ·{' '}
          {centralControl.inputProfile.label}
        </span>
        <CapacityBadge
          capacity={capacity}
          canOpen={emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyCapacity)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => document.dispatchEvent(new Event('open-command-palette'))}
          aria-label="Open command palette"
          title="Search patients, commands, tools..."
          style={{
            width: 32,
            height: 32,
            border: '1px solid #1F2937',
            borderRadius: 8,
            background: '#111827',
            color: '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <IconSearch size={18} stroke={2} />
        </button>

        {reassessmentAttentionCount > 0 ? (
          <button
            type="button"
            className="reassessment-header-badge"
            onClick={() => document.dispatchEvent(new Event('open-reassessment-drawer'))}
            aria-label={`Open reassessment drawer: ${reassessmentAttentionCount} patients need attention`}
            title={`${reassessmentAttentionCount} patients need attention`}
          >
            {reassessmentAttentionCount}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setAlertDrawerOpen((open) => !open)}
          aria-label="Alerts"
          style={{
            width: 32,
            height: 32,
            border: '1px solid #1F2937',
            borderRadius: 8,
            background: '#111827',
            color: '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <IconBell size={18} stroke={2} />
          {unreadAlertCount > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: '#EF4444',
                color: '#F9FAFB',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px #0D1117',
              }}
            >
              {unreadAlertCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => {
            if (canManageWorkload) setStaffWorkloadOpen((open) => !open);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            if (canManageWorkload) setStaffWorkloadOpen(true);
          }}
          aria-label="Staff workload"
          aria-haspopup="dialog"
          aria-expanded={staffWorkloadOpen}
          disabled={!canManageWorkload}
          title={
            canManageWorkload
              ? 'Staff workload'
              : `${emergencyRole.roleLabel} cannot reassign workload`
          }
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            border: '1px solid #1F2937',
            background: '#1C2333',
            color: '#9CA3AF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            cursor: canManageWorkload ? 'pointer' : 'not-allowed',
            opacity: canManageWorkload ? 1 : 0.6,
          }}
        >
          DA
        </button>
      </div>

      {alertDrawerOpen ? (
        <div
          role="dialog"
          aria-label="Alert drawer"
          style={{
            position: 'absolute',
            top: 48,
            right: 52,
            width: 320,
            maxHeight: 360,
            overflowY: 'auto',
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: 12,
            padding: 12,
            boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
            zIndex: 120,
          }}
        >
          <div style={{ color: '#F9FAFB', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Alerts
          </div>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => {
                  if (alert.patientId) selectPatient(alert.patientId);
                  setAlertDrawerOpen(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: '#0B1120',
                  border: '1px solid #1F2937',
                  borderRadius: 10,
                  color: '#F9FAFB',
                  padding: 10,
                  marginBottom: 8,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    color: alert.severity === 'Critical' ? '#EF4444' : '#F59E0B',
                    fontSize: 11,
                  }}
                >
                  {alert.severity}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{alert.title}</div>
                <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{alert.message}</div>
              </button>
            ))
          ) : (
            <div style={{ color: '#9CA3AF', fontSize: 12 }}>All clear</div>
          )}
        </div>
      ) : null}

      <StaffWorkloadPanel open={staffWorkloadOpen} onClose={() => setStaffWorkloadOpen(false)} />
    </header>
  );
}

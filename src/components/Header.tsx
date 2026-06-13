import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBell } from '@tabler/icons-react';
import { useEmergencyStore } from '../store/emergencyStore';
import type { CapacitySnapshot } from '../types/emergency';

const capacityColors: Record<CapacitySnapshot['band'], string> = {
  Green: '#10B981',
  Yellow: '#F59E0B',
  Orange: '#F97316',
  Red: '#EF4444',
};

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

function CapacityBadge({ capacity }: { capacity: CapacitySnapshot }) {
  const navigate = useNavigate();
  const color = capacityColors[capacity.band];

  return (
    <button
      type="button"
      onClick={() => navigate('/emergency/capacity')}
      style={{
        border: `1px solid ${color}`,
        background: `${color}1F`,
        color,
        borderRadius: 999,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background 180ms ease, border-color 180ms ease, color 180ms ease',
      }}
    >
      Capacity: {capacity.score} {capacity.band}
    </button>
  );
}

export function Header() {
  const navigate = useNavigate();
  const capacity = useEmergencyStore((store) => store.capacity);
  const alerts = useEmergencyStore((store) => store.alerts);
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);

  const unreadAlertCount = useMemo(
    () => alerts.filter((alert) => !alert.dismissed).length,
    [alerts],
  );

  useEffect(() => {
    const closePanels = () => {
      setAlertDrawerOpen(false);
      setStaffMenuOpen(false);
    };
    document.addEventListener('close-all-panels', closePanels);
    return () => document.removeEventListener('close-all-panels', closePanels);
  }, []);

  return (
    <header
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
        <span style={{ fontSize: 14, fontWeight: 500, color: '#F9FAFB' }}>Emergency OS</span>
        <Clock />
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <CapacityBadge capacity={capacity} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
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
          onClick={() => setStaffMenuOpen((open) => !open)}
          aria-label="Staff menu"
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
            cursor: 'pointer',
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
          <div style={{ color: '#F9FAFB', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Alerts</div>
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
                <div style={{ color: alert.severity === 'Critical' ? '#EF4444' : '#F59E0B', fontSize: 11 }}>
                  {alert.severity}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{alert.title}</div>
                <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{alert.message}</div>
              </button>
            ))
          ) : (
            <div style={{ color: '#9CA3AF', fontSize: 12 }}>No active alerts.</div>
          )}
        </div>
      ) : null}

      {staffMenuOpen ? (
        <div
          role="menu"
          aria-label="Staff menu placeholder"
          style={{
            position: 'absolute',
            top: 48,
            right: 16,
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: 12,
            color: '#F9FAFB',
            padding: 12,
            minWidth: 180,
            zIndex: 120,
            boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>Dr. A</div>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>Staff menu coming</div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            style={{
              marginTop: 10,
              background: '#1C2333',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#F9FAFB',
              padding: '7px 9px',
              cursor: 'pointer',
            }}
          >
            Open Settings
          </button>
        </div>
      ) : null}
    </header>
  );
}

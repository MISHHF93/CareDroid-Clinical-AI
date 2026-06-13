import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CopilotPanel } from './CopilotPanel';
import PatientDetailPanel from './PatientDetailPanel';
import { useEmergencyStore } from '../store/emergencyStore';
import { startReassessmentEngine } from '../engine/reassessmentEngine';
import { startCapacityEngine } from '../engine/capacityEngine';
import { EMERGENCY_OS_ROUTE_COMMANDS } from '../config/commandPalette.config';

type AppShellProps = {
  children: ReactNode;
};

type Command = {
  label: string;
  action: () => void;
};

function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const filteredCommands = useMemo(
    () => commands.filter((command) => command.label.toLowerCase().includes(query.trim().toLowerCase())),
    [commands, query],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 88,
        background: 'rgba(0,0,0,0.48)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: 'calc(100vw - 32px)',
          background: '#111827',
          border: '1px solid #1F2937',
          borderRadius: 14,
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
          placeholder="Type a command..."
          aria-label="Command search"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            border: 0,
            borderBottom: '1px solid #1F2937',
            background: '#0B1120',
            color: '#F9FAFB',
            padding: '14px 16px',
            fontSize: 15,
            outline: 'none',
          }}
        />
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
          {filteredCommands.map((command) => (
            <button
              key={command.label}
              type="button"
              onClick={() => {
                command.action();
                onClose();
              }}
              style={{
                width: '100%',
                border: '1px solid transparent',
                borderRadius: 10,
                background: 'transparent',
                color: '#F9FAFB',
                padding: '10px 12px',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 14,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = '#1C2333';
                event.currentTarget.style.borderColor = '#374151';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent';
                event.currentTarget.style.borderColor = 'transparent';
              }}
            >
              {command.label}
            </button>
          ))}
          {!filteredCommands.length ? (
            <div style={{ color: '#9CA3AF', padding: '12px 14px', fontSize: 13 }}>No commands found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const [showPalette, setShowPalette] = useState(false);

  const commands = useMemo<Command[]>(
    () => [
      {
        label: 'new patient',
        action: () => {
          navigate('/emergency/whiteboard');
          document.dispatchEvent(new Event('open-intake'));
        },
      },
      ...EMERGENCY_OS_ROUTE_COMMANDS.map((command) => ({
        label: command.label.toLowerCase(),
        action: () => {
          const action = command.build();
          if (action.type === 'OPEN_ROUTE') navigate(action.path);
        },
      })),
    ],
    [navigate],
  );

  useEffect(() => {
    const reassessmentInterval = startReassessmentEngine();
    const capacityInterval = startCapacityEngine();
    return () => {
      window.clearInterval(reassessmentInterval);
      window.clearInterval(capacityInterval);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useEmergencyStore.getState();
      const tag = (e.target as HTMLElement).tagName;
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      if (e.key === 'Escape') {
        store.selectPatient(null);
        document.dispatchEvent(new Event('close-all-panels'));
      }

      if (inInput) return;

      if (e.key === '/') {
        e.preventDefault();
        document.dispatchEvent(new Event('open-command-palette'));
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        document.dispatchEvent(new Event('open-intake'));
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const openPalette = () => setShowPalette(true);
    const closePanels = () => setShowPalette(false);
    document.addEventListener('open-command-palette', openPalette);
    document.addEventListener('close-all-panels', closePanels);
    return () => {
      document.removeEventListener('open-command-palette', openPalette);
      document.removeEventListener('close-all-panels', closePanels);
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: '#0A0E1A',
        color: '#F9FAFB',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
      </div>
      <PatientDetailPanel />
      <CopilotPanel />
      {showPalette ? <CommandPalette commands={commands} onClose={() => setShowPalette(false)} /> : null}
    </div>
  );
}

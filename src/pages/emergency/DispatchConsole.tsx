import { useState, useEffect, useCallback } from 'react';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import {
  createEmergencyCall,
  getAllActiveCalls,
  getDispatchSummary,
  updateCallStatus,
  updateCallPriority,
  type DispatchCallSummary,
} from '../../services/dispatchIntakeService';
import type { EmergencyCall, CallPriority } from '../../types/emergency';

const CALL_PRIORITY_COLORS: Record<CallPriority, string> = {
  Echo: MEDICAL_TYPE.statusCritical,
  Delta: '#c2410c',
  Charlie: '#b45309',
  Bravo: '#1d4ed8',
  Alpha: '#166534',
};

const CALL_PRIORITY_LABELS: Record<CallPriority, string> = {
  Echo: 'Echo — Life Threatening',
  Delta: 'Delta — Emergent',
  Charlie: 'Charlie — Urgent',
  Bravo: 'Bravo — Semi-Urgent',
  Alpha: 'Alpha — Non-Urgent',
};

function PriorityBadge({ priority }: { priority: CallPriority }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: '#fff',
        background: CALL_PRIORITY_COLORS[priority],
      }}
    >
      {priority}
    </span>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 10,
        background: MEDICAL_THEME.surfaceCard,
        border: highlight && value > 0 ? `1px solid ${MEDICAL_TYPE.statusCritical}` : `1px solid ${MEDICAL_THEME.border}`,
        minWidth: 90,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: highlight && value > 0 ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.ink }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function NewCallForm({ onCreated }: { onCreated: (call: EmergencyCall) => void }) {
  const [complaint, setComplaint] = useState('');
  const [address, setAddress] = useState('');
  const [callerName, setCallerName] = useState('');
  const [age, setAge] = useState('');
  const [conscious, setConscious] = useState(true);
  const [breathing, setBreathing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complaint.trim() || !address.trim()) return;
    setSubmitting(true);
    const call = createEmergencyCall({
      chiefComplaint: complaint.trim(),
      address: address.trim(),
      callerName: callerName.trim() || undefined,
      patientAge: age ? Number(age) : undefined,
      patientConscious: conscious,
      patientBreathing: breathing,
      dispatcherId: 'dispatcher-current',
      dispatcherName: 'On-duty Dispatcher',
    });
    onCreated(call);
    setComplaint('');
    setAddress('');
    setCallerName('');
    setAge('');
    setConscious(true);
    setBreathing(true);
    setSubmitting(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${MEDICAL_THEME.border}`,
    background: MEDICAL_THEME.surfacePage,
    color: MEDICAL_THEME.ink,
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: MEDICAL_THEME.inkSubtle,
    marginBottom: 4,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={labelStyle}>Chief Complaint *</label>
        <input
          style={inputStyle}
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          placeholder="e.g. Chest pain, unresponsive, MVA..."
          required
        />
      </div>
      <div>
        <label style={labelStyle}>Incident Address *</label>
        <input
          style={inputStyle}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address or landmark"
          required
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Caller Name</label>
          <input style={inputStyle} value={callerName} onChange={(e) => setCallerName(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label style={labelStyle}>Patient Age</label>
          <input style={inputStyle} type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="If known" min={0} max={120} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={conscious} onChange={(e) => setConscious(e.target.checked)} />
          Conscious
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={breathing} onChange={(e) => setBreathing(e.target.checked)} />
          Breathing
        </label>
      </div>
      <button
        type="submit"
        disabled={submitting || !complaint.trim() || !address.trim()}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: MEDICAL_THEME.accent,
          color: MEDICAL_THEME.onAccent,
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        Log New Call
      </button>
    </form>
  );
}

function CallCard({
  call,
  onPriorityChange,
  onStatusChange,
}: {
  call: EmergencyCall;
  onPriorityChange: (id: string, p: CallPriority) => void;
  onStatusChange: (id: string, s: EmergencyCall['status']) => void;
}) {
  const age = call.receivedAt ? Math.floor((Date.now() - new Date(call.receivedAt).getTime()) / 60_000) : 0;

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${MEDICAL_THEME.border}`,
        background: MEDICAL_THEME.surfaceCard,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, letterSpacing: '0.06em' }}>
            {call.callNumber}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: MEDICAL_THEME.ink, marginTop: 2 }}>
            {call.chiefComplaint}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <PriorityBadge priority={call.callPriority} />
          <span style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}>{age}m ago</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>{call.location.address}</div>
      {(call.patientConscious === false || call.patientBreathing === false) && (
        <div style={{ fontSize: 12, color: MEDICAL_TYPE.statusCritical, fontWeight: 700 }}>
          {call.patientConscious === false && 'UNCONSCIOUS '}
          {call.patientBreathing === false && '— NOT BREATHING'}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <select
          value={call.callPriority}
          onChange={(e) => onPriorityChange(call.id, e.target.value as CallPriority)}
          style={{
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 6,
            border: `1px solid ${MEDICAL_THEME.border}`,
            background: MEDICAL_THEME.surfacePage,
            color: MEDICAL_THEME.ink,
          }}
        >
          {(Object.keys(CALL_PRIORITY_LABELS) as CallPriority[]).map((p) => (
            <option key={p} value={p}>{CALL_PRIORITY_LABELS[p]}</option>
          ))}
        </select>
        <select
          value={call.status}
          onChange={(e) => onStatusChange(call.id, e.target.value as EmergencyCall['status'])}
          style={{
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 6,
            border: `1px solid ${MEDICAL_THEME.border}`,
            background: MEDICAL_THEME.surfacePage,
            color: MEDICAL_THEME.ink,
          }}
        >
          <option value="received">Received</option>
          <option value="triaged">Triaged</option>
          <option value="dispatched">Dispatched</option>
          <option value="ems_en_route">EMS En Route</option>
          <option value="ems_on_scene">EMS On Scene</option>
          <option value="ems_transporting">Transporting</option>
          <option value="hospital_notified">Hospital Notified</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
  );
}

export default function DispatchConsole() {
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [summary, setSummary] = useState<DispatchCallSummary>({
    total: 0, received: 0, dispatched: 0, enRoute: 0, onScene: 0, transporting: 0, echoCount: 0, deltaCount: 0,
  });
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(() => {
    setCalls(getAllActiveCalls().sort((a, b) => {
      const priorityOrder: CallPriority[] = ['Echo', 'Delta', 'Charlie', 'Bravo', 'Alpha'];
      return priorityOrder.indexOf(a.callPriority) - priorityOrder.indexOf(b.callPriority);
    }));
    setSummary(getDispatchSummary());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  function handleCreated(call: EmergencyCall) {
    setShowForm(false);
    refresh();
    void call;
  }

  function handlePriorityChange(id: string, priority: CallPriority) {
    updateCallPriority(id, priority);
    refresh();
  }

  function handleStatusChange(id: string, status: EmergencyCall['status']) {
    updateCallStatus(id, status);
    refresh();
  }

  return (
    <div
      style={{
        padding: 24,
        minHeight: '100%',
        background: MEDICAL_THEME.surfacePage,
        color: MEDICAL_THEME.ink,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MEDICAL_THEME.inkSubtle }}>
            CareDroid
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Dispatch Console</h1>
          <div style={{ fontSize: 13, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
            Emergency call intake · CAD coordination · EMS dispatch
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: showForm ? MEDICAL_THEME.border : MEDICAL_THEME.accent,
            color: showForm ? MEDICAL_THEME.ink : MEDICAL_THEME.onAccent,
            fontWeight: 700,
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : '+ Log Call'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <SummaryCard label="Active Calls" value={summary.total} />
        <SummaryCard label="Echo" value={summary.echoCount} highlight />
        <SummaryCard label="Delta" value={summary.deltaCount} />
        <SummaryCard label="Dispatched" value={summary.dispatched} />
        <SummaryCard label="En Route" value={summary.enRoute} />
        <SummaryCard label="On Scene" value={summary.onScene} />
        <SummaryCard label="Transporting" value={summary.transporting} />
      </div>

      {showForm && (
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            border: `1px solid ${MEDICAL_THEME.border}`,
            background: MEDICAL_THEME.surfaceCard,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>New Emergency Call</div>
          <NewCallForm onCreated={handleCreated} />
        </div>
      )}

      {calls.length === 0 ? (
        <div
          style={{
            padding: 40,
            borderRadius: 12,
            border: `1px solid ${MEDICAL_THEME.border}`,
            background: MEDICAL_THEME.surfaceCard,
            textAlign: 'center',
            color: MEDICAL_THEME.inkSubtle,
            fontSize: 14,
          }}
        >
          No active calls. Log a call using the button above.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {calls.map((call) => (
            <CallCard
              key={call.id}
              call={call}
              onPriorityChange={handlePriorityChange}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <div
        role="note"
        style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(239,68,68,0.07)',
          border: `1px solid rgba(239,68,68,0.2)`,
          fontSize: 12,
          color: MEDICAL_THEME.inkSubtle,
        }}
      >
        CareDroid AI is decision support only. All dispatch decisions must be made by licensed dispatchers following
        local medical protocols. AI never replaces dispatcher judgment.
      </div>
    </div>
  );
}

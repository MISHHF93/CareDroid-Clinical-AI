import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../../config/medicalTheme.constants';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  createEmergencyCall,
  getAllActiveCalls,
  getDispatchSummary,
  updateCallStatus,
  updateCallPriority,
  type DispatchCallSummary,
} from '../../services/dispatchIntakeService';
import {
  cadDispatchUnit,
  cadUpdateAssignmentStatus,
  getAvailableUnits,
  getCADSystemSummary,
  type CADUnit,
  type CADUnitType,
} from '../../services/cadIntegrationService';
import { createReadinessPlan } from '../../services/edReadinessService';
import type { EmergencyCall, CallPriority, DispatchAssignment } from '../../types/emergency';
import './DispatchConsole.css';

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

function autoPriority(conscious: boolean, breathing: boolean, complaint: string): CallPriority {
  if (!conscious && !breathing) return 'Echo';
  if (!conscious || !breathing) return 'Delta';
  const criticalKeywords = /chest pain|stemi|stroke|unresponsive|cardiac arrest|trauma|overdose|sepsis/i;
  if (criticalKeywords.test(complaint)) return 'Delta';
  const urgentKeywords = /difficulty breathing|shortness of breath|severe pain|unconscious|syncope|altered/i;
  if (urgentKeywords.test(complaint)) return 'Charlie';
  return 'Charlie';
}

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
      className={`dispatch-console__summary-card${highlight && value > 0 ? ' dispatch-console__summary-card--highlight' : ''}`}
      style={{
        padding: '12px 16px',
        minWidth: 90,
        border: highlight && value > 0 ? `1px solid ${MEDICAL_TYPE.statusCritical}` : undefined,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: highlight && value > 0 ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.ink }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// ── New Call Form ─────────────────────────────────────────────────────────────

function NewCallForm({ onCreated }: { onCreated: (call: EmergencyCall) => void }) {
  const [complaint, setComplaint] = useState('');
  const [address, setAddress] = useState('');
  const [callerName, setCallerName] = useState('');
  const [age, setAge] = useState('');
  const [conscious, setConscious] = useState(true);
  const [breathing, setBreathing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const detectedPriority = autoPriority(conscious, breathing, complaint);
  const isPriorityCritical = detectedPriority === 'Echo' || detectedPriority === 'Delta';

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
    updateCallPriority(call.id, detectedPriority);
    onCreated({ ...call, callPriority: detectedPriority });
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

      {/* Auto-priority indicator */}
      {complaint.trim() && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: isPriorityCritical ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isPriorityCritical ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 700, color: MEDICAL_THEME.inkSubtle }}>Auto-detected priority:</span>
          <PriorityBadge priority={detectedPriority} />
          <span style={{ color: MEDICAL_THEME.inkSubtle }}>— adjust after intake if needed</span>
        </div>
      )}

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
        {(!conscious || !breathing) && (
          <span style={{ fontSize: 12, fontWeight: 800, color: MEDICAL_TYPE.statusCritical }}>
            {!conscious && !breathing ? '⚠ UNCONSCIOUS + NOT BREATHING — Echo priority' : `⚠ ${!conscious ? 'UNCONSCIOUS' : 'NOT BREATHING'} — Delta priority`}
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={submitting || !complaint.trim() || !address.trim()}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: isPriorityCritical && complaint.trim() ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.accent,
          color: MEDICAL_THEME.onAccent,
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {isPriorityCritical && complaint.trim() ? '⚡ Log Critical Call' : 'Log New Call'}
      </button>
    </form>
  );
}

// ── CAD Dispatch Panel ────────────────────────────────────────────────────────

function CADDispatchPanel({
  call,
  onDispatched,
}: {
  call: EmergencyCall;
  onDispatched: (assignment: DispatchAssignment) => void;
}) {
  const [availableUnits, setAvailableUnits] = useState<CADUnit[]>(getAvailableUnits());
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [requiresALS, setRequiresALS] = useState(
    call.callPriority === 'Echo' || call.callPriority === 'Delta',
  );
  const [requiresAir, setRequiresAir] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unitType: CADUnitType = requiresAir ? 'Air' : requiresALS ? 'ALS' : 'BLS';
    setAvailableUnits(getAvailableUnits(unitType));
    setSelectedUnitId('');
  }, [requiresALS, requiresAir]);

  function handleDispatch() {
    setDispatching(true);
    setError(null);
    const result = cadDispatchUnit({
      callId: call.id,
      dispatchedBy: 'dispatcher-current',
      priority: call.callPriority,
      requiresALS,
      requiresAir,
    });
    if ('error' in result) {
      setError(result.error);
      setDispatching(false);
      return;
    }
    updateCallStatus(call.id, 'dispatched');
    void import('../../services/emergencyCareJourneyOrchestrator').then(({ onEmsUnitDispatched }) =>
      onEmsUnitDispatched(call, result),
    );
    onDispatched(result);
    setDispatching(false);
  }

  const isCritical = call.callPriority === 'Echo' || call.callPriority === 'Delta';

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 10,
        border: `2px solid ${isCritical ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.border}`,
        background: isCritical ? 'rgba(239,68,68,0.05)' : MEDICAL_THEME.surfaceCard,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong style={{ fontSize: 14, color: isCritical ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.ink }}>
          {isCritical ? '⚡ Dispatch Unit Now' : 'Dispatch Unit'}
        </strong>
        <PriorityBadge priority={call.callPriority} />
        {isCritical && (
          <span style={{ fontSize: 11, color: MEDICAL_TYPE.statusCritical, fontWeight: 700 }}>
            3-minute response target
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={requiresALS} onChange={(e) => setRequiresALS(e.target.checked)} />
          ALS required
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={requiresAir} onChange={(e) => setRequiresAir(e.target.checked)} />
          Air transport
        </label>
      </div>

      {availableUnits.length === 0 ? (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: MEDICAL_TYPE.statusCritical, fontWeight: 700 }}>
          ⚠ No available {requiresAir ? 'Air' : requiresALS ? 'ALS' : 'BLS'} units — all assigned. Manually assign or request mutual aid.
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 6 }}>
            Available units ({availableUnits.length}):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {availableUnits.map((unit) => (
              <label
                key={unit.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${selectedUnitId === unit.id ? MEDICAL_THEME.accent : MEDICAL_THEME.border}`,
                  background: selectedUnitId === unit.id ? `color-mix(in srgb, ${MEDICAL_THEME.accent} 10%, transparent)` : 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                <input
                  type="radio"
                  name="unit"
                  value={unit.id}
                  checked={selectedUnitId === unit.id}
                  onChange={() => setSelectedUnitId(unit.id)}
                />
                <strong>{unit.callSign}</strong>
                <span style={{ color: MEDICAL_THEME.inkSubtle }}>
                  {unit.type} · {unit.crewSize} crew · {unit.baseLocation}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 13, color: MEDICAL_TYPE.statusCritical }}>
          {error}
        </div>
      )}

      <button
        onClick={handleDispatch}
        disabled={dispatching || availableUnits.length === 0}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: isCritical ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.accent,
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          cursor: dispatching || availableUnits.length === 0 ? 'not-allowed' : 'pointer',
          opacity: dispatching || availableUnits.length === 0 ? 0.6 : 1,
        }}
      >
        {dispatching ? 'Dispatching...' : `Dispatch to ${call.location.address}`}
      </button>
    </div>
  );
}

// ── ED Pre-Alert Panel ────────────────────────────────────────────────────────

function EDPreAlertPanel({
  call,
  assignment,
  onAlertSent,
}: {
  call: EmergencyCall;
  assignment: DispatchAssignment;
  onAlertSent: () => void;
}) {
  const [resources, setResources] = useState<string[]>([]);
  const [specialtyTeams, setSpecialtyTeams] = useState<string[]>([]);
  const [bay, setBay] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resourceOptions = ['STEMI protocol', 'Stroke protocol', 'Trauma bay', 'Sepsis protocol', 'Airway kit', 'Blood products'];
  const specialtyOptions = ['Cardiology', 'Neurology', 'Trauma surgery', 'Anesthesia', 'Pharmacy'];

  function toggleResource(r: string) {
    setResources((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }
  function toggleSpecialty(s: string) {
    setSpecialtyTeams((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function handleSendAlert() {
    setSending(true);
    const eta = new Date(Date.now() + (assignment.estimatedResponseMinutes ?? 8) * 60_000).toISOString();
    createReadinessPlan({
      callId: call.id,
      linkedEmsArrivalId: call.linkedEmsArrivalId || `ems-${call.id}`,
      preparedBy: 'dispatcher-current',
      expectedArrivalAt: eta,
      activatedResources: resources,
      specialtyTeams,
      assignedBay: bay.trim() || undefined,
    });
    updateCallStatus(call.id, 'hospital_notified');
    setSending(false);
    setSent(true);
    onAlertSent();
  }

  if (sent) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
        <div style={{ fontWeight: 700, color: '#10B981', fontSize: 14 }}>✓ ED Pre-Alert Sent</div>
        <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 4 }}>
          ED Readiness plan created. ETA: {assignment.estimatedResponseMinutes} min.
          Unit: {assignment.unit.callSign}.
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Link to={CANONICAL_ROUTES.emergencyEdReadiness} className="emergency-route-action-chip" style={{ textDecoration: 'none', fontSize: 13 }}>
            Open ED Readiness →
          </Link>
          <Link to={CANONICAL_ROUTES.emergencyEms} className="emergency-route-action-chip" style={{ textDecoration: 'none', fontSize: 13 }}>
            EMS Pipeline →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${MEDICAL_THEME.border}`, background: MEDICAL_THEME.surfaceCard, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <strong style={{ fontSize: 14 }}>Send Hospital Pre-Alert</strong>
        <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle, marginTop: 2 }}>
          Unit {assignment.unit.callSign} dispatched · ETA {assignment.estimatedResponseMinutes} min · Notify ED and activate protocols.
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 6 }}>Activate resources:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {resourceOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleResource(r)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: `1px solid ${resources.includes(r) ? MEDICAL_THEME.accent : MEDICAL_THEME.border}`,
                background: resources.includes(r) ? `color-mix(in srgb, ${MEDICAL_THEME.accent} 15%, transparent)` : 'transparent',
                color: resources.includes(r) ? MEDICAL_THEME.ink : MEDICAL_THEME.inkSubtle,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 6 }}>Specialty teams:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {specialtyOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpecialty(s)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: `1px solid ${specialtyTeams.includes(s) ? '#8B5CF6' : MEDICAL_THEME.border}`,
                background: specialtyTeams.includes(s) ? 'rgba(139,92,246,0.12)' : 'transparent',
                color: specialtyTeams.includes(s) ? '#7C3AED' : MEDICAL_THEME.inkSubtle,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: MEDICAL_THEME.inkSubtle, marginBottom: 4 }}>
          Assign bay / room (optional)
        </label>
        <input
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${MEDICAL_THEME.border}`, background: MEDICAL_THEME.surfacePage, color: MEDICAL_THEME.ink, fontSize: 14, boxSizing: 'border-box' }}
          value={bay}
          onChange={(e) => setBay(e.target.value)}
          placeholder="e.g. Trauma Bay 1, Resus Room 2..."
        />
      </div>

      <button
        onClick={handleSendAlert}
        disabled={sending}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: '#10B981',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          cursor: sending ? 'not-allowed' : 'pointer',
          opacity: sending ? 0.6 : 1,
        }}
      >
        {sending ? 'Sending...' : '→ Send Pre-Alert to ED'}
      </button>
    </div>
  );
}

// ── Call Card ─────────────────────────────────────────────────────────────────

function CallCard({
  call,
  onPriorityChange,
  onStatusChange,
}: {
  call: EmergencyCall;
  onPriorityChange: (id: string, p: CallPriority) => void;
  onStatusChange: (id: string, s: EmergencyCall['status']) => void;
}) {
  const ageMinutes = call.receivedAt ? Math.floor((Date.now() - new Date(call.receivedAt).getTime()) / 60_000) : 0;
  const isOverTarget = ageMinutes >= 3 && (call.callPriority === 'Echo' || call.callPriority === 'Delta');
  const [showDispatch, setShowDispatch] = useState(false);
  const [assignment, setAssignment] = useState<DispatchAssignment | null>(null);
  const [showPreAlert, setShowPreAlert] = useState(false);

  function handleDispatched(a: DispatchAssignment) {
    setAssignment(a);
    setShowDispatch(false);
    setShowPreAlert(true);
    onStatusChange(call.id, 'dispatched');
  }

  const needsDispatch = call.status === 'received' || call.status === 'triaged';
  const isDispatched = call.status === 'dispatched' || call.status === 'ems_en_route' || call.status === 'hospital_notified';

  return (
    <div
      className={`dispatch-console__call-card${isOverTarget ? ' dispatch-console__call-card--breach' : ''}`}
      style={{
        padding: 14,
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
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isOverTarget ? MEDICAL_TYPE.statusCritical : MEDICAL_THEME.inkSubtle,
            }}
          >
            {isOverTarget ? `⚠ ${ageMinutes}m — BREACH` : `${ageMinutes}m ago`}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>{call.location.address}</div>

      {(call.patientConscious === false || call.patientBreathing === false) && (
        <div style={{ fontSize: 12, color: MEDICAL_TYPE.statusCritical, fontWeight: 700 }}>
          {call.patientConscious === false && 'UNCONSCIOUS '}
          {call.patientBreathing === false && '— NOT BREATHING'}
        </div>
      )}

      {/* Status pipeline */}
      <div style={{ display: 'flex', gap: 4, fontSize: 11, flexWrap: 'wrap', marginTop: 2 }}>
        {(['received', 'dispatched', 'ems_en_route', 'ems_on_scene', 'ems_transporting', 'hospital_notified'] as const).map((s) => (
          <span
            key={s}
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: call.status === s ? MEDICAL_THEME.accent : 'transparent',
              color: call.status === s ? MEDICAL_THEME.onAccent : MEDICAL_THEME.inkSubtle,
              fontWeight: call.status === s ? 700 : 400,
              border: `1px solid ${call.status === s ? MEDICAL_THEME.accent : MEDICAL_THEME.border}`,
            }}
          >
            {s.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <select
          value={call.callPriority}
          onChange={(e) => onPriorityChange(call.id, e.target.value as CallPriority)}
          style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${MEDICAL_THEME.border}`, background: MEDICAL_THEME.surfacePage, color: MEDICAL_THEME.ink }}
        >
          {(Object.keys(CALL_PRIORITY_LABELS) as CallPriority[]).map((p) => (
            <option key={p} value={p}>{CALL_PRIORITY_LABELS[p]}</option>
          ))}
        </select>

        <select
          value={call.status}
          onChange={(e) => onStatusChange(call.id, e.target.value as EmergencyCall['status'])}
          style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${MEDICAL_THEME.border}`, background: MEDICAL_THEME.surfacePage, color: MEDICAL_THEME.ink }}
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

        {needsDispatch && !showDispatch && (
          <button
            type="button"
            onClick={() => setShowDispatch(true)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: call.callPriority === 'Echo' || call.callPriority === 'Delta'
                ? MEDICAL_TYPE.statusCritical
                : MEDICAL_THEME.accent,
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Dispatch Unit →
          </button>
        )}

        {isDispatched && !showPreAlert && !assignment && (
          <button
            type="button"
            onClick={() => setShowPreAlert(true)}
            style={{ padding: '4px 10px', borderRadius: 6, background: '#10B981', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}
          >
            Pre-Alert ED →
          </button>
        )}
      </div>

      {showDispatch && (
        <CADDispatchPanel call={call} onDispatched={handleDispatched} />
      )}

      {showPreAlert && (
        <EDPreAlertPanel
          call={call}
          assignment={assignment || {
            id: 'manual',
            callId: call.id,
            assignedAt: new Date().toISOString(),
            unit: { id: 'manual', callSign: 'Manual', type: 'ALS', crewSize: 2, baseLocation: '' },
            dispatchedBy: 'dispatcher-current',
            estimatedResponseMinutes: 8,
            status: 'en_route',
          }}
          onAlertSent={() => { /* refresh handled by interval */ }}
        />
      )}
    </div>
  );
}

// ── CAD Unit Board ────────────────────────────────────────────────────────────

function CADUnitBoard() {
  const [cadSummary, setCadSummary] = useState(getCADSystemSummary());

  useEffect(() => {
    const id = setInterval(() => setCadSummary(getCADSystemSummary()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dispatch-console__unit-board" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>CAD Unit Board</strong>
        <span style={{ fontSize: 11, color: MEDICAL_THEME.inkSubtle }}>Auto-refreshes every 5s</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SummaryCard label="Available" value={cadSummary.availableUnits} />
        <SummaryCard label="Dispatched" value={cadSummary.dispatchedUnits} />
        <SummaryCard label="En Route" value={cadSummary.enRouteUnits} />
        <SummaryCard label="On Scene" value={cadSummary.onSceneUnits} />
        <SummaryCard label="Transporting" value={cadSummary.transportingUnits} highlight />
        <SummaryCard label="Total" value={cadSummary.totalUnits} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Link to={CANONICAL_ROUTES.emergencyEdReadiness} style={{ fontSize: 13, color: MEDICAL_THEME.accent, textDecoration: 'none', fontWeight: 600 }}>
          ED Readiness →
        </Link>
        <Link to={CANONICAL_ROUTES.emergencyEms} style={{ fontSize: 13, color: MEDICAL_THEME.accent, textDecoration: 'none', fontWeight: 600 }}>
          EMS Pipeline →
        </Link>
        <Link to={CANONICAL_ROUTES.emergencyCommandCenter} style={{ fontSize: 13, color: MEDICAL_THEME.accent, textDecoration: 'none', fontWeight: 600 }}>
          Command Center →
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

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
    void import('../../services/emergencyCareJourneyOrchestrator').then(({ onDispatchCallStatusChange }) =>
      onDispatchCallStatusChange(id, status),
    );
    refresh();
  }

  const criticalPending = calls.filter(
    (c) => (c.callPriority === 'Echo' || c.callPriority === 'Delta') && c.status === 'received',
  ).length;

  return (
    <div className="dispatch-console">
      {/* Sticky critical banner */}
      {criticalPending > 0 && (
        <div
          className="dispatch-console__banner"
          style={{
            padding: '10px 16px',
            background: 'rgba(239,68,68,0.08)',
            borderColor: `color-mix(in srgb, ${MEDICAL_TYPE.statusCritical} 35%, var(--cdl-clinical-border, #e2e8f0))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <strong style={{ color: MEDICAL_TYPE.statusCritical, fontSize: 14 }}>
              {criticalPending} Echo/Delta call{criticalPending > 1 ? 's' : ''} awaiting dispatch — 3-minute target
            </strong>
          </div>
          <span style={{ fontSize: 12, color: MEDICAL_THEME.inkSubtle }}>Scroll to call card → Dispatch Unit</span>
        </div>
      )}

      <div className="dispatch-console__header">
        <div className="dispatch-console__title-block">
          <div className="dispatch-console__eyebrow">CareDroid</div>
          <h1>Dispatch Console</h1>
          <div className="dispatch-console__subtitle">
            Emergency call intake · CAD unit dispatch · ED pre-alert
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={`dispatch-console__primary-btn${showForm ? ' dispatch-console__primary-btn--muted' : ''}`}
        >
          {showForm ? 'Cancel' : '+ Log Call'}
        </button>
      </div>

      {/* Summary metrics */}
      <div className="dispatch-console__summary-row">
        <SummaryCard label="Active Calls" value={summary.total} />
        <SummaryCard label="Echo" value={summary.echoCount} highlight />
        <SummaryCard label="Delta" value={summary.deltaCount} />
        <SummaryCard label="Dispatched" value={summary.dispatched} />
        <SummaryCard label="En Route" value={summary.enRoute} />
        <SummaryCard label="On Scene" value={summary.onScene} />
        <SummaryCard label="Transporting" value={summary.transporting} />
      </div>

      {/* New call form */}
      {showForm && (
        <div className="dispatch-console__form" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>New Emergency Call</div>
          <NewCallForm onCreated={handleCreated} />
        </div>
      )}

      {/* CAD Unit Board */}
      <CADUnitBoard />

      {/* Call list */}
      {calls.length === 0 ? (
        <div className="dispatch-console__empty" style={{ padding: 40, textAlign: 'center', color: MEDICAL_THEME.inkSubtle, fontSize: 14 }}>
          No active calls. Log a call using the button above.
        </div>
      ) : (
        <div className="dispatch-console__call-grid">
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
        className="dispatch-console__notice"
        style={{ padding: '10px 14px', fontSize: 12, color: MEDICAL_THEME.inkSubtle }}
      >
        CareDroid AI is decision support only. All dispatch decisions must be made by licensed dispatchers following
        local medical protocols. Unit assignment, pre-alert, and ED readiness activation require dispatcher authorization.
      </div>
    </div>
  );
}

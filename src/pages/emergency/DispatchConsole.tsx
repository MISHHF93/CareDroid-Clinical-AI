import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  getAvailableUnits,
  getCADSystemSummary,
  type CADUnit,
  type CADUnitType,
} from '../../services/cadIntegrationService';
import { createReadinessPlan } from '../../services/edReadinessService';
import type {
  EmergencyCall,
  CallPriority,
  DispatchAssignment,
  EMSArrival,
} from '../../types/emergency';
import EdDataSourceBanner from '../../components/emergency/EdDataSourceBanner';
import useEmergencyOperatingSurface from '../../hooks/useEmergencyOperatingSurface';
import { useEMSIntake } from '../../hooks/useEmergencyOs';
import { useEmergencyStore } from '../../store/emergencyStore';
import { EmergencyRoutePage } from './emergencyRouteShared';
import './DispatchConsole.css';
import './emergency-route.css';

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
  const criticalKeywords =
    /chest pain|stemi|stroke|unresponsive|cardiac arrest|trauma|overdose|sepsis/i;
  if (criticalKeywords.test(complaint)) return 'Delta';
  const urgentKeywords =
    /difficulty breathing|shortness of breath|severe pain|unconscious|syncope|altered/i;
  if (urgentKeywords.test(complaint)) return 'Charlie';
  return 'Charlie';
}

function PriorityBadge({ priority }: { priority: CallPriority }) {
  return (
    <span className="dc-priority-badge" data-priority={priority}>
      {priority}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`dispatch-console__summary-card${highlight && value > 0 ? ' dispatch-console__summary-card--highlight' : ''}`}
    >
      <div className="dispatch-console__summary-card__value">{value}</div>
      <div className="dispatch-console__summary-card__label">{label}</div>
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

  return (
    <form onSubmit={handleSubmit} className="u-flex-col-gap-12">
      <div>
        <label className="dc-field-label" htmlFor="dispatch-complaint">
          Chief Complaint *
        </label>
        <input
          id="dispatch-complaint"
          className="dc-field-input"
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          placeholder="e.g. Chest pain, unresponsive, MVA..."
          required
        />
      </div>

      {/* Auto-priority indicator */}
      {complaint.trim() && (
        <div className={isPriorityCritical ? 'dc-alert-soft' : 'dc-success-panel'}>
          <span className="dc-muted-strong">Auto-detected priority:</span>
          <PriorityBadge priority={detectedPriority} />
          <span className="dc-muted">— adjust after intake if needed</span>
        </div>
      )}

      <div>
        <label className="dc-field-label" htmlFor="dispatch-address">
          Incident Address *
        </label>
        <input
          id="dispatch-address"
          className="dc-field-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address or landmark"
          required
        />
      </div>
      <div className="u-grid-2-gap-10">
        <div>
          <label className="dc-field-label" htmlFor="dispatch-caller-name">
            Caller Name
          </label>
          <input
            id="dispatch-caller-name"
            className="dc-field-input"
            value={callerName}
            onChange={(e) => setCallerName(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="dc-field-label" htmlFor="dispatch-patient-age">
            Patient Age
          </label>
          <input
            id="dispatch-patient-age"
            className="dc-field-input"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="If known"
            min={0}
            max={120}
          />
        </div>
      </div>
      <div className="dc-row-gap-16">
        <label className="u-click-row">
          <input
            type="checkbox"
            checked={conscious}
            onChange={(e) => setConscious(e.target.checked)}
          />
          Conscious
        </label>
        <label className="u-click-row">
          <input
            type="checkbox"
            checked={breathing}
            onChange={(e) => setBreathing(e.target.checked)}
          />
          Breathing
        </label>
        {(!conscious || !breathing) && (
          <span className="dc-critical-12-badge">
            {!conscious && !breathing
              ? '⚠ UNCONSCIOUS + NOT BREATHING — Echo priority'
              : `⚠ ${!conscious ? 'UNCONSCIOUS' : 'NOT BREATHING'} — Delta priority`}
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={submitting || !complaint.trim() || !address.trim()}
        className={`dc-btn-primary${isPriorityCritical && complaint.trim() ? ' dc-btn-primary--critical' : ''}${submitting ? ' dc-btn-primary--disabled' : ''}`}
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
    <div className={`dc-panel ${isCritical ? 'dc-call-card--critical' : ''}`}>
      <div className="u-flex-center u-gap-8">
        <strong className={isCritical ? 'dc-title-14-critical' : 'dc-title-14'}>
          {isCritical ? '⚡ Dispatch Unit Now' : 'Dispatch Unit'}
        </strong>
        <PriorityBadge priority={call.callPriority} />
        {isCritical && <span className="dc-critical-11">3-minute response target</span>}
      </div>

      <div className="dc-row-gap-12-wrap">
        <label className="u-click-row">
          <input
            type="checkbox"
            checked={requiresALS}
            onChange={(e) => setRequiresALS(e.target.checked)}
          />
          ALS required
        </label>
        <label className="u-click-row">
          <input
            type="checkbox"
            checked={requiresAir}
            onChange={(e) => setRequiresAir(e.target.checked)}
          />
          Air transport
        </label>
      </div>

      {availableUnits.length === 0 ? (
        <div className="dc-alert-soft">
          ⚠ No available {requiresAir ? 'Air' : requiresALS ? 'ALS' : 'BLS'} units — all assigned.
          Manually assign or request mutual aid.
        </div>
      ) : (
        <div>
          <div className="dc-field-label-mb6">Available units ({availableUnits.length}):</div>
          <div className="u-flex-col u-gap-4">
            {availableUnits.map((unit) => (
              <label
                key={unit.id}
                className={`dc-unit-option dc-resource-chip ${selectedUnitId === unit.id ? 'dc-resource-chip--on' : ''}`}
              >
                <input
                  type="radio"
                  name="unit"
                  value={unit.id}
                  checked={selectedUnitId === unit.id}
                  onChange={() => setSelectedUnitId(unit.id)}
                />
                <strong>{unit.callSign}</strong>
                <span className="dc-muted">
                  {unit.type} · {unit.crewSize} crew · {unit.baseLocation}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <div className="dc-alert-soft">{error}</div>}

      <button
        type="button"
        onClick={handleDispatch}
        disabled={dispatching || availableUnits.length === 0}
        className={`dc-btn-primary${isCritical ? ' dc-btn-primary--critical' : ''}`}
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

  const resourceOptions = [
    'STEMI protocol',
    'Stroke protocol',
    'Trauma bay',
    'Sepsis protocol',
    'Airway kit',
    'Blood products',
  ];
  const specialtyOptions = ['Cardiology', 'Neurology', 'Trauma surgery', 'Anesthesia', 'Pharmacy'];

  function toggleResource(r: string) {
    setResources((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }
  function toggleSpecialty(s: string) {
    setSpecialtyTeams((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function handleSendAlert() {
    setSending(true);
    const eta = new Date(
      Date.now() + (assignment.estimatedResponseMinutes ?? 8) * 60_000,
    ).toISOString();
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
      <div className="dc-success-panel">
        <div className="dc-success-title">✓ ED Pre-Alert Sent</div>
        <div className="dc-muted-12-mt4">
          ED Readiness plan created. ETA: {assignment.estimatedResponseMinutes} min. Unit:{' '}
          {assignment.unit.callSign}.
        </div>
        <div className="dc-row-gap-8-wrap-mt">
          <Link
            to={CANONICAL_ROUTES.emergencyEdReadiness}
            className="emergency-route-action-chip dc-link-plain"
          >
            Open ED Readiness →
          </Link>
          <Link
            to={CANONICAL_ROUTES.emergencyEms}
            className="emergency-route-action-chip dc-link-plain"
          >
            EMS Pipeline →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dc-panel">
      <div>
        <strong className="dc-title-14">Send Hospital Pre-Alert</strong>
        <div className="dc-muted-12-mt">
          Unit {assignment.unit.callSign} dispatched · ETA {assignment.estimatedResponseMinutes} min
          · Notify ED and activate protocols.
        </div>
      </div>

      <div>
        <div className="dc-field-label-mb6">Activate resources:</div>
        <div className="u-flex-wrap u-gap-6">
          {resourceOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggleResource(r)}
              className={`dc-resource-chip ${resources.includes(r) ? 'dc-resource-chip--on' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="dc-field-label-mb6">Specialty teams:</div>
        <div className="u-flex-wrap u-gap-6">
          {specialtyOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpecialty(s)}
              className={`dc-resource-chip ${specialtyTeams.includes(s) ? 'dc-resource-chip--on' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="dc-field-label" htmlFor="dispatch-bay">
          Assign bay / room (optional)
        </label>
        <input
          id="dispatch-bay"
          className="dc-field-input"
          value={bay}
          onChange={(e) => setBay(e.target.value)}
          placeholder="e.g. Trauma Bay 1, Resus Room 2..."
        />
      </div>

      <button
        type="button"
        onClick={handleSendAlert}
        disabled={sending}
        className="dc-btn-primary dc-btn-success"
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
  const ageMinutes = call.receivedAt
    ? Math.floor((Date.now() - new Date(call.receivedAt).getTime()) / 60_000)
    : 0;
  const isOverTarget =
    ageMinutes >= 3 && (call.callPriority === 'Echo' || call.callPriority === 'Delta');
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
  const isDispatched =
    call.status === 'dispatched' ||
    call.status === 'ems_en_route' ||
    call.status === 'hospital_notified';

  return (
    <div
      className={`dc-call-card dispatch-console__call-card${isOverTarget ? ' dispatch-console__call-card--breach' : ''}`}
    >
      <div className="dc-row-between">
        <div>
          <div className="dc-meta-caps">{call.callNumber}</div>
          <div className="dc-title-15">{call.chiefComplaint}</div>
        </div>
        <div className="dc-col-end">
          <PriorityBadge priority={call.callPriority} />
          <span className={isOverTarget ? 'dc-critical-11' : 'dc-meta-caps'}>
            {isOverTarget ? `⚠ ${ageMinutes}m — BREACH` : `${ageMinutes}m ago`}
          </span>
        </div>
      </div>

      <div className="dc-muted-12">{call.location.address}</div>

      {(call.patientConscious === false || call.patientBreathing === false) && (
        <div className="dc-critical-12">
          {call.patientConscious === false && 'UNCONSCIOUS '}
          {call.patientBreathing === false && '— NOT BREATHING'}
        </div>
      )}

      {/* Status pipeline */}
      <div className="dc-row-gap-4-wrap">
        {(
          [
            'received',
            'dispatched',
            'ems_en_route',
            'ems_on_scene',
            'ems_transporting',
            'hospital_notified',
          ] as const
        ).map((s) => (
          <span key={s} className={`dc-chip ${call.status === s ? 'dc-resource-chip--on' : ''}`}>
            {s.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <div className="dc-row-gap-8-wrap u-mt-4">
        <select
          value={call.callPriority}
          onChange={(e) => onPriorityChange(call.id, e.target.value as CallPriority)}
          className="dc-field-input dc-select-sm"
          aria-label="Call priority"
        >
          {(Object.keys(CALL_PRIORITY_LABELS) as CallPriority[]).map((p) => (
            <option key={p} value={p}>
              {CALL_PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>

        <select
          value={call.status}
          onChange={(e) => onStatusChange(call.id, e.target.value as EmergencyCall['status'])}
          className="dc-field-input dc-select-sm"
          aria-label="Call status"
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
            className={`dc-btn-primary dc-btn-sm ${call.callPriority === 'Echo' || call.callPriority === 'Delta' ? 'dc-btn-primary--critical' : ''}`}
          >
            Dispatch Unit →
          </button>
        )}

        {isDispatched && !showPreAlert && !assignment && (
          <button
            type="button"
            onClick={() => setShowPreAlert(true)}
            className="dc-btn-primary dc-btn-sm dc-btn-success"
          >
            Pre-Alert ED →
          </button>
        )}
      </div>

      {showDispatch && <CADDispatchPanel call={call} onDispatched={handleDispatched} />}

      {showPreAlert && (
        <EDPreAlertPanel
          call={call}
          assignment={
            assignment || {
              id: 'manual',
              callId: call.id,
              assignedAt: new Date().toISOString(),
              unit: {
                id: 'manual',
                callSign: 'Manual',
                type: 'ALS',
                crewSize: 2,
                baseLocation: '',
              },
              dispatchedBy: 'dispatcher-current',
              estimatedResponseMinutes: 8,
              status: 'en_route',
            }
          }
          onAlertSent={() => {
            /* refresh handled by interval */
          }}
        />
      )}
    </div>
  );
}

// ── Physician-Requested Transport (Simulated) Visibility Panel ────────────────
//
// A physician can create a SIMULATED transport request directly from a patient
// chart (PatientDetailPanel.tsx → EMSIntakeService.requestPhysicianTransport) —
// a completely separate simulation from this console's own CAD unit dispatch
// below. Before this panel, a dispatcher working this console had no way to
// know a physician had already made one of these requests. This is READ-ONLY
// visibility only: it deliberately does NOT trigger cadDispatchUnit() or link
// the two simulations together in any way, since doing so would make two
// intentionally-separate honest simulations look more "connected"/real than
// they are. There is still no real EMS/CAD/911 dispatch system connected
// anywhere in this codebase for either one.
//
// Reads from useEmergencyStore rather than this hook's own one-shot response
// so a new request appears live: EMSIntakeService.requestPhysicianTransport()
// broadcasts through the same real EmergencyRealtimeService SSE channel every
// other EMS action uses, and AppShell's shared subscription already writes
// every 'ems_updated' broadcast straight into state.emsArrivals (see
// dispatchWebSocketEvent in emergencyStore.ts) — useEMSIntake() here only
// exists to trigger this page's own initial GET /emergency/ems fetch.
function PhysicianRequestedTransportPanel() {
  useEMSIntake();
  const arrivals = useEmergencyStore((state) => state.emsArrivals) as EMSArrival[];
  const simulatedRequests = arrivals.filter(
    (arrival) =>
      arrival?.simulated === true || arrival?.requestSource === 'physician_initiated_simulated',
  );

  if (simulatedRequests.length === 0) return null;

  return (
    <div className="dc-panel dispatch-console__physician-sim-panel">
      <div className="u-flex-between">
        <strong className="dc-title-14">Physician-Requested Transport (Simulated)</strong>
        <span className="dispatch-console__physician-sim-count">{simulatedRequests.length}</span>
      </div>
      <div className="dc-muted-12-mt">
        Read-only visibility into SIMULATED transport requests physicians created directly from a
        patient chart — not created through this console, and not linked to the CAD unit board
        below. No real ambulance, EMS unit, or 911/CAD dispatch system is connected to either.
      </div>
      <div className="dispatch-console__physician-sim-list">
        {simulatedRequests.map((arrival) => (
          <div key={arrival.id} className="dispatch-console__physician-sim-row">
            <div className="dispatch-console__physician-sim-summary">
              <strong>{arrival.requestedByName || 'A physician'}</strong> requested a simulated
              transport for <strong>{arrival.requestPatientName || 'this patient'}</strong>
            </div>
            <div className="dc-muted-12">
              Reason: {arrival.requestReason || arrival.chiefComplaint || 'Not specified'}
              {arrival.requestUrgency ? ` · Urgency: ${arrival.requestUrgency}` : ''}
              {arrival.requestLocation ? ` · Location: ${arrival.requestLocation}` : ''}
            </div>
          </div>
        ))}
      </div>
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
    <div className="dispatch-console__unit-board dc-panel u-flex-col-gap-10">
      <div className="u-flex-between">
        <strong className="u-fs-13">CAD Unit Board</strong>
        <span className="fj-caption-11">Auto-refreshes every 5s</span>
      </div>
      <div className="u-flex-wrap u-gap-8">
        <SummaryCard label="Available" value={cadSummary.availableUnits} />
        <SummaryCard label="Dispatched" value={cadSummary.dispatchedUnits} />
        <SummaryCard label="En Route" value={cadSummary.enRouteUnits} />
        <SummaryCard label="On Scene" value={cadSummary.onSceneUnits} />
        <SummaryCard label="Transporting" value={cadSummary.transportingUnits} highlight />
        <SummaryCard label="Total" value={cadSummary.totalUnits} />
      </div>
      <div className="u-flex u-gap-8 u-mt-4">
        <Link to={CANONICAL_ROUTES.emergencyEdReadiness} className="dc-link-accent">
          ED Readiness →
        </Link>
        <Link to={CANONICAL_ROUTES.emergencyEms} className="dc-link-accent">
          EMS Pipeline →
        </Link>
        <Link to={CANONICAL_ROUTES.emergencyCommandCenter} className="dc-link-accent">
          Command Center →
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DispatchConsole() {
  const {
    loading: apiLoading,
    error: apiError,
    envelope: apiEnvelope,
  } = useEmergencyOperatingSurface('dispatch');
  const [calls, setCalls] = useState<EmergencyCall[]>([]);
  const [summary, setSummary] = useState<DispatchCallSummary>({
    total: 0,
    received: 0,
    dispatched: 0,
    enRoute: 0,
    onScene: 0,
    transporting: 0,
    echoCount: 0,
    deltaCount: 0,
  });
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(() => {
    setCalls(
      getAllActiveCalls().sort((a, b) => {
        const priorityOrder: CallPriority[] = ['Echo', 'Delta', 'Charlie', 'Bravo', 'Alpha'];
        return priorityOrder.indexOf(a.callPriority) - priorityOrder.indexOf(b.callPriority);
      }),
    );
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
    void import('../../services/emergencyCareJourneyOrchestrator').then(
      ({ onDispatchCallStatusChange }) => onDispatchCallStatusChange(id, status),
    );
    refresh();
  }

  const criticalPending = calls.filter(
    (c) => (c.callPriority === 'Echo' || c.callPriority === 'Delta') && c.status === 'received',
  ).length;

  return (
    <EmergencyRoutePage
      surfaceClassName="dispatch-console"
      eyebrow="Pre-arrival"
      title="Dispatch Console"
      description="Emergency call intake · CAD unit dispatch · ED pre-alert"
      situationBrief={{
        status: `${summary.total} active call${summary.total === 1 ? '' : 's'}`,
        attention:
          criticalPending > 0
            ? `${criticalPending} Echo/Delta awaiting dispatch — 3-minute target`
            : summary.echoCount + summary.deltaCount > 0
              ? `${summary.echoCount + summary.deltaCount} priority call${summary.echoCount + summary.deltaCount === 1 ? '' : 's'} in pipeline`
              : 'No critical calls pending dispatch',
        owner: 'Dispatcher',
        nextAction:
          criticalPending > 0
            ? 'Dispatch highest-priority unit and send ED pre-alert'
            : showForm
              ? 'Complete call intake form'
              : '+ Log Call when new emergency arrives',
        tone:
          criticalPending > 0
            ? 'critical'
            : summary.deltaCount + summary.echoCount > 0
              ? 'warning'
              : 'neutral',
      }}
      actions={
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={`dispatch-console__primary-btn${showForm ? ' dispatch-console__primary-btn--muted' : ''}`}
        >
          {showForm ? 'Cancel' : '+ Log Call'}
        </button>
      }
      primaryActions={
        <div className="dispatch-console__summary-row">
          <SummaryCard label="Active Calls" value={summary.total} />
          <SummaryCard label="Echo" value={summary.echoCount} highlight />
          <SummaryCard label="Delta" value={summary.deltaCount} />
          <SummaryCard label="Dispatched" value={summary.dispatched} />
          <SummaryCard label="En Route" value={summary.enRoute} />
          <SummaryCard label="On Scene" value={summary.onScene} />
          <SummaryCard label="Transporting" value={summary.transporting} />
        </div>
      }
    >
      <EdDataSourceBanner
        loading={apiLoading}
        error={apiError}
        envelope={{
          source: apiEnvelope.source,
          generatedAt: apiEnvelope.generatedAt,
        }}
        compact
      />
      {showForm && (
        <div className="dispatch-console__form u-pad-16">
          <div className="dc-title-14 u-mb-16">New Emergency Call</div>
          <NewCallForm onCreated={handleCreated} />
        </div>
      )}

      {/* Physician-requested simulated transport requests (separate from CAD dispatch below) */}
      <PhysicianRequestedTransportPanel />

      {/* CAD Unit Board */}
      <CADUnitBoard />

      {/* Call list */}
      {calls.length === 0 ? (
        <div className="dispatch-console__empty dc-muted u-ta-center dc-empty-pad">
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

      <div role="note" className="dispatch-console__notice dc-muted-12 dc-pad-note">
        CareDroid AI is decision support only. All dispatch decisions must be made by licensed
        dispatchers following local medical protocols. Unit assignment, pre-alert, and ED readiness
        activation require dispatcher authorization. The CAD unit board and Dispatch Unit action
        above use a SIMULATED demo unit registry — not connected to a real ambulance, EMS unit, or
        911/CAD dispatch system. The physician-requested transport panel above is a separate,
        also-simulated CareDroid record with the same real-world limitation; the two panels are
        never linked to each other.
      </div>
    </EmergencyRoutePage>
  );
}

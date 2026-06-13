import { useEffect, useMemo, useState } from 'react';
import {
  deriveCapacityCrisisState,
  type CapacityCrisisState,
} from '../engine/capacityEngine';
import { dispatchAlert } from '../engine/alertEngine';
import { unifiedAIClient } from '../lib/ai/client';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  PatientState,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
  type Room,
} from '../types/emergency';
import './CapacityCrisisMode.css';

type CapacityCrisisModeProps = {
  capacity: CapacitySnapshot;
  patients: Patient[];
  rooms: Room[];
  referrals: Referral[];
  emsArrivals: unknown[];
  emsIncomingPatients: unknown[];
};

type AiRequestSnapshot = {
  systemPrompt: string;
  userMessage: string;
  context: Record<string, unknown>;
};

function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return `${hours}h ${remainder}min`;
}

function formatClockTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (!Number.isFinite(parsed.getTime())) return 'unknown time';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function responseText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const data = value as Record<string, unknown>;
  return String(data.response || data.message || data.content || data.text || '');
}

function buildAiRequestSnapshot(crisis: CapacityCrisisState, capacity: CapacitySnapshot): AiRequestSnapshot {
  const snapshot = {
    capacity,
    scoreBreakdown: crisis.factors,
    actionInputs: {
      boardingPatients: crisis.boardingPatients.map((item) => ({
        patientId: item.patient.id,
        name: item.name,
        targetDepartment: item.targetDepartment,
        boardingMinutes: item.boardingMinutes,
        timestampSource: item.timestampSource,
      })),
      dischargeReady: crisis.dischargeReady.map((item) => ({
        patientId: item.patient.id,
        name: item.name,
        dispositionMinutes: item.dispositionMinutes,
        timestampSource: item.timestampSource,
      })),
      reassessmentQueue: crisis.reassessmentQueue,
      criticalEmsInbound: crisis.criticalEmsInbound,
    },
    documentation: crisis.documentation,
  };

  return {
    systemPrompt: [
      'You are ED capacity crisis decision support. Provide operational suggestions only; do not make autonomous clinical, staffing, admission, or discharge decisions.',
      'Label every recommendation as requiring physician or charge-team review.',
      'Full capacity snapshot:',
      JSON.stringify(snapshot, null, 2),
    ].join('\n'),
    userMessage: 'Provide a 2-3 sentence narrative suggestion for this CAPACITY_CRISIS panel.',
    context: {
      capacitySnapshot: capacity,
      crisisMode: {
        scoreBreakdown: crisis.factors,
        documentation: crisis.documentation,
      },
    },
  };
}

export default function CapacityCrisisMode({
  capacity,
  patients,
  rooms,
  referrals,
  emsArrivals,
  emsIncomingPatients,
}: CapacityCrisisModeProps) {
  const addNote = useEmergencyStore((state) => state.addNote);
  const movePatientToState = useEmergencyStore((state) => state.movePatientToState);
  const setActiveQueueFilter = useEmergencyStore((state) => state.setActiveQueueFilter);
  const requestAdditionalStaff = useEmergencyStore((state) => state.requestAdditionalStaff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiRequest, setAiRequest] = useState<AiRequestSnapshot | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const crisis = useMemo(
    () =>
      deriveCapacityCrisisState({
        capacity,
        patients,
        rooms,
        referrals,
        emsArrivals: emsArrivals as Array<Partial<EMSArrival> & Record<string, unknown>>,
        emsIncomingPatients: emsIncomingPatients as Array<Record<string, unknown>>,
      }),
    [capacity, emsArrivals, emsIncomingPatients, patients, referrals, rooms],
  );

  useEffect(() => {
    if (!crisis.active) {
      setDrawerOpen(false);
      setAiRequest(null);
      setAiSuggestion('');
      setAiError('');
    }
  }, [crisis.active]);

  useEffect(() => {
    if (!drawerOpen || !aiRequest) return undefined;

    let cancelled = false;
    setAiLoading(true);
    setAiError('');
    setAiSuggestion('');

    unifiedAIClient
      .request({
        requestType: 'CAPACITY_CRISIS',
        systemPrompt: aiRequest.systemPrompt,
        messages: [{ role: 'user', content: aiRequest.userMessage }],
        message: aiRequest.userMessage,
        maxTokens: 260,
        tools: [],
        context: aiRequest.context,
      })
      .then((response) => {
        if (cancelled) return;
        const text = responseText(response.content) || responseText(response.data);
        setAiSuggestion(
          text ||
            'Focus first on confirmed boarding and discharge-ready patients, then reassessment queue and critical EMS preparation. Keep each action under charge-team and physician review.',
        );
      })
      .catch(() => {
        if (!cancelled) setAiError('AI suggestion unavailable. Use deterministic crisis actions above.');
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [aiRequest, drawerOpen]);

  if (!crisis.active || !crisis.band) return null;

  const openDrawer = () => {
    if (!drawerOpen) {
      setAiRequest(buildAiRequestSnapshot(crisis, capacity));
    }
    setDrawerOpen(true);
  };

  const contactAdmittingTeam = (patientId: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    addNote(patientId, `Admitting team contacted at ${time}`, activeShift.chargeStaffId);
    setActionMessage(`Admitting team contact documented at ${time}.`);
  };

  const completeDischarge = (patientId: string) => {
    movePatientToState(patientId, PatientState.Discharge, {
      staffId: activeShift.chargeStaffId,
      note: 'Capacity crisis action panel: discharge completed.',
    });
    setActionMessage('Patient moved to Discharge.');
  };

  const openReassessmentDrawer = () => {
    setActiveQueueFilter('Reassessment');
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new Event('open-reassessment-drawer'));
    }
    setActionMessage('Reassessment drawer opened.');
  };

  const notifyAdministrator = () => {
    dispatchAlert({
      type: 'CAPACITY_CRISIS',
      severity: 'Critical',
      title: 'Capacity crisis administrator notification',
      message: `Capacity ${crisis.band} at ${crisis.score}/100. Administrator notification requested from crisis action panel.`,
      source: 'capacity-crisis-mode',
      metadata: {
        score: crisis.score,
        band: crisis.band,
        boardingCount: crisis.boardingPatients.length,
        dischargeReadyCount: crisis.dischargeReady.length,
      },
    });
    setActionMessage('Administrator notification dispatched.');
  };

  const requestStaff = () => {
    const request = requestAdditionalStaff({
      requestedByStaffId: activeShift.chargeStaffId,
      reason: `Capacity crisis ${crisis.band} at ${crisis.score}/100`,
      capacityScore: crisis.score,
      capacityBand: crisis.band || capacity.band,
      source: 'capacity-crisis-mode',
      metadata: {
        boardingCount: crisis.boardingPatients.length,
        dischargeReadyCount: crisis.dischargeReady.length,
        reassessmentQueue: crisis.reassessmentQueue,
        criticalEmsInbound: crisis.criticalEmsInbound.length,
      },
    });
    setActionMessage(`Staffing request created: ${request.id}.`);
  };

  const bannerClass = `capacity-crisis-banner capacity-crisis-banner--${crisis.band.toLowerCase()}`;
  const bannerTitle =
    crisis.band === 'Red'
      ? `🚨 CAPACITY CRITICAL — ${crisis.score}/100`
      : `⚠ CAPACITY STRAINED — ${crisis.score}/100 · Orange`;

  return (
    <>
      <section className={bannerClass} role="alert" aria-label="Capacity crisis mode">
        <strong>{bannerTitle}</strong>
        <div className="capacity-crisis-banner__actions">
          {crisis.band === 'Orange' ? (
            <>
              <span>{crisis.boardingPatients.length} boarding</span>
              <span aria-hidden>·</span>
              <span>{crisis.dischargeReady.length} discharge-ready</span>
              <button type="button" onClick={openDrawer}>
                View Actions
              </button>
            </>
          ) : (
            <button type="button" onClick={openDrawer}>
              View Emergency Actions
            </button>
          )}
        </div>
      </section>

      {drawerOpen ? (
        <aside className="capacity-crisis-drawer" aria-label="Capacity crisis action panel">
          <header className="capacity-crisis-drawer__header">
            <div>
              <span>Capacity Crisis Mode</span>
              <h2>{crisis.band} · {crisis.score}/100</h2>
            </div>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close capacity crisis actions">
              Close
            </button>
          </header>

          <div className="capacity-crisis-drawer__body">
            <section className="capacity-crisis-section">
              <h3>Score Breakdown</h3>
              <div className="capacity-crisis-factors">
                {crisis.factors.map((factor) => (
                  <article key={factor.id} className="capacity-crisis-factor">
                    <div>
                      <strong>{factor.detail}</strong>
                      <span>{factor.source === 'snapshot' ? 'Snapshot deduction' : 'Approximation'}</span>
                    </div>
                    <div className="capacity-crisis-factor__bar" aria-hidden>
                      <span style={{ width: `${factor.percent}%` }} />
                    </div>
                  </article>
                ))}
              </div>
              <p>{crisis.documentation.join(' ')}</p>
            </section>

            <section className="capacity-crisis-section">
              <h3>Immediate Action List</h3>
              {!crisis.boardingPatients.length &&
              !crisis.dischargeReady.length &&
              crisis.reassessmentQueue <= 3 &&
              !crisis.criticalEmsInbound.length ? (
                <p>No deterministic crisis actions currently apply.</p>
              ) : null}

              {crisis.boardingPatients.length > 0 ? (
                <div className="capacity-crisis-card">
                  <strong>Clear {crisis.boardingPatients.length} boarding patients</strong>
                  {crisis.boardingPatients.map((item) => (
                    <article key={item.patient.id} className="capacity-crisis-row">
                      <span>
                        {item.name} | {item.targetDepartment} | boarding {formatDuration(item.boardingMinutes)}
                      </span>
                      <button type="button" onClick={() => contactAdmittingTeam(item.patient.id)}>
                        Contact admitting team
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              {crisis.dischargeReady.length > 0 ? (
                <div className="capacity-crisis-card">
                  <strong>Expedite {crisis.dischargeReady.length} discharges</strong>
                  {crisis.dischargeReady.map((item) => (
                    <article key={item.patient.id} className="capacity-crisis-row">
                      <span>
                        {item.name} | in Disposition since {formatClockTime(item.sinceTime)}
                      </span>
                      <button type="button" onClick={() => completeDischarge(item.patient.id)}>
                        Complete Discharge
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              {crisis.reassessmentQueue > 3 ? (
                <div className="capacity-crisis-card">
                  <strong>Clear reassessment queue first</strong>
                  <p>These patients may improve disposition once assessed.</p>
                  <button type="button" onClick={openReassessmentDrawer}>
                    Open Reassessment Drawer
                  </button>
                </div>
              ) : null}

              {crisis.criticalEmsInbound.length > 0 ? (
                <div className="capacity-crisis-card">
                  <strong>Prepare bays for critical EMS</strong>
                  {crisis.criticalEmsInbound.map((arrival) => (
                    <article key={arrival.id} className="capacity-crisis-row">
                      <span>
                        ETA {arrival.etaMinutes ?? '--'}min | {arrival.complaint}
                      </span>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="capacity-crisis-section">
              <h3>AI suggestion — requires physician review</h3>
              <p>{aiLoading ? 'Requesting capacity crisis suggestion...' : aiError || aiSuggestion}</p>
            </section>

            <section className="capacity-crisis-section">
              <h3>Escalate</h3>
              <div className="capacity-crisis-escalate">
                <button type="button" onClick={notifyAdministrator}>
                  Notify Administrator
                </button>
                <button type="button" onClick={requestStaff}>
                  Request additional staff
                </button>
              </div>
              {actionMessage ? <p role="status">{actionMessage}</p> : null}
            </section>
          </div>
        </aside>
      ) : null}
    </>
  );
}

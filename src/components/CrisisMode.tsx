import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Siren, X } from 'lucide-react';
import {
  selectReassessmentQueue,
  useEmergencyStore,
} from '../store/emergencyStore';
import { dispatchAlert } from '../engine/alertEngine';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import { deriveCrisisModeState } from '../utils/crisisMode';
import './CrisisMode.css';

function formatDuration(minutes) {
  if (!minutes) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function aiText(data) {
  return (
    data?.response ||
    data?.message?.content ||
    data?.message ||
    data?.content ||
    data?.assistantMessage?.content ||
    ''
  );
}

export default function CrisisMode({ onVisibilityChange }) {
  const capacity = useEmergencyStore((state) => state.capacity);
  const patients = useEmergencyStore((state) => state.patients);
  const rooms = useEmergencyStore((state) => state.rooms);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const dischargePatient = useEmergencyStore((state) => state.dischargePatient);
  const prepareEMSBay = useEmergencyStore((state) => state.prepareEMSBay);
  const setQueueFilter = useEmergencyStore((state) => state.setQueueFilter);
  const requestAdditionalStaff = useEmergencyStore((state) => state.requestAdditionalStaff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sawCrisis, setSawCrisis] = useState(false);
  const [resolutionAcknowledged, setResolutionAcknowledged] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const reassessmentQueue = useMemo(() => selectReassessmentQueue({ patients } as any), [patients]);
  const crisisState = useMemo(
    () =>
      deriveCrisisModeState({
        capacity,
        patients,
        rooms,
        referrals,
        reassessmentQueue,
        emsArrivals,
      }),
    [capacity, emsArrivals, patients, reassessmentQueue, referrals, rooms]
  );
  const isCrisisActive = crisisState.active;
  const showResolved = sawCrisis && !isCrisisActive && !resolutionAcknowledged;

  useEffect(() => {
    onVisibilityChange?.(isCrisisActive || showResolved);
  }, [isCrisisActive, onVisibilityChange, showResolved]);

  useEffect(() => {
    if (isCrisisActive) {
      setSawCrisis(true);
      setResolutionAcknowledged(false);
      setPanelOpen(true);
    }
  }, [isCrisisActive]);

  useEffect(() => {
    if (!panelOpen || !isCrisisActive || aiSuggestion || aiLoading) return undefined;
    let cancelled = false;
    setAiLoading(true);
    setAiError('');
    sendClinicalChatMessage({
      message: [
        'Provide a 2-3 sentence capacity crisis recommendation for ED charge nurse review.',
        'Do not make autonomous decisions. Reference deterministic capacity context only.',
      ].join('\n'),
      requestType: 'CAPACITY_CRISIS_RECOMMENDATION',
      workspaceContext: {
        workspaceId: 'emergency',
        capacity,
        crisisMode: {
          actionGroups: crisisState.actionGroups.map((group) => group.title),
          boardingCount: crisisState.boardingPatients.length,
          dischargeReadyCount: crisisState.dischargeReady.length,
          reassessmentQueueLength: crisisState.reassessmentQueue.length,
          emsInboundCount: crisisState.inboundEms.length,
        },
      },
    } as any)
      .then((response) => {
        if (cancelled) return;
        if (!response.ok) throw new Error('Copilot request failed');
        setAiSuggestion(
          aiText(response.data) ||
            'Prioritize boarding disposition calls, discharge-ready patients, and incoming EMS bay readiness. Keep escalation human-reviewed and document actions taken.'
        );
      })
      .catch(() => {
        if (!cancelled) setAiError('AI suggestion unavailable. Use deterministic actions above.');
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aiLoading, aiSuggestion, capacity, crisisState, isCrisisActive, panelOpen]);

  if (!isCrisisActive && !showResolved) return null;

  const notifyAdmin = () => {
    dispatchAlert({
      id: `alert-capacity-crisis-admin-${capacity.riskLevel}`,
      type: 'CAPACITY_CRISIS',
      severity: 'Critical',
      title: `CAPACITY CRISIS - ${capacity.riskLevel}`,
      message: `Capacity score ${capacity.score}/100. ${(capacity.deductions ?? [])
        .map((deduction) => deduction.label)
        .slice(0, 3)
        .join(' - ')}`,
      actionLabel: 'View Whiteboard',
      actionType: 'OPEN_QUEUE',
    });
  };

  const requestStaff = () => {
    requestAdditionalStaff({
      requestedByStaffId: activeShift.chargeStaffId || activeShift.staffIds?.[0] || 'charge-nurse',
      reason: `Capacity crisis ${capacity.riskLevel} at ${capacity.score}/100`,
      capacityScore: capacity.score,
      capacityRiskLevel: capacity.riskLevel,
    } as any);
  };

  return (
    <>
      <section
        className={`crisis-mode-banner crisis-mode-banner--${crisisState.severity.toLowerCase()}`}
        role="alert"
        aria-label="Capacity crisis mode"
      >
        {showResolved ? (
          <>
            <div className="crisis-mode-banner__main">
              <AlertTriangle size={20} aria-hidden />
              <div>
                <strong>CAPACITY STABILIZED - {capacity.score}/100 - {capacity.riskLevel}</strong>
                <span>Capacity returned below crisis threshold. Charge nurse acknowledgement required.</span>
              </div>
            </div>
            <button type="button" onClick={() => setResolutionAcknowledged(true)}>
              Acknowledge resolution
            </button>
          </>
        ) : capacity.riskLevel === 'Red' ? (
          <>
            <div className="crisis-mode-banner__main">
              <Siren size={21} aria-hidden />
              <div>
                <strong>CAPACITY CRITICAL - {capacity.score}/100 - Red</strong>
                <span>Department is near maximum. Immediate action needed.</span>
              </div>
            </div>
            <button type="button" onClick={() => setPanelOpen(true)}>
              View all
            </button>
          </>
        ) : (
          <>
            <div className="crisis-mode-banner__main">
              <AlertTriangle size={20} aria-hidden />
              <div>
                <strong>CAPACITY STRAINED - {capacity.score}/100 - Orange</strong>
                <span>
                  {capacity.boardingCount} patients in boarding - {capacity.dischargeReadyCount} discharge-ready
                </span>
              </div>
            </div>
            <div className="crisis-mode-banner__actions" aria-label="Recommended crisis actions">
              <span>Recommended actions:</span>
              {crisisState.actionGroups.slice(0, 3).map((group, index) => (
                <button key={group.id} type="button" onClick={() => setPanelOpen(true)}>
                  {index + 1}
                </button>
              ))}
              <button type="button" onClick={() => setPanelOpen(true)}>
                View all
              </button>
            </div>
          </>
        )}
      </section>

      {panelOpen ? (
        <aside className="crisis-action-panel" aria-label="Capacity Crisis Actions">
          <header>
            <div>
              <span>Capacity Crisis Actions</span>
              <h2>Score {capacity.score}/100 - {capacity.riskLevel}</h2>
              <p>{(capacity.deductions || []).map((deduction) => deduction.label).join(' - ') || 'No score deductions recorded.'}</p>
            </div>
            <button type="button" onClick={() => setPanelOpen(false)} aria-label="Close crisis action panel">
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="crisis-action-panel__body">
            <section>
              <h3>Immediate Actions</h3>
              {!crisisState.actionGroups.length ? <p>No deterministic crisis actions currently apply.</p> : null}

              {crisisState.boardingPatients.length ? (
                <div className="crisis-action-panel__group">
                  <strong>{crisisState.actionGroups.find((group) => group.id === 'boarding')?.title}</strong>
                  {crisisState.boardingPatients.map((item) => (
                    <article key={item.patient.id}>
                      <div>
                        <b>{item.name}</b>
                        <span>{item.targetDepartment} - Boarding {formatDuration(item.boardingMinutes)}</span>
                      </div>
                      <button type="button" onClick={() => dispatchAlert({
                        type: 'CAPACITY_CRISIS',
                        severity: 'Warning',
                        title: `Call admitting team - ${item.name}`,
                        message: `${item.targetDepartment} needs bed update for ${item.name}.`,
                        patientId: item.patient.id,
                        actionLabel: 'View Patient',
                        actionType: 'VIEW_PATIENT',
                      })}>
                        Call team
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              {crisisState.dischargeReady.length ? (
                <div className="crisis-action-panel__group">
                  <strong>{crisisState.actionGroups.find((group) => group.id === 'discharge')?.title}</strong>
                  {crisisState.dischargeReady.map((item) => (
                    <article key={item.patient.id}>
                      <div>
                        <b>{item.name}</b>
                        <span>In Disposition {formatDuration(item.dispositionMinutes)}</span>
                      </div>
                      <button type="button" onClick={() => dischargePatient(item.patient.id)}>
                        Discharge now
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              {crisisState.reassessmentQueue.length > 3 ? (
                <div className="crisis-action-panel__group">
                  <strong>{crisisState.actionGroups.find((group) => group.id === 'reassessment')?.title}</strong>
                  <article>
                    <div>
                      <b>{crisisState.reassessmentQueue.length} overdue reassessments</b>
                      <span>Clear the reassessment queue before lower acuity throughput.</span>
                    </div>
                    <button type="button" onClick={() => setQueueFilter('Reassessment')}>
                      Open queue
                    </button>
                  </article>
                </div>
              ) : null}

              {crisisState.inboundEms.length ? (
                <div className="crisis-action-panel__group">
                  <strong>{crisisState.actionGroups.find((group) => group.id === 'ems')?.title}</strong>
                  {crisisState.inboundEms.map((arrival) => (
                    <article key={arrival.id}>
                      <div>
                        <b>{arrival.unitName}</b>
                        <span>ETA {arrival.eta ?? '--'}m - {arrival.chiefComplaint}</span>
                      </div>
                      <button type="button" disabled={Boolean(arrival.preparedRoomId)} onClick={() => prepareEMSBay(arrival.id)}>
                        {arrival.preparedRoomId ? 'Bay assigned' : 'Assign bay'}
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <section>
              <h3>AI suggestion - requires review</h3>
              <p>{aiLoading ? 'Requesting ED Copilot recommendation...' : aiError || aiSuggestion || 'Open panel to request a reviewed narrative suggestion.'}</p>
            </section>

            <section>
              <h3>Escalation</h3>
              <div className="crisis-action-panel__escalation">
                <button type="button" onClick={notifyAdmin}>
                  Notify Administrator
                </button>
                <button type="button" onClick={requestStaff}>
                  Request additional staff
                </button>
              </div>
            </section>
          </div>
        </aside>
      ) : null}
    </>
  );
}

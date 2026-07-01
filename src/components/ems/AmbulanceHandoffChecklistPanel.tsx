import React, { useMemo, useState } from 'react';
import {
  AMBULANCE_HANDOFF_DESTINATION_LABELS,
  AMBULANCE_HANDOFF_IDENTITY_LABELS,
  ambulanceHandoffChecklistCompletionPercent,
  buildAmbulanceHandoffChecklistSteps,
  formatAmbulanceHandoffDestination,
  resolveAmbulanceHandoffChecklist,
} from '../../services/ambulanceHandoffChecklist';
import './AmbulanceHandoffChecklistPanel.css';

function vitalChip(label, value, unit = '') {
  if (value === undefined || value === null || value === '') return `${label} —`;
  return `${label} ${value}${unit}`;
}

function VitalsRow({ vitals }) {
  if (!vitals) return <p className="amb-handoff-checklist__muted">No vitals received from EMS.</p>;
  return (
    <div className="amb-handoff-checklist__vitals">
      <span>{vitalChip('HR', vitals.hr ?? vitals.heartRate)}</span>
      <span>
        {vitalChip(
          'BP',
          vitals.sbp ?? vitals.bpSystolic,
          vitals.dbp ?? vitals.bpDiastolic ? `/${vitals.dbp ?? vitals.bpDiastolic}` : '',
        )}
      </span>
      <span>{vitalChip('SpO2', vitals.spo2 ?? vitals.oxygenSaturation, '%')}</span>
      <span>{vitalChip('GCS', vitals.gcs)}</span>
    </div>
  );
}

export default function AmbulanceHandoffChecklistPanel({
  arrival,
  patient = null,
  rooms = [] as any[],
  actorName = 'Staff',
  canEdit = true,
  compact = false,
  onUpdate,
  className = '',
}) {
  const checklist = useMemo(
    () => resolveAmbulanceHandoffChecklist(arrival, { patient, rooms }),
    [arrival, patient, rooms],
  );
  const steps = useMemo(() => buildAmbulanceHandoffChecklistSteps(checklist), [checklist]);
  const completion = useMemo(
    () => ambulanceHandoffChecklistCompletionPercent(checklist),
    [checklist],
  );
  const [medicationDraft, setMedicationDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState(checklist.handoffNotes || '');

  if (!arrival?.id) return null;

  const applyPatch = (patch) => {
    if (!canEdit || !onUpdate) return;
    onUpdate(arrival.id, patch, { staffName: actorName });
  };

  const destinationOptions = Object.entries(AMBULANCE_HANDOFF_DESTINATION_LABELS);
  const identityOptions = Object.entries(AMBULANCE_HANDOFF_IDENTITY_LABELS);

  return (
    <section
      className={[
        'amb-handoff-checklist',
        compact ? 'amb-handoff-checklist--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Ambulance handoff checklist"
    >
      <header className="amb-handoff-checklist__header">
        <div>
          <h4>Ambulance handoff checklist</h4>
          <p>{arrival.unitName || arrival.unitId} · {checklist.complaintSummary}</p>
        </div>
        <span className={`amb-handoff-checklist__status${checklist.handoffAccepted ? ' amb-handoff-checklist__status--done' : ''}`}>
          {checklist.handoffAccepted ? 'Accepted' : `${completion}% complete`}
        </span>
      </header>

      <div
        className="amb-handoff-checklist__progress"
        role="progressbar"
        aria-valuenow={completion}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Handoff checklist completion"
      >
        <span style={{ width: `${completion}%` }} />
      </div>

      <ol className="amb-handoff-checklist__steps" aria-label="Handoff checklist steps">
        {steps.map((step) => (
          <li key={step.id} data-status={step.status}>
            <span>{step.label}</span>
            <small>{step.value}</small>
          </li>
        ))}
      </ol>

      <dl className="amb-handoff-checklist__grid">
        <div>
          <dt>Patient identity</dt>
          <dd>
            {canEdit ? (
              <select
                value={checklist.identityStatus}
                onChange={(event) =>
                  applyPatch({ identityStatus: event.target.value })
                }
              >
                {identityOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              AMBULANCE_HANDOFF_IDENTITY_LABELS[checklist.identityStatus]
            )}
          </dd>
        </div>

        <div>
          <dt>Complaint summary</dt>
          <dd>
            {canEdit ? (
              <input
                type="text"
                value={checklist.complaintSummary}
                onChange={(event) =>
                  applyPatch({ complaintSummary: event.target.value })
                }
              />
            ) : (
              checklist.complaintSummary
            )}
          </dd>
        </div>

        <div>
          <dt>Vitals received</dt>
          <dd>
            <label className="amb-handoff-checklist__check">
              <input
                type="checkbox"
                checked={checklist.vitalsReceived}
                disabled={!canEdit}
                onChange={(event) =>
                  applyPatch({ vitalsReceived: event.target.checked })
                }
              />
              {checklist.vitalsReceived ? 'Yes' : 'Pending'}
            </label>
            <VitalsRow vitals={checklist.vitalsSnapshot} />
          </dd>
        </div>

        <div>
          <dt>Medications en route</dt>
          <dd>
            {checklist.medicationsEnRoute.length ? (
              <ul className="amb-handoff-checklist__meds">
                {checklist.medicationsEnRoute.map((med) => (
                  <li key={med}>{med}</li>
                ))}
              </ul>
            ) : (
              <p className="amb-handoff-checklist__muted">None documented.</p>
            )}
            {canEdit ? (
              <div className="amb-handoff-checklist__inline-form">
                <input
                  type="text"
                  value={medicationDraft}
                  placeholder="Add medication"
                  onChange={(event) => setMedicationDraft(event.target.value)}
                />
                <button
                  type="button"
                  disabled={!medicationDraft.trim()}
                  onClick={() => {
                    const next = medicationDraft.trim();
                    if (!next) return;
                    applyPatch({
                      medicationsEnRoute: [...checklist.medicationsEnRoute, next],
                    });
                    setMedicationDraft('');
                  }}
                >
                  Add
                </button>
              </div>
            ) : null}
          </dd>
        </div>

        <div>
          <dt>Critical flags</dt>
          <dd>
            {checklist.criticalFlags.length ? (
              <div className="amb-handoff-checklist__flags">
                {checklist.criticalFlags.map((flag) => (
                  <span key={flag.id} className="amb-handoff-checklist__flag">
                    {flag.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="amb-handoff-checklist__muted">No critical flags surfaced.</p>
            )}
          </dd>
        </div>

        <div>
          <dt>Handoff accepted</dt>
          <dd>
            <label className="amb-handoff-checklist__check">
              <input
                type="checkbox"
                checked={checklist.handoffAccepted}
                disabled={!canEdit}
                onChange={(event) =>
                  applyPatch({ handoffAccepted: event.target.checked })
                }
              />
              {checklist.handoffAccepted
                ? `Accepted${checklist.handoffAcceptedByStaffName ? ` by ${checklist.handoffAcceptedByStaffName}` : ''}`
                : 'Awaiting acceptance'}
            </label>
          </dd>
        </div>

        <div>
          <dt>Patient destination</dt>
          <dd>
            {canEdit ? (
              <select
                value={checklist.patientDestination}
                onChange={(event) =>
                  applyPatch({
                    patientDestination: event.target.value,
                    destinationLabel:
                      AMBULANCE_HANDOFF_DESTINATION_LABELS[event.target.value],
                  })
                }
              >
                {destinationOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              formatAmbulanceHandoffDestination(checklist)
            )}
          </dd>
        </div>
      </dl>

      {checklist.handoffSummary ? (
        <p className="amb-handoff-checklist__summary">{checklist.handoffSummary}</p>
      ) : null}

      {canEdit ? (
        <label className="amb-handoff-checklist__notes">
          Handoff notes
          <textarea
            rows={2}
            value={notesDraft}
            onChange={(event) => setNotesDraft(event.target.value)}
            onBlur={() => {
              if (notesDraft !== (checklist.handoffNotes || '')) {
                applyPatch({ handoffNotes: notesDraft });
              }
            }}
          />
        </label>
      ) : checklist.handoffNotes ? (
        <p className="amb-handoff-checklist__summary">{checklist.handoffNotes}</p>
      ) : null}
    </section>
  );
}

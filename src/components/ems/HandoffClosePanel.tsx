import React, { useState } from 'react';
import {
  canInitiateHandoffClose,
  handoffCloseCompletionPercent,
  isHandoffCloseComplete,
  mergeHandoffClosePatch,
} from '../../services/handoffClose';
import './HandoffClosePanel.css';

export default function HandoffClosePanel({
  arrival,
  checklist,
  handoffClose,
  canEdit = true,
  actorName = 'Staff',
  onUpdate,
  className = '',
}) {
  const [clinicianDraft, setClinicianDraft] = useState(handoffClose?.receivingClinicianName || '');
  const [notesDraft, setNotesDraft] = useState(handoffClose?.notes || '');
  const canStart = canInitiateHandoffClose(arrival, checklist);
  const completion = handoffCloseCompletionPercent(handoffClose);
  const closed = isHandoffCloseComplete(handoffClose);

  if (!canStart && !handoffClose) return null;

  const applyPatch = (patch) => {
    if (!canEdit || !onUpdate) return;
    onUpdate(mergeHandoffClosePatch(handoffClose, patch, { staffName: actorName }));
  };

  return (
    <section
      className={['handoff-close', closed ? 'handoff-close--done' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label="Handoff close checkpoint"
    >
      <header>
        <h4>Handoff close</h4>
        <span>{closed ? 'Checkpoint complete' : `${completion}% complete`}</span>
      </header>
      <p>Confirm the receiving clinician received and understood prehospital information.</p>

      <label className="handoff-close__field">
        Receiving clinician
        <input
          type="text"
          value={clinicianDraft}
          disabled={!canEdit}
          onChange={(event) => setClinicianDraft(event.target.value)}
          onBlur={() => {
            if (clinicianDraft !== (handoffClose?.receivingClinicianName || '')) {
              applyPatch({ receivingClinicianName: clinicianDraft });
            }
          }}
        />
      </label>

      <label className="handoff-close__check">
        <input
          type="checkbox"
          checked={Boolean(handoffClose?.informationUnderstood)}
          disabled={!canEdit}
          onChange={(event) => applyPatch({ informationUnderstood: event.target.checked })}
        />
        Information received and understood
      </label>

      <label className="handoff-close__check">
        <input
          type="checkbox"
          checked={Boolean(handoffClose?.questionsClarified)}
          disabled={!canEdit}
          onChange={(event) => applyPatch({ questionsClarified: event.target.checked })}
        />
        Questions clarified with EMS crew
      </label>

      {canEdit ? (
        <label className="handoff-close__field">
          Notes
          <textarea
            rows={2}
            value={notesDraft}
            onChange={(event) => setNotesDraft(event.target.value)}
            onBlur={() => {
              if (notesDraft !== (handoffClose?.notes || '')) {
                applyPatch({ notes: notesDraft });
              }
            }}
          />
        </label>
      ) : handoffClose?.notes ? (
        <p className="handoff-close__notes">{handoffClose.notes}</p>
      ) : null}
    </section>
  );
}

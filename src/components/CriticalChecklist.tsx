import { useEffect, useMemo, useRef, useState } from 'react';
import useModalDialog from '../hooks/useModalDialog';
import './CriticalChecklist.css';
import {
  CHECKLISTS,
  buildChecklistCompletionNote,
  findChecklistById,
  parseChecklistCompletionsFromNotes,
  sortChecklistItems,
  type Checklist,
  type ChecklistCompletion,
  type ChecklistItem,
  type ChecklistItemCategory,
} from '../config/criticalChecklists';
import { useEmergencyStore } from '../store/emergencyStore';
import type { Note, Patient } from '../types/emergency';

type CriticalChecklistProps = {
  patient: Patient;
  checklist?: Checklist | null;
  open: boolean;
  onClose: () => void;
  currentStaffId?: string | null;
  currentStaffName?: string | null;
  titleHint?: string;
  readOnly?: boolean;
};

const categoryIcon: Record<ChecklistItemCategory, string> = {
  Equipment: 'EQ',
  Medication: 'Rx',
  Notification: 'NT',
  Documentation: 'DOC',
  Assessment: 'AX',
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function completionMap(completions: ChecklistCompletion[], checklistId?: string): Map<string, ChecklistCompletion> {
  return completions.reduce((map, completion) => {
    if (!checklistId || completion.checklistId === checklistId) {
      map.set(completion.itemId, completion);
    }
    return map;
  }, new Map<string, ChecklistCompletion>());
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function ChecklistChooser({
  onSelect,
}: {
  onSelect: (checklistId: string) => void;
}) {
  return (
    <div className="checklist-chooser">
      {CHECKLISTS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          className="checklist-chooser__option"
        >
          <strong>{option.name}</strong>
          <span className="checklist-chooser__option-meta">
            {option.items.length} preparation items
          </span>
        </button>
      ))}
    </div>
  );
}

function ChecklistRow({
  item,
  completion,
  onCheck,
  disabled,
}: {
  item: ChecklistItem;
  completion?: ChecklistCompletion;
  onCheck: (item: ChecklistItem) => void;
  disabled?: boolean;
}) {
  const checked = Boolean(completion);

  return (
    <label
      className="checklist-row"
      style={{
        background: checked ? '#102316' : '#ffffff',
        // HEAL-262: the row text (.checklist-row__text) inherits color
        // from --medical-ink, a theme variable -- in light theme it's a
        // dark navy (near-unreadable on this row's own near-black checked
        // background); in dark theme it flips to near-white (near-
        // unreadable on this row's own hardcoded white unchecked
        // background). Pinning an explicit, contrast-matched text color
        // per state here breaks that dependency regardless of app theme.
        color: checked ? '#f0fdf4' : '#111827',
        border: `1px solid ${checked ? '#166534' : item.critical ? '#7F1D1D' : '#e0f2fe'}`,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.checked) onCheck(item);
        }}
        className="checklist-row__checkbox"
      />
      <span
        title={item.category}
        aria-label={item.category}
        className="checklist-row__category-icon"
      >
        {categoryIcon[item.category]}
      </span>
      <span>
        <span className="u-flex-center u-gap-6">
          {item.critical ? (
            <span aria-label="Critical item" className="checklist-row__critical-dot" />
          ) : null}
          {/* HEAL-262: .checklist-row__text has its own `color:
              var(--medical-ink)` CSS rule, which would otherwise override
              the label's inherited color above -- set explicitly here too
              so the fix actually reaches the text, not just the parent. */}
          <span className="checklist-row__text" style={{ color: checked ? '#f0fdf4' : '#111827' }}>
            {item.text}
          </span>
        </span>
        {completion ? (
          <small
            className="checklist-row__completion-note"
            style={{ color: checked ? '#bbf7d0' : undefined }}
          >
            Completed by {completion.checkedBy} at {formatTime(completion.checkedAt)}
          </small>
        ) : null}
      </span>
    </label>
  );
}

export default function CriticalChecklist({
  patient,
  checklist,
  open,
  onClose,
  currentStaffId,
  currentStaffName,
  titleHint,
  readOnly = false,
}: CriticalChecklistProps) {
  const addNote = useEmergencyStore((state) => state.addNote);
  const [selectedChecklistId, setSelectedChecklistId] = useState(checklist?.id || '');
  const [optimisticCompletions, setOptimisticCompletions] = useState<ChecklistCompletion[]>([]);
  const activeChecklist = checklist || findChecklistById(selectedChecklistId);
  const checkedBy = currentStaffName || currentStaffId || patient.assignedStaffId || 'current-staff';

  useEffect(() => {
    setSelectedChecklistId(checklist?.id || '');
    setOptimisticCompletions([]);
  }, [checklist?.id, patient.id, open]);

  const dialogRef = useRef<HTMLElement>(null);

  // HEAL-261: this dialog had role="dialog"/aria-modal="true" but none of
  // the focus/keyboard handling other dialogs in this codebase implement
  // (see ReassessmentDrawer.tsx's HEAL-221 fix for the same gap, and
  // ConfirmDialogProvider.tsx/CommandPalette.tsx for the same pattern
  // done correctly): no Escape-to-close, no focus moved in on open, no
  // focus restored on close, no backdrop click-to-dismiss. This is
  // auto-opened by PatientDetailPanel for stroke-code flags and critical
  // EMS arrivals -- the single highest-acuity modal in the app -- yet was
  // the one dialog a keyboard user couldn't dismiss without finding the
  // small "X" with a mouse.
  // HEAL-261 added Escape, focus-in and focus-restore by hand; Tab containment was
  // the missing piece behind this dialog's own aria-modal="true". initialFocus
  // stays on the container, which is the behaviour that shipped and is asserted by
  // this component's tests.
  useModalDialog(dialogRef, { onClose, enabled: open, initialFocus: 'container' });

  const noteCompletions = useMemo(
    () => parseChecklistCompletionsFromNotes(patient.notes || []),
    [patient.notes],
  );
  const completionsByItem = useMemo(
    () => completionMap([...noteCompletions, ...optimisticCompletions], activeChecklist?.id),
    [activeChecklist?.id, noteCompletions, optimisticCompletions],
  );
  const sortedItems = useMemo(
    () => sortChecklistItems(activeChecklist?.items || []),
    [activeChecklist?.items],
  );
  const completedCount = activeChecklist
    ? activeChecklist.items.filter((item) => completionsByItem.has(item.id)).length
    : 0;
  const totalCount = activeChecklist?.items.length || 0;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  if (!open) return null;

  const checkItem = (item: ChecklistItem) => {
    // HEAL-347.86: this checklist is auto-opened by PatientDetailPanel for
    // stroke-code flags and critical EMS arrivals -- highest-acuity modal
    // in the app -- yet had no permission check at all, unlike every other
    // note-writing surface in that same parent (which computes
    // canWriteNote via emergencyRole.presentAction(EMERGENCY_ACTIONS.
    // writeNote) and passes it down, but never to this component). A role
    // that can view the patient but not write clinical notes could still
    // check off critical-checklist items, which silently calls addNote().
    if (readOnly || !activeChecklist || completionsByItem.has(item.id)) return;

    const completion: ChecklistCompletion = {
      checklistId: activeChecklist.id,
      itemId: item.id,
      checkedBy,
      checkedAt: new Date().toISOString(),
      itemText: item.text,
    };
    const text = buildChecklistCompletionNote(completion);
    const note: Note = {
      id: createId('critical-checklist-note'),
      patientId: patient.id,
      text,
      body: text,
      authorId: currentStaffId || patient.assignedStaffId || 'current-staff',
      authorStaffId: currentStaffId || patient.assignedStaffId || 'current-staff',
      type: 'Checklist',
      timestamp: completion.checkedAt,
      createdAt: completion.checkedAt,
      metadata: {
        checklistId: activeChecklist.id,
        itemId: item.id,
        checkedBy,
      },
    };

    setOptimisticCompletions((current) => [...current, completion]);
    addNote(patient.id, note);
  };

  return (
    <>
      <button
        type="button"
        className="critical-checklist-panel__backdrop"
        aria-label="Close checklist backdrop"
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={activeChecklist?.name || 'Critical checklist'}
        className="critical-checklist-panel"
        tabIndex={-1}
      >
      <header className="critical-checklist-panel__header">
        <div className="critical-checklist-panel__header-row">
          <div>
            <span className="critical-checklist-panel__eyebrow">
              CRITICAL CHECKLIST
            </span>
            <h2 className="critical-checklist-panel__title">
              {activeChecklist?.name || titleHint || 'Choose a checklist'}
            </h2>
            <p className="critical-checklist-panel__subtitle">
              {patient.firstName} {patient.lastName} · {patient.chiefComplaint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checklist"
            className="u-icon-btn-32"
          >
            X
          </button>
        </div>

        {activeChecklist ? (
          <div className="critical-checklist-panel__progress-wrap">
            <div
              aria-label={`${completedCount}/${totalCount} items checked`}
              className="critical-checklist-progress-track"
            >
              <span
                style={{
                  background: progress === 100 ? '#22C55E' : '#EF4444',
                  display: 'block',
                  height: '100%',
                  width: `${progress}%`,
                }}
              />
            </div>
            <strong className="critical-checklist-panel__progress-label">
              {completedCount}/{totalCount} items checked
            </strong>
          </div>
        ) : null}
      </header>

      <div className="u-pad-16">
        {activeChecklist ? (
          <>
            {!checklist ? (
              <div className="critical-checklist-panel__change-row">
                <button
                  type="button"
                  onClick={() => setSelectedChecklistId('')}
                  className="critical-checklist-panel__change-btn"
                >
                  Change Checklist
                </button>
              </div>
            ) : null}
            <div className="u-grid-gap-10">
              {sortedItems.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  completion={completionsByItem.get(item.id)}
                  onCheck={checkItem}
                  disabled={readOnly}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="critical-checklist-panel__empty-state">
              Select one of the configured preparation checklists. StrokeCode has no configured C10 checklist yet.
            </p>
            <ChecklistChooser onSelect={setSelectedChecklistId} />
          </>
        )}
      </div>
      </aside>
    </>
  );
}


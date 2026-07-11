import { useEffect, useMemo, useState } from 'react';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../config/medicalTheme.constants';
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
    <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
      {CHECKLISTS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          style={{
            background: MEDICAL_THEME.surfaceCard,
            border: '1px solid #e0f2fe',
            borderRadius: 10,
            color: 'var(--medical-ink, #111827)',
            cursor: 'pointer',
            padding: '10px 12px',
            textAlign: 'left',
          }}
        >
          <strong>{option.name}</strong>
          <span style={{ display: 'block', color: MEDICAL_THEME.inkSubtle, fontSize: 12, marginTop: 3 }}>
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
}: {
  item: ChecklistItem;
  completion?: ChecklistCompletion;
  onCheck: (item: ChecklistItem) => void;
}) {
  const checked = Boolean(completion);

  return (
    <label
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 24px 1fr',
        gap: 10,
        alignItems: 'start',
        background: checked ? '#102316' : MEDICAL_THEME.surfaceCard,
        border: `1px solid ${checked ? '#166534' : item.critical ? '#7F1D1D' : '#e0f2fe'}`,
        borderRadius: 12,
        padding: 10,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          if (event.target.checked) onCheck(item);
        }}
        style={{ marginTop: 3 }}
      />
      <span
        title={item.category}
        aria-label={item.category}
        style={{
          alignItems: 'center',
          background: '#f0f9ff',
          borderRadius: 7,
          color: MEDICAL_THEME.accent,
          display: 'inline-flex',
          fontSize: 10,
          fontWeight: 800,
          height: 22,
          justifyContent: 'center',
          lineHeight: 1,
          width: 24,
        }}
      >
        {categoryIcon[item.category]}
      </span>
      <span>
        <span className="u-flex-center u-gap-6">
          {item.critical ? (
            <span
              aria-label="Critical item"
              style={{ background: '#EF4444', borderRadius: 999, height: 8, width: 8, flex: '0 0 auto' }}
            />
          ) : null}
          <span style={{ color: 'var(--medical-ink, #111827)', fontSize: 13, lineHeight: 1.35 }}>{item.text}</span>
        </span>
        {completion ? (
          <small style={{ color: MEDICAL_THEME.inkSubtle, display: 'block', fontSize: 11, marginTop: 5 }}>
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
    if (!activeChecklist || completionsByItem.has(item.id)) return;

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
    <aside
      role="dialog"
      aria-modal="true"
      aria-label={activeChecklist?.name || 'Critical checklist'}
      style={{
        background: MEDICAL_THEME.surfaceCard,
        borderLeft: '1px solid #e0f2fe',
        boxShadow: '-24px 0 60px rgba(0,0,0,0.36)',
        color: 'var(--medical-ink, #111827)',
        height: '100vh',
        overflowY: 'auto',
        position: 'fixed',
        right: 0,
        top: 0,
        width: 360,
        zIndex: 180,
      }}
    >
      <header
        style={{
          background: MEDICAL_THEME.surfaceCard,
          borderBottom: '1px solid #e0f2fe',
          padding: 16,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <div style={{ alignItems: 'start', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <span style={{ color: MEDICAL_TYPE.statusCritical, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em' }}>
              CRITICAL CHECKLIST
            </span>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: '5px 0 0' }}>
              {activeChecklist?.name || titleHint || 'Choose a checklist'}
            </h2>
            <p style={{ color: MEDICAL_THEME.inkSubtle, fontSize: 12, lineHeight: 1.35, margin: '6px 0 0' }}>
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
          <div style={{ marginTop: 14 }}>
            <div
              aria-label={`${completedCount}/${totalCount} items checked`}
              style={{
                background: MEDICAL_THEME.surfaceCard,
                border: '1px solid #e0f2fe',
                borderRadius: 999,
                height: 9,
                overflow: 'hidden',
              }}
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
            <strong style={{ color: '#E5E7EB', display: 'block', fontSize: 12, marginTop: 7 }}>
              {completedCount}/{totalCount} items checked
            </strong>
          </div>
        ) : null}
      </header>

      <div className="u-pad-16">
        {activeChecklist ? (
          <>
            {!checklist ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setSelectedChecklistId('')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #e0f2fe',
                    borderRadius: 10,
                    color: 'var(--medical-ink, #111827)',
                    cursor: 'pointer',
                    padding: '8px 10px',
                  }}
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
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <p style={{ color: MEDICAL_THEME.inkDisabled, fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              Select one of the configured preparation checklists. StrokeCode has no configured C10 checklist yet.
            </p>
            <ChecklistChooser onSelect={setSelectedChecklistId} />
          </>
        )}
      </div>
    </aside>
  );
}


import React from 'react';
import './ems.css';

export type HandoffStep = {
  id: string;
  label: string;
  done: boolean;
  optional?: boolean;
};

type HandoffChecklistItemProps = {
  step: HandoffStep;
  onChange?: (id: string, done: boolean) => void;
};

export function HandoffChecklistItem({ step, onChange }: HandoffChecklistItemProps) {
  return (
    <div className={['cd-handoff-item', step.done ? 'cd-handoff-item--done' : ''].filter(Boolean).join(' ')}>
      <input
        type="checkbox"
        className="cd-handoff-item__check"
        checked={step.done}
        onChange={(e) => onChange?.(step.id, e.target.checked)}
        id={`handoff-${step.id}`}
        aria-label={step.label}
      />
      <label htmlFor={`handoff-${step.id}`} className="cd-handoff-item__label">{step.label}</label>
      {step.optional && <span className="cd-handoff-item__badge">Optional</span>}
    </div>
  );
}

type HandoffChecklistProps = {
  steps: HandoffStep[];
  onChange?: (id: string, done: boolean) => void;
  className?: string;
};

export function HandoffChecklist({ steps, onChange, className }: HandoffChecklistProps) {
  const done = steps.filter((s) => s.done).length;
  return (
    <div className={['cd-handoff-list', className ?? ''].filter(Boolean).join(' ')}>
      <div className="cd-handoff-list__progress">{done} / {steps.length} complete</div>
      {steps.map((s) => (
        <HandoffChecklistItem key={s.id} step={s} onChange={onChange} />
      ))}
    </div>
  );
}

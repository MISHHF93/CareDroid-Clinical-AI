import React, { useId } from 'react';
import { AriaInvalidTextarea } from '../a11y/AriaInvalidFields';
import './Textarea.css';

type TextareaProps = {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ label, hint, error, required, className, id: externalId, rows = 3, ...props }: TextareaProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={['cd-input-root', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={id} className={['cd-input-label', required ? 'cd-input-label--required' : ''].filter(Boolean).join(' ')}>
          {label}
        </label>
      )}
      <AriaInvalidTextarea
        id={id}
        rows={rows}
         invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-required={required ? 'true' : 'false'}
        className={['cd-textarea', error ? 'cd-textarea--error' : ''].filter(Boolean).join(' ')}
        {...props}
      />
      {hint && !error && <p id={hintId} className="cd-input-hint">{hint}</p>}
      {error && <p id={errorId} className="cd-input-error" role="alert">{error}</p>}
    </div>
  );
}

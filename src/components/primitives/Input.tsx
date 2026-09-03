import React, { useId } from 'react';
import { AriaInvalidInput } from '../a11y/AriaInvalidFields';
import './Input.css';

type InputSize = 'sm' | 'md' | 'lg';

type InputProps = {
  label?: string;
  hint?: string;
  error?: string;
  size?: InputSize;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  required?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>;

export function Input({
  label,
  hint,
  error,
  size = 'md',
  leadingIcon,
  trailingIcon,
  required,
  className,
  id: externalId,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['cd-input-root', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={id}
          className={['cd-input-label', required ? 'cd-input-label--required' : '']
            .filter(Boolean)
            .join(' ')}
        >
          {label}
        </label>
      )}
      <div className="cd-input-wrap">
        {leadingIcon && (
          <span className="cd-input-icon cd-input-icon--leading" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <AriaInvalidInput
          id={id}
          invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required ? 'true' : 'false'}
          className={[
            'cd-input',
            `cd-input--${size}`,
            error ? 'cd-input--error' : '',
            leadingIcon ? 'cd-input--has-leading' : '',
            trailingIcon ? 'cd-input--has-trailing' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {trailingIcon && (
          <span className="cd-input-icon cd-input-icon--trailing" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="cd-input-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="cd-input-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

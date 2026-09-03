import React, { useId, useEffect, useRef } from 'react';
import { AriaInvalidInput } from '../a11y/AriaInvalidFields';
import './Checkbox.css';

type CheckboxProps = {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function Checkbox({
  label,
  description,
  error,
  indeterminate,
  className,
  id: externalId,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate ?? false;
  }, [indeterminate]);

  return (
    <div className={['cd-checkbox-root', className].filter(Boolean).join(' ')}>
      <label className="cd-checkbox-row" htmlFor={id}>
        <AriaInvalidInput
          ref={ref}
          type="checkbox"
          id={id}
          className="cd-checkbox-control"
          invalid={error ? true : undefined}
          {...props}
        />
        {(label || description) && (
          <span>
            {label && <span className="cd-checkbox-label">{label}</span>}
            {description && <span className="cd-checkbox-desc">{description}</span>}
          </span>
        )}
      </label>
      {error && (
        <p className="cd-input-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

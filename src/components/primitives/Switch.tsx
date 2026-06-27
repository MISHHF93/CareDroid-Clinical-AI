import React, { useId } from 'react';
import './Switch.css';

type SwitchSize = 'sm' | 'md';

type SwitchProps = {
  label?: string;
  size?: SwitchSize;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>;

export function Switch({ label, size = 'md', className, id: externalId, ...props }: SwitchProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;

  return (
    <label
      htmlFor={id}
      className={['cd-switch-row', className].filter(Boolean).join(' ')}
    >
      <span className={`cd-switch-track cd-switch-track--${size}`}>
        <input
          type="checkbox"
          role="switch"
          id={id}
          className="cd-switch-input"
          {...props}
        />
        <span className="cd-switch-thumb" aria-hidden="true" />
      </span>
      {label && <span className="cd-switch-label">{label}</span>}
    </label>
  );
}

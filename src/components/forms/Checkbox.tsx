import './Checkbox.css';

/**
 * Checkbox Component
 * 
 * Single checkbox with label and description
 * 
 * @param {string} id - Input id for label association
 * @param {string} label - Label text
 * @param {string} description - Optional description below label
 * @param {boolean} checked - Checked state
 * @param {Function} onChange - Change callback (checked: boolean) => void
 * @param {boolean} disabled - Disabled state
 * @param {boolean} required - Required field
 * @param {string} error - Error message
 * @param {('sm'|'md'|'lg')} size - Checkbox size
 */
export const Checkbox = ({
  id,
  label,
  description = undefined as any,
  checked,
  onChange,
  disabled = false,
  required = false,
  error = undefined,
  size = 'md',
}) => {
  return (
    <div className={`checkbox-container checkbox-${size}`}>
      <div className="checkbox-wrapper">
        <input
          type="checkbox"
          id={id}
          className="checkbox-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={description ? `${id}-desc` : undefined}
        />
        <label htmlFor={id} className="checkbox-label">
          <span className="checkbox-box">
            {checked && <span className="checkbox-check">✓</span>}
          </span>
          <span className="checkbox-text">
            <span className="checkbox-label-text">
              {label}
              {required && <span className="checkbox-required">*</span>}
            </span>
            {description && (
              <span id={`${id}-desc`} className="checkbox-description">
                {description}
              </span>
            )}
          </span>
        </label>
      </div>
      {error && <span className="checkbox-error">{error}</span>}
    </div>
  );
};

/**
 * Checkbox Group Component
 * Multiple checkboxes with shared label
 */
export const CheckboxGroup = ({
  label,
  description,
  options = [] as any[],
  value = [] as any[],
  onChange,
  disabled = false,
  required = false,
  error,
  size = 'md',
}) => {
  const handleChange = (optionValue, checked) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  return (
    <div className="checkbox-group">
      {label && (
        <div className="checkbox-group-header">
          <span className="checkbox-group-label">
            {label}
            {required && <span className="checkbox-required">*</span>}
          </span>
          {description && (
            <span className="checkbox-group-description">{description}</span>
          )}
        </div>
      )}

      <div className="checkbox-group-options">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            id={option.value}
            label={option.label}
            description={option.description}
            checked={value.includes(option.value)}
            onChange={(checked) => handleChange(option.value, checked)}
            disabled={disabled || option.disabled}
            size={size}
          />
        ))}
      </div>

      {error && <span className="checkbox-error">{error}</span>}
    </div>
  );
};

/**
 * Toggle Switch (Styled checkbox alternative)
 */
export const Toggle = ({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  return (
    <div className={`toggle-container toggle-${size}`}>
      <input
        type="checkbox"
        id={id}
        className="toggle-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
      />
      <label htmlFor={id} className="toggle-label">
        <span className="toggle-text">
          <span className="toggle-label-text">{label}</span>
          {description && (
            <span className="toggle-description">{description}</span>
          )}
        </span>
        <span className="toggle-switch">
          <span className="toggle-slider"></span>
        </span>
      </label>
    </div>
  );
};

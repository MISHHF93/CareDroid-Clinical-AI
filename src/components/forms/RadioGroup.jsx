import './RadioGroup.css';

/**
 * Radio Group Component
 * 
 * Group of mutually exclusive radio buttons
 * 
 * @param {string} name - Input name (shared across all radios)
 * @param {string} label - Group label
 * @param {string} description - Optional description
 * @param {Array<{value: string, label: string, description?: string}>} options - Radio options
 * @param {string} value - Selected value
 * @param {Function} onChange - Change callback (value) => void
 * @param {boolean} disabled - Disabled state for all radios
 * @param {boolean} required - Required field
 * @param {string} error - Error message
 * @param {('vertical'|'horizontal')} layout - Layout direction
 * @param {('sm'|'md'|'lg')} size - Radio size
 */
export const RadioGroup = ({
  name,
  label,
  description,
  options = [],
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  layout = 'vertical',
  size = 'md',
}) => {
  return (
    <div className={`radio-group radio-group-${layout}`} role="radiogroup">
      {label && (
        <div className="radio-group-header">
          <span className="radio-group-label">
            {label}
            {required && <span className="radio-required">*</span>}
          </span>
          {description && (
            <span className="radio-group-description">{description}</span>
          )}
        </div>
      )}

      <div className={`radio-group-options radio-group-options-${layout}`}>
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            id={`${name}-${option.value}`}
            label={option.label}
            description={option.description}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
            disabled={disabled || option.disabled}
            size={size}
          />
        ))}
      </div>

      {error && <span className="radio-error">{error}</span>}
    </div>
  );
};

/**
 * Single Radio Button Component
 */
export const Radio = ({
  name,
  id,
  label,
  description,
  value,
  checked,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  return (
    <div className={`radio-container radio-${size}`}>
      <input
        type="radio"
        id={id}
        name={name}
        className="radio-input"
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
      />
      <label htmlFor={id} className="radio-label">
        <span className="radio-button">
          <span className="radio-dot"></span>
        </span>
        <span className="radio-text">
          <span className="radio-label-text">{label}</span>
          {description && (
            <span id={`${id}-desc`} className="radio-description">
              {description}
            </span>
          )}
        </span>
      </label>
    </div>
  );
};

/**
 * Card-style Radio Group (Larger, more prominent selections)
 */
export const RadioCardGroup = ({
  name,
  label,
  description,
  options = [],
  value,
  onChange,
  disabled = false,
  required = false,
  error,
}) => {
  return (
    <div className="radio-card-group" role="radiogroup">
      {label && (
        <div className="radio-group-header">
          <span className="radio-group-label">
            {label}
            {required && <span className="radio-required">*</span>}
          </span>
          {description && (
            <span className="radio-group-description">{description}</span>
          )}
        </div>
      )}

      <div className="radio-card-options">
        {options.map((option) => (
          <div
            key={option.value}
            className={`radio-card ${
              value === option.value ? 'radio-card-selected' : ''
            } ${disabled || option.disabled ? 'radio-card-disabled' : ''}`}
          >
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              className="radio-card-input"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || option.disabled}
            />
            <label htmlFor={`${name}-${option.value}`} className="radio-card-label">
              {option.icon && (
                <span className="radio-card-icon">{option.icon}</span>
              )}
              <span className="radio-card-content">
                <span className="radio-card-title">{option.label}</span>
                {option.description && (
                  <span className="radio-card-description">
                    {option.description}
                  </span>
                )}
              </span>
              <span className="radio-card-check">✓</span>
            </label>
          </div>
        ))}
      </div>

      {error && <span className="radio-error">{error}</span>}
    </div>
  );
};

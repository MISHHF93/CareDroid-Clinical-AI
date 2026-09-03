import { useId, useState } from 'react';
import './input.css';

const Input = ({
  type = 'text',
  label,
  error,
  success,
  leftIcon,
  rightIcon,
  placeholder,
  id,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled,
  compact = false,
  className,
  style,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = error || success ? `${inputId}-message` : undefined;
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getInputClassName = () => {
    let classes = ['input-field'];
    if (error) classes.push('input-error');
    if (success) classes.push('input-success');
    if (disabled) classes.push('input-disabled');
    if (isFocused) classes.push('input-focused');
    if (compact) classes.push('input-compact');
    if (leftIcon) classes.push('input-with-left-icon');
    if (rightIcon) classes.push('input-with-right-icon');
    if (className) classes.push(className);
    return classes.join(' ');
  };

  return (
    <div className="input-wrapper">
      {label && (
        <label
          className={`input-label ${isFocused ? 'input-label-focused' : ''}`}
          htmlFor={inputId}
        >
          {label}
        </label>
      )}
      <div className="input-container">
        {leftIcon && <span className="input-icon input-icon-left">{leftIcon}</span>}
        {error ? (
          <input
            id={inputId}
            type={type}
            className={getInputClassName()}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            style={style}
            aria-invalid="true"
            aria-describedby={messageId}
            {...props}
          />
        ) : (
          <input
            id={inputId}
            type={type}
            className={getInputClassName()}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            style={style}
            aria-invalid="false"
            aria-describedby={messageId}
            {...props}
          />
        )}
        {rightIcon && <span className="input-icon input-icon-right">{rightIcon}</span>}
      </div>
      {error && (
        <span id={messageId} className="input-message input-error-message">
          {error}
        </span>
      )}
      {success && (
        <span id={messageId} className="input-message input-success-message">
          {success}
        </span>
      )}
    </div>
  );
};

export default Input;

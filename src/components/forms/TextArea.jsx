import { useState, useRef, useEffect } from 'react';
import './TextArea.css';

/**
 * TextArea Component
 * 
 * Multi-line text input with auto-resize and character count
 * 
 * @param {string} id - Input id for label association
 * @param {string} label - Label text
 * @param {string} value - Input value
 * @param {Function} onChange - Change callback (value) => void
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Disabled state
 * @param {boolean} required - Required field
 * @param {string} error - Error message
 * @param {number} rows - Initial number of rows (default: 3)
 * @param {number} maxRows - Maximum rows before scrolling (default: 10)
 * @param {number} maxLength - Maximum character count
 * @param {boolean} autoResize - Enable auto-resize (default: true)
 * @param {boolean} showCount - Show character count (default: false)
 * @param {('sm'|'md'|'lg')} size - TextArea size
 */
export const TextArea = ({
  id,
  label,
  value = '',
  onChange,
  placeholder,
  disabled = false,
  required = false,
  error,
  rows = 3,
  maxRows = 10,
  maxLength,
  autoResize = true,
  showCount = false,
  size = 'md',
}) => {
  const textAreaRef = useRef(null);
  const [charCount, setCharCount] = useState(value.length);

  // Auto-resize functionality
  useEffect(() => {
    if (autoResize && textAreaRef.current) {
      const textArea = textAreaRef.current;
      
      // Reset height to auto to get accurate scrollHeight
      textArea.style.height = 'auto';
      
      // Calculate line height
      const lineHeight = parseInt(window.getComputedStyle(textArea).lineHeight);
      const maxHeight = lineHeight * maxRows;
      
      // Set new height (limited by maxRows)
      const newHeight = Math.min(textArea.scrollHeight, maxHeight);
      textArea.style.height = `${newHeight}px`;
    }
  }, [value, autoResize, maxRows]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Enforce maxLength if set
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    setCharCount(newValue.length);
    onChange(newValue);
  };

  return (
    <div className={`textarea-container textarea-${size}`}>
      {label && (
        <label htmlFor={id} className="textarea-label">
          {label}
          {required && <span className="textarea-required">*</span>}
        </label>
      )}

      <textarea
        ref={textAreaRef}
        id={id}
        className={`textarea-input ${error ? 'textarea-input-error' : ''}`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />

      {(showCount || maxLength || error) && (
        <div className="textarea-footer">
          {error ? (
            <span id={`${id}-error`} className="textarea-error">
              {error}
            </span>
          ) : (
            <span></span>
          )}

          {(showCount || maxLength) && (
            <span
              className={`textarea-count ${
                maxLength && charCount >= maxLength ? 'textarea-count-max' : ''
              }`}
            >
              {charCount}
              {maxLength && ` / ${maxLength}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Code TextArea (Monospace font, no auto-resize)
 */
export const CodeTextArea = ({
  id,
  label,
  value = '',
  onChange,
  placeholder = 'Enter code...',
  disabled = false,
  required = false,
  error,
  rows = 10,
  maxLength,
  language,
}) => {
  return (
    <div className="textarea-container textarea-code">
      {label && (
        <div className="textarea-header">
          <label htmlFor={id} className="textarea-label">
            {label}
            {required && <span className="textarea-required">*</span>}
          </label>
          {language && <span className="textarea-language">{language}</span>}
        </div>
      )}

      <textarea
        id={id}
        className={`textarea-input textarea-input-code ${
          error ? 'textarea-input-error' : ''
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        spellCheck={false}
        aria-invalid={!!error}
      />

      {error && <span className="textarea-error">{error}</span>}
    </div>
  );
};

/**
 * Rich Text Preview TextArea
 * Shows preview alongside input (for markdown, etc.)
 */
export const TextAreaWithPreview = ({
  id,
  label,
  value = '',
  onChange,
  placeholder,
  disabled = false,
  required = false,
  error,
  rows = 10,
  renderPreview,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="textarea-with-preview">
      {label && (
        <div className="textarea-header">
          <label htmlFor={id} className="textarea-label">
            {label}
            {required && <span className="textarea-required">*</span>}
          </label>
          <button
            type="button"
            className="textarea-preview-toggle"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '✏️ Edit' : '👁️ Preview'}
          </button>
        </div>
      )}

      <div className="textarea-preview-container">
        {!showPreview ? (
          <textarea
            id={id}
            className={`textarea-input ${error ? 'textarea-input-error' : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={rows}
          />
        ) : (
          <div className="textarea-preview-content">
            {renderPreview ? renderPreview(value) : value}
          </div>
        )}
      </div>

      {error && <span className="textarea-error">{error}</span>}
    </div>
  );
};

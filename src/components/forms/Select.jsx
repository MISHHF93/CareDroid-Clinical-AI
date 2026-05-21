import { useState, useRef, useEffect } from 'react';
import './Select.css';

/**
 * Select Dropdown Component
 * 
 * Custom select with search/filter functionality
 * 
 * @param {string} id - Input id for label association
 * @param {string} label - Label text
 * @param {Array<{value: string, label: string}>} options - Select options
 * @param {string} value - Selected value
 * @param {Function} onChange - Change callback (value) => void
 * @param {string} placeholder - Placeholder text
 * @param {boolean} searchable - Enable search/filter (default: false)
 * @param {boolean} disabled - Disabled state
 * @param {boolean} required - Required field
 * @param {string} error - Error message
 * @param {('sm'|'md'|'lg')} size - Select size
 */
export const Select = ({
  id,
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  searchable = false,
  disabled = false,
  required = false,
  error,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Filter options based on search
  const filteredOptions = searchable && searchTerm
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setHighlightedIndex(0);
      }
    }
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          setIsOpen(true);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        e.preventDefault();
        break;

      case 'Escape':
        setIsOpen(false);
        e.preventDefault();
        break;

      case 'ArrowDown':
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        e.preventDefault();
        break;

      case 'ArrowUp':
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        e.preventDefault();
        break;

      default:
        break;
    }
  };

  return (
    <div className={`select-container select-${size}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="select-label">
          {label}
          {required && <span className="select-required">*</span>}
        </label>
      )}

      <div
        className={`select-trigger ${isOpen ? 'select-trigger-open' : ''} ${
          disabled ? 'select-trigger-disabled' : ''
        } ${error ? 'select-trigger-error' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-labelledby={label ? id : undefined}
        aria-required={required}
        aria-invalid={!!error}
        tabIndex={disabled ? -1 : 0}
      >
        <span className="select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`select-arrow ${isOpen ? 'select-arrow-open' : ''}`}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="select-dropdown" id={`${id}-listbox`} role="listbox">
          {searchable && (
            <div className="select-search">
              <input
                ref={searchInputRef}
                type="text"
                className="select-search-input"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search options"
              />
            </div>
          )}

          <ul className="select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  className={`select-option ${
                    option.value === value ? 'select-option-selected' : ''
                  } ${
                    index === highlightedIndex ? 'select-option-highlighted' : ''
                  }`}
                  onClick={() => handleSelect(option.value)}
                  role="option"
                  aria-selected={option.value === value}
                >
                  {option.label}
                  {option.value === value && (
                    <span className="select-check">✓</span>
                  )}
                </li>
              ))
            ) : (
              <li className="select-option select-option-empty">
                No options found
              </li>
            )}
          </ul>
        </div>
      )}

      {error && <span className="select-error">{error}</span>}
    </div>
  );
};

/**
 * Multi-Select Component
 * Allows selecting multiple options
 */
export const MultiSelect = ({
  id,
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options...',
  searchable = false,
  disabled = false,
  required = false,
  error,
  size = 'md',
  maxSelections,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable && searchTerm
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };

  const handleSelect = (optionValue) => {
    if (value.includes(optionValue)) {
      // Remove
      onChange(value.filter((v) => v !== optionValue));
    } else {
      // Add if not at max
      if (!maxSelections || value.length < maxSelections) {
        onChange([...value, optionValue]);
      }
    }
  };

  const handleRemove = (optionValue, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className={`select-container select-${size}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="select-label">
          {label}
          {required && <span className="select-required">*</span>}
        </label>
      )}

      <div
        className={`select-trigger select-trigger-multi ${
          isOpen ? 'select-trigger-open' : ''
        } ${disabled ? 'select-trigger-disabled' : ''} ${
          error ? 'select-trigger-error' : ''
        }`}
        onClick={handleToggle}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
      >
        <div className="select-multi-values">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span key={opt.value} className="select-multi-tag">
                {opt.label}
                <button
                  type="button"
                  className="select-multi-remove"
                  onClick={(e) => handleRemove(opt.value, e)}
                  aria-label={`Remove ${opt.label}`}
                >
                  ✕
                </button>
              </span>
            ))
          ) : (
            <span className="select-placeholder">{placeholder}</span>
          )}
        </div>
        <span className={`select-arrow ${isOpen ? 'select-arrow-open' : ''}`}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div className="select-dropdown" role="listbox" aria-multiselectable="true">
          {searchable && (
            <div className="select-search">
              <input
                ref={searchInputRef}
                type="text"
                className="select-search-input"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          <ul className="select-options">
            {filteredOptions.map((option) => {
              const isSelected = value.includes(option.value);
              const isDisabled =
                !isSelected && maxSelections && value.length >= maxSelections;

              return (
                <li
                  key={option.value}
                  className={`select-option ${
                    isSelected ? 'select-option-selected' : ''
                  } ${isDisabled ? 'select-option-disabled' : ''}`}
                  onClick={() => !isDisabled && handleSelect(option.value)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    readOnly
                    tabIndex={-1}
                  />
                  <span>{option.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && <span className="select-error">{error}</span>}
    </div>
  );
};

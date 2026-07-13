import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';

export function CalcPanelTitle({ icon, children }) {
  return (
    <div className="calculator-panel-title">
      <NavIcon icon={icon} size={22} aria-hidden />
      <span className="calculator-panel-title-text">{children}</span>
    </div>
  );
}

export function ResultsPanelTitle() {
  return (
    <div className="calculator-panel-title">
      <NavIcon icon={CHROME_ICONS.barChart} size={22} aria-hidden />
      <span className="calculator-panel-title-text">Results</span>
    </div>
  );
}

export function CalcResultsEmptyIcon({ icon, size = 56 }) {
  return (
    <div className="calc-results-empty-icon" aria-hidden>
      <NavIcon icon={icon} size={size} />
    </div>
  );
}

export function CalcDecisionSupportLead({ children = undefined }: any) {
  return (
    <p className="calc-ds-lead">
      <strong>Decision support only.</strong>{' '}
      {children ||
        'Does not establish a diagnosis, confer diagnostic certainty, or replace clinician judgment; follow local protocols.'}
    </p>
  );
}

export function CalcResultSafetyFooter({ children = undefined }: any) {
  return (
    <p className="calc-result-safety-footer" role="note">
      {children ||
        'Output reflects the values you entered and may omit important clinical context. Do not treat this screen as definitive proof of illness severity, eligibility, or treatment requirement, and do not use it alone to rule in or rule out a diagnosis.'}
    </p>
  );
}

export function CalcInterpretationRegion({ headingId, title, severity, emphasizeRisk = false, children, ariaLabel = undefined }) {
  return (
    <section
      className={`calc-interpretation-box ${severity}${emphasizeRisk ? ' calc-interpretation-box--risk-emphasis' : ''}`}
      role="region"
      aria-labelledby={headingId}
      aria-label={ariaLabel}
    >
      {headingId ? (
        <h3 id={headingId} className="calc-interpretation-title">
          {title}
        </h3>
      ) : (
        <h3 className="calc-interpretation-title">{title}</h3>
      )}
      {children}
    </section>
  );
}

export function CalcResultsPanel({
  id,
  resultsRef,
  children,
  ariaLabel = undefined,
  ariaLive = 'polite',
  ariaAtomic = true,
  role = undefined,
}: any) {
  // Static role when results are a named region (Edge Tools rejects dynamic ARIA roles).
  const useRegion = role === 'region' || (!!ariaLabel && role !== 'status' && role !== 'alert');
  if (useRegion) {
    return (
      <div
        ref={resultsRef}
        id={id}
        className="calculator-results"
        role="region"
        aria-label={ariaLabel}
        aria-live={ariaLive}
        aria-atomic={ariaAtomic ? 'true' : 'false'}
        tabIndex={-1}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      ref={resultsRef}
      id={id}
      className="calculator-results"
      aria-label={ariaLabel}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic ? 'true' : 'false'}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

export function scrollResultsIntoView(el) {
  if (!el) return;
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}

export function ValidationErrors({ errors, title = 'Check required fields:' }) {
  if (!errors.length) return null;
  return (
    <div className="calc-validation-errors" role="alert">
      <strong>{title}</strong>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export function CalcFieldValidationErrors({ errors }) {
  if (!errors.length) return null;
  return (
    <div className="calc-validation-errors" role="alert" aria-live="assertive">
      <p className="calc-validation-errors-title">Correct the following before calculating:</p>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export function CalcNumberField({ slug, field, value, onChange }) {
  return (
    <div className="calc-input-group">
      <label className="calc-input-label" htmlFor={`${slug}-${field.name}`}>
        {field.label}
      </label>
      <input
        id={`${slug}-${field.name}`}
        className="calc-input-field"
        type="number"
        min={field.min}
        max={field.max}
        step={field.step || 'any'}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        inputMode="decimal"
      />
      {field.help ? <span className="calc-input-help">{field.help}</span> : null}
    </div>
  );
}

export function CalcSelectField({ slug, field, value, onChange }) {
  return (
    <div className="calc-input-group">
      <label className="calc-input-label" htmlFor={`${slug}-${field.name}`}>
        {field.label}
      </label>
      <select
        id={`${slug}-${field.name}`}
        className="calc-select-field"
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
      >
        <option value="">Select...</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {field.help ? <span className="calc-input-help">{field.help}</span> : null}
    </div>
  );
}

export function CalcCheckboxGroup({ fields, form, onChange, legend = 'Clinical features' }) {
  if (!fields.length) return null;
  return (
    <fieldset className="calc-meld-fieldset calc-has-bled-fieldset">
      <legend className="calc-timi-legend calc-has-bled-legend">{legend}</legend>
      {fields.map((field) => (
        <div className="calc-checkbox-group" key={field.name}>
          <input
            id={field.name}
            type="checkbox"
            className="calc-checkbox"
            checked={Boolean(form[field.name])}
            onChange={(event) => onChange(field.name, event.target.checked)}
          />
          <label htmlFor={field.name} className="calc-checkbox-label">
            {field.label}
          </label>
        </div>
      ))}
    </fieldset>
  );
}

export function ConfigDrivenCalculatorField({ slug, field, value, onChange }) {
  return field.type === 'select' ? (
    <CalcSelectField slug={slug} field={field} value={value} onChange={onChange} />
  ) : (
    <CalcNumberField slug={slug} field={field} value={value} onChange={onChange} />
  );
}

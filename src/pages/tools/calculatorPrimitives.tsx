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

export function CalcResultSafetyFooter({ children = undefined }) {
  return (
    <p className="calc-result-safety-footer" role="note">
      {children ||
        'Output reflects the values you entered and may omit important clinical context. Do not treat this screen as definitive proof of illness severity, eligibility, or treatment requirement, and do not use it alone to rule in or rule out a diagnosis.'}
    </p>
  );
}

export function CalcInterpretationRegion({ headingId, title, severity, emphasizeRisk, children, ariaLabel = undefined }) {
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
  return (
    <div
      ref={resultsRef}
      id={id}
      className="calculator-results"
      role={role || (ariaLabel ? 'region' : undefined)}
      aria-label={ariaLabel}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
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

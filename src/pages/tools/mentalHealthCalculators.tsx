import { AriaInvalidSelect } from '../../components/a11y/AriaInvalidFields';
/**
 * PHQ-9 and GAD-7 calculator forms (Tier A). Screening-only UX with accessibility affordances.
 */

import { useEffect, useRef, useState } from 'react';
import {
  PHQ9_ITEMS,
  PHQ9_LIKERT_OPTIONS,
  PHQ9_QUESTION9_ELEVATED_THRESHOLD,
  computePhq9Result,
} from '../../utils/phq9Calculator';
import { GAD7_ITEMS, GAD7_LIKERT_OPTIONS, computeGad7Result } from '../../utils/gad7Calculator';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getCalculatorSubIcon } from '../../navigation/iconRegistry';
import {
  CalcDecisionSupportLead as SharedCalcDecisionSupportLead,
  CalcResultSafetyFooter as SharedCalcResultSafetyFooter,
  CalcInterpretationRegion,
  CalcPanelTitle,
  CalcResultsEmptyIcon,
  ResultsPanelTitle,
  scrollResultsIntoView,
} from './calculatorPrimitives';

function CalcDecisionSupportLead() {
  return (
    <SharedCalcDecisionSupportLead>
      Does not establish a diagnosis or replace clinician judgment; follow local protocols.
    </SharedCalcDecisionSupportLead>
  );
}

function CalcResultSafetyFooter() {
  return (
    <SharedCalcResultSafetyFooter>
      Output reflects the values you entered and may omit important clinical context. Do not treat
      this screen as definitive proof of illness severity, eligibility, or treatment requirement,
      and do not use it alone to rule in or rule out a diagnosis.
    </SharedCalcResultSafetyFooter>
  );
}

function focusFirstEmptyLikertItem(items, responses, idPrefix) {
  const missing = items.find((item) => responses[item.key] === '');
  if (!missing) return;
  document.getElementById(`${idPrefix}-${missing.key}`)?.focus();
}

function likertSelectClassName(hasValidationErrors, value) {
  return `calc-select-field${
    hasValidationErrors && value === '' ? ' calc-select-field--invalid' : ''
  }`;
}

function formDescribedByIds(disclaimerId, validationSummaryId, hasValidationErrors) {
  return (
    [disclaimerId, hasValidationErrors ? validationSummaryId : null].filter(Boolean).join(' ') ||
    undefined
  );
}

export function Phq9Calculator({ onResultChange }) {
  const [responses, setResponses] = useState(() =>
    Object.fromEntries(PHQ9_ITEMS.map((item) => [item.key, ''])),
  );
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              phq9Score: result.totalScore,
              severityCategory: result.severityCategory,
              question9Elevated: result.question9Elevated,
              severity: result.severity,
            }
          : null,
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const out = computePhq9Result(responses);
    setValidationErrors(out.ok ? [] : out.errors || []);
    setResult(out.ok ? out : null);
    if (!out.ok) focusFirstEmptyLikertItem(PHQ9_ITEMS, responses, 'phq9');
  };

  const reset = () => {
    setResponses(Object.fromEntries(PHQ9_ITEMS.map((item) => [item.key, ''])));
    setValidationErrors([]);
    setResult(null);
    requestAnimationFrame(() => document.getElementById('phq9-q1')?.focus());
  };

  const setItem = (key, value) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const icon = getCalculatorSubIcon('phq9');
  const formTitleId = 'phq9-form-title';
  const formDisclaimerId = 'phq9-form-disclaimer';
  const interpretationHeadingId = 'phq9-interpretation-heading';
  const validationSummaryId = 'phq9-validation-summary';
  const hasValidationErrors = validationErrors.length > 0;
  const q9Live = responses.q9 !== '' && Number(responses.q9) >= PHQ9_QUESTION9_ELEVATED_THRESHOLD;

  const renderLikert = (item) => {
    const id = `phq9-${item.key}`;
    const isQ9 = item.key === 'q9';
    return (
      <div key={item.key} className={`calc-input-group${isQ9 ? ' calc-phq9-q9-group' : ''}`}>
        <label className="calc-input-label" htmlFor={id}>
          <span className="calc-input-label-text">
            {item.number}. {item.label}
          </span>
          {isQ9 ? (
            <span className="calc-phq9-q9-badge">
              <span className="calc-sr-only"> — </span>
              Safety item
            </span>
          ) : null}
        </label>
        <AriaInvalidSelect
          id={id}
          className={likertSelectClassName(hasValidationErrors, responses[item.key])}
          value={responses[item.key]}
          onChange={(e) => setItem(item.key, e.target.value)}
          aria-required="true"
          invalid={hasValidationErrors && responses[item.key] === ''}
          aria-describedby={
            [isQ9 ? 'phq9-q9-field-help' : null, hasValidationErrors ? validationSummaryId : null]
              .filter(Boolean)
              .join(' ') || undefined
          }
        >
          <option value="">Select…</option>
          {PHQ9_LIKERT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.points})
            </option>
          ))}
        </AriaInvalidSelect>
        {isQ9 ? (
          <span className="calc-input-help" id="phq9-q9-field-help">
            Any non-zero response requires urgent safety review per institutional protocols.
          </span>
        ) : null}
        {isQ9 && q9Live ? (
          <div className="calc-phq9-q9-inline-warning" role="alert" aria-live="assertive">
            <strong>Question 9 elevated:</strong> Possible self-harm or suicidal ideation reported.
            Arrange immediate clinical assessment and follow local psychiatric emergency pathways
            (e.g. crisis line 988 in the U.S. when applicable). This tool does not provide emergency
            care.
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="calculator-interface calculator-interface--phq9">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={formTitleId}>PHQ-9 (depression symptom screen)</span>
        </CalcPanelTitle>

        <div
          id={formDisclaimerId}
          className="calc-timi-disclaimer calc-has-bled-disclaimer"
          role="note"
        >
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Screening only.</strong> PHQ-9 assesses depressive symptoms over the past two
            weeks. It does not diagnose depression or any other psychiatric disorder and does not
            recommend medications or specific therapies.
          </p>
          <p className="calc-disclaimer-detail">
            Results require review by a qualified clinician. Follow institutional behavioral health
            and suicide-risk pathways when indicated.
          </p>
          <p className="calc-disclaimer-detail">
            If you or someone else is in immediate danger or crisis, contact emergency services
            (e.g. 911 in the U.S.) or the 988 Suicide &amp; Crisis Lifeline when applicable. This
            tool does not provide emergency care.
          </p>
        </div>

        {q9Live ? (
          <div
            className="calc-has-bled-anticoag-warning calc-phq9-q9-form-warning"
            role="alert"
            aria-live="assertive"
          >
            <strong>Question 9 safety:</strong> A non-zero response on self-harm or suicidal
            ideation requires urgent evaluation before routine disposition. Do not use this screen
            alone to clear safety concerns.
          </div>
        ) : null}

        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={formTitleId}
          aria-describedby={formDescribedByIds(
            formDisclaimerId,
            validationSummaryId,
            hasValidationErrors,
          )}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {hasValidationErrors ? (
            <div
              id={validationSummaryId}
              className="calc-validation-errors"
              role="alert"
              aria-live="assertive"
            >
              <p className="calc-validation-errors-title">
                Complete all questions before calculating ({validationErrors.length}{' '}
                {validationErrors.length === 1 ? 'item' : 'items'} remaining).
              </p>
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <fieldset className="calc-meld-fieldset calc-has-bled-fieldset">
            <legend className="calc-timi-legend calc-has-bled-legend" id="phq9-questions-legend">
              Over the last 2 weeks, how often have you been bothered by the following?
            </legend>
            {PHQ9_ITEMS.map((item) => renderLikert(item))}
          </fieldset>

          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn" aria-label="Calculate PHQ-9 score">
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate PHQ-9
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              onClick={reset}
              aria-label="Reset PHQ-9 form"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="calculator-results"
        aria-live={result?.question9Elevated ? 'assertive' : 'polite'}
        aria-label="PHQ-9 results"
      >
        <ResultsPanelTitle />

        {result ? (
          <>
            {result.question9Elevated ? (
              <div
                className="calc-has-bled-anticoag-warning calc-phq9-q9-result-warning"
                role="alert"
              >
                <strong>{result.question9SafetyAlert.headline}</strong>
                <p>{result.question9SafetyAlert.message}</p>
              </div>
            ) : null}

            <div
              className={`calc-score-display ${result.severity}`}
              role="group"
              aria-label={`PHQ-9 total score ${result.totalScore} out of 27, ${result.severityLabel}${
                result.question9Elevated ? ', safety review takes priority' : ''
              }`}
            >
              <div className="calc-score-label">PHQ-9 total score</div>
              <div className="calc-score-value" aria-hidden="true">
                {result.totalScore}
              </div>
              <div className="calc-score-interpretation" aria-hidden="true">
                of 27 — {result.severityLabel}
                {result.question9Elevated ? ' (safety review takes priority)' : ''}
              </div>
            </div>

            {result.highSymptomEscalation?.warranted ? (
              <div
                className="calc-has-bled-anticoag-warning calc-phq9-high-symptom-warning"
                role="alert"
              >
                <strong>Elevated symptom burden:</strong>
                <p>{result.highSymptomEscalation.message}</p>
              </div>
            ) : null}

            <div className="calc-breakdown">
              <div className="calc-breakdown-title" id="phq9-breakdown-heading">
                Item scores
              </div>
              <ul className="calc-breakdown-list" aria-labelledby="phq9-breakdown-heading">
                {PHQ9_ITEMS.map((item) => (
                  <li key={item.key} className="calc-breakdown-item">
                    <span className="calc-breakdown-label">
                      Q{item.number}
                      {item.key === 'q9' ? ' (safety)' : ''}
                    </span>
                    <span className="calc-breakdown-score">{result.breakdown[item.key]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <CalcInterpretationRegion
              headingId={interpretationHeadingId}
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.severityCategory !== 'none_minimal' || result.question9Elevated}
            >
              <div className="calc-interpretation-text">{result.interpretation}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.screeningDiscussion}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.screeningDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.safetyDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.clinicianReviewDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.pathwayDisclaimer}
              </div>
            </CalcInterpretationRegion>

            <div className="calc-references">
              <div className="calc-references-title">Reference</div>
              <ul className="calc-references-list">
                <li>{result.referenceLine}</li>
              </ul>
            </div>
            <CalcResultSafetyFooter />
          </>
        ) : (
          <div className="calc-results-empty" role="status">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Answer all nine questions, then calculate</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function Gad7Calculator({ onResultChange }) {
  const [responses, setResponses] = useState(() =>
    Object.fromEntries(GAD7_ITEMS.map((item) => [item.key, ''])),
  );
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              gad7Score: result.totalScore,
              severityCategory: result.severityCategory,
              severity: result.severity,
            }
          : null,
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const out = computeGad7Result(responses);
    setValidationErrors(out.ok ? [] : out.errors || []);
    setResult(out.ok ? out : null);
    if (!out.ok) focusFirstEmptyLikertItem(GAD7_ITEMS, responses, 'gad7');
  };

  const reset = () => {
    setResponses(Object.fromEntries(GAD7_ITEMS.map((item) => [item.key, ''])));
    setValidationErrors([]);
    setResult(null);
    requestAnimationFrame(() => document.getElementById('gad7-q1')?.focus());
  };

  const setItem = (key, value) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const icon = getCalculatorSubIcon('gad7');
  const formTitleId = 'gad7-form-title';
  const formDisclaimerId = 'gad7-form-disclaimer';
  const interpretationHeadingId = 'gad7-interpretation-heading';
  const validationSummaryId = 'gad7-validation-summary';
  const hasValidationErrors = validationErrors.length > 0;

  const renderLikert = (item) => {
    const id = `gad7-${item.key}`;
    const isDistressItem = item.key === 'q7';
    return (
      <div key={item.key} className="calc-input-group">
        <label className="calc-input-label" htmlFor={id}>
          <span className="calc-input-label-text">
            {item.number}. {item.label}
          </span>
        </label>
        <AriaInvalidSelect
          id={id}
          className={likertSelectClassName(hasValidationErrors, responses[item.key])}
          value={responses[item.key]}
          onChange={(e) => setItem(item.key, e.target.value)}
          aria-required="true"
          invalid={hasValidationErrors && responses[item.key] === ''}
          aria-describedby={
            [
              isDistressItem ? 'gad7-q7-field-help' : null,
              hasValidationErrors ? validationSummaryId : null,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
        >
          <option value="">Select…</option>
          {GAD7_LIKERT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ({opt.points})
            </option>
          ))}
        </AriaInvalidSelect>
        {isDistressItem ? (
          <span className="calc-input-help" id="gad7-q7-field-help">
            High scores may reflect acute fear or panic; follow distress and suicide-risk pathways
            when clinically indicated.
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="calculator-interface calculator-interface--gad7">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={formTitleId}>GAD-7 (anxiety symptom screen)</span>
        </CalcPanelTitle>

        <div
          id={formDisclaimerId}
          className="calc-timi-disclaimer calc-has-bled-disclaimer"
          role="note"
        >
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Screening only.</strong> GAD-7 assesses anxiety symptoms over the past two
            weeks. It does not diagnose generalized anxiety disorder or any other psychiatric
            condition and does not recommend medications or specific therapies.
          </p>
          <p className="calc-disclaimer-detail">
            Results require review by a qualified clinician. Follow institutional behavioral health
            pathways when indicated. For suicidal thoughts, use suicide-risk protocols (e.g. PHQ-9
            question 9 pathways). For acute panic or overwhelming distress, follow local psychiatric
            emergency pathways.
          </p>
          <p className="calc-disclaimer-detail">
            If you or someone else is in immediate danger or crisis, contact emergency services
            (e.g. 911 in the U.S.) or the 988 Suicide &amp; Crisis Lifeline when applicable. This
            tool does not provide emergency care.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={formTitleId}
          aria-describedby={formDescribedByIds(
            formDisclaimerId,
            validationSummaryId,
            hasValidationErrors,
          )}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {hasValidationErrors ? (
            <div
              id={validationSummaryId}
              className="calc-validation-errors"
              role="alert"
              aria-live="assertive"
            >
              <p className="calc-validation-errors-title">
                Complete all questions before calculating ({validationErrors.length}{' '}
                {validationErrors.length === 1 ? 'item' : 'items'} remaining).
              </p>
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <fieldset className="calc-meld-fieldset calc-has-bled-fieldset">
            <legend className="calc-timi-legend calc-has-bled-legend" id="gad7-questions-legend">
              Over the last 2 weeks, how often have you been bothered by the following?
            </legend>
            {GAD7_ITEMS.map((item) => renderLikert(item))}
          </fieldset>

          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn" aria-label="Calculate GAD-7 score">
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate GAD-7
            </button>
            <button
              type="button"
              className="calc-reset-btn"
              onClick={reset}
              aria-label="Reset GAD-7 form"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div
        ref={resultsRef}
        tabIndex={-1}
        className="calculator-results"
        aria-live={
          result?.acuteDistressSafetyAlert?.elevated || result?.moderateSymptomEscalation?.warranted
            ? 'assertive'
            : 'polite'
        }
        aria-label="GAD-7 results"
      >
        <ResultsPanelTitle />

        {result ? (
          <>
            {result.acuteDistressSafetyAlert?.elevated ? (
              <div className="calc-has-bled-anticoag-warning calc-gad7-severe-warning" role="alert">
                <strong>{result.acuteDistressSafetyAlert.headline}</strong>
                <p>{result.acuteDistressSafetyAlert.message}</p>
              </div>
            ) : null}

            {result.moderateSymptomEscalation?.warranted ? (
              <div
                className="calc-has-bled-anticoag-warning calc-gad7-moderate-warning"
                role="alert"
              >
                <strong>Moderate symptom burden:</strong>
                <p>{result.moderateSymptomEscalation.message}</p>
              </div>
            ) : null}

            <div
              className={`calc-score-display ${result.severity}`}
              role="group"
              aria-label={`GAD-7 total score ${result.totalScore} out of 21, ${result.severityLabel}`}
            >
              <div className="calc-score-label">GAD-7 total score</div>
              <div className="calc-score-value" aria-hidden="true">
                {result.totalScore}
              </div>
              <div className="calc-score-interpretation" aria-hidden="true">
                of 21 — {result.severityLabel}
              </div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title" id="gad7-breakdown-heading">
                Item scores
              </div>
              <ul className="calc-breakdown-list" aria-labelledby="gad7-breakdown-heading">
                {GAD7_ITEMS.map((item) => (
                  <li key={item.key} className="calc-breakdown-item">
                    <span className="calc-breakdown-label">Q{item.number}</span>
                    <span className="calc-breakdown-score">{result.breakdown[item.key]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <CalcInterpretationRegion
              headingId={interpretationHeadingId}
              title={result.label}
              severity={result.severity}
              emphasizeRisk={
                result.severityCategory !== 'none_minimal' ||
                result.acuteDistressSafetyAlert?.elevated ||
                result.moderateSymptomEscalation?.warranted
              }
            >
              <div className="calc-interpretation-text">{result.interpretation}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.screeningDiscussion}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.screeningDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.safetyDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.clinicianReviewDisclaimer}
              </div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.pathwayDisclaimer}
              </div>
            </CalcInterpretationRegion>

            <div className="calc-references">
              <div className="calc-references-title">Reference</div>
              <ul className="calc-references-list">
                <li>{result.referenceLine}</li>
              </ul>
            </div>
            <CalcResultSafetyFooter />
          </>
        ) : (
          <div className="calc-results-empty" role="status">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Answer all seven questions, then calculate</p>
          </div>
        )}
      </div>
    </div>
  );
}

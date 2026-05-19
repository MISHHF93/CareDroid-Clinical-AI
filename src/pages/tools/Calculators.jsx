import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import ToolPageLayout from './ToolPageLayout';
import './Calculators.css';
import { executeClinicalTool } from '../../services/clinicalOrchestratorApi';
import {
  calculateQsofaScore,
  interpretQsofaScore,
  qsofaCriteriaFromInputs,
  validateQsofaInputs,
} from '../../utils/qsofaCalculator';
import {
  computeNews2Breakdown,
  interpretNews2Risk,
  sumNews2Score,
  validateNews2Inputs,
} from '../../utils/news2Calculator';
import {
  computeChildPughBreakdown,
  interpretChildPughClass,
  sumChildPughScore,
  validateChildPughInputs,
} from '../../utils/childPughCalculator';
import {
  HAS_BLED_CRITERIA_META,
  calculateHasBledScore,
  computeHasBledBreakdown,
  interpretHasBled,
} from '../../utils/hasBledCalculator';
import { computeMeldResult, formatMeldLabValue } from '../../utils/meldCalculator';
import {
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  PR3_CALCULATOR_REGISTRY_IDS,
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
} from '../../data/clinicalCatalogWiring';
import { builtinUiCalculators, clinicalIntentTools, nluCalculatorHubOnly } from '../../data/clinicalIntentToolCatalog';
import { toolRegistryById } from '../../data/toolRegistry';
import {
  CHAT_ASSISTED_HUB_GROUPS,
  chatAssistedLaunchAriaLabel,
  chatAssistedLaunchAriaLabelForTool,
  fleetChatAssistedLaunchAriaLabel,
} from '../../data/chatAssistedHubGroups';
import {
  TIMI_UA_NSTEMI_CRITERIA_META,
  calculateTimiUaNstemiScore,
  computeTimiBreakdown,
  interpretTimiUaNstemi,
} from '../../utils/timiUaNstemiCalculator';
import { NavIcon } from '../../navigation/NavIcon';
import { getCalculatorSubIcon, CHROME_ICONS } from '../../navigation/iconRegistry';
import { Phq9Calculator, Gad7Calculator } from './mentalHealthCalculators';
import {
  AscvdRiskCalculator,
  AuditCCalculator,
  CkdStagingCalculator,
  StopBangCalculator,
} from './pr4aCalculators';
import ToolNotFound from './ToolNotFound';

const CALCULATORS = builtinUiCalculators.map((calc) => {
  const registryId = BUILTIN_CALC_ID_TO_REGISTRY_ID[calc.id] ?? calc.id;
  const reg = toolRegistryById[registryId];
  return {
    id: calc.id,
    name: calc.name,
    description: calc.description || reg?.description || '',
    category: reg?.category || 'Calculator',
  };
});

function CalcPanelTitle({ icon, children }) {
  return (
    <div className="calculator-panel-title">
      <NavIcon icon={icon} size={22} aria-hidden />
      <span className="calculator-panel-title-text">{children}</span>
    </div>
  );
}

function ResultsPanelTitle() {
  return (
    <div className="calculator-panel-title">
      <NavIcon icon={CHROME_ICONS.barChart} size={22} aria-hidden />
      <span className="calculator-panel-title-text">Results</span>
    </div>
  );
}

function CalcResultsEmptyIcon({ icon, size = 56 }) {
  return (
    <div className="calc-results-empty-icon" aria-hidden>
      <NavIcon icon={icon} size={size} />
    </div>
  );
}

/** Shared PR1 lead line: clinical decision support, not diagnostic or prescriptive. */
function CalcDecisionSupportLead() {
  return (
    <p className="calc-ds-lead">
      <strong>Decision support only.</strong> Does not establish a diagnosis, confer diagnostic certainty, or replace
      clinician judgment; follow local protocols.
    </p>
  );
}

function CalcResultSafetyFooter() {
  return (
    <p className="calc-result-safety-footer" role="note">
      Output reflects the values you entered and may omit important clinical context. Do not treat this screen as
      definitive proof of illness severity, eligibility, or treatment requirement, and do not use it alone to rule
      in or rule out a diagnosis.
    </p>
  );
}

/** Distinct interpretation panel (region + heading id for screen readers). */
function CalcInterpretationRegion({ headingId, title, severity, emphasizeRisk, children }) {
  return (
    <section
      className={`calc-interpretation-box ${severity}${emphasizeRisk ? ' calc-interpretation-box--risk-emphasis' : ''}`}
      role="region"
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="calc-interpretation-title">
        {title}
      </h3>
      {children}
    </section>
  );
}

function scrollCalcResultsIntoView(resultsEl) {
  if (!resultsEl) return;
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resultsEl.focus({ preventScroll: true });
  resultsEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}

function focusFirstFieldById(fieldIds) {
  for (const id of fieldIds) {
    const el = document.getElementById(id);
    if (el && !el.disabled) {
      el.focus();
      return;
    }
  }
}

function calcFieldClass(base, invalid) {
  return invalid ? `${base} calc-input-field--invalid` : base;
}

function calcDescribedBy(...ids) {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}

function CalcResultsPanel({ id, resultsRef, children }) {
  return (
    <div
      ref={resultsRef}
      id={id}
      className="calculator-results"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

function CalculatorSelectCard({ calc, isActive, onSelect }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`${calc.name}. ${calc.description}`}
      className={`calculator-card ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <div className="calculator-card-header">
        <span className="calculator-icon" aria-hidden>
          <NavIcon icon={getCalculatorSubIcon(calc.id)} size={22} />
        </span>
        <span className="calculator-name">{calc.name}</span>
      </div>
      <div className="calculator-description">{calc.description}</div>
      <div className="calculator-card-category">{calc.category}</div>
    </div>
  );
}

const CHAT_ASSISTED_TOOLS = nluCalculatorHubOnly.filter((t) =>
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS.includes(t.toolId)
);

const CHAT_ASSISTED_TOOL_BY_ID = Object.fromEntries(
  CHAT_ASSISTED_TOOLS.map((tool) => [tool.toolId, tool])
);

const Calculators = ({ embedded = false, onCloseEmbedded, initialCalculatorId = null } = {}) => {
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const [searchParams] = useSearchParams();
  const calcFromUrl = searchParams.get('calc');

  const handleChatAssistedLaunch = useCallback(
    (toolId) => {
      const launch = resolveCatalogLaunch(toolId);
      if (launch.registryId) {
        recordToolAccess(launch.registryId);
        selectTool(launch.registryId);
        setActiveTool(launch.registryId);
      }
      if (launch.chatSeed) {
        addMessage(launch.chatSeed, 'user');
      }
      const navPath = resolveNavigationPathForLaunch(launch);
      navigate(navPath || '/dashboard');
    },
    [addMessage, navigate, recordToolAccess, selectTool, setActiveTool]
  );

  const toolConfig = {
    id: 'calculators',
    name: 'Medical Calculators',
    path: '/tools/calculators',
    color: '#95E1D3',
    description: 'Medical calculators (GFR, BMI, scores, etc.)',
    shortcut: 'Ctrl+7',
    category: 'Calculator',
  };

  const [selectedCalculator, setSelectedCalculator] = useState(null);
  const [sharedResult, setSharedResult] = useState(null);
  const [unknownSlug, setUnknownSlug] = useState(null);

  useEffect(() => {
    const slug = initialCalculatorId || calcFromUrl;
    if (!slug) {
      setUnknownSlug(null);
      return;
    }
    const match = CALCULATORS.find((c) => c.id === slug);
    if (match) {
      setSelectedCalculator(match);
      setSharedResult(null);
      setUnknownSlug(null);
    } else {
      setSelectedCalculator(null);
      setSharedResult(null);
      setUnknownSlug(slug);
    }
  }, [initialCalculatorId, calcFromUrl]);

  return (
    <ToolPageLayout
      tool={toolConfig}
      embedded={embedded}
      onCloseEmbedded={onCloseEmbedded}
      results={selectedCalculator && sharedResult ? { calculator: selectedCalculator.id, ...sharedResult } : null}
    >
      <div className="calculators-content">
        {CHAT_ASSISTED_TOOLS.length > 0 ? (
          <section className="calc-chat-assisted" aria-labelledby="calc-chat-assisted-heading">
            <div className="calc-chat-assisted-header">
              <h2 id="calc-chat-assisted-heading" className="calc-chat-assisted-title">
                Chat-assisted clinical decision support
              </h2>
              <p className="calc-chat-assisted-lead" role="note">
                <strong>Decision support only.</strong> Guided chat supports risk stratification, structured exam
                scoring, or imaging decisions — it does not diagnose, rule out disease with certainty, or replace
                urgent ACS, stroke, trauma, or PE pathways. Use Tab and Enter to launch; emergency care takes
                priority over completing chat.
              </p>
            </div>
            {CHAT_ASSISTED_HUB_GROUPS.map((group) => {
              const toolsInGroup = group.toolIds
                .map((id) => CHAT_ASSISTED_TOOL_BY_ID[id])
                .filter(Boolean);
              if (toolsInGroup.length === 0) return null;
              const groupHeadingId = `calc-chat-assisted-group-${group.groupId}`;
              const isFleetDispatch = group.groupId === 'fleet-dispatch';
              return (
                <div
                  key={group.groupId}
                  className={`calc-chat-assisted-group${isFleetDispatch ? ' calc-chat-assisted-group--fleet' : ''}`}
                  role="group"
                  aria-labelledby={groupHeadingId}
                >
                  <h3 id={groupHeadingId} className="calc-chat-assisted-group-title">
                    {group.heading}
                  </h3>
                  <p className="calc-chat-assisted-group-lead" role="note">
                    {group.lead}
                  </p>
                  <div className="calc-chat-assisted-grid">
                    {toolsInGroup.map((tool) => {
                      const meta = clinicalIntentTools.find((t) => t.toolId === tool.toolId);
                      const description = meta?.description || 'Chat-assisted decision support';
                      return (
                        <button
                          key={tool.toolId}
                          type="button"
                          className="calc-chat-assisted-card"
                          data-calc-id={tool.toolId}
                          aria-label={
                            isFleetDispatch
                              ? fleetChatAssistedLaunchAriaLabel(tool.name)
                              : chatAssistedLaunchAriaLabelForTool(tool.toolId, tool.name)
                          }
                          aria-describedby={`calc-chat-assisted-desc-${tool.toolId}`}
                          onClick={() => handleChatAssistedLaunch(tool.toolId)}
                        >
                          <span className="calc-chat-assisted-name">{tool.name}</span>
                          {isFleetDispatch ? (
                            <span className="calc-chat-assisted-safety-pill" role="note">
                              Human approval required — no auto-assign
                            </span>
                          ) : null}
                          <span
                            id={`calc-chat-assisted-desc-${tool.toolId}`}
                            className="calc-chat-assisted-desc"
                          >
                            {description}
                          </span>
                          <span className="calc-chat-assisted-action" aria-hidden="true">
                            Start guided chat
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        ) : null}

        <div className="calculator-selection" role="list" aria-label="Built-in calculator forms">
          {CALCULATORS.map((calc) => (
            <CalculatorSelectCard
              key={calc.id}
              calc={calc}
              isActive={selectedCalculator?.id === calc.id}
              onSelect={() => {
                setSelectedCalculator(calc);
                setSharedResult(null);
              }}
            />
          ))}
        </div>

        {/* Calculator Interface */}
        {unknownSlug ? (
          <ToolNotFound
            toolId={unknownSlug}
            title="Calculator not found"
            description={`No built-in form is available for calculator id “${unknownSlug}”. Choose another calculator above or browse the clinical catalog.`}
            showCatalogLink
          />
        ) : selectedCalculator ? (
          <CalculatorInterface calculator={selectedCalculator} onResultChange={setSharedResult} />
        ) : (
          <div className="calculators-select-placeholder">
            <div className="calculators-select-placeholder-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.barChart} size={56} />
            </div>
            <p>Select a calculator above to begin</p>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};

/**
 * Calculator Interface Component
 */
const CalculatorInterface = ({ calculator, onResultChange }) => {
  switch (calculator.id) {
    case 'sofa':
      return <SOFACalculator onResultChange={onResultChange} />;
    case 'qsofa':
      return <QSOFACalculator onResultChange={onResultChange} />;
    case 'news2':
      return <NEWS2Calculator onResultChange={onResultChange} />;
    case 'child-pugh':
      return <ChildPughCalculator onResultChange={onResultChange} />;
    case 'has-bled':
      return <HasBledCalculator onResultChange={onResultChange} />;
    case 'meld':
      return <MeldCalculator mode="meld" onResultChange={onResultChange} />;
    case 'meld-na':
      return <MeldCalculator mode="meld-na" onResultChange={onResultChange} />;
    case 'timi-ua-nstemi':
      return <TimiUaNstemiCalculator onResultChange={onResultChange} />;
    case 'gfr':
      return <GFRCalculator onResultChange={onResultChange} />;
    case 'bmi':
      return <BMICalculator onResultChange={onResultChange} />;
    case 'chads2vasc':
      return <CHA2DS2VAScCalculator onResultChange={onResultChange} />;
    case 'phq9':
      return <Phq9Calculator onResultChange={onResultChange} />;
    case 'gad7':
      return <Gad7Calculator onResultChange={onResultChange} />;
    case 'ascvd-risk':
      return <AscvdRiskCalculator onResultChange={onResultChange} />;
    case 'ckd-staging':
      return <CkdStagingCalculator onResultChange={onResultChange} />;
    case 'stop-bang':
      return <StopBangCalculator onResultChange={onResultChange} />;
    case 'audit-c':
      return <AuditCCalculator onResultChange={onResultChange} />;
    default:
      return (
        <ToolNotFound
          toolId={calculator.id}
          title="Calculator not implemented"
          description={`The calculator “${calculator.name || calculator.id}” does not have a form in this build yet.`}
        />
      );
  }
};

/**
 * qSOFA — bedside screening (Sepsis-3). Decision support only; not a substitute for clinical judgment.
 */
const QSOFACalculator = ({ onResultChange }) => {
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [systolicBloodPressure, setSystolicBloodPressure] = useState('');
  const [alteredMentation, setAlteredMentation] = useState(false);
  const [gcs, setGcs] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);
  const errorSummaryId = 'qsofa-errors';

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              qsofaScore: result.score,
              severity: result.severity,
              criteria: result.criteria,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollCalcResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const v = validateQsofaInputs({
      respiratoryRate,
      systolicBloodPressure,
      alteredMentation,
      gcs,
    });
    setValidationErrors(v.errors);
    if (!v.ok) {
      setResult(null);
      focusFirstFieldById(['qsofa-rr', 'qsofa-sbp', 'qsofa-alt', 'qsofa-gcs']);
      return;
    }
    const criteria = qsofaCriteriaFromInputs({
      respiratoryRate,
      systolicBloodPressure,
      alteredMentation,
      gcs,
    });
    const score = calculateQsofaScore(criteria);
    const interp = interpretQsofaScore(score);
    setResult({
      score,
      severity: interp.severity,
      interpretation: interp.interpretation,
      referenceLine: interp.referenceLine,
      criteria,
    });
  };

  const reset = () => {
    setRespiratoryRate('');
    setSystolicBloodPressure('');
    setAlteredMentation(false);
    setGcs('');
    setValidationErrors([]);
    setResult(null);
  };

  const rrInvalid = validationErrors.some((e) => /respiratory/i.test(e));
  const sbpInvalid = validationErrors.some((e) => /systolic|blood pressure/i.test(e));
  const gcsInvalid = validationErrors.some((e) => /GCS/i.test(e));
  const mentationInvalid = validationErrors.some((e) => /mentation/i.test(e));

  return (
    <div className="calculator-interface calculator-interface--qsofa">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.siren}>qSOFA</CalcPanelTitle>

        <div className="calc-qsofa-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Clinical use:</strong> qSOFA is bedside screening in suspected infection. It does not diagnose
            sepsis. Score ≥2 suggests higher risk of poor outcome per Sepsis-3 — always interpret in clinical context.
            Not for use as sole basis for treatment decisions.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
        <div className="calc-input-grid calc-input-grid--responsive">
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="qsofa-rr">
              Respiratory rate (breaths/min)
            </label>
            <span className="calc-input-help" id="qsofa-rr-help">
              1 point if ≥ 22
            </span>
            <input
              id="qsofa-rr"
              type="number"
              inputMode="decimal"
              className={calcFieldClass('calc-input-field', rrInvalid)}
              aria-describedby={calcDescribedBy('qsofa-rr-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={rrInvalid || undefined}
              min={0}
              max={120}
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
            />
          </div>
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="qsofa-sbp">
              Systolic blood pressure (mmHg)
            </label>
            <span className="calc-input-help" id="qsofa-sbp-help">
              1 point if ≤ 100
            </span>
            <input
              id="qsofa-sbp"
              type="number"
              inputMode="decimal"
              className={calcFieldClass('calc-input-field', sbpInvalid)}
              aria-describedby={calcDescribedBy('qsofa-sbp-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={sbpInvalid || undefined}
              min={40}
              max={300}
              value={systolicBloodPressure}
              onChange={(e) => setSystolicBloodPressure(e.target.value)}
            />
          </div>
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="qsofa-alt"
              className="calc-checkbox"
              checked={alteredMentation}
              onChange={(e) => setAlteredMentation(e.target.checked)}
              aria-describedby={calcDescribedBy(
                'qsofa-ment-help',
                validationErrors.length ? errorSummaryId : ''
              )}
              aria-invalid={mentationInvalid || undefined}
            />
            <label htmlFor="qsofa-alt" className="calc-checkbox-label">
              Altered mentation (e.g. disorientation, lethargy)
            </label>
          </div>
          <span className="calc-input-help" id="qsofa-ment-help">
            1 point if altered, or if GCS below is &lt; 15 (either satisfies the mentation criterion).
          </span>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label" htmlFor="qsofa-gcs">
            GCS total (optional)
          </label>
          <span className="calc-input-help" id="qsofa-gcs-help">
            3–15. If provided and &lt; 15, counts toward mentation criterion. May leave blank if you used
            “altered mentation” only.
          </span>
          <input
            id="qsofa-gcs"
            type="number"
            className={calcFieldClass('calc-input-field', gcsInvalid)}
            aria-describedby={calcDescribedBy('qsofa-gcs-help', validationErrors.length ? errorSummaryId : '')}
            aria-invalid={gcsInvalid || undefined}
            min={3}
            max={15}
            value={gcs}
            onChange={(e) => setGcs(e.target.value)}
            placeholder="e.g. 15"
          />
        </div>

        {validationErrors.length > 0 && (
          <div id={errorSummaryId} className="calc-error calc-validation-errors" role="alert" aria-live="assertive">
            <strong>Please fix:</strong>
            <ul className="calc-validation-list">
              {validationErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
            Calculate qSOFA
          </button>
          <button type="button" className="calc-reset-btn" onClick={reset} aria-label="Reset qSOFA form">
            Reset
          </button>
        </div>
        </form>
      </div>

      <CalcResultsPanel id="calc-results-qsofa" resultsRef={resultsRef}>
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`} aria-labelledby="qsofa-score-label">
              <div id="qsofa-score-label" className="calc-score-label">
                qSOFA score
              </div>
              <div className="calc-score-value">{result.score}</div>
              <div className="calc-score-interpretation">of 3 criteria present</div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title">Criteria</div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">RR ≥ 22/min</span>
                <span className="calc-breakdown-score">{result.criteria.respiratoryRateGte22 ? '1' : '0'}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">SBP ≤ 100 mmHg</span>
                <span className="calc-breakdown-score">{result.criteria.systolicBpLte100 ? '1' : '0'}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Altered mentation or GCS &lt; 15</span>
                <span className="calc-breakdown-score">{result.criteria.alteredMentationOrGcsLt15 ? '1' : '0'}</span>
              </div>
            </div>

            <CalcInterpretationRegion
              headingId="qsofa-interpretation-heading"
              title="Interpretation"
              severity={result.severity}
              emphasizeRisk={result.score >= 2}
            >
              <p className="calc-interpretation-text">{result.interpretation}</p>
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
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.siren} />
            <p>Enter vitals and mentation, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
};

/**
 * NEWS2 — RCP standard acute physiology score. Decision support only; follow local escalation policy.
 */
const NEWS2Calculator = ({ onResultChange }) => {
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [spo2Scale, setSpo2Scale] = useState('1');
  const [supplementalOxygen, setSupplementalOxygen] = useState(false);
  const [systolicBp, setSystolicBp] = useState('');
  const [pulse, setPulse] = useState('');
  const [newConfusion, setNewConfusion] = useState(false);
  const [temperature, setTemperature] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);
  const errorSummaryId = 'news2-errors';

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              news2Score: result.total,
              severity: result.severity,
              riskBand: result.riskBand,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollCalcResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const v = validateNews2Inputs({
      respiratoryRate,
      spo2,
      spo2Scale,
      supplementalOxygen,
      systolicBp,
      pulse,
      newConfusion,
      temperature,
    });
    setValidationErrors(v.errors);
    if (!v.ok) {
      setResult(null);
      focusFirstFieldById(['news2-rr', 'news2-spo2', 'news2-scale-1', 'news2-sbp', 'news2-pulse', 'news2-temp']);
      return;
    }
    const breakdown = computeNews2Breakdown({
      respiratoryRate,
      spo2,
      spo2Scale,
      supplementalOxygen,
      systolicBp,
      pulse,
      newConfusion,
      temperature,
    });
    const total = sumNews2Score(breakdown);
    if (total === null) {
      setValidationErrors(['Unable to compute score from inputs.']);
      setResult(null);
      return;
    }
    const interp = interpretNews2Risk(total, breakdown);
    setResult({
      total,
      breakdown,
      ...interp,
    });
  };

  const reset = () => {
    setRespiratoryRate('');
    setSpo2('');
    setSpo2Scale('1');
    setSupplementalOxygen(false);
    setSystolicBp('');
    setPulse('');
    setNewConfusion(false);
    setTemperature('');
    setValidationErrors([]);
    setResult(null);
  };

  const rrInvalid = validationErrors.some((e) => /respiratory/i.test(e));
  const spo2Invalid = validationErrors.some((e) => /SpO/i.test(e));
  const sbpInvalid = validationErrors.some((e) => /systolic/i.test(e));
  const pulseInvalid = validationErrors.some((e) => /pulse/i.test(e));
  const tempInvalid = validationErrors.some((e) => /temperature/i.test(e));

  return (
    <div className="calculator-interface calculator-interface--news2">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.clipboardList}>NEWS2</CalcPanelTitle>

        <div className="calc-news2-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Clinical use:</strong> NEWS2 supports detection of acute illness severity and guides monitoring
            frequency and escalation. It is an adjunct to clinical judgement, not a substitute. Follow your
            organisation’s response policy and senior review where indicated.
          </p>
        </div>

        <fieldset className="calc-news2-scale-fieldset">
          <legend className="calc-news2-legend" id="news2-scale-legend">
            SpO₂ scoring scale
          </legend>
          <div className="calc-news2-scale-options" role="radiogroup" aria-labelledby="news2-scale-legend">
            <label className="calc-news2-scale-option">
              <input
                id="news2-scale-1"
                type="radio"
                name="news2-spo2-scale"
                value="1"
                checked={spo2Scale === '1'}
                onChange={() => setSpo2Scale('1')}
              />
              <span>
                <strong>Scale 1</strong> — usual scale for most patients (target SpO₂ typically 94–98% per BTS when
                using oxygen).
              </span>
            </label>
            <label className="calc-news2-scale-option calc-news2-scale-option--scale2">
              <input
                id="news2-scale-2"
                type="radio"
                name="news2-spo2-scale"
                value="2"
                checked={spo2Scale === '2'}
                onChange={() => setSpo2Scale('2')}
              />
              <span>
                <strong>Scale 2</strong> — only for patients with a <strong>prescribed</strong> target SpO₂ range of
                88–92% (e.g. confirmed hypercapnic respiratory failure), under direction of a competent clinician and
                documented in the notes.
              </span>
            </label>
          </div>
          {spo2Scale === '2' && (
            <div className="calc-news2-scale2-warning" role="alert">
              <strong>Scale 2 warning:</strong> Using Scale 2 inappropriately (e.g. for patients who should be on
              Scale 1) will mis-score SpO₂ and may delay recognition of hypoxaemia or cause inappropriate oxygen
              targets. If unsure, use Scale 1 and seek respiratory / senior advice.
            </div>
          )}
        </fieldset>

        <form
          className="calc-pr1-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
        <div className="calc-input-grid calc-input-grid--responsive">
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="news2-rr">
              Respiratory rate (breaths/min)
            </label>
            <span className="calc-input-help" id="news2-rr-help">
              Values outside 0–60 cannot be calculated; use the chart for extreme physiology.
            </span>
            <input
              id="news2-rr"
              type="number"
              inputMode="numeric"
              className={calcFieldClass('calc-input-field', rrInvalid)}
              aria-describedby={calcDescribedBy('news2-rr-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={rrInvalid || undefined}
              min={0}
              max={60}
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
            />
          </div>
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="news2-spo2">
              SpO₂ (%)
            </label>
            <span className="calc-input-help" id="news2-spo2-help">
              Pulse oximetry on current scale ({spo2Scale === '2' ? 'Scale 2' : 'Scale 1'}).
            </span>
            <input
              id="news2-spo2"
              type="number"
              inputMode="decimal"
              className={calcFieldClass('calc-input-field', spo2Invalid)}
              aria-describedby={calcDescribedBy('news2-spo2-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={spo2Invalid || undefined}
              min={70}
              max={100}
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
            />
          </div>
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="news2-o2"
              className="calc-checkbox"
              checked={supplementalOxygen}
              onChange={(e) => setSupplementalOxygen(e.target.checked)}
              aria-describedby="news2-o2-help"
            />
            <label htmlFor="news2-o2" className="calc-checkbox-label">
              Supplemental oxygen in use (any delivery device)
            </label>
          </div>
          <span className="calc-input-help" id="news2-o2-help">
            NEWS2 adds 2 points when supplemental oxygen is required (Air vs oxygen row), in addition to the SpO₂
            score for the scale you selected.
          </span>
        </div>

        <div className="calc-input-grid calc-input-grid--responsive">
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="news2-sbp">
              Systolic BP (mmHg)
            </label>
            <span className="calc-input-help" id="news2-sbp-help">
              Values outside 50–280 mmHg are blocked from calculation.
            </span>
            <input
              id="news2-sbp"
              type="number"
              inputMode="decimal"
              className={calcFieldClass('calc-input-field', sbpInvalid)}
              aria-describedby={calcDescribedBy('news2-sbp-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={sbpInvalid || undefined}
              min={50}
              max={280}
              value={systolicBp}
              onChange={(e) => setSystolicBp(e.target.value)}
            />
          </div>
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="news2-pulse">
              Pulse (bpm)
            </label>
            <span className="calc-input-help" id="news2-pulse-help">
              Values outside 20–220 bpm are blocked from calculation.
            </span>
            <input
              id="news2-pulse"
              type="number"
              inputMode="numeric"
              className={calcFieldClass('calc-input-field', pulseInvalid)}
              aria-describedby={calcDescribedBy('news2-pulse-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={pulseInvalid || undefined}
              min={20}
              max={220}
              value={pulse}
              onChange={(e) => setPulse(e.target.value)}
            />
          </div>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label" htmlFor="news2-temp">
            Temperature (°C)
          </label>
          <span className="calc-input-help" id="news2-temp-help">
            Core or equivalent temperature. Values outside 30–43 °C are blocked from calculation.
          </span>
            <input
              id="news2-temp"
              type="number"
              inputMode="decimal"
              className={calcFieldClass('calc-input-field', tempInvalid)}
              aria-describedby={calcDescribedBy('news2-temp-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={tempInvalid || undefined}
              step="0.1"
              min={30}
              max={43}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="news2-conf"
              className="calc-checkbox"
              checked={newConfusion}
              onChange={(e) => setNewConfusion(e.target.checked)}
              aria-describedby="news2-conf-help"
            />
            <label htmlFor="news2-conf" className="calc-checkbox-label">
              New confusion (or not alert — ACVPU not “alert”)
            </label>
          </div>
          <span className="calc-input-help" id="news2-conf-help">
            Score 3 if new confusion / CVPU applies; leave unchecked if the patient is alert.
          </span>
        </div>

        {validationErrors.length > 0 && (
          <div id={errorSummaryId} className="calc-error calc-validation-errors" role="alert" aria-live="assertive">
            <strong>Please fix:</strong>
            <ul className="calc-validation-list">
              {validationErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
            Calculate NEWS2
          </button>
          <button type="button" className="calc-reset-btn" onClick={reset} aria-label="Reset NEWS2 form">
            Reset
          </button>
        </div>
        </form>
      </div>

      <CalcResultsPanel id="calc-results-news2" resultsRef={resultsRef}>
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`} aria-labelledby="news2-score-label">
              <div id="news2-score-label" className="calc-score-label">
                NEWS2 total
              </div>
              <div className="calc-score-value">{result.total}</div>
              <div className="calc-score-interpretation">{result.label}</div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title">Parameter scores</div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Respiratory rate</span>
                <span className="calc-breakdown-score">{result.breakdown.respiratoryRate}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">
                  SpO₂ (scale {result.breakdown.spo2ScaleUsed})
                </span>
                <span className="calc-breakdown-score">{result.breakdown.spo2}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Supplemental oxygen</span>
                <span className="calc-breakdown-score">{result.breakdown.supplementalOxygen}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Systolic BP</span>
                <span className="calc-breakdown-score">{result.breakdown.systolicBp}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Pulse</span>
                <span className="calc-breakdown-score">{result.breakdown.pulse}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Consciousness</span>
                <span className="calc-breakdown-score">{result.breakdown.consciousness}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Temperature</span>
                <span className="calc-breakdown-score">{result.breakdown.temperature}</span>
              </div>
            </div>

            <CalcInterpretationRegion
              headingId="news2-interpretation-heading"
              title="Escalation (RCP guidance)"
              severity={result.severity}
              emphasizeRisk={result.severity !== 'normal'}
            >
              <p className="calc-interpretation-text">{result.interpretation}</p>
              <p className="calc-interpretation-text calc-interpretation-text--secondary">{result.escalationHint}</p>
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
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.clipboardList} />
            <p>Enter observations, choose SpO₂ scale, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
};

/**
 * Child-Pugh — cirrhosis severity class. Prognostic index only; not for directing therapy without specialist context.
 */
const ChildPughCalculator = ({ onResultChange }) => {
  const [bilirubin, setBilirubin] = useState('');
  const [bilirubinUnit, setBilirubinUnit] = useState('mg_dl');
  const [albumin, setAlbumin] = useState('');
  const [albuminUnit, setAlbuminUnit] = useState('g_dl');
  const [coagulationMode, setCoagulationMode] = useState('inr');
  const [inr, setInr] = useState('');
  const [ptProlongationSec, setPtProlongationSec] = useState('');
  const [ascites, setAscites] = useState('none');
  const [encephalopathy, setEncephalopathy] = useState('none');
  const [validationErrors, setValidationErrors] = useState([]);
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);
  const errorSummaryId = "cp-errors";

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              childPughScore: result.total,
              childPughClass: result.childPughClass,
              severity: result.severity,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollCalcResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const raw = {
      bilirubin,
      bilirubinUnit,
      albumin,
      albuminUnit,
      coagulationMode,
      inr,
      ptProlongationSec,
      ascites,
      encephalopathy,
    };
    const v = validateChildPughInputs(raw);
    setValidationErrors(v.errors);
    if (!v.ok) {
      setResult(null);
      focusFirstFieldById(["cp-bili", "cp-alb", coagulationMode === "inr" ? "cp-inr" : "cp-pt"]);
      return;
    }
    const breakdown = computeChildPughBreakdown(raw);
    const total = sumChildPughScore(breakdown);
    if (total === null) {
      setValidationErrors(['Unable to compute score from inputs.']);
      setResult(null);
      return;
    }
    const interp = interpretChildPughClass(total);
    if (!interp) {
      setValidationErrors(['Total score out of expected range.']);
      setResult(null);
      return;
    }
    setResult({ total, breakdown, ...interp });
  };

  const reset = () => {
    setBilirubin('');
    setBilirubinUnit('mg_dl');
    setAlbumin('');
    setAlbuminUnit('g_dl');
    setCoagulationMode('inr');
    setInr('');
    setPtProlongationSec('');
    setAscites('none');
    setEncephalopathy('none');
    setValidationErrors([]);
    setResult(null);
  };

  const biliInvalid = validationErrors.some((e) => /bilirubin/i.test(e));
  const albInvalid = validationErrors.some((e) => /albumin/i.test(e));
  const inrInvalid = validationErrors.some((e) => /INR/i.test(e));
  const ptInvalid = validationErrors.some((e) => /PT prolongation/i.test(e));

  return (
    <div className="calculator-interface calculator-interface--child-pugh">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.microscope}>Child-Pugh</CalcPanelTitle>

        <div className="calc-child-pugh-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Clinical use:</strong> Child-Pugh is a severity / prognostic classification for cirrhosis. It does
            not replace hepatology assessment, transplant listing criteria, or institution-specific pathways. Do not use
            this tool alone to prescribe treatments or procedures.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
        <div className="calc-input-grid calc-input-grid--responsive">
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="cp-bili">
              Total bilirubin
            </label>
            <span className="calc-input-help" id="cp-bili-help">
              Required. Valid ranges depend on unit; out-of-range values are blocked.
            </span>
            <div className="calc-input-inline-units">
              <input
                id="cp-bili"
                type="number"
                inputMode="decimal"
                className={calcFieldClass('calc-input-field', biliInvalid)}
                aria-describedby={calcDescribedBy('cp-bili-help', validationErrors.length ? errorSummaryId : '')}
                aria-invalid={biliInvalid || undefined}
                step="0.1"
                min={0}
                value={bilirubin}
                onChange={(e) => setBilirubin(e.target.value)}
              />
              <div className="calc-unit-field">
                <label className="calc-input-label calc-input-label--unit" htmlFor="cp-bili-unit">
                  Unit
                </label>
                <select
                  id="cp-bili-unit"
                  className="calc-select-field"
                  aria-describedby="cp-bili-unit-hint"
                  value={bilirubinUnit}
                  onChange={(e) => setBilirubinUnit(e.target.value)}
                >
                  <option value="mg_dl">mg/dL</option>
                  <option value="umol_l">μmol/L</option>
                </select>
                <span id="cp-bili-unit-hint" className="calc-sr-only">
                  Milligrams per decilitre or micromoles per litre
                </span>
              </div>
            </div>
          </div>
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="cp-alb">
              Albumin
            </label>
            <span className="calc-input-help" id="cp-alb-help">
              Required. Valid ranges depend on unit; out-of-range values are blocked.
            </span>
            <div className="calc-input-inline-units">
              <input
                id="cp-alb"
                type="number"
                inputMode="decimal"
                className={calcFieldClass('calc-input-field', albInvalid)}
                aria-describedby={calcDescribedBy('cp-alb-help', validationErrors.length ? errorSummaryId : '')}
                aria-invalid={albInvalid || undefined}
                step="0.1"
                min={0}
                value={albumin}
                onChange={(e) => setAlbumin(e.target.value)}
              />
              <div className="calc-unit-field">
                <label className="calc-input-label calc-input-label--unit" htmlFor="cp-alb-unit">
                  Unit
                </label>
                <select
                  id="cp-alb-unit"
                  className="calc-select-field"
                  aria-describedby="cp-alb-unit-hint"
                  value={albuminUnit}
                  onChange={(e) => setAlbuminUnit(e.target.value)}
                >
                  <option value="g_dl">g/dL</option>
                  <option value="g_l">g/L</option>
                </select>
                <span id="cp-alb-unit-hint" className="calc-sr-only">
                  Grams per decilitre or grams per litre
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label" htmlFor="cp-coag-mode">
            Coagulation (choose one)
          </label>
          <span className="calc-input-help" id="cp-coag-help">
            Enter <strong>either</strong> INR <strong>or</strong> prothrombin time prolongation vs control (seconds) —
            not both.
          </span>
          <select
            id="cp-coag-mode"
            className="calc-select-field"
            aria-describedby="cp-coag-help"
            value={coagulationMode}
            onChange={(e) => {
              setCoagulationMode(e.target.value);
              setInr('');
              setPtProlongationSec('');
            }}
          >
            <option value="inr">INR</option>
            <option value="pt">PT prolongation (sec above control)</option>
          </select>
        </div>

        {coagulationMode === 'inr' ? (
          <div className="calc-input-group">
            <label className="calc-input-label" htmlFor="cp-inr">
              INR
            </label>
            <span className="calc-input-help" id="cp-inr-help">
              0.5–15. Values outside this range are blocked from calculation.
            </span>
            <input
              id="cp-inr"
              type="number"
              inputMode="decimal"
              className={calcFieldClass('calc-input-field', inrInvalid)}
              aria-describedby={calcDescribedBy('cp-inr-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={inrInvalid || undefined}
              step="0.1"
              min={0.5}
              max={15}
              value={inr}
              onChange={(e) => setInr(e.target.value)}
            />
          </div>
        ) : (
          <div className="calc-input-group">
            <label className="calc-input-label" htmlFor="cp-pt">
              PT prolongation (seconds above control)
            </label>
            <span className="calc-input-help" id="cp-pt-help">
              0–80 seconds above control. Values outside this range are blocked.
            </span>
            <input
              id="cp-pt"
              type="number"
              inputMode="decimal"
              className={calcFieldClass('calc-input-field', ptInvalid)}
              aria-describedby={calcDescribedBy('cp-pt-help', validationErrors.length ? errorSummaryId : '')}
              aria-invalid={ptInvalid || undefined}
              step="0.1"
              min={0}
              max={80}
              value={ptProlongationSec}
              onChange={(e) => setPtProlongationSec(e.target.value)}
            />
          </div>
        )}

        <div className="calc-input-grid calc-input-grid--responsive">
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="cp-ascites">
              Ascites
            </label>
            <select
              id="cp-ascites"
              className="calc-select-field"
              value={ascites}
              onChange={(e) => setAscites(e.target.value)}
            >
              <option value="none">None</option>
              <option value="slight">Slight / controlled (diuretic-responsive)</option>
              <option value="moderate">Moderate / tense (refractory or significant)</option>
            </select>
          </div>
          <div className="calc-input-group calc-input-group--grow">
            <label className="calc-input-label" htmlFor="cp-enceph">
              Hepatic encephalopathy
            </label>
            <select
              id="cp-enceph"
              className="calc-select-field"
              value={encephalopathy}
              onChange={(e) => setEncephalopathy(e.target.value)}
            >
              <option value="none">None</option>
              <option value="grade12">Grade 1–2 (mild)</option>
              <option value="grade34">Grade 3–4 (severe)</option>
            </select>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div id={errorSummaryId} className="calc-error calc-validation-errors" role="alert" aria-live="assertive">
            <strong>Please fix:</strong>
            <ul className="calc-validation-list">
              {validationErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
            Calculate Child-Pugh
          </button>
          <button type="button" className="calc-reset-btn" onClick={reset} aria-label="Reset Child-Pugh form">
            Reset
          </button>
        </div>
        </form>
      </div>

      <CalcResultsPanel id="calc-results-child-pugh" resultsRef={resultsRef}>
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`} aria-labelledby="cp-score-label">
              <div id="cp-score-label" className="calc-score-label">
                Child-Pugh score
              </div>
              <div className="calc-score-value">{result.total}</div>
              <div className="calc-score-interpretation">{result.label}</div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title">Components (each 1–3)</div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Bilirubin (scored as mg/dL)</span>
                <span className="calc-breakdown-score">{result.breakdown.bilirubin}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Albumin (scored as g/dL)</span>
                <span className="calc-breakdown-score">{result.breakdown.albumin}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">
                  Coagulation ({result.breakdown.parsed.coagulationMode === 'pt' ? 'PT prolongation' : 'INR'})
                </span>
                <span className="calc-breakdown-score">{result.breakdown.coagulation}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Ascites</span>
                <span className="calc-breakdown-score">{result.breakdown.ascites}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Encephalopathy</span>
                <span className="calc-breakdown-score">{result.breakdown.encephalopathy}</span>
              </div>
            </div>

            <CalcInterpretationRegion
              headingId="cp-interpretation-heading"
              title="Interpretation"
              severity={result.severity}
              emphasizeRisk={result.severity !== 'normal'}
            >
              <p className="calc-interpretation-text">{result.interpretation}</p>
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
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.microscope} />
            <p>Enter labs and clinical grades, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
};

/**
 * HAS-BLED — bleeding risk factors (anticoagulation context). Decision support only.
 */
const HasBledCalculator = ({ onResultChange }) => {
  const [hypertension, setHypertension] = useState(false);
  const [renalDysfunction, setRenalDysfunction] = useState(false);
  const [liverDysfunction, setLiverDysfunction] = useState(false);
  const [strokeHistory, setStrokeHistory] = useState(false);
  const [bleedingHistory, setBleedingHistory] = useState(false);
  const [labileInr, setLabileInr] = useState(false);
  const [ageOver65, setAgeOver65] = useState(false);
  const [bleedingPredisposingDrugs, setBleedingPredisposingDrugs] = useState(false);
  const [alcoholUse, setAlcoholUse] = useState(false);
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);

  const inputs = {
    hypertension,
    renalDysfunction,
    liverDysfunction,
    strokeHistory,
    bleedingHistory,
    labileInr,
    ageOver65,
    bleedingPredisposingDrugs,
    alcoholUse,
  };

  const setters = {
    hypertension: setHypertension,
    renalDysfunction: setRenalDysfunction,
    liverDysfunction: setLiverDysfunction,
    strokeHistory: setStrokeHistory,
    bleedingHistory: setBleedingHistory,
    labileInr: setLabileInr,
    ageOver65: setAgeOver65,
    bleedingPredisposingDrugs: setBleedingPredisposingDrugs,
    alcoholUse: setAlcoholUse,
  };

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              hasBledScore: result.total,
              severity: result.severity,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollCalcResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const total = calculateHasBledScore(inputs);
    const breakdown = computeHasBledBreakdown(inputs);
    const interp = interpretHasBled(total);
    if (!interp) {
      setResult(null);
      return;
    }
    setResult({ total, breakdown, ...interp });
  };

  const reset = () => {
    setHypertension(false);
    setRenalDysfunction(false);
    setLiverDysfunction(false);
    setStrokeHistory(false);
    setBleedingHistory(false);
    setLabileInr(false);
    setAgeOver65(false);
    setBleedingPredisposingDrugs(false);
    setAlcoholUse(false);
    setResult(null);
  };

  return (
    <div className="calculator-interface calculator-interface--has-bled">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.bandage}>HAS-BLED</CalcPanelTitle>

        <div className="calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Clinical use:</strong> HAS-BLED summarises bleeding-risk factors and is commonly used alongside
            stroke-risk assessment in atrial fibrillation. It does not replace shared decision-making, bleeding-risk
            clinics, or institutional anticoagulation protocols.
          </p>
        </div>

        <div className="calc-has-bled-anticoag-warning" role="alert">
          <strong>Anticoagulation safety:</strong> Any anticoagulant carries bleeding risk. This calculator does not
          recommend starting, stopping, or switching therapy — document decisions and monitoring per local policy.
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
        <fieldset className="calc-has-bled-fieldset">
          <legend className="calc-has-bled-legend" id="has-bled-criteria-legend">
            Risk factors (check all that apply)
          </legend>
          <div className="calc-has-bled-criteria">
            {HAS_BLED_CRITERIA_META.map((row) => {
              const id = `has-bled-${row.key}`;
              const checked = Boolean(inputs[row.key]);
              return (
                <div key={row.key} className="calc-has-bled-row">
                  <div className="calc-checkbox-group">
                    <input
                      type="checkbox"
                      id={id}
                      className="calc-checkbox"
                      checked={checked}
                      onChange={(e) => setters[row.key](e.target.checked)}
                      aria-describedby={`${id}-help`}
                    />
                    <label htmlFor={id} className="calc-checkbox-label">
                      {row.shortLabel}
                    </label>
                  </div>
                  <span className="calc-input-help calc-has-bled-help" id={`${id}-help`}>
                    {row.help}
                  </span>
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="calc-actions">
          <button type="submit" className="calc-calculate-btn">
            <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
            Calculate HAS-BLED
          </button>
          <button type="button" className="calc-reset-btn" onClick={reset} aria-label="Reset HAS-BLED form">
            Reset
          </button>
        </div>
        </form>
      </div>

      <CalcResultsPanel id="calc-results-has-bled" resultsRef={resultsRef}>
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`} aria-labelledby="has-bled-score-label">
              <div id="has-bled-score-label" className="calc-score-label">
                HAS-BLED score
              </div>
              <div className="calc-score-value">{result.total}</div>
              <div className="calc-score-interpretation">of 9 possible factor points</div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title">Factors present</div>
              {HAS_BLED_CRITERIA_META.map((row) => (
                <div key={row.key} className="calc-breakdown-item">
                  <span className="calc-breakdown-label">{row.shortLabel}</span>
                  <span className="calc-breakdown-score">{result.breakdown[row.key]}</span>
                </div>
              ))}
            </div>

            <CalcInterpretationRegion
              headingId="has-bled-interpretation-heading"
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.total >= 3}
            >
              <p className="calc-interpretation-text">{result.interpretation}</p>
              <p className="calc-interpretation-text calc-interpretation-text--secondary">{result.bleedingRiskNote}</p>
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
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.bandage} />
            <p>Select applicable factors, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
};

/**
 * TIMI — UA/NSTEMI risk score (Antman et al.). Decision support only; no treatment recommendations.
 */
const TimiUaNstemiCalculator = ({ onResultChange }) => {
  const resultsRef = useRef(null);
  const [inputs, setInputs] = useState(() =>
    Object.fromEntries(TIMI_UA_NSTEMI_CRITERIA_META.map((r) => [r.key, false]))
  );
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              timiScore: result.total,
              severity: result.severity,
              riskBand: result.riskBand,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollCalcResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const total = calculateTimiUaNstemiScore(inputs);
    const breakdown = computeTimiBreakdown(inputs);
    const interp = interpretTimiUaNstemi(total);
    if (!interp) {
      setResult(null);
      return;
    }
    setResult({ total, breakdown, ...interp });
  };

  const reset = () => {
    setInputs(Object.fromEntries(TIMI_UA_NSTEMI_CRITERIA_META.map((r) => [r.key, false])));
    setResult(null);
    requestAnimationFrame(() => document.getElementById('timi-age65OrOlder')?.focus());
  };

  const timiInterpretationHeadingId = 'timi-interpretation-heading';
  const timiScoreLabelId = 'timi-score-label';

  return (
    <div className="calculator-interface calculator-interface--timi">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.heartPulse}>
          <span id="timi-form-title">TIMI (UA/NSTEMI)</span>
        </CalcPanelTitle>

        <div className="calc-timi-disclaimer calc-has-bled-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>ACS context:</strong>             Apply only when unstable angina or NSTEMI is already suspected or
            diagnosed (not for STEMI). TIMI estimates 14-day adverse-event risk in the validation cohort — it does not
            confirm ACS and does not direct antiplatelet, anticoagulant, or revascularisation therapy.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby="timi-form-title"
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          <fieldset className="calc-timi-fieldset calc-has-bled-fieldset">
            <legend className="calc-timi-legend calc-has-bled-legend" id="timi-criteria-legend">
              TIMI criteria (check all that apply)
            </legend>
            <div className="calc-timi-criteria calc-has-bled-criteria">
              {TIMI_UA_NSTEMI_CRITERIA_META.map((row) => {
                const id = `timi-${row.key}`;
                const checked = Boolean(inputs[row.key]);
                return (
                  <div key={row.key} className="calc-timi-row">
                    <div className="calc-checkbox-group">
                      <input
                        type="checkbox"
                        id={id}
                        className="calc-checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setInputs((prev) => ({ ...prev, [row.key]: e.target.checked }))
                        }
                        aria-describedby={`${id}-help`}
                      />
                      <label htmlFor={id} className="calc-checkbox-label">
                        {row.shortLabel}
                      </label>
                    </div>
                    <span className="calc-input-help calc-timi-help" id={`${id}-help`}>
                      {row.help}
                    </span>
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn" aria-label="Calculate TIMI UA/NSTEMI score">
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate TIMI
            </button>
            <button type="button" className="calc-reset-btn" onClick={reset} aria-label="Reset TIMI form">
              Reset
            </button>
          </div>
        </form>
      </div>

      <CalcResultsPanel id="calc-results-timi" resultsRef={resultsRef}>
        <ResultsPanelTitle />

        {result ? (
          <>
            <div
              className={`calc-score-display ${result.severity}`}
              aria-labelledby={timiScoreLabelId}
            >
              <div id={timiScoreLabelId} className="calc-score-label">
                TIMI score
              </div>
              <div className="calc-score-value">{result.total}</div>
              <div className="calc-score-interpretation">of 7 points</div>
            </div>

            <div className="calc-breakdown">
              <div className="calc-breakdown-title">Criteria</div>
              {TIMI_UA_NSTEMI_CRITERIA_META.map((row) => (
                <div key={row.key} className="calc-breakdown-item">
                  <span className="calc-breakdown-label">{row.shortLabel}</span>
                  <span className="calc-breakdown-score">{result.breakdown[row.key]}</span>
                </div>
              ))}
            </div>

            <CalcInterpretationRegion
              headingId={timiInterpretationHeadingId}
              title={result.label}
              severity={result.severity}
              emphasizeRisk={result.total >= 5}
            >
              <div className="calc-interpretation-text">{result.riskBand}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.approximateEventRate}
              </div>
              <div className="calc-interpretation-text">{result.interpretation}</div>
              <div className="calc-interpretation-text calc-interpretation-text--secondary">{result.acsDisclaimer}</div>
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
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.heartPulse} />
            <p>Check applicable criteria, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
};

/**
 * MELD / MELD-Na — liver disease severity (UNOS laboratory model). Decision support only.
 */
const MeldCalculator = ({ mode = 'meld', onResultChange }) => {
  const includeMeldNa = mode === 'meld-na';
  const resultsRef = useRef(null);
  const [bilirubin, setBilirubin] = useState('');
  const [bilirubinUnit, setBilirubinUnit] = useState('mg_dl');
  const [inr, setInr] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [creatinineUnit, setCreatinineUnit] = useState('mg_dl');
  const [onDialysis, setOnDialysis] = useState(false);
  const [sodium, setSodium] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(
        result
          ? {
              meldScore: result.meld,
              meldNaScore: result.meldNa,
              severity: result.severity,
            }
          : null
      );
    }
  }, [onResultChange, result]);

  useEffect(() => {
    if (result) scrollCalcResultsIntoView(resultsRef.current);
  }, [result]);

  const runCalculate = () => {
    const raw = {
      bilirubin,
      bilirubinUnit,
      inr,
      creatinine,
      creatinineUnit,
      onDialysis,
      sodium: includeMeldNa ? sodium : undefined,
    };
    const out = computeMeldResult(raw, { includeMeldNa });
    if (!out.ok) {
      setValidationErrors(out.errors);
      setResult(null);
      focusFirstFieldById(
        includeMeldNa
          ? ['meld-bili', 'meld-inr', 'meld-cr', 'meld-sodium']
          : ['meld-bili', 'meld-inr', 'meld-cr']
      );
      return;
    }
    setValidationErrors([]);
    setResult(out);
  };

  const reset = () => {
    setBilirubin('');
    setBilirubinUnit('mg_dl');
    setInr('');
    setCreatinine('');
    setCreatinineUnit('mg_dl');
    setOnDialysis(false);
    setSodium('');
    setValidationErrors([]);
    setResult(null);
    requestAnimationFrame(() => document.getElementById('meld-bili')?.focus());
  };

  const title = includeMeldNa ? 'MELD-Na' : 'MELD';
  const icon = getCalculatorSubIcon('meld');
  const formTitleId = includeMeldNa ? 'meld-na-form-title' : 'meld-form-title';
  const interpretationHeadingId = includeMeldNa ? 'meld-na-interpretation-heading' : 'meld-interpretation-heading';
  const errorSummaryId = includeMeldNa ? 'meld-na-errors' : 'meld-errors';
  const resultsPanelId = includeMeldNa ? 'calc-results-meld-na' : 'calc-results-meld';
  const meldScoreLabelId = includeMeldNa ? 'meld-na-score-label' : 'meld-score-label';
  const hasValidationErrors = validationErrors.length > 0;
  const fieldError = (pattern) =>
    hasValidationErrors && validationErrors.some((err) => pattern.test(err));
  const biliInvalid = !bilirubin.trim() || fieldError(/bilirubin/i);
  const inrInvalid = !inr.trim() || fieldError(/\binr\b/i);
  const crInvalid = !onDialysis && (!creatinine.trim() || fieldError(/creatinine|dialysis/i));
  const sodiumInvalid = includeMeldNa && (!sodium.trim() || fieldError(/sodium/i));
  const meldNaSecondaryScoreLabelId = includeMeldNa ? 'meld-na-lab-score-label' : null;

  const clearValidationIfPresent = () => {
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  return (
    <div
      className={`calculator-interface calculator-interface--meld${
        includeMeldNa ? ' calculator-interface--meld-na' : ''
      }`}
    >
      <div className="calculator-inputs">
        <CalcPanelTitle icon={icon}>
          <span id={formTitleId}>{title}</span>
        </CalcPanelTitle>

        <div className="calc-meld-disclaimer" role="note">
          <CalcDecisionSupportLead />
          <p className="calc-disclaimer-detail">
            <strong>Clinical use:</strong> MELD and MELD-Na summarise laboratory severity in chronic liver disease.
            They do not diagnose acute liver failure, do not replace specialist assessment, and{' '}
            <strong>do not recommend transplant evaluation or listing</strong>.
          </p>
        </div>

        <form
          className="calc-pr1-form"
          noValidate
          aria-labelledby={formTitleId}
          onSubmit={(e) => {
            e.preventDefault();
            runCalculate();
          }}
        >
          {hasValidationErrors ? (
            <div
              id={errorSummaryId}
              className="calc-validation-errors"
              role="alert"
              aria-live="assertive"
            >
              <ul>
                {validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <fieldset className="calc-meld-fieldset calc-has-bled-fieldset">
            <legend className="calc-has-bled-legend" id="meld-labs-legend">
              Laboratory values
            </legend>

          <div className="calc-input-group">
            <label className="calc-input-label" htmlFor="meld-bili">
              Total bilirubin
            </label>
            <div className="calc-input-row calc-input-row--with-unit">
              <input
                id="meld-bili"
                type="number"
                min="0"
                step="any"
                className={calcFieldClass('calc-input-field', biliInvalid)}
                value={bilirubin}
                onChange={(e) => {
                  clearValidationIfPresent();
                  setBilirubin(e.target.value);
                }}
                aria-required="true"
                aria-invalid={biliInvalid}
                aria-describedby={calcDescribedBy(hasValidationErrors ? errorSummaryId : null, 'meld-labs-legend')}
                inputMode="decimal"
              />
              <select
                className="calc-select-field"
                value={bilirubinUnit}
                onChange={(e) => setBilirubinUnit(e.target.value)}
                aria-label="Bilirubin unit"
              >
                <option value="mg_dl">mg/dL</option>
                <option value="umol_l">μmol/L</option>
              </select>
            </div>
            <span className="calc-input-help">Values &lt;1 mg/dL are floored to 1.0 for MELD per UNOS.</span>
          </div>

          <div className="calc-input-group">
            <label className="calc-input-label" htmlFor="meld-inr">
              INR
            </label>
            <input
              id="meld-inr"
              type="number"
              min="0"
              step="any"
              className={calcFieldClass('calc-input-field', inrInvalid)}
              value={inr}
              onChange={(e) => {
                clearValidationIfPresent();
                setInr(e.target.value);
              }}
              aria-required="true"
              aria-invalid={inrInvalid}
              aria-describedby={calcDescribedBy(hasValidationErrors ? errorSummaryId : null)}
              inputMode="decimal"
            />
            <span className="calc-input-help">Values &lt;1.0 are floored to 1.0 for MELD.</span>
          </div>

          <div className="calc-input-group">
            <label className="calc-input-label" htmlFor="meld-cr">
              Serum creatinine
            </label>
            <div className="calc-input-row calc-input-row--with-unit">
              <input
                id="meld-cr"
                type="number"
                min="0"
                step="any"
                className={calcFieldClass('calc-input-field', crInvalid)}
                value={creatinine}
                onChange={(e) => {
                  clearValidationIfPresent();
                  setCreatinine(e.target.value);
                }}
                disabled={onDialysis}
                aria-required={!onDialysis}
                aria-invalid={crInvalid}
                aria-describedby={calcDescribedBy(
                  hasValidationErrors ? errorSummaryId : null,
                  'meld-dialysis-help'
                )}
                inputMode="decimal"
              />
              <select
                className="calc-select-field"
                value={creatinineUnit}
                onChange={(e) => setCreatinineUnit(e.target.value)}
                aria-label="Creatinine unit"
                disabled={onDialysis}
              >
                <option value="mg_dl">mg/dL</option>
                <option value="umol_l">μmol/L</option>
              </select>
            </div>
            <div className="calc-checkbox-group">
              <input
                type="checkbox"
                id="meld-dialysis"
                className="calc-checkbox"
                checked={onDialysis}
                onChange={(e) => {
                  clearValidationIfPresent();
                  setOnDialysis(e.target.checked);
                }}
                aria-describedby="meld-dialysis-help"
              />
              <label htmlFor="meld-dialysis" className="calc-checkbox-label">
                Dialysis at least twice in the past week (creatinine set to 4.0 mg/dL)
              </label>
            </div>
            <span id="meld-dialysis-help" className="calc-input-help">
              Creatinine is capped at 4.0 mg/dL when not on dialysis; dialysis applies UNOS creatinine = 4.0 mg/dL.
            </span>
          </div>

          {includeMeldNa ? (
            <div className="calc-input-group">
              <label className="calc-input-label" htmlFor="meld-sodium">
                Serum sodium
              </label>
              <input
                id="meld-sodium"
                type="number"
                min="100"
                max="180"
                step="any"
                className={calcFieldClass('calc-input-field', sodiumInvalid)}
                value={sodium}
                onChange={(e) => {
                  clearValidationIfPresent();
                  setSodium(e.target.value);
                }}
                aria-required="true"
                aria-describedby={calcDescribedBy(
                  'meld-sodium-help',
                  hasValidationErrors ? errorSummaryId : null
                )}
                aria-invalid={sodiumInvalid}
                inputMode="decimal"
              />
              <span id="meld-sodium-help" className="calc-input-help">
                mEq/L (mmol/L). Sodium is clamped to 125–140 for MELD-Na; MELD-Na will not fall below laboratory MELD.
              </span>
            </div>
          ) : null}

          </fieldset>

          <div className="calc-actions">
            <button type="submit" className="calc-calculate-btn" aria-label={`Calculate ${title} score`}>
              <NavIcon icon={CHROME_ICONS.calculator} size={20} aria-hidden />
              Calculate {title}
            </button>
            <button type="button" className="calc-reset-btn" onClick={reset} aria-label={`Reset ${title} form`}>
              Reset
            </button>
          </div>
        </form>
      </div>

      <CalcResultsPanel id={resultsPanelId} resultsRef={resultsRef}>
        <ResultsPanelTitle />

        {result ? (
          <>
            <div
              className={`calc-score-display ${result.severity}`}
              aria-labelledby={meldScoreLabelId}
            >
              <div id={meldScoreLabelId} className="calc-score-label">
                Laboratory MELD
              </div>
              <div className="calc-score-value">{result.meld}</div>
              <div className="calc-score-interpretation">6–40 (UNOS laboratory model)</div>
            </div>

            {includeMeldNa && result.meldNa !== null ? (
              <div
                className={`calc-score-display calc-score-display--secondary ${result.severity}`}
                aria-labelledby={meldNaSecondaryScoreLabelId}
              >
                <div id={meldNaSecondaryScoreLabelId} className="calc-score-label">
                  MELD-Na
                </div>
                <div className="calc-score-value">{result.meldNa}</div>
                {result.sodiumUsed !== null ? (
                  <div className="calc-score-interpretation">
                    Sodium used: {result.sodiumUsed} mEq/L
                    {result.sodiumEntered !== result.sodiumUsed
                      ? ` (entered ${result.sodiumEntered})`
                      : ''}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="calc-breakdown">
              <div className="calc-breakdown-title">Values used in formula (after UNOS clamps)</div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Bilirubin</span>
                <span className="calc-breakdown-score">{formatMeldLabValue(result.clamped.bilirubinMgDl)} mg/dL</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">INR</span>
                <span className="calc-breakdown-score">{formatMeldLabValue(result.clamped.inr)}</span>
              </div>
              <div className="calc-breakdown-item">
                <span className="calc-breakdown-label">Creatinine</span>
                <span className="calc-breakdown-score">{formatMeldLabValue(result.clamped.creatinineMgDl)} mg/dL</span>
              </div>
              {includeMeldNa && result.meldForNa !== undefined ? (
                <div className="calc-breakdown-item">
                  <span className="calc-breakdown-label">MELD for Na step (≥11 floor)</span>
                  <span className="calc-breakdown-score">{result.meldForNa}</span>
                </div>
              ) : null}
            </div>

            <CalcInterpretationRegion
              headingId={interpretationHeadingId}
              title={result.mortalityBand}
              severity={result.severity}
              emphasizeRisk={(result.meldNa ?? result.meld) >= 30}
            >
              <div className="calc-interpretation-text">{result.interpretation}</div>
              {result.meldNaNote ? (
                <div className="calc-interpretation-text calc-interpretation-text--secondary">{result.meldNaNote}</div>
              ) : null}
              <div className="calc-interpretation-text calc-interpretation-text--secondary">
                {result.transplantDisclaimer}
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
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={icon} />
            <p>Enter labs{includeMeldNa ? ' and sodium' : ''}, then calculate</p>
          </div>
        )}
      </CalcResultsPanel>
    </div>
  );
};

/**
 * SOFA Score Calculator
 */
const SOFACalculator = ({ onResultChange }) => {
  const [inputs, setInputs] = useState({
    pao2: '',
    fio2: '',
    mechanicalVentilation: false,
    platelets: '',
    bilirubin: '',
    map: '',
    dopamine: '',
    norepinephrine: '',
    epinephrine: '',
    gcs: '',
    creatinine: '',
    urineOutput: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result ? { ...result, severity: result.severity || getSeverityLevel(result.totalScore || result.score || 0) } : null);
    }
  }, [onResultChange, result]);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    try {
      const parameters = Object.entries(inputs).reduce((acc, [key, value]) => {
        if (value !== '' && value !== false) {
          acc[key] = typeof value === 'string' ? parseFloat(value) || value : value;
        }
        return acc;
      }, {});

      const execution = await executeClinicalTool('sofa-calculator', parameters);
      if (!execution.ok) {
        throw new Error(execution.message || 'Failed to calculate SOFA score');
      }
      if (execution.data != null) {
        setResult(execution.data);
      } else {
        throw new Error(execution.errors?.[0] || 'Calculation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs({
      pao2: '',
      fio2: '',
      mechanicalVentilation: false,
      platelets: '',
      bilirubin: '',
      map: '',
      dopamine: '',
      norepinephrine: '',
      epinephrine: '',
      gcs: '',
      creatinine: '',
      urineOutput: '',
    });
    setResult(null);
    setError(null);
  };

  const getSeverityLevel = (score) => {
    if (score === 0) return 'normal';
    if (score <= 6) return 'normal';
    if (score <= 12) return 'warning';
    return 'critical';
  };

  return (
    <div className="calculator-interface">
      <div className="calc-qsofa-disclaimer" role="note">
        <p className="calc-disclaimer-detail">
          <strong>Clinical use:</strong> SOFA scores organ dysfunction for context in sepsis and ICU care.
          Clinical decision support only — does not diagnose sepsis, predict mortality for an individual patient,
          or direct therapy. Verify against complete assessment and local protocols.
        </p>
      </div>
      {/* Inputs */}
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.stethoscope}>Patient Parameters</CalcPanelTitle>

        {/* Respiration */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            PaO2 (mmHg)
            <span className="calc-input-help">Arterial oxygen pressure</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="80-100"
            value={inputs.pao2}
            onChange={(e) => setInputs({ ...inputs, pao2: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            FiO2 (0.21-1.0)
            <span className="calc-input-help">Fraction of inspired oxygen</span>
          </label>
          <input
            type="number"
            step="0.01"
            className="calc-input-field"
            placeholder="0.21"
            value={inputs.fio2}
            onChange={(e) => setInputs({ ...inputs, fio2: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="mechvent"
              className="calc-checkbox"
              checked={inputs.mechanicalVentilation}
              onChange={(e) => setInputs({ ...inputs, mechanicalVentilation: e.target.checked })}
            />
            <label htmlFor="mechvent" className="calc-checkbox-label">
              Mechanical Ventilation
            </label>
          </div>
        </div>

        {/* Coagulation */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            Platelets (×10³/μL)
            <span className="calc-input-help">Normal: 150-400</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="150"
            value={inputs.platelets}
            onChange={(e) => setInputs({ ...inputs, platelets: e.target.value })}
          />
        </div>

        {/* Liver */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            Bilirubin (mg/dL)
            <span className="calc-input-help">Normal: 0.1-1.2</span>
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            placeholder="1.0"
            value={inputs.bilirubin}
            onChange={(e) => setInputs({ ...inputs, bilirubin: e.target.value })}
          />
        </div>

        {/* Cardiovascular */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            MAP (mmHg)
            <span className="calc-input-help">Mean arterial pressure</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="70"
            value={inputs.map}
            onChange={(e) => setInputs({ ...inputs, map: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Vasopressor Doses (μg/kg/min)
            <span className="calc-input-help">If applicable</span>
          </label>
          <input
            type="number"
            step="0.01"
            className="calc-input-field"
            placeholder="Dopamine"
            value={inputs.dopamine}
            onChange={(e) => setInputs({ ...inputs, dopamine: e.target.value })}
            style={{ marginBottom: '8px' }}
          />
          <input
            type="number"
            step="0.01"
            className="calc-input-field"
            placeholder="Norepinephrine"
            value={inputs.norepinephrine}
            onChange={(e) => setInputs({ ...inputs, norepinephrine: e.target.value })}
            style={{ marginBottom: '8px' }}
          />
          <input
            type="number"
            step="0.01"
            className="calc-input-field"
            placeholder="Epinephrine"
            value={inputs.epinephrine}
            onChange={(e) => setInputs({ ...inputs, epinephrine: e.target.value })}
          />
        </div>

        {/* CNS */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            Glasgow Coma Scale (3-15)
            <span className="calc-input-help">Consciousness level</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="15"
            min="3"
            max="15"
            value={inputs.gcs}
            onChange={(e) => setInputs({ ...inputs, gcs: e.target.value })}
          />
        </div>

        {/* Renal */}
        <div className="calc-input-group">
          <label className="calc-input-label">
            Creatinine (mg/dL)
            <span className="calc-input-help">Normal: 0.6-1.3</span>
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            placeholder="1.0"
            value={inputs.creatinine}
            onChange={(e) => setInputs({ ...inputs, creatinine: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Urine Output (mL/day)
            <span className="calc-input-help">24-hour total</span>
          </label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="1500"
            value={inputs.urineOutput}
            onChange={(e) => setInputs({ ...inputs, urineOutput: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button
            className="calc-calculate-btn"
            onClick={handleCalculate}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="calc-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                Calculating...
              </>
            ) : (
              <>
                <NavIcon icon={CHROME_ICONS.calculator} size={20} />
                Calculate SOFA Score
              </>
            )}
          </button>
          <button className="calc-reset-btn" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="calculator-results">
        <ResultsPanelTitle />

        {loading ? (
          <div className="calc-loading">
            <div className="calc-spinner"></div>
            <p>Calculating...</p>
          </div>
        ) : error ? (
          <div className="calc-error">
            <strong>Error:</strong> {error}
          </div>
        ) : result ? (
          <>
            {/* Score Display */}
            <div className={`calc-score-display ${getSeverityLevel(result.totalScore)}`}>
              <div className="calc-score-label">SOFA Score</div>
              <div className="calc-score-value">{result.totalScore}</div>
              <div className="calc-score-interpretation">
                {result.interpretation || 'Assessment complete'}
              </div>
            </div>

            {/* Score Breakdown */}
            {result.breakdown && (
              <div className="calc-breakdown">
                <div className="calc-breakdown-title">Score Breakdown by System</div>
                {Object.entries(result.breakdown).map(([system, score]) => (
                  <div key={system} className="calc-breakdown-item">
                    <span className="calc-breakdown-label">
                      {system.charAt(0).toUpperCase() + system.slice(1)}
                    </span>
                    <span className="calc-breakdown-score">{score}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Clinical Interpretation */}
            {result.interpretation && (
              <div className={`calc-interpretation-box ${getSeverityLevel(result.totalScore)}`}>
                <div className="calc-interpretation-title">Clinical Interpretation</div>
                <div className="calc-interpretation-text">{result.interpretation}</div>
              </div>
            )}

            {/* References */}
            <div className="calc-references">
              <div className="calc-references-title">References</div>
              <ul className="calc-references-list">
                <li>Vincent JL, et al. The SOFA score to describe organ dysfunction/failure. Intensive Care Med. 1996;22(7):707-10.</li>
                <li>Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801-810.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.hospital} />
            <p>Enter patient parameters and calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * GFR Calculator (simplified version - can be expanded)
 */
const GFRCalculator = ({ onResultChange }) => {
  const [inputs, setInputs] = useState({
    age: '',
    sex: '',
    creatinine: '',
    race: '',
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result);
    }
  }, [onResultChange, result]);

  const calculateGFR = () => {
    const { age, sex, creatinine, race } = inputs;
    
    if (!age || !sex || !creatinine) {
      alert('Please fill in all required fields');
      return;
    }

    // CKD-EPI formula (simplified)
    const kappa = sex === 'female' ? 0.7 : 0.9;
    const alpha = sex === 'female' ? -0.329 : -0.411;
    const minCrKappa = Math.min(parseFloat(creatinine) / kappa, 1);
    const maxCrKappa = Math.max(parseFloat(creatinine) / kappa, 1);
    
    let gfr = 141 * Math.pow(minCrKappa, alpha) * Math.pow(maxCrKappa, -1.209) * Math.pow(0.993, parseFloat(age));
    
    if (sex === 'female') gfr *= 1.018;
    if (race === 'black') gfr *= 1.159;

    gfr = Math.round(gfr);

    let stage = '';
    let interpretation = '';
    let severity = 'normal';

    if (gfr >= 90) {
      stage = 'G1';
      interpretation = 'Normal or high kidney function';
      severity = 'normal';
    } else if (gfr >= 60) {
      stage = 'G2';
      interpretation = 'Mildly decreased kidney function';
      severity = 'normal';
    } else if (gfr >= 45) {
      stage = 'G3a';
      interpretation = 'Mild to moderate decrease in kidney function';
      severity = 'warning';
    } else if (gfr >= 30) {
      stage = 'G3b';
      interpretation = 'Moderate to severe decrease in kidney function';
      severity = 'warning';
    } else if (gfr >= 15) {
      stage = 'G4';
      interpretation = 'Severe decrease in kidney function';
      severity = 'critical';
    } else {
      stage = 'G5';
      interpretation = 'Kidney failure - dialysis or transplant may be needed';
      severity = 'critical';
    }

    setResult({ gfr, stage, interpretation, severity });
  };

  return (
    <div className="calculator-interface">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.activity}>Patient Information</CalcPanelTitle>

        <div className="calc-input-group">
          <label className="calc-input-label">Age (years)</label>
          <input
            type="number"
            className="calc-input-field"
            value={inputs.age}
            onChange={(e) => setInputs({ ...inputs, age: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">Sex</label>
          <select
            className="calc-select-field"
            value={inputs.sex}
            onChange={(e) => setInputs({ ...inputs, sex: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Serum Creatinine (mg/dL)
            <span className="calc-input-help">Normal: 0.6-1.3</span>
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            value={inputs.creatinine}
            onChange={(e) => setInputs({ ...inputs, creatinine: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">Race (optional)</label>
          <select
            className="calc-select-field"
            value={inputs.race}
            onChange={(e) => setInputs({ ...inputs, race: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="black">Black/African American</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="calc-actions">
          <button
            type="button"
            className="calc-calculate-btn"
            onClick={calculateGFR}
          >
            <NavIcon icon={CHROME_ICONS.calculator} size={20} />
            Calculate eGFR
          </button>
          <button
            className="calc-reset-btn"
            onClick={() => { setInputs({ age: '', sex: '', creatinine: '', race: '' }); setResult(null); }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="calculator-results">
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">eGFR (CKD-EPI)</div>
              <div className="calc-score-value">
                {result.gfr}
                <span style={{ fontSize: '24px', marginLeft: '8px' }}>mL/min/1.73m²</span>
              </div>
              <div className="calc-score-interpretation">
                CKD Stage {result.stage}
              </div>
            </div>

            <div className={`calc-interpretation-box ${result.severity}`}>
              <div className="calc-interpretation-title">Interpretation</div>
              <div className="calc-interpretation-text">{result.interpretation}</div>
            </div>

            <div className="calc-references">
              <div className="calc-references-title">Reference</div>
              <ul className="calc-references-list">
                <li>Levey AS, et al. A new equation to estimate glomerular filtration rate. Ann Intern Med. 2009;150(9):604-612.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.activity} />
            <p>Enter patient information and calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * BMI Calculator (simplified)
 */
const BMICalculator = ({ onResultChange }) => {
  const [inputs, setInputs] = useState({
    weight: '',
    height: '',
    unit: 'metric',
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result);
    }
  }, [onResultChange, result]);

  const calculateBMI = () => {
    let { weight, height, unit } = inputs;
    
    if (!weight || !height) {
      alert('Please enter weight and height');
      return;
    }

    weight = parseFloat(weight);
    height = parseFloat(height);

    let bmi;
    if (unit === 'metric') {
      bmi = weight / Math.pow(height / 100, 2);
    } else {
      bmi = (weight / Math.pow(height, 2)) * 703;
    }

    bmi = Math.round(bmi * 10) / 10;

    let category = '';
    let severity = 'normal';
    let interpretation = '';

    if (bmi < 18.5) {
      category = 'Underweight';
      severity = 'warning';
      interpretation = 'Below healthy weight range';
    } else if (bmi < 25) {
      category = 'Normal weight';
      severity = 'normal';
      interpretation = 'Healthy weight range';
    } else if (bmi < 30) {
      category = 'Overweight';
      severity = 'warning';
      interpretation = 'Above healthy weight range';
    } else if (bmi < 35) {
      category = 'Obese Class I';
      severity = 'warning';
      interpretation = 'Obesity - increased health risks';
    } else if (bmi < 40) {
      category = 'Obese Class II';
      severity = 'critical';
      interpretation = 'Severe obesity - high health risks';
    } else {
      category = 'Obese Class III';
      severity = 'critical';
      interpretation = 'Morbid obesity - very high health risks';
    }

    setResult({ bmi, category, severity, interpretation });
  };

  return (
    <div className="calculator-interface">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.scale}>Body Measurements</CalcPanelTitle>

        <div className="calc-input-group">
          <label className="calc-input-label">Unit System</label>
          <select
            className="calc-select-field"
            value={inputs.unit}
            onChange={(e) => setInputs({ ...inputs, unit: e.target.value })}
          >
            <option value="metric">Metric (kg, cm)</option>
            <option value="imperial">Imperial (lb, in)</option>
          </select>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Weight {inputs.unit === 'metric' ? '(kg)' : '(lb)'}
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            value={inputs.weight}
            onChange={(e) => setInputs({ ...inputs, weight: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">
            Height {inputs.unit === 'metric' ? '(cm)' : '(inches)'}
          </label>
          <input
            type="number"
            step="0.1"
            className="calc-input-field"
            value={inputs.height}
            onChange={(e) => setInputs({ ...inputs, height: e.target.value })}
          />
        </div>

        <div className="calc-actions">
          <button type="button" className="calc-calculate-btn" onClick={calculateBMI}>
            <NavIcon icon={CHROME_ICONS.calculator} size={20} />
            Calculate BMI
          </button>
          <button
            className="calc-reset-btn"
            onClick={() => { setInputs({ ...inputs, weight: '', height: '' }); setResult(null); }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="calculator-results">
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">Body Mass Index</div>
              <div className="calc-score-value">
                {result.bmi}
                <span style={{ fontSize: '24px', marginLeft: '8px' }}>kg/m²</span>
              </div>
              <div className="calc-score-interpretation">{result.category}</div>
            </div>

            <div className={`calc-interpretation-box ${result.severity}`}>
              <div className="calc-interpretation-title">Interpretation</div>
              <div className="calc-interpretation-text">{result.interpretation}</div>
            </div>

            <div className="calc-references">
              <div className="calc-references-title">BMI Categories</div>
              <ul className="calc-references-list">
                <li>Underweight: BMI &lt; 18.5</li>
                <li>Normal weight: BMI 18.5-24.9</li>
                <li>Overweight: BMI 25.0-29.9</li>
                <li>Obese: BMI ≥ 30.0</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.scale} />
            <p>Enter measurements and calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * CHA2DS2-VASc Calculator (simplified) — stroke risk stratum only; no anticoagulation directives.
 */
const CHA2DS2VAScCalculator = ({ onResultChange }) => {
  const [inputs, setInputs] = useState({
    chf: false,
    hypertension: false,
    age: '',
    diabetes: false,
    stroke: false,
    vascular: false,
    sex: '',
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (onResultChange) {
      onResultChange(result);
    }
  }, [onResultChange, result]);

  const calculateScore = () => {
    let score = 0;
    
    if (inputs.chf) score += 1;
    if (inputs.hypertension) score += 1;
    
    const age = parseInt(inputs.age);
    if (age >= 75) score += 2;
    else if (age >= 65) score += 1;
    
    if (inputs.diabetes) score += 1;
    if (inputs.stroke) score += 2;
    if (inputs.vascular) score += 1;
    if (inputs.sex === 'female') score += 1;

    let interpretation = '';
    let severity = 'normal';
    let recommendation = '';

    if (score === 0) {
      interpretation = 'Low estimated stroke risk stratum (score 0)';
      severity = 'normal';
      recommendation =
        'Discuss stroke risk with guidelines and shared decision-making — this tool does not recommend for or against anticoagulation.';
    } else if (score === 1) {
      interpretation = 'Intermediate estimated stroke risk stratum (score 1)';
      severity = 'normal';
      recommendation =
        'Discuss stroke and bleeding risk with guidelines — does not direct anticoagulant initiation or cessation.';
    } else if (score === 2) {
      interpretation = 'Moderate estimated stroke risk stratum (score 2)';
      severity = 'warning';
      recommendation =
        'Higher stroke-risk stratum for discussion with guidelines — not a directive to start or stop anticoagulation.';
    } else {
      interpretation = 'High estimated stroke risk stratum (score ≥3)';
      severity = 'critical';
      recommendation =
        'Higher stroke-risk stratum for discussion with guidelines and bleeding-risk assessment (e.g. HAS-BLED) — not a directive to start or stop therapy.';
    }

    setResult({ score, interpretation, severity, recommendation });
  };

  return (
    <div className="calculator-interface">
      <div className="calculator-inputs">
        <CalcPanelTitle icon={CHROME_ICONS.heartPulse}>Risk Factors</CalcPanelTitle>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="chf"
              className="calc-checkbox"
              checked={inputs.chf}
              onChange={(e) => setInputs({ ...inputs, chf: e.target.checked })}
            />
            <label htmlFor="chf" className="calc-checkbox-label">
              CHF/LV dysfunction (1 point)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="htn"
              className="calc-checkbox"
              checked={inputs.hypertension}
              onChange={(e) => setInputs({ ...inputs, hypertension: e.target.checked })}
            />
            <label htmlFor="htn" className="calc-checkbox-label">
              Hypertension (1 point)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">Age (years)</label>
          <input
            type="number"
            className="calc-input-field"
            placeholder="65+ = 1 pt, 75+ = 2 pts"
            value={inputs.age}
            onChange={(e) => setInputs({ ...inputs, age: e.target.value })}
          />
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="dm"
              className="calc-checkbox"
              checked={inputs.diabetes}
              onChange={(e) => setInputs({ ...inputs, diabetes: e.target.checked })}
            />
            <label htmlFor="dm" className="calc-checkbox-label">
              Diabetes mellitus (1 point)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="stroke"
              className="calc-checkbox"
              checked={inputs.stroke}
              onChange={(e) => setInputs({ ...inputs, stroke: e.target.checked })}
            />
            <label htmlFor="stroke" className="calc-checkbox-label">
              Prior stroke/TIA/embolism (2 points)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <div className="calc-checkbox-group">
            <input
              type="checkbox"
              id="vasc"
              className="calc-checkbox"
              checked={inputs.vascular}
              onChange={(e) => setInputs({ ...inputs, vascular: e.target.checked })}
            />
            <label htmlFor="vasc" className="calc-checkbox-label">
              Vascular disease (1 point)
            </label>
          </div>
        </div>

        <div className="calc-input-group">
          <label className="calc-input-label">Sex</label>
          <select
            className="calc-select-field"
            value={inputs.sex}
            onChange={(e) => setInputs({ ...inputs, sex: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female (1 point)</option>
          </select>
        </div>

        <div className="calc-actions">
          <button type="button" className="calc-calculate-btn" onClick={calculateScore}>
            <NavIcon icon={CHROME_ICONS.calculator} size={20} />
            Calculate Score
          </button>
          <button
            className="calc-reset-btn"
            onClick={() => {
              setInputs({
                chf: false,
                hypertension: false,
                age: '',
                diabetes: false,
                stroke: false,
                vascular: false,
                sex: '',
              });
              setResult(null);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="calculator-results">
        <ResultsPanelTitle />

        {result ? (
          <>
            <div className={`calc-score-display ${result.severity}`}>
              <div className="calc-score-label">CHA2DS2-VASc Score</div>
              <div className="calc-score-value">{result.score}</div>
              <div className="calc-score-interpretation">{result.interpretation}</div>
            </div>

            <div className={`calc-interpretation-box ${result.severity}`}>
              <div className="calc-interpretation-title">Stroke risk discussion (not a treatment order)</div>
              <div className="calc-interpretation-text">{result.recommendation}</div>
            </div>
            <CalcResultSafetyFooter />

            <div className="calc-references">
              <div className="calc-references-title">Reference</div>
              <ul className="calc-references-list">
                <li>Lip GY, et al. Refining clinical risk stratification for predicting stroke and thromboembolism in atrial fibrillation. Chest. 2010;138(2):263-272.</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="calc-results-empty">
            <CalcResultsEmptyIcon icon={CHROME_ICONS.heartPulse} />
            <p>Select risk factors and calculate</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calculators;
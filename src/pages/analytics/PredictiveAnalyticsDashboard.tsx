import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHART_PALETTE } from '../../config/colorSchema.registry';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import {
  DEMO_PREDICTIVE_ANALYTICS_MODELS,
  buildPredictiveAnalyticsSummary,
  resolvePredictiveRiskBand,
  searchPredictiveModels,
} from '../../data/predictiveAnalyticsDashboard';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './PredictiveAnalyticsDashboard.css';

// ── constants ─────────────────────────────────────────────────────────────────

const BAND_COLOR: Record<string, string> = {
  critical: CHART_PALETTE.critical,
  high: CHART_PALETTE.high,
  moderate: CHART_PALETTE.moderate,
  low: CHART_PALETTE.low,
};

const BAND_BG: Record<string, string> = {
  critical: CHART_PALETTE.criticalBg,
  high: CHART_PALETTE.highBg,
  moderate: CHART_PALETTE.moderateBg,
  low: CHART_PALETTE.lowBg,
};

// ── sub-components ────────────────────────────────────────────────────────────

function SummaryStrip({
  summary,
}: {
  summary: ReturnType<typeof buildPredictiveAnalyticsSummary>;
}) {
  return (
    <div className="pad-summary-strip">
      {[
        { label: 'Models active', value: summary.modelCount },
        {
          label: 'High / Critical',
          value: summary.highOrCriticalCount,
          accent: summary.highOrCriticalCount > 0 ? CHART_PALETTE.critical : CHART_PALETTE.low,
        },
        { label: 'Avg risk score', value: `${summary.averageScore}/100` },
        {
          label: 'Highest risk',
          value: summary.highestRisk?.title ?? '—',
          accent: BAND_COLOR[summary.highestRisk?.band ?? 'low'],
        },
      ].map(({ label, value, accent }) => (
        <div key={label} className="pad-summary-card">
          <div className="pad-eyebrow-label">{label}</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: accent || MEDICAL_THEME.ink,
              lineHeight: 1.15,
            }}
          >
            {String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreBar({ score, band }: { score: number; band: string }) {
  const color = BAND_COLOR[band] || MEDICAL_THEME.inkSubtle;
  return (
    <div className="pad-score-bar">
      <div className="pad-score-track">
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            borderRadius: 4,
            background: color,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, color, minWidth: 34, textAlign: 'right' }}>
        {score}
      </span>
    </div>
  );
}

function ModelCard({
  model,
  onNavigate,
}: {
  model: (typeof DEMO_PREDICTIVE_ANALYTICS_MODELS)[number];
  onNavigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const band = resolvePredictiveRiskBand(model.score);
  const color = BAND_COLOR[band];
  const bg = BAND_BG[band];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded ? 'true' : 'false'}
      style={{
        background: MEDICAL_THEME.surfaceCard,
        border: `1.5px solid ${color}44`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((e) => !e)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((prev) => !prev);
        }
      }}
    >
      {/* Header */}
      <div className="pad-card-header">
        <div className="u-flex-1">
          <div className="pad-card-title">{model.title}</div>
          <div className="pad-card-subtitle">
            {model.domain} · {model.horizon}
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color,
            background: bg,
            border: `1px solid ${color}55`,
            borderRadius: 20,
            padding: '3px 10px',
            flexShrink: 0,
          }}
        >
          {band}
        </span>
      </div>

      {/* Score bar */}
      <ScoreBar score={model.score} band={band} />

      {/* Confidence */}
      <div style={{ fontSize: 12, color: MEDICAL_THEME.inkMuted, marginBottom: expanded ? 12 : 0 }}>
        Confidence:{' '}
        <strong className="pad-confidence-value">{Math.round(model.confidence * 100)}%</strong>
        {' · '}
        {expanded ? 'Hide details ▲' : 'Show details ▼'}
      </div>

      {/* Expanded detail */}
      {expanded && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- onClick only stops propagation to the card's own toggle handler, it is not an interactive control itself
        <div className="pad-expanded-detail" onClick={(e) => e.stopPropagation()}>
          {/* Signals */}
          <div>
            <div className="pad-eyebrow-label">Risk signals</div>
            {model.signals.map((signal) => (
              <div key={signal} className="pad-signal-row">
                <span style={{ color, fontSize: 8 }}>●</span>
                {signal}
              </div>
            ))}
          </div>

          {/* Recommended actions */}
          <div>
            <div className="pad-eyebrow-label">Recommended actions</div>
            {model.recommendedActions.map((action, i) => (
              <div key={action} className="pad-action-row">
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: MEDICAL_THEME.onAccent,
                    background: color,
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                {action}
              </div>
            ))}
          </div>

          {/* Open linked page */}
          {model.linkedPath && (
            <button
              type="button"
              onClick={() => onNavigate(model.linkedPath)}
              className="pad-open-button"
            >
              Open related module →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function PredictiveAnalyticsDashboard() {
  useRouteChromeRegistration({ title: 'Predictive Analytics Dashboard' });
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [models, setModels] = useState(DEMO_PREDICTIVE_ANALYTICS_MODELS as any[]);
  const [summary, setSummary] = useState(() => buildPredictiveAnalyticsSummary());

  useEffect(() => {
    const results = searchPredictiveModels(query);
    setModels(results as any[]);
    setSummary(buildPredictiveAnalyticsSummary(results as any));
  }, [query]);

  return (
    <main className="pad-page">
      {/* Header */}
      <div className="u-mb-20">
        <p className="pad-page-title" data-testid="cd-page-title-text">
          Predictive Analytics Dashboard
        </p>
        <p className="pad-page-subtitle">
          Deterioration · Sepsis · Readmission · ICU transfer · Device & fleet risk
        </p>
      </div>

      {/* Demo notice */}
      <div className="pad-demo-notice">
        <span className="u-fw-700">Demo models</span> — predictions shown are not live patient,
        device, or fleet data. Connect live data pipelines to activate real predictions.
      </div>

      {/* Summary strip */}
      <SummaryStrip summary={summary} />

      {/* Search */}
      <div className="pad-search-wrap">
        <input
          type="text"
          placeholder="Search models, domains, signals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pad-search-input"
        />
      </div>

      {/* Model cards */}
      {models.length === 0 ? (
        <div className="pad-empty-state">No models match "{query}"</div>
      ) : (
        <div className="pad-model-grid">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} onNavigate={navigate} />
          ))}
        </div>
      )}
    </main>
  );
}

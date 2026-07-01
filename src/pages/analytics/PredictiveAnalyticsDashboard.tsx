import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import {
  DEMO_PREDICTIVE_ANALYTICS_MODELS,
  buildPredictiveAnalyticsSummary,
  resolvePredictiveRiskBand,
  searchPredictiveModels,
} from '../../data/predictiveAnalyticsDashboard';

// -- constants -----------------------------------------------------------------

const BAND_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  moderate: '#f59e0b',
  low:      '#22c55e',
};

const BAND_BG: Record<string, string> = {
  critical: '#fef2f2',
  high:     '#fff7ed',
  moderate: '#fefce8',
  low:      '#f0fdf4',
};

// -- sub-components ------------------------------------------------------------

function SummaryStrip({ summary }: { summary: ReturnType<typeof buildPredictiveAnalyticsSummary> }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      {[
        { label: 'Models active', value: summary.modelCount },
        {
          label: 'High / Critical',
          value: summary.highOrCriticalCount,
          accent: summary.highOrCriticalCount > 0 ? '#ef4444' : '#22c55e',
        },
        { label: 'Avg risk score', value: `${summary.averageScore}/100` },
        {
          label: 'Highest risk',
          value: summary.highestRisk?.title ?? '�',
          accent: BAND_COLOR[summary.highestRisk?.band ?? 'low'],
        },
      ].map(({ label, value, accent }) => (
        <div
          key={label}
          style={{
            background: MEDICAL_THEME.surfaceCard,
            border: `1px solid ${MEDICAL_THEME.border}`,
            borderRadius: 12,
            padding: '14px 18px',
            flex: '1 1 140px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: MEDICAL_THEME.inkSubtle,
              marginBottom: 6,
            }}
          >
            {label}
          </div>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: MEDICAL_THEME.border,
          overflow: 'hidden',
        }}
      >
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
  const bg    = BAND_BG[band];

  return (
    <div
      style={{
        background: MEDICAL_THEME.surfaceCard,
        border: `1.5px solid ${color}44`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: MEDICAL_THEME.ink }}>
            {model.title}
          </div>
          <div style={{ fontSize: 12, color: MEDICAL_THEME.inkMuted, marginTop: 2 }}>
            {model.domain} � {model.horizon}
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
        Confidence: <strong style={{ color: MEDICAL_THEME.ink }}>{Math.round(model.confidence * 100)}%</strong>
        {' � '}
        {expanded ? 'Hide details ?' : 'Show details ?'}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${MEDICAL_THEME.border}`,
            paddingTop: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Signals */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: MEDICAL_THEME.inkSubtle,
                marginBottom: 6,
              }}
            >
              Risk signals
            </div>
            {model.signals.map((signal) => (
              <div
                key={signal}
                style={{
                  fontSize: 13,
                  color: MEDICAL_THEME.ink,
                  padding: '3px 0',
                  borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color, fontSize: 8 }}>?</span>
                {signal}
              </div>
            ))}
          </div>

          {/* Recommended actions */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: MEDICAL_THEME.inkSubtle,
                marginBottom: 6,
              }}
            >
              Recommended actions
            </div>
            {model.recommendedActions.map((action, i) => (
              <div
                key={action}
                style={{
                  fontSize: 13,
                  color: MEDICAL_THEME.ink,
                  padding: '3px 0',
                  borderBottom: `1px solid ${MEDICAL_THEME.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
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
              onClick={() => onNavigate(model.linkedPath)}
              style={{
                alignSelf: 'flex-start',
                background: MEDICAL_THEME.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              Open related module ?
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// -- page ----------------------------------------------------------------------

export default function PredictiveAnalyticsDashboard() {
  const navigate = useNavigate();
  const [query, setQuery]     = useState('');
  const [models, setModels]   = useState(DEMO_PREDICTIVE_ANALYTICS_MODELS as any[]);
  const [summary, setSummary] = useState(() => buildPredictiveAnalyticsSummary());

  useEffect(() => {
    const results = searchPredictiveModels(query);
    setModels(results as any[]);
    setSummary(buildPredictiveAnalyticsSummary(results as any));
  }, [query]);

  return (
    <main
      style={{
        background: MEDICAL_THEME.surfacePage,
        minHeight: '100vh',
        padding: '24px 28px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: MEDICAL_THEME.ink }}>
          Predictive Analytics Dashboard
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: MEDICAL_THEME.inkMuted }}>
          Deterioration � Sepsis � Readmission � ICU transfer � Device & fleet risk
        </p>
      </div>

      {/* Demo notice */}
      <div
        style={{
          background: '#fefce8',
          border: '1px solid #d97706',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12,
          color: '#78350f',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 700 }}>Demo models</span> � predictions shown are not live
        patient, device, or fleet data. Connect live data pipelines to activate real predictions.
      </div>

      {/* Summary strip */}
      <SummaryStrip summary={summary} />

      {/* Search */}
      <div style={{ marginBottom: 18 }}>
        <input
          type="text"
          placeholder="Search models, domains, signals�"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 420,
            padding: '8px 14px',
            fontSize: 13,
            border: `1.5px solid ${MEDICAL_THEME.border}`,
            borderRadius: 8,
            background: MEDICAL_THEME.surfaceCard,
            color: MEDICAL_THEME.ink,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Model cards */}
      {models.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: MEDICAL_THEME.inkSubtle,
            fontSize: 14,
          }}
        >
          No models match "{query}"
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 14,
          }}
        >
          {models.map((model) => (
            <ModelCard key={model.id} model={model} onNavigate={navigate} />
          ))}
        </div>
      )}
    </main>
  );
}

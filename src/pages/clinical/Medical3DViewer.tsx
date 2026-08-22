import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  DEMO_ANATOMY_MODELS,
  modelStatusLabel,
  modelStatusTone,
} from '../../utils/medical3dViewerModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './Medical3DViewer.css';

const MARKER_FILL: Record<string, string> = {
  good: 'var(--app-chart-2)',
  warning: 'var(--app-chart-5)',
  critical: 'var(--app-status-critical, #ef4444)',
  neutral: 'var(--app-chart-3)',
};

export default function Medical3DViewer() {
  useRouteChromeRegistration({ title: '3D Viewer' });
  const [selectedModelId, setSelectedModelId] = useState<string | null>(DEMO_ANATOMY_MODELS[0]?.id ?? null);

  const models = DEMO_ANATOMY_MODELS;
  const selectedModel = models.find((model) => model.id === selectedModelId) || null;

  const availability = useMemo(() => {
    const available = models.filter((model) => model.status === 'available').length;
    const demo = models.filter((model) => model.status === 'demo').length;
    const restricted = models.filter((model) => model.status === 'restricted').length;
    return { available, demo, restricted, total: models.length };
  }, [models]);

  return (
    <main className="medical-3d-page" aria-label="Medical 3D viewer">
      <header className="medical-3d-page__header">
        <div className="medical-3d-page__title-row">
          <GraphicIconBadge iconKey="layout-dashboard" accent="brand" size="md" />
          <div>
            <p className="medical-3d-page-title-text" data-testid="cd-page-title-text">3D Viewer</p>
            <p>Asset-safe anatomy model shell with demo markers — no committed Three.js or DICOM viewer.</p>
          </div>
        </div>
        <div className="medical-3d-page__actions">
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.simulation}>Simulation suite</Link>
          <Link to={`${CANONICAL_ROUTES.simulation}/stroke-alert`}>Stroke scenario</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
          <Link to={CANONICAL_ROUTES.operations}>Operations hub</Link>
        </div>
      </header>

      <StateSourceNotice
        title="3D viewer source state"
        states={[
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.SIMULATED,
          DEMO_LIVE_STATES.UNSUPPORTED,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
        ]}
        details="Placeholder silhouette viewer. Full 3D rendering requires entitled model assets and a WebGL runtime."
      />

      <div className="medical-3d-page__metrics" role="group" aria-label="3D viewer summary metrics">
        <MetricCard label="Models" value={String(availability.total)} hint="Registered demo markers" tone="neutral" />
        <MetricCard label="Available" value={String(availability.available)} hint="Ready for inspection" tone="good" />
        <MetricCard label="Demo shells" value={String(availability.demo)} hint="Training placeholders" tone="warning" />
        <MetricCard
          label="Restricted"
          value={String(availability.restricted)}
          hint="Requires additional entitlement"
          tone={availability.restricted > 0 ? 'critical' : 'neutral'}
        />
      </div>

      <div className="medical-3d-page__layout">
        <section className="medical-3d-page__canvas-panel" aria-label="Anatomy model canvas">
          <h2>Model canvas</h2>
          <p>Select a marker to inspect demo anatomy regions.</p>
          <svg
            className="medical-3d-page__canvas"
            viewBox="0 0 100 100"
            role="group"
            aria-label="Demo anatomy silhouette — contains selectable model markers"
          >
            <rect x="0" y="0" width="100" height="100" fill="var(--app-surface-muted, #f1f5f9)" />
            <ellipse cx="50" cy="22" rx="12" ry="14" fill="var(--app-chart-3)" opacity="0.35" />
            <rect x="38" y="34" width="24" height="34" rx="8" fill="var(--app-chart-1)" opacity="0.25" />
            <rect x="34" y="68" width="10" height="24" rx="4" fill="var(--app-chart-4)" opacity="0.25" />
            <rect x="56" y="68" width="10" height="24" rx="4" fill="var(--app-chart-4)" opacity="0.25" />
            {models.map((model) => {
              const tone = modelStatusTone(model.status);
              const selected = model.id === selectedModelId;
              return (
                <g key={model.id}>
                  <circle
                    cx={model.x}
                    cy={model.y}
                    r={selected ? 4.2 : 3.2}
                    fill={MARKER_FILL[tone]}
                    stroke={selected ? 'var(--medical-text-heading, #0f172a)' : 'transparent'}
                    strokeWidth={selected ? 1.2 : 0}
                    className="medical-3d-page__marker"
                    onClick={() => setSelectedModelId(model.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedModelId(model.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${model.label}, ${modelStatusLabel(model.status)}`}
                    {...((selected) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
                  />
                </g>
              );
            })}
          </svg>
          {selectedModel ? (
            <div className="medical-3d-page__selection">
              <strong>{selectedModel.label}</strong>
              <span>{selectedModel.category}</span>
              <span className={`medical-3d-page__status medical-3d-page__status--${modelStatusTone(selectedModel.status)}`}>
                {modelStatusLabel(selectedModel.status)}
              </span>
            </div>
          ) : null}
        </section>

        <section className="medical-3d-page__roster" aria-label="Anatomy model roster">
          <h2>Model roster</h2>
          <div className="medical-3d-page__roster-list">
            {models.map((model) => (
              <button
                key={model.id}
                type="button"
                className={`medical-3d-page__roster-item${model.id === selectedModelId ? ' is-selected' : ''}`}
                onClick={() => setSelectedModelId(model.id)}
                {...((model.id === selectedModelId) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
              >
                <strong>{model.label}</strong>
                <span>{model.category}</span>
                <span className={`medical-3d-page__status medical-3d-page__status--${modelStatusTone(model.status)}`}>
                  {modelStatusLabel(model.status)}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
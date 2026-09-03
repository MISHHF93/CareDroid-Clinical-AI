import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiStateBanner from '../../components/ApiStateBanner';
import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';
import StateSourceNotice from '../../components/StateSourceNotice';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildFleetTrackingMarkers,
  buildIotTrackingMarkers,
  filterTrackingMarkers,
  type TrackingLayer,
  type UnifiedTrackingMarker,
} from '../../utils/liveTrackingMapModel';
import { fetchFleetLiveTrackingSnapshot } from '../../services/fleetTelemetryService';
import { fetchMedicalIotSnapshot } from '../../services/medicalIotService';
import '../LiveTrackingMap.css';

const MARKER_FILL: Record<string, string> = {
  brand: 'var(--app-chart-1)',
  action: 'var(--app-chart-4)',
  good: 'var(--app-chart-2)',
  warning: 'var(--app-chart-5)',
  critical: 'var(--app-status-critical, #ef4444)',
  neutral: 'var(--app-chart-3)',
};

export default function LiveTrackingMap() {
  useRouteChromeRegistration({ title: 'Live Tracking Map' });
  const { recordToolAccess } = useToolPreferences();
  const recordToolAccessRef = useRef(recordToolAccess);
  recordToolAccessRef.current = recordToolAccess;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markers, setMarkers] = useState<UnifiedTrackingMarker[]>([]);
  const [sourceLabel, setSourceLabel] = useState('');
  const [layer, setLayer] = useState<TrackingLayer>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [usedBackend, setUsedBackend] = useState(false);

  const loadSnapshot = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const [fleetResult, iotResult] = await Promise.all([
        fetchFleetLiveTrackingSnapshot({ signal, delayMs: 0 }),
        fetchMedicalIotSnapshot({ signal }),
      ]);
      if (signal?.aborted) return;

      const fleetMarkers = buildFleetTrackingMarkers(fleetResult.vehicles || []);
      const iotMarkers = buildIotTrackingMarkers(iotResult.snapshot?.devices || []);
      setMarkers([...fleetMarkers, ...iotMarkers]);
      setUsedBackend(Boolean(fleetResult.fromApi) || !iotResult.unsupported);
      setSourceLabel(
        [fleetResult.sourceLabel, iotResult.snapshot?.sourceLabel].filter(Boolean).join(' · ') ||
          'Demo tracking layers',
      );
      recordToolAccessRef.current('live-tracking-map');
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(
        loadError instanceof Error ? loadError.message : 'Unable to load tracking map data.',
      );
      setMarkers([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSnapshot(controller.signal);
    return () => controller.abort();
  }, [loadSnapshot]);

  const visibleMarkers = useMemo(
    () => filterTrackingMarkers(markers, layer, statusFilter),
    [layer, markers, statusFilter],
  );
  const selectedMarker =
    visibleMarkers.find((marker) => marker.id === selectedMarkerId) ||
    markers.find((marker) => marker.id === selectedMarkerId) ||
    null;

  const statusOptions = useMemo(() => {
    const values = new Set(markers.map((marker) => marker.status));
    return ['all', ...values];
  }, [markers]);

  return (
    <section className="live-map-page page-container" aria-label="Live tracking map">
      <header className="live-map-page__header">
        <div className="live-map-page__title-row">
          <GraphicIconBadge iconKey="route" accent="brand" size="md" />
          <div>
            <p className="live-map-page__title-text" data-testid="cd-page-title-text">
              Live Tracking Map
            </p>
            <p>Unified fleet vehicle and Medical IoT marker canvas for operations review.</p>
          </div>
        </div>
        <div className="live-map-page__actions">
          <Link to={CANONICAL_ROUTES.fleetMap}>Fleet map</Link>
          <Link to={CANONICAL_ROUTES.medicalIot}>Medical IoT</Link>
          <Link to={CANONICAL_ROUTES.hospitalMap}>Hospital map</Link>
          <button type="button" onClick={() => void loadSnapshot()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh map'}
          </button>
        </div>
      </header>

      <ClinicalDecisionSupportDisclaimer variant="fleet" />
      <StateSourceNotice
        title="Tracking source state"
        states={
          usedBackend
            ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.UNSUPPORTED]
            : [
                DEMO_LIVE_STATES.DEMO,
                DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
                DEMO_LIVE_STATES.UNSUPPORTED,
              ]
        }
        details={sourceLabel}
      />

      <div className="live-map-page__filters" role="group" aria-label="Map layer filters">
        {(['all', 'fleet', 'iot'] as TrackingLayer[]).map((value) => (
          <button
            key={value}
            type="button"
            {...(layer === value
              ? { 'aria-pressed': 'true' as const }
              : { 'aria-pressed': 'false' as const })}
            onClick={() => setLayer(value)}
          >
            {value === 'all' ? 'All layers' : value === 'fleet' ? 'Fleet' : 'Medical IoT'}
          </button>
        ))}
        {statusOptions.map((value) => (
          <button
            key={value}
            type="button"
            {...(statusFilter === value
              ? { 'aria-pressed': 'true' as const }
              : { 'aria-pressed': 'false' as const })}
            onClick={() => setStatusFilter(value)}
          >
            {value === 'all' ? 'All statuses' : value}
          </button>
        ))}
      </div>

      <ApiStateBanner
        loading={loading}
        loadingMessage="Loading live tracking markers…"
        error={error}
        onRetry={() => void loadSnapshot()}
      />

      {!loading && !error ? (
        <div className="live-map__layout">
          <section className="live-map__map-shell" aria-label="Unified tracking canvas">
            <div
              className="live-map-canvas"
              role="group"
              aria-label="Fleet and IoT tracking map — contains selectable markers"
            >
              <svg
                viewBox="0 0 100 100"
                className="live-map-canvas__svg"
                preserveAspectRatio="xMidYMid meet"
              >
                {visibleMarkers.map((marker) => {
                  const selected = marker.id === selectedMarkerId;
                  return (
                    <g
                      key={marker.id}
                      className={`live-map-canvas__marker live-map-canvas__marker--${marker.layer}${
                        selected ? ' live-map-canvas__marker--selected' : ''
                      }`}
                      transform={`translate(${marker.x} ${marker.y})`}
                      onClick={() => setSelectedMarkerId(marker.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${marker.label}, ${marker.layer} layer`}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedMarkerId(marker.id);
                        }
                      }}
                    >
                      <circle
                        r="2.2"
                        fill={MARKER_FILL[marker.layer === 'fleet' ? 'brand' : 'good']}
                      />
                      <text x="2.8" y="1">
                        {marker.layer === 'fleet' ? 'F' : 'I'}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            {selectedMarker ? (
              <p className="live-map__state">
                <strong>{selectedMarker.label}</strong> — {selectedMarker.subtitle}
              </p>
            ) : (
              <p className="live-map__state">Select a marker to inspect tracking context.</p>
            )}
          </section>

          <aside className="live-map__panel" aria-label="Tracking marker roster">
            <h2>Tracked assets</h2>
            <div className="live-map__marker-list">
              {visibleMarkers.length ? (
                visibleMarkers.map((marker) => (
                  <button
                    key={marker.id}
                    type="button"
                    className={`live-map__marker-item${
                      marker.id === selectedMarkerId ? ' live-map__marker-item--selected' : ''
                    }`}
                    onClick={() => setSelectedMarkerId(marker.id)}
                  >
                    <strong>{marker.label}</strong>
                    <span>
                      {marker.layer.toUpperCase()} · {marker.status}
                    </span>
                    <small>{marker.subtitle}</small>
                  </button>
                ))
              ) : (
                <p className="live-map__state">No markers match the current filters.</p>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

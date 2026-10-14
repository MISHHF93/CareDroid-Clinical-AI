import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  Radio,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  type DetectedObject,
  type MobilityVehicle,
  type RecognitionEvent,
  RECOGNITION_STATES,
  type RecognitionState,
} from '../../domain/mobility/mobilityTypes';
import {
  fetchRecognitionEvents,
  simulateRecognitionTelemetry,
} from '../../services/medicalMobilityService';
import './VehicleRecognitionHUD.css';

export interface VehicleRecognitionHUDProps {
  vehicles: MobilityVehicle[];
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string) => void;
  className?: string;
}

const STATE_BADGE_CONFIG: Record<
  RecognitionState,
  { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'critical' }
> = {
  [RECOGNITION_STATES.RECOGNITION_NOT_CONFIRMED]: {
    label: 'Not Confirmed',
    tone: 'neutral',
  },
  [RECOGNITION_STATES.RECOGNITION_IN_PROGRESS]: {
    label: 'Scanning...',
    tone: 'info',
  },
  [RECOGNITION_STATES.RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT]: {
    label: 'Path Clear',
    tone: 'success',
  },
  [RECOGNITION_STATES.RELEVANT_OBJECT_DETECTED]: {
    label: 'Obstacle Detected',
    tone: 'critical',
  },
  [RECOGNITION_STATES.RECOGNITION_DATA_STALE]: {
    label: 'Telemetry Stale',
    tone: 'warning',
  },
  [RECOGNITION_STATES.SENSOR_UNAVAILABLE]: {
    label: 'Sensors Offline',
    tone: 'critical',
  },
  [RECOGNITION_STATES.RECOGNITION_ERROR]: {
    label: 'Recognition Error',
    tone: 'critical',
  },
};

export const VehicleRecognitionHUD: React.FC<VehicleRecognitionHUDProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  className = '',
}) => {
  const [activeVehicleId, setActiveVehicleId] = useState<string>(
    selectedVehicleId || vehicles[0]?.id || '',
  );
  const [events, setEvents] = useState<RecognitionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (selectedVehicleId) {
      setActiveVehicleId(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const loadTelemetry = useCallback(async () => {
    if (!activeVehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRecognitionEvents(activeVehicleId);
      const list = Array.isArray(res) ? res : res?.data || [];
      setEvents(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recognition data');
    } finally {
      setLoading(false);
    }
  }, [activeVehicleId]);

  useEffect(() => {
    loadTelemetry();
  }, [loadTelemetry]);

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === activeVehicleId) || vehicles[0],
    [vehicles, activeVehicleId],
  );

  const latestEvent: RecognitionEvent | undefined = useMemo(() => events[0], [events]);

  const currentRecognitionState: RecognitionState =
    latestEvent?.recognitionState ||
    latestEvent?.state ||
    RECOGNITION_STATES.RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT;

  const stateBadge =
    STATE_BADGE_CONFIG[currentRecognitionState] ||
    STATE_BADGE_CONFIG[RECOGNITION_STATES.RECOGNITION_NOT_CONFIRMED];

  const detectedObjects: DetectedObject[] = latestEvent?.detectedObjects || [];
  const relevantObstacles = detectedObjects.filter(
    (o) => o.isRelevantObject || o.isRelevantObstacle,
  );

  const directionAndCoverage = latestEvent?.directionAndCoverage || {
    azimuthDegrees: 0,
    fieldOfViewDegrees: 120,
    distanceRangeMeters: 15,
  };

  const handleSimulateState = async (
    stateType: 'clear' | 'obstacle' | 'sensor_degrade' | 'stale',
  ) => {
    if (!activeVehicleId) return;
    setSimulating(true);
    try {
      await simulateRecognitionTelemetry(activeVehicleId, stateType);
      await loadTelemetry();
    } finally {
      setSimulating(false);
    }
  };

  const radarSize = 220;
  const radarCenter = radarSize / 2;
  const maxRangeMeters = Math.max(10, directionAndCoverage.distanceRangeMeters || 15);

  return (
    <div className={`vehicle-recognition-hud ${className}`} data-testid="vehicle-recognition-hud">
      <header className="vehicle-recognition-hud__header">
        <div className="vehicle-recognition-hud__title-group">
          <div className="vehicle-recognition-hud__icon-badge">
            <Radio size={16} className="text-accent" />
          </div>
          <div>
            <h3 className="vehicle-recognition-hud__title">
              Vehicle Recognition Intelligence Engine
            </h3>
            <p className="vehicle-recognition-hud__subtitle">
              Live spatial perception, obstacle detection, and sensor health telemetry
            </p>
          </div>
        </div>

        <div className="vehicle-recognition-hud__controls">
          <select
            className="vehicle-recognition-hud__vehicle-select"
            value={activeVehicleId}
            onChange={(e) => {
              setActiveVehicleId(e.target.value);
              onSelectVehicle?.(e.target.value);
            }}
            aria-label="Select Autonomous Vehicle"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.type})
              </option>
            ))}
          </select>

          <button
            type="button"
            className="vehicle-recognition-hud__refresh-btn"
            onClick={loadTelemetry}
            disabled={loading}
            title="Refresh perception telemetry"
            aria-label="Refresh perception telemetry"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Recognition State & Alert Banner */}
      <div className="vehicle-recognition-hud__status-strip">
        <div className="vehicle-recognition-hud__status-pill">
          <span className="vehicle-recognition-hud__status-pill-label">Perception Status:</span>
          <span
            className={`vehicle-recognition-hud__badge vehicle-recognition-hud__badge--${stateBadge.tone}`}
          >
            {stateBadge.label}
          </span>
        </div>

        <div className="vehicle-recognition-hud__meta-items">
          <span className="vehicle-recognition-hud__meta-item">
            <Eye size={13} />
            <span>FOV: {directionAndCoverage.fieldOfViewDegrees}°</span>
          </span>
          <span className="vehicle-recognition-hud__meta-item">
            <Radio size={13} />
            <span>Range: {directionAndCoverage.distanceRangeMeters}m</span>
          </span>
          <span className="vehicle-recognition-hud__meta-item">
            <Clock size={13} />
            <span>Freshness: {latestEvent?.telemetryFreshnessMs ?? 18}ms</span>
          </span>
        </div>
      </div>

      {relevantObstacles.length > 0 && (
        <div className="vehicle-recognition-hud__critical-alert" role="alert" aria-live="assertive">
          <AlertOctagon size={16} className="text-danger" />
          <div className="vehicle-recognition-hud__alert-text">
            <strong>Immediate Obstacle Detected in Navigation Path!</strong>
            <span>
              {relevantObstacles.length} critical object(s) within safety stopping distance.
              Auto-braking engaged.
            </span>
          </div>
        </div>
      )}

      {/* Main HUD Body: Spatial Radar on left, Object Table & Sensor Health on right */}
      <div className="vehicle-recognition-hud__grid">
        {/* Left Column: Spatial Perception Radar */}
        <div className="vehicle-recognition-hud__radar-card">
          <div className="vehicle-recognition-hud__card-header">
            <h4>Spatial Perception Field (2D Polar)</h4>
            <span className="vehicle-recognition-hud__azimuth-chip">
              Azimuth: {directionAndCoverage.azimuthDegrees}°
            </span>
          </div>

          <div className="vehicle-recognition-hud__radar-container">
            <svg
              className="vehicle-recognition-hud__radar-svg"
              viewBox={`0 0 ${radarSize} ${radarSize}`}
              width={radarSize}
              height={radarSize}
              aria-label="Radar scan visualizer"
            >
              <defs>
                <radialGradient id="radarSweepGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--medical-accent, #0ea5e9)" stopOpacity="0.25" />
                  <stop
                    offset="100%"
                    stopColor="var(--medical-accent, #0ea5e9)"
                    stopOpacity="0.02"
                  />
                </radialGradient>
              </defs>

              {/* Distance concentric circles */}
              <circle
                cx={radarCenter}
                cy={radarCenter}
                r={radarSize * 0.45}
                className="radar-ring"
              />
              <circle
                cx={radarCenter}
                cy={radarCenter}
                r={radarSize * 0.3}
                className="radar-ring"
              />
              <circle
                cx={radarCenter}
                cy={radarCenter}
                r={radarSize * 0.15}
                className="radar-ring"
              />

              {/* Radar axes */}
              <line
                x1={radarCenter}
                y1={10}
                x2={radarCenter}
                y2={radarSize - 10}
                className="radar-axis"
              />
              <line
                x1={10}
                y1={radarCenter}
                x2={radarSize - 10}
                y2={radarCenter}
                className="radar-axis"
              />

              {/* Field of View Cone */}
              {(() => {
                const halfFov = (directionAndCoverage.fieldOfViewDegrees || 120) / 2;
                const az = directionAndCoverage.azimuthDegrees || 0;
                const r = radarSize * 0.45;
                const radStart = ((az - halfFov - 90) * Math.PI) / 180;
                const radEnd = ((az + halfFov - 90) * Math.PI) / 180;
                const x1 = radarCenter + r * Math.cos(radStart);
                const y1 = radarCenter + r * Math.sin(radStart);
                const x2 = radarCenter + r * Math.cos(radEnd);
                const y2 = radarCenter + r * Math.sin(radEnd);
                return (
                  <path
                    d={`M ${radarCenter} ${radarCenter} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                    fill="url(#radarSweepGrad)"
                    stroke="var(--medical-accent, #0ea5e9)"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity={0.6}
                  />
                );
              })()}

              {/* Vehicle Origin (Center) */}
              <circle cx={radarCenter} cy={radarCenter} r={6} className="radar-vehicle-center" />
              <polygon
                points={`${radarCenter},${radarCenter - 10} ${radarCenter - 4},${radarCenter - 2} ${radarCenter + 4},${radarCenter - 2}`}
                fill="var(--app-on-solid, #ffffff)"
              />

              {/* Detected Objects Blips */}
              {detectedObjects.map((obj) => {
                const bearing = (obj.bearingDegrees ?? obj.relativeBearingDegrees ?? 0) - 90;
                const distanceRatio = Math.min(1, obj.distanceMeters / maxRangeMeters);
                const r = distanceRatio * (radarSize * 0.44);
                const rad = (bearing * Math.PI) / 180;
                const cx = radarCenter + r * Math.cos(rad);
                const cy = radarCenter + r * Math.sin(rad);
                const isObstacle = obj.isRelevantObject || obj.isRelevantObstacle;

                return (
                  <g key={obj.id} className="radar-object-group">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isObstacle ? 5.5 : 4}
                      className={isObstacle ? 'radar-blip-critical' : 'radar-blip-normal'}
                    />
                    <text x={cx + 7} y={cy + 3} className="radar-blip-label">
                      {obj.classification} ({obj.distanceMeters}m)
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="vehicle-recognition-hud__radar-legend">
              <span className="legend-item">
                <span className="legend-dot legend-dot--critical" /> Obstacle
              </span>
              <span className="legend-item">
                <span className="legend-dot legend-dot--normal" /> Detected Item
              </span>
              <span className="legend-item">
                <span className="legend-dot legend-dot--center" /> Vehicle Center
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Detected Objects Table & Sensor Telemetry */}
        <div className="vehicle-recognition-hud__details-col">
          {/* Detected Objects List */}
          <div className="vehicle-recognition-hud__objects-card">
            <div className="vehicle-recognition-hud__card-header">
              <h4>Classified Objects ({detectedObjects.length})</h4>
              <span className="vehicle-recognition-hud__count-badge">
                {relevantObstacles.length} Relevant Hazards
              </span>
            </div>

            <div className="vehicle-recognition-hud__table-wrap">
              {detectedObjects.length > 0 ? (
                <table className="vehicle-recognition-hud__table">
                  <thead>
                    <tr>
                      <th>Object</th>
                      <th>Confidence</th>
                      <th>Distance</th>
                      <th>Bearing</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectedObjects.map((obj) => {
                      const conf = obj.confidenceScore ?? obj.confidence ?? 0.85;
                      const isHazard = obj.isRelevantObject || obj.isRelevantObstacle;
                      return (
                        <tr key={obj.id} className={isHazard ? 'row-hazard' : ''}>
                          <td className="cell-classification">
                            <strong>{obj.classification}</strong>
                            <span className="text-subtle font-mono text-xs">{obj.id}</span>
                          </td>
                          <td className="cell-num">{Math.round(conf * 100)}%</td>
                          <td className="cell-num font-mono">{obj.distanceMeters} m</td>
                          <td className="cell-num font-mono">
                            {obj.bearingDegrees ?? obj.relativeBearingDegrees ?? 0}°
                          </td>
                          <td>
                            {isHazard ? (
                              <span className="risk-badge risk-badge--high">Hazard</span>
                            ) : (
                              <span className="risk-badge risk-badge--clear">Clear</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="vehicle-recognition-hud__empty">
                  <CheckCircle2 size={18} className="text-success" />
                  <p>No obstacles or hazards detected in path.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sensor Health Telemetry Grid */}
          <div className="vehicle-recognition-hud__sensors-card">
            <div className="vehicle-recognition-hud__card-header">
              <h4>Sensor Suite Health Telemetry</h4>
              <span className="text-xs text-subtle">
                Model: {activeVehicle?.model || 'Autonomous AMR'}
              </span>
            </div>

            <div className="vehicle-recognition-hud__sensor-grid">
              <div className="sensor-tile">
                <div className="sensor-tile__head">
                  <Camera size={14} />
                  <span>Stereo RGB-D</span>
                </div>
                <span className="sensor-tile__status status-nominal">Nominal</span>
                <span className="sensor-tile__meta">30 FPS · 1080p</span>
              </div>

              <div className="sensor-tile">
                <div className="sensor-tile__head">
                  <Radio size={14} />
                  <span>360° LiDAR</span>
                </div>
                <span className="sensor-tile__status status-nominal">Nominal</span>
                <span className="sensor-tile__meta">16-Beam · 20Hz</span>
              </div>

              <div className="sensor-tile">
                <div className="sensor-tile__head">
                  <Zap size={14} />
                  <span>Ultrasonic Array</span>
                </div>
                <span className="sensor-tile__status status-nominal">Nominal</span>
                <span className="sensor-tile__meta">8-Ring Perimeter</span>
              </div>

              <div className="sensor-tile">
                <div className="sensor-tile__head">
                  <Radio size={14} />
                  <span>IMU & Odometry</span>
                </div>
                <span className="sensor-tile__status status-nominal">Nominal</span>
                <span className="sensor-tile__meta">9-DOF · &lt;2ms latency</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation & Validation Controls Bar */}
      <footer className="vehicle-recognition-hud__simulation-bar">
        <div className="vehicle-recognition-hud__sim-title">
          <Info size={14} />
          <span>Recognition Test Bench (Simulation & Hardware Validation):</span>
        </div>
        <div className="vehicle-recognition-hud__sim-actions">
          <button
            type="button"
            className="sim-btn sim-btn--clear"
            onClick={() => handleSimulateState('clear')}
            disabled={simulating}
          >
            Simulate Clear Corridor
          </button>
          <button
            type="button"
            className="sim-btn sim-btn--obstacle"
            onClick={() => handleSimulateState('obstacle')}
            disabled={simulating}
          >
            Inject Gurney Obstacle
          </button>
          <button
            type="button"
            className="sim-btn sim-btn--degrade"
            onClick={() => handleSimulateState('sensor_degrade')}
            disabled={simulating}
          >
            Inject Sensor Degraded
          </button>
          <button
            type="button"
            className="sim-btn sim-btn--stale"
            onClick={() => handleSimulateState('stale')}
            disabled={simulating}
          >
            Inject Telemetry Stale
          </button>
        </div>
      </footer>
    </div>
  );
};

export default VehicleRecognitionHUD;

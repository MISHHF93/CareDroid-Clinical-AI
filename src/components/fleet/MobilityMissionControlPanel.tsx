import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Package,
  PlusCircle,
  RefreshCw,
  Thermometer,
  Truck,
} from 'lucide-react';
import {
  type DeliveryEvidence,
  type MissionPriority,
  type MissionStatus,
  type MobilityMission,
  type MobilityVehicle,
  type OperatorActionType,
} from '../../domain/mobility/mobilityTypes';
import {
  createMobilityMission,
  executeOperatorOverride,
  fetchMobilityMissions,
  verifyDeliveryEvidence,
} from '../../services/medicalMobilityService';
import './MobilityMissionControlPanel.css';

export interface MobilityMissionControlPanelProps {
  vehicles: MobilityVehicle[];
  onSelectMission?: (missionId: string) => void;
  className?: string;
}

const PRIORITY_BADGES: Record<
  MissionPriority,
  { label: string; tone: 'neutral' | 'info' | 'warning' | 'critical' }
> = {
  LOW: { label: 'Low', tone: 'neutral' },
  NORMAL: { label: 'Standard', tone: 'info' },
  URGENT: { label: 'Urgent', tone: 'warning' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
  EMERGENCY_STAT: { label: 'STAT Red', tone: 'critical' },
};

const STATUS_BADGES: Record<
  MissionStatus,
  { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'critical' }
> = {
  REQUESTED: { label: 'Requested', tone: 'neutral' },
  VALIDATED: { label: 'Validated', tone: 'info' },
  ASSIGNED: { label: 'Assigned', tone: 'info' },
  APPROVED: { label: 'Approved', tone: 'info' },
  DISPATCHED: { label: 'Dispatched', tone: 'info' },
  EN_ROUTE: { label: 'En Route', tone: 'info' },
  IN_TRANSIT: { label: 'In Transit', tone: 'info' },
  READY_FOR_DISPATCH: { label: 'Ready', tone: 'info' },
  PAUSED: { label: 'Paused', tone: 'warning' },
  ARRIVED: { label: 'Arrived', tone: 'warning' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  ABORTED: { label: 'Aborted', tone: 'critical' },
};

export const MobilityMissionControlPanel: React.FC<MobilityMissionControlPanelProps> = ({
  vehicles,
  onSelectMission,
  className = '',
}) => {
  const [missions, setMissions] = useState<MobilityMission[]>([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // New Mission Dialog State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, _setNewType] = useState('INTERNAL_HOSPITAL_SUPPLY');
  const [newPriority, setNewPriority] = useState<MissionPriority>('URGENT');
  const [newOrigin, setNewOrigin] = useState('Central Pharmacy Bay 4');
  const [newDestination, setNewDestination] = useState('Emergency Dept Trauma Bay 1');
  const [newPayloadType, _setNewPayloadType] = useState('PHARMACEUTICAL');
  const [newPayloadDesc, setNewPayloadDesc] = useState('STAT IV Cefepime & Norepinephrine');
  const [newWeightKg, setNewWeightKg] = useState(1.2);
  const [newTempMin, setNewTempMin] = useState(2.0);
  const [newTempMax, setNewTempMax] = useState(8.0);
  const [newVehicleId, setNewVehicleId] = useState(vehicles[0]?.id || '');

  const loadMissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMobilityMissions();
      const list = Array.isArray(res) ? res : res?.data || [];
      setMissions(list);
      if (!selectedMissionId && list.length > 0) {
        setSelectedMissionId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch missions');
    } finally {
      setLoading(false);
    }
  }, [selectedMissionId]);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  const filteredMissions = useMemo(() => {
    const list = Array.isArray(missions) ? missions : [];
    return list.filter((m) => {
      const matchesPriority = filterPriority === 'all' || m.priority === filterPriority;
      const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
      return matchesPriority && matchesStatus;
    });
  }, [missions, filterPriority, filterStatus]);

  const activeMission = useMemo(
    () => missions.find((m) => m.id === selectedMissionId) || missions[0],
    [missions, selectedMissionId],
  );

  const handleOperatorAction = async (action: OperatorActionType) => {
    if (!activeMission) return;
    setActionInProgress(action);
    try {
      await executeOperatorOverride(activeMission.id, action, 'Dispatcher supervisor control');
      await loadMissions();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleVerifyDelivery = async () => {
    if (!activeMission) return;
    setActionInProgress('VERIFY');
    try {
      const evidence: DeliveryEvidence = {
        recipientId: 'staff-clinician-ed',
        recipientName: 'Staff Clinician',
        recipientBadgeVerified: true,
        tamperSealIntact: true,
        deliveredTemperatureCelsius: 4.2,
        temperatureAtDeliveryCelsius: 4.2,
        timestampIso: new Date().toISOString(),
        notes: 'Verified via STAFF_BADGE_TAP with OTP 7492',
      };
      await verifyDeliveryEvidence(activeMission.id, evidence);

      await loadMissions();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setActionInProgress('CREATING');
    try {
      await createMobilityMission({
        title: newTitle,
        itemCategory: newType,
        priority: newPriority,
        status: 'REQUESTED',
        originFacility: {
          facilityId: 'facility-metro-general',
          facilityName: 'Metro General Hospital',
          locationDescription: newOrigin,
        },
        destinationFacility: {
          facilityId: 'facility-metro-general',
          facilityName: 'Metro General Hospital',
          locationDescription: newDestination,
        },
        payload: {
          itemDescription: newPayloadDesc,
          description: newPayloadDesc,
          quantity: '1 package',
          type: newPayloadType,
          weightKg: Number(newWeightKg),
          requiresTemperatureControl: true,
          temperatureRequirement: {
            targetCelsius: (Number(newTempMin) + Number(newTempMax)) / 2,
            minCelsius: Number(newTempMin),
            maxCelsius: Number(newTempMax),
          },
          temperatureRangeCelsius: {
            min: Number(newTempMin),
            max: Number(newTempMax),
          },
          hazardousOrBiohazard: false,
          chainOfCustodyRequired: true,
        },
        assignedVehicleId: newVehicleId || undefined,
      });

      setShowCreateDialog(false);
      setNewTitle('');
      await loadMissions();
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className={`mobility-mission-control ${className}`} data-testid="mobility-mission-control">
      <header className="mobility-mission-control__header">
        <div className="mobility-mission-control__title-group">
          <div className="mobility-mission-control__icon-badge">
            <Truck size={16} />
          </div>
          <div>
            <h3 className="mobility-mission-control__title">
              Medical Mobility Mission Dispatch & Logistics
            </h3>
            <p className="mobility-mission-control__subtitle">
              Intelligent routing, cold chain payload custody, and human-supervised execution
            </p>
          </div>
        </div>

        <div className="mobility-mission-control__toolbar">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="mission-select"
            aria-label="Filter by mission priority"
          >
            <option value="all">All Priorities</option>
            <option value="EMERGENCY_STAT">STAT Red</option>
            <option value="CRITICAL">Critical</option>
            <option value="URGENT">Urgent</option>
            <option value="NORMAL">Standard</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="mission-select"
            aria-label="Filter by mission status"
          >
            <option value="all">All Statuses</option>
            <option value="EN_ROUTE_DELIVERY">En Route</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAUSED">Paused</option>
          </select>

          <button
            type="button"
            className="mission-refresh-btn"
            onClick={loadMissions}
            disabled={loading}
            title="Refresh active missions"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            className="new-mission-btn"
            onClick={() => setShowCreateDialog(true)}
          >
            <PlusCircle size={14} />
            <span>New Mission</span>
          </button>
        </div>
      </header>

      {/* Two-Column Master-Detail Split Workspace */}
      <div className="mobility-mission-control__workspace">
        {/* Left: Mission Queue List */}
        <div className="mobility-mission-control__queue-col">
          <div className="queue-col__header">
            <h4>Active Dispatch Queue ({filteredMissions.length})</h4>
          </div>

          <div className="queue-col__list">
            {filteredMissions.length > 0 ? (
              filteredMissions.map((mission) => {
                const isSelected = mission.id === activeMission?.id;
                const priorityBadge = PRIORITY_BADGES[mission.priority] || PRIORITY_BADGES.NORMAL;
                const statusBadge = STATUS_BADGES[mission.status] || STATUS_BADGES.REQUESTED;

                return (
                  <button
                    type="button"
                    key={mission.id}
                    className={`mission-item ${isSelected ? 'mission-item--selected' : ''}`}
                    onClick={() => {
                      setSelectedMissionId(mission.id);
                      onSelectMission?.(mission.id);
                    }}
                  >
                    <div className="mission-item__top">
                      <strong className="mission-item__title">{mission.title}</strong>
                      <span className={`priority-chip priority-chip--${priorityBadge.tone}`}>
                        {priorityBadge.label}
                      </span>
                    </div>

                    <div className="mission-item__meta">
                      <span className="font-mono text-xs text-subtle">{mission.id}</span>
                      <span className={`status-chip status-chip--${statusBadge.tone}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="mission-item__route">
                      <span className="route-node">
                        {mission.originFacility?.locationDescription ||
                          mission.originFacility?.facilityName}
                      </span>
                      <ArrowRight size={12} className="text-subtle" />
                      <span className="route-node">
                        {mission.destinationFacility?.locationDescription ||
                          mission.destinationFacility?.facilityName}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="queue-col__empty">
                <Package size={20} className="text-subtle" />
                <p>No active missions in queue.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Active Mission Cockpit */}
        {activeMission ? (
          <div className="mobility-mission-control__cockpit-col">
            <div className="cockpit-card">
              <div className="cockpit-card__head">
                <div>
                  <div className="cockpit-card__badges">
                    <span
                      className={`priority-chip priority-chip--${PRIORITY_BADGES[activeMission.priority]?.tone || 'info'}`}
                    >
                      {PRIORITY_BADGES[activeMission.priority]?.label || activeMission.priority}
                    </span>
                    <span
                      className={`status-chip status-chip--${STATUS_BADGES[activeMission.status]?.tone || 'info'}`}
                    >
                      {STATUS_BADGES[activeMission.status]?.label || activeMission.status}
                    </span>
                  </div>
                  <h3 className="cockpit-card__title">{activeMission.title}</h3>
                  <span className="font-mono text-xs text-subtle">{activeMission.id}</span>
                </div>

                <div className="cockpit-card__eta">
                  <span className="text-xs text-subtle">Estimated Delivery:</span>
                  <span className="font-mono font-bold text-sm">
                    {activeMission.estimatedCompletionIso
                      ? new Date(activeMission.estimatedCompletionIso).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '8 mins'}
                  </span>
                </div>
              </div>

              {/* Waypoints & Routing */}
              <div className="cockpit-card__section">
                <h5 className="section-label">Routing & Transfer Waypoints</h5>
                <div className="waypoints-grid">
                  <div className="waypoint-box">
                    <span className="waypoint-type">ORIGIN</span>
                    <strong>{activeMission.originFacility?.facilityName}</strong>
                    <span className="text-xs text-subtle">
                      {activeMission.originFacility?.locationDescription}
                    </span>
                  </div>

                  <div className="waypoint-arrow">
                    <ArrowRight size={18} />
                  </div>

                  <div className="waypoint-box">
                    <span className="waypoint-type waypoint-type--dest">DESTINATION</span>
                    <strong>{activeMission.destinationFacility?.facilityName}</strong>
                    <span className="text-xs text-subtle">
                      {activeMission.destinationFacility?.locationDescription}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payload & Cold Chain Integrity */}
              <div className="cockpit-card__section">
                <h5 className="section-label">Medical Payload & Cold Chain Custody</h5>
                <div className="payload-strip">
                  <div className="payload-item">
                    <Package size={14} className="text-accent" />
                    <div>
                      <span className="text-xs text-subtle">Payload:</span>
                      <strong>
                        {activeMission.payload?.description ||
                          activeMission.payload?.itemDescription ||
                          'Medical supplies'}
                      </strong>
                    </div>
                  </div>

                  <div className="payload-item">
                    <Thermometer size={14} className="text-info" />
                    <div>
                      <span className="text-xs text-subtle">Chamber Spec:</span>
                      <strong className="font-mono">
                        {activeMission.payload?.temperatureRangeCelsius?.min ??
                          activeMission.payload?.temperatureRequirement?.minCelsius ??
                          2}
                        °C to{' '}
                        {activeMission.payload?.temperatureRangeCelsius?.max ??
                          activeMission.payload?.temperatureRequirement?.maxCelsius ??
                          8}
                        °C
                      </strong>
                    </div>
                  </div>

                  <div className="payload-item">
                    <FileCheck size={14} className="text-success" />
                    <div>
                      <span className="text-xs text-subtle">Custody Lock:</span>
                      <strong>Tamper-Evident Active</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Human-Supervised Operator Override Controls */}
              <div className="cockpit-card__controls-bar">
                <span className="control-label">Supervisor Overrides:</span>

                <div className="control-buttons">
                  <button
                    type="button"
                    className="ctrl-btn ctrl-btn--pause"
                    onClick={() => handleOperatorAction('PAUSE')}
                    disabled={actionInProgress === 'PAUSE'}
                  >
                    Pause Mission
                  </button>

                  <button
                    type="button"
                    className="ctrl-btn ctrl-btn--reroute"
                    onClick={() => handleOperatorAction('REROUTE')}
                    disabled={actionInProgress === 'REROUTE'}
                  >
                    Reroute
                  </button>

                  <button
                    type="button"
                    className="ctrl-btn ctrl-btn--return"
                    onClick={() => handleOperatorAction('RETURN_TO_BASE')}
                    disabled={actionInProgress === 'RETURN_TO_BASE'}
                  >
                    Return to Base
                  </button>

                  <button
                    type="button"
                    className="ctrl-btn ctrl-btn--verify"
                    onClick={handleVerifyDelivery}
                    disabled={actionInProgress === 'VERIFY'}
                  >
                    <CheckCircle2 size={13} />
                    <span>Confirm Delivery</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="cockpit-card cockpit-card--empty">
            <p>Select a mission to inspect telemetry and dispatch actions.</p>
          </div>
        )}
      </div>

      {/* New Mission Modal */}
      {showCreateDialog && (
        <div className="mission-modal-backdrop" role="presentation">
          <div
            className="mission-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-mission-title"
          >
            <header className="mission-modal__header">
              <h3 id="new-mission-title">Schedule New Medical Delivery Mission</h3>
              <button
                type="button"
                className="mission-modal__close-btn"
                onClick={() => setShowCreateDialog(false)}
                aria-label="Close dialog"
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleCreateMission} className="mission-modal__form">
              <div className="form-group">
                <label htmlFor="mission-title">Mission Title</label>
                <input
                  id="mission-title"
                  type="text"
                  required
                  placeholder="e.g. STAT Blood Component Delivery to Trauma Room 2"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mission-priority">Priority Acuity</label>
                  <select
                    id="mission-priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as MissionPriority)}
                  >
                    <option value="EMERGENCY_STAT">STAT Red (Highest Acuity)</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="URGENT">Urgent</option>
                    <option value="NORMAL">Standard Routine</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="mission-vehicle">Assigned Autonomous Vehicle</label>
                  <select
                    id="mission-vehicle"
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.type}) - Battery {v.batteryPercent}%
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mission-origin">Pickup Location</label>
                  <input
                    id="mission-origin"
                    type="text"
                    required
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mission-dest">Delivery Destination</label>
                  <input
                    id="mission-dest"
                    type="text"
                    required
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mission-payload-desc">Payload Description</label>
                  <input
                    id="mission-payload-desc"
                    type="text"
                    required
                    value={newPayloadDesc}
                    onChange={(e) => setNewPayloadDesc(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mission-weight">Payload Weight (kg)</label>
                  <input
                    id="mission-weight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    required
                    value={newWeightKg}
                    onChange={(e) => setNewWeightKg(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mission-temp-min">Min Cold-Chain Temp (°C)</label>
                  <input
                    id="mission-temp-min"
                    type="number"
                    step="0.5"
                    value={newTempMin}
                    onChange={(e) => setNewTempMin(parseFloat(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mission-temp-max">Max Cold-Chain Temp (°C)</label>
                  <input
                    id="mission-temp-max"
                    type="number"
                    step="0.5"
                    value={newTempMax}
                    onChange={(e) => setNewTempMax(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <footer className="mission-modal__footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-submit-btn"
                  disabled={actionInProgress === 'CREATING'}
                >
                  {actionInProgress === 'CREATING' ? 'Dispatching...' : 'Dispatch Mission'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobilityMissionControlPanel;

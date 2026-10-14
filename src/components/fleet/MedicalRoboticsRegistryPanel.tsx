import React, { useMemo, useState } from 'react';
import {
  Activity,
  Battery,
  BatteryCharging,
  Compass,
  Cpu,
  Lock,
  Search,
  Server,
  Shield,
  Thermometer,
} from 'lucide-react';
import type { MobilityVehicle } from '../../domain/mobility/mobilityTypes';
import './MedicalRoboticsRegistryPanel.css';

export interface MedicalRoboticsRegistryPanelProps {
  vehicles: MobilityVehicle[];
  selectedVehicleId?: string;
  onSelectVehicle?: (vehicleId: string) => void;
  onExecuteAction?: (vehicleId: string, action: string) => void;
  className?: string;
}

export const MedicalRoboticsRegistryPanel: React.FC<MedicalRoboticsRegistryPanelProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  onExecuteAction,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        searchQuery === '' ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        filterType === 'all' || v.type === filterType || v.vehicleType === filterType;

      const matchesStatus =
        filterStatus === 'all' || v.status === filterStatus || v.operatingStatus === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vehicles, searchQuery, filterType, filterStatus]);

  const handleAction = async (vehicleId: string, action: string) => {
    setActionInProgress(`${vehicleId}-${action}`);
    try {
      onExecuteAction?.(vehicleId, action);
    } finally {
      setTimeout(() => setActionInProgress(null), 500);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'IDLE_AVAILABLE':
      case 'AVAILABLE':
        return <span className="status-badge status-badge--available">Available</span>;
      case 'ACTIVE_MISSION':
      case 'EN_ROUTE':
        return <span className="status-badge status-badge--active">Active Mission</span>;
      case 'CHARGING':
        return <span className="status-badge status-badge--charging">Charging</span>;
      case 'MAINTENANCE':
        return <span className="status-badge status-badge--maintenance">Maintenance</span>;
      default:
        return <span className="status-badge status-badge--neutral">{status}</span>;
    }
  };

  const getProtocolBadge = (protocol?: string) => {
    const p = protocol || 'ROS_2_DDS';
    if (p.includes('ROS')) return <span className="proto-tag proto-tag--ros">ROS 2 DDS</span>;
    if (p.includes('REST') || p.includes('MQTT'))
      return <span className="proto-tag proto-tag--bridge">REST / MQTT</span>;
    if (p.includes('CAN')) return <span className="proto-tag proto-tag--can">CAN-FD</span>;
    return <span className="proto-tag">{p}</span>;
  };

  return (
    <div
      className={`medical-robotics-registry ${className}`}
      data-testid="medical-robotics-registry"
    >
      <header className="medical-robotics-registry__header">
        <div className="medical-robotics-registry__title-group">
          <div className="medical-robotics-registry__icon-badge">
            <Cpu size={16} />
          </div>
          <div>
            <h3 className="medical-robotics-registry__title">
              Medical Robotics & Autonomous Fleet Registry
            </h3>
            <p className="medical-robotics-registry__subtitle">
              Connected hospital AMRs, delivery drones, and autonomous ground platforms
            </p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="medical-robotics-registry__toolbar">
          <div className="medical-robotics-registry__search">
            <Search size={14} className="search-icon" />
            <input
              type="search"
              placeholder="Filter robot, model, VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter robotics registry"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="registry-select"
            aria-label="Filter by vehicle type"
          >
            <option value="all">All Vehicle Types</option>
            <option value="INTERNAL_HOSPITAL_AMR">Indoor AMR</option>
            <option value="DELIVERY_DRONE">Medical Drone</option>
            <option value="AUTONOMOUS_GROUND_VEHICLE">Ground Rover</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="registry-select"
            aria-label="Filter by operational status"
          >
            <option value="all">All Statuses</option>
            <option value="IDLE_AVAILABLE">Available</option>
            <option value="ACTIVE_MISSION">On Mission</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </header>

      {/* Registry Grid */}
      <div className="medical-robotics-registry__grid">
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((vehicle) => {
            const isSelected = vehicle.id === selectedVehicleId;
            const connectivityObj =
              typeof vehicle.connectivity === 'object' ? vehicle.connectivity : null;
            const latency = connectivityObj?.latencyMs ?? 16;
            const protocol = connectivityObj?.protocol || vehicle.hardwareIntegrationType;
            const temp = vehicle.temperatureChamber;

            return (
              <div
                key={vehicle.id}
                role="button"
                tabIndex={0}
                aria-label={`Select vehicle ${vehicle.name}`}
                aria-pressed={isSelected}
                className={`robot-card ${isSelected ? 'robot-card--selected' : ''}`}
                onClick={() => onSelectVehicle?.(vehicle.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectVehicle?.(vehicle.id);
                  }
                }}
              >
                <div className="robot-card__top">
                  <div className="robot-card__info">
                    <div className="robot-card__name-row">
                      <strong className="robot-card__name">{vehicle.name}</strong>
                      {getStatusBadge(vehicle.status)}
                    </div>
                    <span className="robot-card__spec text-subtle">
                      {vehicle.manufacturer} · {vehicle.model}
                    </span>
                    <span className="robot-card__id font-mono text-xs">{vehicle.id}</span>
                  </div>

                  <div className="robot-card__energy">
                    <div className="energy-pill">
                      {vehicle.batteryPercent < 25 ? (
                        <Battery size={14} className="text-danger" />
                      ) : (
                        <BatteryCharging size={14} className="text-success" />
                      )}
                      <span className="font-mono font-bold">{vehicle.batteryPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Telemetry Chips */}
                <div className="robot-card__telemetry-strip">
                  <div className="telemetry-chip">
                    <Compass size={12} />
                    <span>
                      {vehicle.currentLocation?.areaOrFloor ||
                        vehicle.currentLocation?.facilityId ||
                        'Bay Dock'}
                    </span>
                  </div>

                  {temp && (
                    <div
                      className={`telemetry-chip ${temp.inRange !== false ? 'telemetry-chip--cold' : 'telemetry-chip--warn'}`}
                      title={`Cold chain chamber: ${temp.currentCelsius}°C`}
                    >
                      <Thermometer size={12} />
                      <span className="font-mono">{temp.currentCelsius}°C</span>
                    </div>
                  )}

                  <div className="telemetry-chip" title="Hardware protocol and bus latency">
                    {getProtocolBadge(protocol)}
                    <span className="latency-val font-mono">{latency}ms</span>
                  </div>
                </div>

                {/* Operating Mode and Safety Controls */}
                <div className="robot-card__footer">
                  <div className="robot-card__mode">
                    <span className="text-xs text-subtle">Mode:</span>
                    <span className="font-bold text-xs font-mono">{vehicle.operatingMode}</span>
                  </div>

                  <div className="robot-card__actions">
                    <button
                      type="button"
                      className={`action-btn ${vehicle.safetyInterlockEngaged ? 'action-btn--interlock-active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(
                          vehicle.id,
                          vehicle.safetyInterlockEngaged ? 'DISENGAGE_ESTOP' : 'ENGAGE_ESTOP',
                        );
                      }}
                      title={
                        vehicle.safetyInterlockEngaged
                          ? 'Emergency Stop is ENGAGED. Click to release interlock.'
                          : 'Engage Emergency Interlock E-Stop'
                      }
                      aria-label="Toggle Safety Interlock"
                    >
                      {vehicle.safetyInterlockEngaged ? (
                        <>
                          <Lock size={12} />
                          <span>E-Stop Active</span>
                        </>
                      ) : (
                        <>
                          <Shield size={12} />
                          <span>E-Stop Ready</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="action-btn action-btn--secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(vehicle.id, 'DIAGNOSTIC_PING');
                      }}
                      disabled={actionInProgress === `${vehicle.id}-DIAGNOSTIC_PING`}
                      title="Run ROS 2 / Node Diagnostic Self-Test"
                    >
                      <Activity size={12} />
                      <span>Ping</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="medical-robotics-registry__empty">
            <Server size={24} className="text-subtle" />
            <p>No autonomous platforms match current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRoboticsRegistryPanel;

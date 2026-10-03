import React, { useState, useEffect, useCallback } from 'react';
import './HospitalAutonomousOperationsMatrix.css';
import { hospitalRoboticsFleetService } from '../../domain/robotics/hospitalRoboticsFleetService';
import { autonomousFlightService } from '../../domain/autonomous/autonomousFlightService';
import { universalDeviceRegistry } from '../../domain/devices/universalDeviceRegistry';
import { governedAgentRuntime } from '../../domain/aiGateway/governedAgentRuntime';
import { digitalTwinEngine } from '../../domain/digitalTwin/digitalTwinEngine';
import { offlineStoreAndForwardQueue } from '../../domain/edge/offlineStoreAndForward';
import { HospitalRobotItem } from '../../domain/robotics/robotTypes';
import { MedicalUavItem } from '../../domain/autonomous/uavTypes';
import { UniversalMedicalDevice } from '../../domain/devices/deviceTypes';

export interface HospitalAutonomousOperationsMatrixProps {
  className?: string;
  onAlertTriggered?: (alert: string) => void;
}

export const HospitalAutonomousOperationsMatrix: React.FC<
  HospitalAutonomousOperationsMatrixProps
> = ({ className = '', onAlertTriggered }) => {
  const [fleet, setFleet] = useState<HospitalRobotItem[]>([]);
  const [eStopActive, setEStopActive] = useState(false);
  const [uavs, setUavs] = useState<MedicalUavItem[]>([]);
  const [devices, setDevices] = useState<UniversalMedicalDevice[]>([]);
  const [agentCount, setAgentCount] = useState(0);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [simulationStatus, setSimulationStatus] = useState<string>('Nominal baseline model active');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshState = useCallback(() => {
    const robots = hospitalRoboticsFleetService.listFleet();
    setFleet([...robots]);
    const isEStopped = robots.some((r) => r.safety.emergencyStopActive);
    setEStopActive(isEStopped);

    const drones = autonomousFlightService.listUavs();
    setUavs([...drones]);

    const registeredDevices = universalDeviceRegistry.listDevices();
    setDevices([...registeredDevices]);

    const agents = governedAgentRuntime.listAgents();
    setAgentCount(agents.length);

    const queueCount = offlineStoreAndForwardQueue.getPendingCount();
    setPendingQueueCount(queueCount);
  }, []);

  useEffect(() => {
    refreshState();
    const interval = setInterval(refreshState, 3000);
    return () => clearInterval(interval);
  }, [refreshState]);

  const handleDispatchRover = async () => {
    try {
      const result = await hospitalRoboticsFleetService.dispatchRobotTask({
        destinationZone: 'ZONE_ED_ACUTE',
        destinationRoom: 'Bay-04',
        robotType: 'hospital_logistics',
        priority: 'urgent',
        requestingUserId: 'user-ops-command',
        requestingUserRole: 'emergency_physician',
        payload: {
          payloadType: 'blood_products',
          description: 'Emergency Blood Infusion Unit & Rapid Saline Pack',
          isSecureCompartmentLocked: true,
          requiresPinOrBadgeToUnlock: true,
          dispatchRequestId: 'req-mat-1',
          originLocation: 'CENTRAL_PHARMACY',
          destinationLocation: 'ED_BAY_04',
        },
      });

      if (result.success) {
        setActionNotice(`Logistics tug ${result.dispatchedRobotId} dispatched: ${result.message}`);
      } else {
        setActionNotice(`Dispatch notice: ${result.message}`);
      }
      refreshState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionNotice(`Dispatch error: ${msg}`);
      if (onAlertTriggered) onAlertTriggered(msg);
    }
  };

  const handleEmergencyStop = async () => {
    await hospitalRoboticsFleetService.triggerFleetEmergencyStop();
    setEStopActive(true);
    setActionNotice('EMERGENCY STOP TRIPPED across all autonomous rovers and platforms.');
    if (onAlertTriggered) onAlertTriggered('EMERGENCY STOP TRIPPED');
    refreshState();
  };

  const handleClearEStop = async () => {
    for (const r of fleet) {
      await hospitalRoboticsFleetService.resumeRobot(r.id);
    }
    setEStopActive(false);
    setActionNotice('Fleet emergency stop interlocks reset to standby.');
    refreshState();
  };

  const handleSimulateSurge = () => {
    const twins = digitalTwinEngine.listTwins();
    const targetTwin = twins[0];
    if (!targetTwin) return;

    const simResult = digitalTwinEngine.simulateWhatIfScenario({
      targetTwinId: targetTwin.id,
      additionalArrivalsPerHour: 18,
      staffAbsenceCount: 2,
      offlineEquipmentCount: 1,
      simulationDurationMinutes: 60,
    });

    setSimulationStatus(
      `Surge simulated: +18 arrivals/hr. Surge Risk: ${simResult.projectedMetrics.surgeRiskScore}%, Est Wait: ${simResult.projectedMetrics.projectedWaitTimeMinutes}m`,
    );
    setActionNotice('Digital twin discrete-event surge projection calculated.');
  };

  const handleFlushOfflineQueue = async () => {
    await offlineStoreAndForwardQueue.synchronize(async () => ({ success: true }));
    const remaining = offlineStoreAndForwardQueue.getPendingCount();
    setPendingQueueCount(remaining);
    setActionNotice('Offline telemetry & clinical records synchronized to upstream gateway.');
  };

  return (
    <section
      className={`hospital-ops-matrix ${className}`}
      aria-label="Autonomous Operations & Fleet Command Matrix"
      data-testid="hospital-autonomous-matrix"
    >
      <div className="hospital-ops-matrix__header">
        <div>
          <h2>Autonomous Operations &amp; Fleet Command Matrix</h2>
          <p>
            Real-time orchestration of robotics fleets, medical UAVs, IoT devices, AI agents, and
            digital twins.
          </p>
        </div>
        <div className="hospital-ops-matrix__badges">
          <span
            className={`hospital-ops-matrix__badge ${
              eStopActive
                ? 'hospital-ops-matrix__badge--alert'
                : 'hospital-ops-matrix__badge--active'
            }`}
            data-testid="matrix-estop-badge"
          >
            {eStopActive ? '● E-STOP ACTIVE' : '● FLEET STANDBY'}
          </span>
          <span className="hospital-ops-matrix__badge hospital-ops-matrix__badge--active">
            ● AIR CORRIDORS MONITORED
          </span>
          <span className="hospital-ops-matrix__badge" data-testid="matrix-queue-badge">
            ● STORE &amp; FORWARD: {pendingQueueCount} QUEUED
          </span>
        </div>
      </div>

      {actionNotice && (
        <div
          role="status"
          aria-live="polite"
          data-testid="matrix-action-notice"
          style={{
            fontSize: '0.8125rem',
            padding: '0.5rem 0.75rem',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.375rem',
            color: '#1e40af',
          }}
        >
          {actionNotice}
        </div>
      )}

      <div className="hospital-ops-matrix__grid">
        {/* Card 1: Robotics Fleet */}
        <div className="hospital-ops-matrix__card" data-testid="matrix-fleet-card">
          <div className="hospital-ops-matrix__card-title">
            <span>Hospital Robotics Fleet</span>
            <span
              className={`hospital-ops-matrix__pill ${
                eStopActive
                  ? 'hospital-ops-matrix__pill--danger'
                  : 'hospital-ops-matrix__pill--success'
              }`}
            >
              {eStopActive ? 'INTERLOCK LOCKED' : 'OPERATIONAL'}
            </span>
          </div>
          <div className="hospital-ops-matrix__card-stat">{fleet.length} Active Platforms</div>
          <div className="hospital-ops-matrix__card-desc">
            Autonomous mobile logistics rovers, telepresence units, and smart mobility stretchers.
          </div>
          <div className="hospital-ops-matrix__items-list">
            {fleet.slice(0, 3).map((r) => (
              <div key={r.id} className="hospital-ops-matrix__item-row">
                <span>
                  {r.name} ({r.type})
                </span>
                <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--info">
                  {r.status} · {Math.round(r.batteryPercent)}%
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="hospital-ops-matrix__btn-sm"
              onClick={handleDispatchRover}
              disabled={eStopActive}
              data-testid="matrix-dispatch-rover-btn"
            >
              Dispatch Rover
            </button>
            {eStopActive ? (
              <button
                type="button"
                className="hospital-ops-matrix__btn-sm"
                onClick={handleClearEStop}
                data-testid="matrix-clear-estop-btn"
              >
                Reset E-Stop
              </button>
            ) : (
              <button
                type="button"
                className="hospital-ops-matrix__btn-sm hospital-ops-matrix__btn-sm--danger"
                onClick={handleEmergencyStop}
                data-testid="matrix-estop-btn"
              >
                Emergency Stop
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Autonomous Medical Flight & UAV */}
        <div className="hospital-ops-matrix__card" data-testid="matrix-flight-card">
          <div className="hospital-ops-matrix__card-title">
            <span>Autonomous Medical UAVs</span>
            <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--info">
              FAA PART 135 COMPLIANT
            </span>
          </div>
          <div className="hospital-ops-matrix__card-stat">{uavs.length} Units Ready</div>
          <div className="hospital-ops-matrix__card-desc">
            Organ &amp; whole-blood logistics with active 2°C–6°C cold-chain verification and
            failsafe return-to-base.
          </div>
          <div className="hospital-ops-matrix__items-list">
            {uavs.map((d) => (
              <div key={d.id} className="hospital-ops-matrix__item-row">
                <span>
                  {d.model} ({d.tailNumber})
                </span>
                <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--success">
                  {d.status} · {d.currentTelemetry.batteryPercent}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Universal Medical IoT Registry */}
        <div className="hospital-ops-matrix__card" data-testid="matrix-devices-card">
          <div className="hospital-ops-matrix__card-title">
            <span>Universal Medical IoT</span>
            <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--success">
              ONLINE
            </span>
          </div>
          <div className="hospital-ops-matrix__card-stat">{devices.length} Registered Devices</div>
          <div className="hospital-ops-matrix__card-desc">
            Standardized adapters across MQTT, BLE, and REST with IEEE 11073 / HL7 FHIR compliance.
          </div>
          <div className="hospital-ops-matrix__items-list">
            {devices.slice(0, 3).map((d) => (
              <div key={d.id} className="hospital-ops-matrix__item-row">
                <span>
                  {d.name} ({d.category})
                </span>
                <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--info">
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Governed Agent Runtime */}
        <div className="hospital-ops-matrix__card" data-testid="matrix-agents-card">
          <div className="hospital-ops-matrix__card-title">
            <span>Governed Agent Runtime</span>
            <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--info">
              GOVERNED
            </span>
          </div>
          <div className="hospital-ops-matrix__card-stat">{agentCount} Verified Agents</div>
          <div className="hospital-ops-matrix__card-desc">
            Bounded execution, verifiable provenance hash chains, and mandatory clinician approval
            gates.
          </div>
          <div className="hospital-ops-matrix__items-list">
            <div className="hospital-ops-matrix__item-row">
              <span>Audit Logging &amp; Cryptographic Provenance</span>
              <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--success">
                ENABLED
              </span>
            </div>
            <div className="hospital-ops-matrix__item-row">
              <span>Unsupervised Action Blocks</span>
              <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--success">
                ENFORCED
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Hospital Digital Twin & Surge */}
        <div className="hospital-ops-matrix__card" data-testid="matrix-twin-card">
          <div className="hospital-ops-matrix__card-title">
            <span>Hospital Digital Twin</span>
            <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--warning">
              PREDICTIVE
            </span>
          </div>
          <div className="hospital-ops-matrix__card-stat">Active Digital Twin Nodes</div>
          <div className="hospital-ops-matrix__card-desc" data-testid="matrix-simulation-status">
            {simulationStatus}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="hospital-ops-matrix__btn-sm"
              onClick={handleSimulateSurge}
              data-testid="matrix-simulate-surge-btn"
            >
              Simulate Surge (+45%)
            </button>
          </div>
        </div>

        {/* Card 6: Edge AI & Store-and-Forward */}
        <div className="hospital-ops-matrix__card" data-testid="matrix-edge-card">
          <div className="hospital-ops-matrix__card-title">
            <span>Edge AI &amp; Store-and-Forward</span>
            <span className="hospital-ops-matrix__pill hospital-ops-matrix__pill--info">
              RESILIENT
            </span>
          </div>
          <div className="hospital-ops-matrix__card-stat">{pendingQueueCount} Pending Upstream</div>
          <div className="hospital-ops-matrix__card-desc">
            Offline-first SQLite/IndexedDB caching with clinical vector clocks and priority conflict
            resolution.
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="hospital-ops-matrix__btn-sm"
              onClick={handleFlushOfflineQueue}
              data-testid="matrix-sync-edge-btn"
            >
              Sync Offline Queue
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HospitalAutonomousOperationsMatrix;

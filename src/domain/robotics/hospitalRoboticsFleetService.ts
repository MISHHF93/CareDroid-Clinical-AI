/**
 * CareDroid Hospital Robotics Fleet Management Service
 * Coordinates autonomous ground robots, telepresence units, and logistics rovers,
 * enforcing hardware safety interlocks, authorized access, and real-time fleet orchestration.
 */

import {
  HospitalRobotItem,
  HospitalRobotType,
  RobotDispatchCommand,
  RobotDispatchResult,
  RobotOperationalStatus,
} from './robotTypes';
import { IRobotAdapter, RestBridgeRobotAdapter, Ros2DdsAdapter } from './robotAdapter';

export class HospitalRoboticsFleetService {
  private static instance: HospitalRoboticsFleetService;
  private fleet: Map<string, HospitalRobotItem> = new Map();
  private adapters: Map<string, IRobotAdapter> = new Map();

  constructor() {
    this.adapters.set('ros2_dds', new Ros2DdsAdapter());
    this.adapters.set('rest_bridge', new RestBridgeRobotAdapter());
    this.seedDefaultFleet();
  }

  public static getInstance(): HospitalRoboticsFleetService {
    if (!HospitalRoboticsFleetService.instance) {
      HospitalRoboticsFleetService.instance = new HospitalRoboticsFleetService();
    }
    return HospitalRoboticsFleetService.instance;
  }

  public registerRobot(robot: HospitalRobotItem): void {
    this.fleet.set(robot.id, { ...robot });
    const adapter = this.adapters.get(robot.adapterProtocol);
    if (adapter) {
      void adapter.connect(robot);
    }
  }

  public getRobot(id: string): HospitalRobotItem | undefined {
    return this.fleet.get(id);
  }

  public listFleet(filter?: {
    type?: HospitalRobotType;
    status?: RobotOperationalStatus;
  }): HospitalRobotItem[] {
    let result = Array.from(this.fleet.values());
    if (filter?.type) {
      result = result.filter((r) => r.type === filter.type);
    }
    if (filter?.status) {
      result = result.filter((r) => r.status === filter.status);
    }
    return result;
  }

  public async dispatchRobotTask(command: RobotDispatchCommand): Promise<RobotDispatchResult> {
    let selectedRobot: HospitalRobotItem | undefined;

    if (command.robotId) {
      selectedRobot = this.fleet.get(command.robotId);
    } else {
      const candidates = Array.from(this.fleet.values()).filter((r) => {
        if (command.robotType && r.type !== command.robotType) return false;
        if (r.status !== 'docked' && r.status !== 'charging') return false;
        if (r.safety.emergencyStopActive) return false;
        if (r.batteryPercent < 25) return false;
        return true;
      });

      candidates.sort((a, b) => b.batteryPercent - a.batteryPercent);
      selectedRobot = candidates[0];
    }

    if (!selectedRobot) {
      return {
        success: false,
        taskId: '',
        message: 'No available robot matching dispatch requirements.',
        estimatedArrivalSeconds: 0,
        timestampIso: new Date().toISOString(),
      };
    }

    if (selectedRobot.safety.emergencyStopActive) {
      return {
        success: false,
        taskId: '',
        dispatchedRobotId: selectedRobot.id,
        message: `Robot '${selectedRobot.name}' has an active Emergency Stop. Clear interlock first.`,
        estimatedArrivalSeconds: 0,
        timestampIso: new Date().toISOString(),
      };
    }

    const adapter =
      this.adapters.get(selectedRobot.adapterProtocol) || this.adapters.get('ros2_dds')!;
    const navResult = await adapter.sendNavigationGoal(selectedRobot.id, {
      zone: command.destinationZone,
      room: command.destinationRoom,
    });

    if (!navResult.accepted) {
      return {
        success: false,
        taskId: '',
        dispatchedRobotId: selectedRobot.id,
        message: `Robot controller rejected navigation goal to ${command.destinationRoom}.`,
        estimatedArrivalSeconds: 0,
        timestampIso: new Date().toISOString(),
      };
    }

    const taskId = `task-robot-${Date.now()}`;
    selectedRobot.status = 'navigating';
    selectedRobot.activeTaskId = taskId;
    selectedRobot.targetDestination = {
      zone: command.destinationZone,
      room: command.destinationRoom,
    };
    if (command.payload) {
      selectedRobot.currentPayload = command.payload;
    }

    return {
      success: true,
      taskId,
      dispatchedRobotId: selectedRobot.id,
      estimatedArrivalSeconds: navResult.estimatedDurationSeconds,
      message: `Dispatched ${selectedRobot.name} to ${command.destinationZone} (${command.destinationRoom}).`,
      timestampIso: new Date().toISOString(),
    };
  }

  public async triggerFleetEmergencyStop(): Promise<number> {
    let stoppedCount = 0;
    for (const robot of this.fleet.values()) {
      robot.safety.emergencyStopActive = true;
      robot.status = 'emergency_stopped';
      const adapter = this.adapters.get(robot.adapterProtocol);
      if (adapter) {
        await adapter.triggerEmergencyStop(robot.id);
      }
      stoppedCount++;
    }
    return stoppedCount;
  }

  public async triggerRobotEmergencyStop(robotId: string): Promise<boolean> {
    const robot = this.fleet.get(robotId);
    if (!robot) return false;
    robot.safety.emergencyStopActive = true;
    robot.status = 'emergency_stopped';
    const adapter = this.adapters.get(robot.adapterProtocol);
    if (adapter) {
      await adapter.triggerEmergencyStop(robot.id);
    }
    return true;
  }

  public async resumeRobot(robotId: string): Promise<boolean> {
    const robot = this.fleet.get(robotId);
    if (!robot) return false;
    robot.safety.emergencyStopActive = false;
    robot.status = robot.currentPayload ? 'navigating' : 'docked';
    const adapter = this.adapters.get(robot.adapterProtocol);
    if (adapter) {
      await adapter.releaseEmergencyStop(robot.id);
    }
    return true;
  }

  public async unlockPayloadCompartment(
    robotId: string,
    verificationBadgeOrPin: string,
  ): Promise<boolean> {
    const robot = this.fleet.get(robotId);
    if (!robot || !robot.currentPayload) return false;

    const adapter = this.adapters.get(robot.adapterProtocol);
    if (!adapter) return false;

    const success = await adapter.unlockCompartment(robotId, verificationBadgeOrPin);
    if (success) {
      robot.currentPayload.isSecureCompartmentLocked = false;
    }
    return success;
  }

  public getFleetStatusSummary(): {
    totalRobots: number;
    navigating: number;
    docked: number;
    emergencyStopped: number;
    averageBatteryPercent: number;
  } {
    const all = Array.from(this.fleet.values());
    const totalRobots = all.length;
    let navigating = 0;
    let docked = 0;
    let emergencyStopped = 0;
    let totalBattery = 0;

    for (const r of all) {
      if (r.status === 'navigating') navigating++;
      if (r.status === 'docked' || r.status === 'charging') docked++;
      if (r.safety.emergencyStopActive || r.status === 'emergency_stopped') emergencyStopped++;
      totalBattery += r.batteryPercent;
    }

    return {
      totalRobots,
      navigating,
      docked,
      emergencyStopped,
      averageBatteryPercent: totalRobots > 0 ? Math.round(totalBattery / totalRobots) : 100,
    };
  }

  private seedDefaultFleet(): void {
    const defaultRobots: HospitalRobotItem[] = [
      {
        id: 'bot-tug-pharmacy-01',
        name: 'CareDroid Pharmacy Tug Rover 1',
        type: 'hospital_logistics',
        manufacturer: 'Aethon Robotics Systems',
        model: 'TUG Autonomous Mobile Robot T3',
        status: 'docked',
        batteryPercent: 96,
        isCharging: true,
        currentLocation: {
          building: 'Main Hospital',
          floor: 'Level 1',
          zone: 'Central Pharmacy Charging Dock',
          xMeters: 4.2,
          yMeters: 1.0,
          headingDegrees: 0,
        },
        adapterProtocol: 'ros2_dds',
        safety: {
          obstacleDetected: false,
          emergencyStopActive: false,
          lidarHealthy: true,
          tamperDetected: false,
          safeSpeedLimitMetersPerSecond: 1.2,
        },
      },
      {
        id: 'bot-tele-stroke-01',
        name: 'Tele-Neurology Roving Specialist Bot',
        type: 'telepresence',
        manufacturer: 'Teladoc Health / InTouch',
        model: 'Vici Clinical Telepresence Robot',
        status: 'docked',
        batteryPercent: 88,
        isCharging: false,
        currentLocation: {
          building: 'Main Hospital',
          floor: 'Level 1',
          zone: 'ED Physician Core Bay',
          xMeters: 12.0,
          yMeters: 8.5,
          headingDegrees: 180,
        },
        adapterProtocol: 'rest_bridge',
        safety: {
          obstacleDetected: false,
          emergencyStopActive: false,
          lidarHealthy: true,
          tamperDetected: false,
          safeSpeedLimitMetersPerSecond: 0.8,
        },
      },
      {
        id: 'bot-stretcher-ed-01',
        name: 'Smart Stretcher Power-Assist Unit 1',
        type: 'smart_stretcher',
        manufacturer: 'Stryker Medical',
        model: 'Power-LOAD Autonomous Assist Cot',
        status: 'docked',
        batteryPercent: 100,
        isCharging: true,
        currentLocation: {
          building: 'Main Hospital',
          floor: 'Level 1',
          zone: 'Ambulance Bay Intake Vestibule',
          xMeters: 0.5,
          yMeters: 2.1,
          headingDegrees: 90,
        },
        adapterProtocol: 'ros2_dds',
        safety: {
          obstacleDetected: false,
          emergencyStopActive: false,
          lidarHealthy: true,
          tamperDetected: false,
          safeSpeedLimitMetersPerSecond: 1.5,
        },
      },
    ];

    for (const r of defaultRobots) {
      this.registerRobot(r);
    }
  }
}

export const hospitalRoboticsFleetService = HospitalRoboticsFleetService.getInstance();

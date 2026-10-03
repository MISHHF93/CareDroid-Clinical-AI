/**
 * CareDroid Vendor-Neutral Robotics Adapter Layer
 * Bridges ROS 2 / DDS middleware, WebSocket fleets, and REST robot controllers
 * into a standardized command and safety interlock interface.
 */

import {
  HospitalRobotItem,
  RobotAdapterProtocol,
  RobotCoordinates,
  RobotSafetyInterlocks,
} from './robotTypes';

export interface IRobotAdapter {
  protocol: RobotAdapterProtocol;
  connect(robot: HospitalRobotItem): Promise<boolean>;
  disconnect(robotId: string): Promise<boolean>;
  sendNavigationGoal(
    robotId: string,
    destination: { zone: string; room: string; xMeters?: number; yMeters?: number },
  ): Promise<{ accepted: boolean; estimatedDurationSeconds: number }>;
  triggerEmergencyStop(robotId: string): Promise<boolean>;
  releaseEmergencyStop(robotId: string): Promise<boolean>;
  unlockCompartment(robotId: string, verificationBadgeOrPin: string): Promise<boolean>;
  pollTelemetry(robotId: string): Promise<{
    coordinates: RobotCoordinates;
    batteryPercent: number;
    safety: RobotSafetyInterlocks;
  }>;
}

export class Ros2DdsAdapter implements IRobotAdapter {
  public protocol: RobotAdapterProtocol = 'ros2_dds';
  private simulatedState: Map<string, { x: number; y: number; eStop: boolean; battery: number }> =
    new Map();

  async connect(robot: HospitalRobotItem): Promise<boolean> {
    this.simulatedState.set(robot.id, {
      x: robot.currentLocation.xMeters,
      y: robot.currentLocation.yMeters,
      eStop: robot.safety.emergencyStopActive,
      battery: robot.batteryPercent,
    });
    return true;
  }

  async disconnect(robotId: string): Promise<boolean> {
    this.simulatedState.delete(robotId);
    return true;
  }

  async sendNavigationGoal(
    robotId: string,
    _destination: { zone: string; room: string; xMeters?: number; yMeters?: number },
  ): Promise<{ accepted: boolean; estimatedDurationSeconds: number }> {
    const state = this.simulatedState.get(robotId);
    if (state?.eStop) {
      return { accepted: false, estimatedDurationSeconds: 0 };
    }
    return { accepted: true, estimatedDurationSeconds: 65 };
  }

  async triggerEmergencyStop(robotId: string): Promise<boolean> {
    const state = this.simulatedState.get(robotId);
    if (state) state.eStop = true;
    return true;
  }

  async releaseEmergencyStop(robotId: string): Promise<boolean> {
    const state = this.simulatedState.get(robotId);
    if (state) state.eStop = false;
    return true;
  }

  async unlockCompartment(_robotId: string, verificationBadgeOrPin: string): Promise<boolean> {
    return Boolean(verificationBadgeOrPin && verificationBadgeOrPin.length >= 4);
  }

  async pollTelemetry(robotId: string): Promise<{
    coordinates: RobotCoordinates;
    batteryPercent: number;
    safety: RobotSafetyInterlocks;
  }> {
    const state = this.simulatedState.get(robotId) || { x: 10, y: 5, eStop: false, battery: 85 };
    return {
      coordinates: {
        building: 'Main Hospital',
        floor: 'Level 1',
        zone: 'ED-Logistics-Corridor',
        xMeters: state.x,
        yMeters: state.y,
        headingDegrees: 90,
      },
      batteryPercent: state.battery,
      safety: {
        obstacleDetected: false,
        emergencyStopActive: state.eStop,
        lidarHealthy: true,
        tamperDetected: false,
        safeSpeedLimitMetersPerSecond: 1.2,
      },
    };
  }
}

export class RestBridgeRobotAdapter implements IRobotAdapter {
  public protocol: RobotAdapterProtocol = 'rest_bridge';

  async connect(_robot: HospitalRobotItem): Promise<boolean> {
    return true;
  }

  async disconnect(_robotId: string): Promise<boolean> {
    return true;
  }

  async sendNavigationGoal(
    _robotId: string,
    _destination: { zone: string; room: string },
  ): Promise<{ accepted: boolean; estimatedDurationSeconds: number }> {
    return { accepted: true, estimatedDurationSeconds: 45 };
  }

  async triggerEmergencyStop(_robotId: string): Promise<boolean> {
    return true;
  }

  async releaseEmergencyStop(_robotId: string): Promise<boolean> {
    return true;
  }

  async unlockCompartment(_robotId: string, verificationBadgeOrPin: string): Promise<boolean> {
    return Boolean(verificationBadgeOrPin && verificationBadgeOrPin.length >= 4);
  }

  async pollTelemetry(_robotId: string) {
    return {
      coordinates: {
        building: 'Main Hospital',
        floor: 'Level 1',
        zone: 'Trauma-Core',
        xMeters: 22.4,
        yMeters: 14.1,
        headingDegrees: 180,
      },
      batteryPercent: 94,
      safety: {
        obstacleDetected: false,
        emergencyStopActive: false,
        lidarHealthy: true,
        tamperDetected: false,
        safeSpeedLimitMetersPerSecond: 1.0,
      },
    };
  }
}

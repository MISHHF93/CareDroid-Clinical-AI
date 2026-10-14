/**
 * Vehicle Recognition Intelligence Engine
 * Deterministic perception evaluation, proximity classification, and safety interlock state machine.
 */

import {
  RECOGNITION_STATES,
  type DetectedObject,
  type RecognitionEvent,
  type SensorHealthStatus,
} from './mobilityTypes';

export const CRITICAL_OBSTACLE_PROXIMITY_METERS = 3.5;
export const CAUTION_OBSTACLE_PROXIMITY_METERS = 8.0;
export const TELEMETRY_STALE_THRESHOLD_MS = 5000;

export const ABSENCE_OF_OBJECTS_SAFETY_NOTE =
  'Safety Notice: The absence of detected objects is NEVER proof that an environment is safe. Deterministic vehicle safety decisions and hard stops are handled by certified interlocks, not AI/LLMs.';

export interface EvaluateRecognitionInput {
  vehicleId: string;
  missionId?: string;
  directionAndCoverage: {
    azimuthDegrees: number;
    fieldOfViewDegrees: number;
    distanceRangeMeters: number;
  };
  detectedObjects: DetectedObject[];
  sensorHealth: SensorHealthStatus;
  timestampIso?: string;
}

export interface RecognitionEvaluationResult {
  event: RecognitionEvent;
  recommendedVehicleAction:
    | 'proceed_nominal'
    | 'proceed_with_caution'
    | 'emergency_stop'
    | 'hold_and_alert';
  safetyInterlockEngaged: boolean;
  operatorAlertRequired: boolean;
  explanation: string;
}

export class VehicleRecognitionEngine {
  public static evaluateRecognition(input: EvaluateRecognitionInput): RecognitionEvaluationResult {
    const nowMs = Date.now();
    const eventTimeMs = input.timestampIso ? new Date(input.timestampIso).getTime() : nowMs;
    const freshnessMs = Math.max(0, nowMs - eventTimeMs);
    const isStale = freshnessMs > TELEMETRY_STALE_THRESHOLD_MS;

    const sensorHealth: SensorHealthStatus = {
      ...input.sensorHealth,
      telemetryFreshnessMs: freshnessMs,
      isTelemetryStale: isStale,
    };

    // 1. Check for stale telemetry
    if (isStale) {
      const explanation = `Perception telemetry stale (${freshnessMs}ms elapsed, threshold is ${TELEMETRY_STALE_THRESHOLD_MS}ms). Hard failsafe stop initiated.`;
      return {
        event: {
          id: `rec-evt-${Date.now()}`,
          vehicleId: input.vehicleId,
          missionId: input.missionId,
          timestampIso: input.timestampIso || new Date().toISOString(),
          state: RECOGNITION_STATES.RECOGNITION_DATA_STALE,
          recognitionState: RECOGNITION_STATES.RECOGNITION_DATA_STALE,
          telemetryFreshnessMs: freshnessMs,
          directionAndCoverage: input.directionAndCoverage,
          detectedObjects: input.detectedObjects,
          sensorHealth,
          humanReadableExplanation: explanation,
          operatorAlertRequired: true,
          operatorAlertTriggered: true,
          safetyNote: ABSENCE_OF_OBJECTS_SAFETY_NOTE,
        },
        recommendedVehicleAction: 'emergency_stop',
        safetyInterlockEngaged: true,
        operatorAlertRequired: true,
        explanation,
      };
    }

    // 2. Check for sensor failure
    const isLidarFailed =
      sensorHealth.lidar === 'failed' ||
      sensorHealth.primaryLidar === 'FAILED' ||
      sensorHealth.primaryLidar === 'failed';
    const isCameraFailed =
      sensorHealth.opticalCamera === 'failed' ||
      sensorHealth.opticalCameras === 'FAILED' ||
      sensorHealth.opticalCameras === 'failed';

    if (isLidarFailed || isCameraFailed) {
      const explanation = `Primary sensor failure detected (LiDAR: ${sensorHealth.lidar || sensorHealth.primaryLidar}, Camera: ${sensorHealth.opticalCamera || sensorHealth.opticalCameras}). Perception degraded.`;
      return {
        event: {
          id: `rec-evt-${Date.now()}`,
          vehicleId: input.vehicleId,
          missionId: input.missionId,
          timestampIso: input.timestampIso || new Date().toISOString(),
          state: RECOGNITION_STATES.RECOGNITION_ERROR,
          recognitionState: RECOGNITION_STATES.RECOGNITION_ERROR,
          telemetryFreshnessMs: freshnessMs,
          directionAndCoverage: input.directionAndCoverage,
          detectedObjects: input.detectedObjects,
          sensorHealth,
          humanReadableExplanation: explanation,
          operatorAlertRequired: true,
          operatorAlertTriggered: true,
          safetyNote: ABSENCE_OF_OBJECTS_SAFETY_NOTE,
        },
        recommendedVehicleAction: 'emergency_stop',
        safetyInterlockEngaged: true,
        operatorAlertRequired: true,
        explanation,
      };
    }

    // 3. Check for sensor unavailable / calibrating
    const isLidarUnavailable =
      sensorHealth.lidar === 'unavailable' || sensorHealth.primaryLidar === 'unavailable';
    const isCameraUnavailable =
      sensorHealth.opticalCamera === 'unavailable' || sensorHealth.opticalCameras === 'unavailable';

    if (isLidarUnavailable || isCameraUnavailable) {
      const explanation = `Sensor suite unavailable or calibrating. Halting autonomous movement pending verification.`;
      return {
        event: {
          id: `rec-evt-${Date.now()}`,
          vehicleId: input.vehicleId,
          missionId: input.missionId,
          timestampIso: input.timestampIso || new Date().toISOString(),
          state: RECOGNITION_STATES.SENSOR_UNAVAILABLE,
          recognitionState: RECOGNITION_STATES.SENSOR_UNAVAILABLE,
          telemetryFreshnessMs: freshnessMs,
          directionAndCoverage: input.directionAndCoverage,
          detectedObjects: input.detectedObjects,
          sensorHealth,
          humanReadableExplanation: explanation,
          operatorAlertRequired: true,
          operatorAlertTriggered: true,
          safetyNote: ABSENCE_OF_OBJECTS_SAFETY_NOTE,
        },
        recommendedVehicleAction: 'hold_and_alert',
        safetyInterlockEngaged: true,
        operatorAlertRequired: true,
        explanation,
      };
    }

    // 4. Evaluate detected objects
    const relevantObjects = input.detectedObjects.filter(
      (obj) => obj.isRelevantObject !== false && obj.isRelevantObstacle !== false,
    );

    if (relevantObjects.length > 0) {
      const closestObj = relevantObjects.reduce((prev, curr) =>
        curr.distanceMeters < prev.distanceMeters ? curr : prev,
      );

      const isCritical = closestObj.distanceMeters < CRITICAL_OBSTACLE_PROXIMITY_METERS;
      const isCaution =
        !isCritical && closestObj.distanceMeters <= CAUTION_OBSTACLE_PROXIMITY_METERS;

      const action = isCritical
        ? 'emergency_stop'
        : isCaution
          ? 'proceed_with_caution'
          : 'proceed_nominal';

      const zone = isCritical ? 'CRITICAL PROXIMITY' : isCaution ? 'CAUTION ZONE' : 'CLEAR TRACK';
      const explanation = `RELEVANT OBJECT DETECTED in ${zone}: ${closestObj.classification.toUpperCase()} at ${closestObj.distanceMeters.toFixed(1)}m. Action: ${action}.`;

      return {
        event: {
          id: `rec-evt-${Date.now()}`,
          vehicleId: input.vehicleId,
          missionId: input.missionId,
          timestampIso: input.timestampIso || new Date().toISOString(),
          state: RECOGNITION_STATES.RELEVANT_OBJECT_DETECTED,
          recognitionState: RECOGNITION_STATES.RELEVANT_OBJECT_DETECTED,
          telemetryFreshnessMs: freshnessMs,
          directionAndCoverage: input.directionAndCoverage,
          detectedObjects: input.detectedObjects,
          sensorHealth,
          humanReadableExplanation: explanation,
          operatorAlertRequired: true,
          operatorAlertTriggered: true,
          safetyNote: ABSENCE_OF_OBJECTS_SAFETY_NOTE,
        },
        recommendedVehicleAction: action,
        safetyInterlockEngaged: isCritical,
        operatorAlertRequired: true,
        explanation,
      };
    }

    // 5. No relevant objects detected - corridor clear
    const explanation = `Corridor scan clear across ${input.directionAndCoverage.fieldOfViewDegrees}° field of view (${input.directionAndCoverage.distanceRangeMeters}m range). No relevant obstacle reported.`;
    return {
      event: {
        id: `rec-evt-${Date.now()}`,
        vehicleId: input.vehicleId,
        missionId: input.missionId,
        timestampIso: input.timestampIso || new Date().toISOString(),
        state: RECOGNITION_STATES.RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT,
        recognitionState: RECOGNITION_STATES.RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT,
        telemetryFreshnessMs: freshnessMs,
        directionAndCoverage: input.directionAndCoverage,
        detectedObjects: [],
        sensorHealth,
        humanReadableExplanation: explanation,
        operatorAlertRequired: false,
        operatorAlertTriggered: false,
        safetyNote: ABSENCE_OF_OBJECTS_SAFETY_NOTE,
      },
      recommendedVehicleAction: 'proceed_nominal',
      safetyInterlockEngaged: false,
      operatorAlertRequired: false,
      explanation,
    };
  }
}

export default VehicleRecognitionEngine;

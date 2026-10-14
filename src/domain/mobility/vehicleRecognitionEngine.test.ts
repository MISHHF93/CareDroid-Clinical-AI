import { describe, expect, it } from 'vitest';
import { VehicleRecognitionEngine } from './vehicleRecognitionEngine';
import { RECOGNITION_STATES } from './mobilityTypes';

describe('VehicleRecognitionEngine', () => {
  const nominalSensors = {
    lidar: 'nominal' as const,
    opticalCamera: 'nominal' as const,
    depthIr: 'nominal' as const,
    ultrasonic: 'nominal' as const,
    telemetryFreshnessMs: 50,
    isTelemetryStale: false,
  };

  const nominalDirection = {
    azimuthDegrees: 90,
    fieldOfViewDegrees: 180,
    distanceRangeMeters: 20.0,
  };

  it('correctly reports RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT when corridor is clear', () => {
    const result = VehicleRecognitionEngine.evaluateRecognition({
      vehicleId: 'AMR-ROVER-01',
      directionAndCoverage: nominalDirection,
      detectedObjects: [],
      sensorHealth: nominalSensors,
    });

    expect(result.event.state).toBe(RECOGNITION_STATES.RECOGNITION_COMPLETED_NO_RELEVANT_OBJECT);
    expect(result.recommendedVehicleAction).toBe('proceed_nominal');
    expect(result.safetyInterlockEngaged).toBe(false);
    expect(result.event.safetyNote).toContain(
      'absence of detected objects is NEVER proof that an environment is safe',
    );
  });

  it('triggers emergency stop and safety interlock when obstacle is within critical proximity', () => {
    const result = VehicleRecognitionEngine.evaluateRecognition({
      vehicleId: 'AMR-ROVER-01',
      directionAndCoverage: nominalDirection,
      detectedObjects: [
        {
          id: 'obj-1',
          classification: 'stretcher',
          confidenceScore: 0.94,
          isRelevantObject: true,
          distanceMeters: 2.1, // less than CRITICAL_OBSTACLE_PROXIMITY_METERS (3.5m)
          relativeBearingDegrees: 5,
        },
      ],
      sensorHealth: nominalSensors,
    });

    expect(result.event.state).toBe(RECOGNITION_STATES.RELEVANT_OBJECT_DETECTED);
    expect(result.recommendedVehicleAction).toBe('emergency_stop');
    expect(result.safetyInterlockEngaged).toBe(true);
    expect(result.operatorAlertRequired).toBe(true);
    expect(result.explanation).toContain('CRITICAL PROXIMITY');
    expect(result.explanation).toContain('STRETCHER');
  });

  it('recommends proceed with caution when obstacle is in caution zone', () => {
    const result = VehicleRecognitionEngine.evaluateRecognition({
      vehicleId: 'AMR-ROVER-01',
      directionAndCoverage: nominalDirection,
      detectedObjects: [
        {
          id: 'obj-2',
          classification: 'medical_cart',
          confidenceScore: 0.88,
          isRelevantObject: true,
          distanceMeters: 6.2, // between 3.5m and 8.0m
          relativeBearingDegrees: -10,
        },
      ],
      sensorHealth: nominalSensors,
    });

    expect(result.event.state).toBe(RECOGNITION_STATES.RELEVANT_OBJECT_DETECTED);
    expect(result.recommendedVehicleAction).toBe('proceed_with_caution');
    expect(result.safetyInterlockEngaged).toBe(false);
    expect(result.operatorAlertRequired).toBe(true);
  });

  it('transitions to RECOGNITION_ERROR and engages interlock on LIDAR or camera failure', () => {
    const failedLidarSensors = {
      ...nominalSensors,
      lidar: 'failed' as const,
    };

    const result = VehicleRecognitionEngine.evaluateRecognition({
      vehicleId: 'AMR-ROVER-01',
      directionAndCoverage: nominalDirection,
      detectedObjects: [],
      sensorHealth: failedLidarSensors,
    });

    expect(result.event.state).toBe(RECOGNITION_STATES.RECOGNITION_ERROR);
    expect(result.recommendedVehicleAction).toBe('emergency_stop');
    expect(result.safetyInterlockEngaged).toBe(true);
    expect(result.operatorAlertRequired).toBe(true);
    expect(result.explanation).toContain('Primary sensor failure detected');
  });

  it('flags RECOGNITION_DATA_STALE when telemetry timestamp exceeds threshold', () => {
    const staleTimeIso = new Date(Date.now() - 10000).toISOString(); // 10s old

    const result = VehicleRecognitionEngine.evaluateRecognition({
      vehicleId: 'AMR-ROVER-01',
      directionAndCoverage: nominalDirection,
      detectedObjects: [],
      sensorHealth: nominalSensors,
      timestampIso: staleTimeIso,
    });

    expect(result.event.state).toBe(RECOGNITION_STATES.RECOGNITION_DATA_STALE);
    expect(result.safetyInterlockEngaged).toBe(true);
    expect(result.operatorAlertRequired).toBe(true);
    expect(result.event.sensorHealth.isTelemetryStale).toBe(true);
  });

  it('handles SENSOR_UNAVAILABLE when sensor is calibrating or unavailable', () => {
    const calibratingSensors = {
      ...nominalSensors,
      opticalCamera: 'unavailable' as const,
    };

    const result = VehicleRecognitionEngine.evaluateRecognition({
      vehicleId: 'AMR-ROVER-01',
      directionAndCoverage: nominalDirection,
      detectedObjects: [],
      sensorHealth: calibratingSensors,
    });

    expect(result.event.state).toBe(RECOGNITION_STATES.SENSOR_UNAVAILABLE);
    expect(result.recommendedVehicleAction).toBe('hold_and_alert');
    expect(result.safetyInterlockEngaged).toBe(true);
  });
});

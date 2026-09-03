export type NativeAiThresholdConfig = {
  admissionAlertPercent: number;
  prolongedStayAlertPercent: number;
  prolongedStayHours: number;
  orientationDisplayPercent: number;
  occupancyAlertPercent: number;
  highProlongedStayPatientCount: number;
  mlRefreshIntervalMinutes: number;
};

export const DEFAULT_NATIVE_AI_THRESHOLDS: NativeAiThresholdConfig = {
  admissionAlertPercent: 70,
  prolongedStayAlertPercent: 65,
  prolongedStayHours: 8,
  orientationDisplayPercent: 50,
  occupancyAlertPercent: 90,
  highProlongedStayPatientCount: 3,
  mlRefreshIntervalMinutes: 20,
};

export function resolveNativeAiThresholds(
  settings?: Partial<NativeAiThresholdConfig> | null,
): NativeAiThresholdConfig {
  return {
    ...DEFAULT_NATIVE_AI_THRESHOLDS,
    ...(settings || {}),
  };
}

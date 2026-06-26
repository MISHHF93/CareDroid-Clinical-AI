import type { Patient, PatientState, PatientFlag, Priority, ReassessmentReminder, VitalsAlert, Alert } from '../types/emergency';
import { PatientState as PatientStateEnum, PatientFlag as PatientFlagEnum } from '../types/emergency';

/**
 * Waiting room patient record – unified view for safety board display.
 * Aggregates all operational context needed for nurse/staff monitoring.
 */
export interface WaitingRoomPatientRecord {
  // Patient identity
  patientId: string;
  firstName: string;
  lastName: string;
  mrn: string;
  name: string;

  // Arrival and complaint
  arrivalTime: string; // ISO 8601
  presentingComplaint: string;
  complaintCategory: string;

  // Triage context
  triageLevel?: Priority | string;
  triageTime?: string;

  // Waiting metrics
  waitingDurationMinutes: number;
  waitingDurationFormatted: string; // "15m", "1h 22m"

  // Vitals tracking
  lastVitalsTime?: string;
  vitalsAgeMinutes: number;
  vitalsAgeFormatted: string;
  currentVitals?: {
    hr?: number;
    sbp?: number;
    dbp?: number;
    spo2?: number;
    temp?: number;
    rr?: number;
  };
  vitalsAbnormal: boolean;

  // Reassessment tracking
  lastReassessmentTime?: string;
  timeSinceReassessmentMinutes: number;
  timeSinceReassessmentFormatted: string;
  reassessmentOverdue: boolean;
  reassessmentDueMinutes?: number; // Minutes until due if not overdue

  // Risk flags
  hasReassessmentDueFlag: boolean;
  hasLongWaitFlag: boolean;
  hasHighRiskFlag: boolean;
  hasDeteriorationRiskFlag: boolean;
  hasSepsisAlertFlag: boolean;
  hasIsolationFlag: boolean;

  // Safety indicators
  highRiskComplaintFlags: string[];
  activeAlerts: Alert[];
  activeVitalsAlerts: VitalsAlert[];

  // Provider/test status
  providerAssignedStaffId?: string;
  providerAssignedStaffName?: string;
  testAwaitingResults: boolean;
  testResultsLabel?: string;

  // Operational state
  state: PatientState;
  priority: Priority | string;
}

/**
 * Waiting room safety board snapshot – all waiting patients with context.
 * Sorted and filtered for clinical oversight.
 */
export interface WaitingRoomSafetyBoard {
  generatedAt: string;
  totalWaitingPatients: number;
  criticalReassessmentNeeded: number;
  overduReassessments: number;
  abnormalVitals: number;
  highRiskPatients: number;
  patients: WaitingRoomPatientRecord[];
  riskMetrics: {
    oldestWaitMinutes: number;
    averageWaitMinutes: number;
    criticalWaitCount: number;
    stalVitalsCount: number;
  };
  recommendations: string[];
}

/**
 * Calculate waiting duration in minutes since arrival.
 */
function minutesSince(timestamp: string | undefined, now = Date.now()): number {
  if (!timestamp) return 0;
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.round((now - time) / 60000));
}

/**
 * Format duration in human-readable form.
 */
function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Extract latest vitals from patient record.
 */
function getLatestVitals(patient: Patient): import('../types/emergency').Vitals | undefined {
  if (Array.isArray(patient.vitals) && patient.vitals.length > 0) {
    return patient.vitals[patient.vitals.length - 1];
  }
  return Array.isArray(patient.vitals) ? patient.vitals[0] : undefined;
}

/**
 * Detect abnormal vital signs based on standard emergency ranges.
 */
function hasAbnormalVitals(vitals: any): boolean {
  if (!vitals) return false;
  const hr = vitals.hr || vitals.heartRate;
  const sbp = vitals.sbp || vitals.bpSystolic;
  const spo2 = vitals.spo2 || vitals.oxygenSaturation;
  const rr = vitals.rr || vitals.respiratoryRate;

  // Critical ranges
  if (hr && (hr < 40 || hr > 130)) return true;
  if (sbp && (sbp < 80 || sbp > 180)) return true;
  if (spo2 && spo2 < 90) return true;
  if (rr && (rr < 10 || rr > 30)) return true;

  return false;
}

/**
 * Check if patient has flag by type.
 */
function hasFlag(patient: Patient, flag: PatientFlag): boolean {
  return (patient.flags || []).some((f) => {
    if (typeof f === 'string') return f === flag;
    return (f as any)?.type === flag;
  });
}

/**
 * Get patient display name safely.
 */
function getPatientName(patient: Patient): string {
  if (patient.name) return patient.name;
  const full = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  return full || patient.mrn || 'Unknown';
}

/**
 * Build waiting room patient record for a single patient.
 * Core operation: aggregate all relevant safety context.
 */
export function buildWaitingRoomPatientRecord(
  patient: Patient,
  staff: Array<{ id: string; name?: string; displayName?: string }> = [],
  now = Date.now(),
): WaitingRoomPatientRecord | null {
  // Only include waiting state patients
  if (patient.state !== PatientStateEnum.Waiting) {
    return null;
  }

  const latestVitals = getLatestVitals(patient);
  const vitalsTime = latestVitals?.recordedAt || patient.vitalsUpdatedAt || patient.arrivalTime;
  const vitalsAgeMinutes = minutesSince(vitalsTime, now);
  const waitingMinutes = minutesSince(patient.arrivalTime, now);

  // Reassessment tracking
  const lastReminder = (patient.reassessmentReminders || []).sort(
    (a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime(),
  )[0];
  const lastReassessmentTime = lastReminder?.completedAt;
  const timeSinceReassessmentMinutes = minutesSince(lastReassessmentTime, now);

  // Calculate overdue status (45+ minutes waiting or vitals stale 30+ minutes)
  const reassessmentOverdue =
    (waitingMinutes > 45) || (vitalsAgeMinutes > 30) || hasFlag(patient, PatientFlagEnum.ReassessmentDue);

  // Extract high-risk complaint patterns
  const highRiskComplaintFlags: string[] = [];
  const complaint = ((patient as unknown as { presentingComplaint?: string }).presentingComplaint || patient.chiefComplaint || '').toLowerCase();
  const highRiskKeywords = [
    'chest pain',
    'chest pressure',
    'shortness of breath',
    'difficulty breathing',
    'respiratory distress',
    'trauma',
    'stroke symptoms',
    'altered mental',
    'loss of consciousness',
    'severe headache',
    'severe abdominal',
  ];
  for (const keyword of highRiskKeywords) {
    if (complaint.includes(keyword)) {
      highRiskComplaintFlags.push(keyword);
    }
  }

  const assignedStaff = staff.find((s) => s.id === patient.assignedStaffId);

  return {
    patientId: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    mrn: patient.mrn,
    name: getPatientName(patient),
    arrivalTime: patient.arrivalTime,
    presentingComplaint: patient.chiefComplaint || (patient as unknown as { presentingComplaint?: string }).presentingComplaint || 'No complaint recorded',
    complaintCategory: patient.complaintCategory || 'Other',
    triageLevel: patient.priority,
    triageTime: patient.triageTime ?? undefined,
    waitingDurationMinutes: waitingMinutes,
    waitingDurationFormatted: formatDuration(waitingMinutes),
    lastVitalsTime: vitalsTime,
    vitalsAgeMinutes,
    vitalsAgeFormatted: formatDuration(vitalsAgeMinutes),
    currentVitals: latestVitals
      ? {
          hr: latestVitals.hr ?? (latestVitals.heartRate as unknown as number | undefined),
          sbp: latestVitals.sbp ?? (latestVitals.bpSystolic as unknown as number | undefined),
          dbp: latestVitals.dbp ?? (latestVitals.bpDiastolic as unknown as number | undefined),
          spo2: latestVitals.spo2 ?? (latestVitals.oxygenSaturation as unknown as number | undefined),
          temp: latestVitals.temp ?? (latestVitals.temperature as unknown as number | undefined),
          rr: latestVitals.rr ?? (latestVitals.respiratoryRate as unknown as number | undefined),
        }
      : undefined,
    vitalsAbnormal: hasAbnormalVitals(latestVitals),
    lastReassessmentTime,
    timeSinceReassessmentMinutes,
    timeSinceReassessmentFormatted: formatDuration(timeSinceReassessmentMinutes),
    reassessmentOverdue,
    reassessmentDueMinutes: reassessmentOverdue ? undefined : Math.max(0, 45 - waitingMinutes),
    hasReassessmentDueFlag: hasFlag(patient, PatientFlagEnum.ReassessmentDue),
    hasLongWaitFlag: hasFlag(patient, PatientFlagEnum.LongWait),
    hasHighRiskFlag: hasFlag(patient, PatientFlagEnum.HighRisk),
    hasDeteriorationRiskFlag: hasFlag(patient, PatientFlagEnum.DeteriorationRisk),
    hasSepsisAlertFlag: hasFlag(patient, PatientFlagEnum.SepsisAlert),
    hasIsolationFlag: hasFlag(patient, PatientFlagEnum.Isolation),
    highRiskComplaintFlags,
    activeAlerts: [],
    activeVitalsAlerts: patient.vitalsAlerts || [],
    providerAssignedStaffId: patient.assignedStaffId ?? undefined,
    providerAssignedStaffName: assignedStaff?.displayName || assignedStaff?.name,
    testAwaitingResults: ((patient.state as string) === PatientStateEnum.Results && !patient.notes?.some((n) => n.type === 'Result')),
    state: patient.state,
    priority: patient.priority,
  };
}

/**
 * Build complete waiting room safety board.
 * Canonical operation: snapshot all waiting patients for staff monitoring.
 */
export function buildWaitingRoomSafetyBoard(
  patients: Patient[],
  alerts: Alert[] = [],
  staff: Array<{ id: string; name?: string; displayName?: string }> = [],
  now = Date.now(),
): WaitingRoomSafetyBoard {
  const waitingPatients = patients
    .filter((p) => p.state === PatientStateEnum.Waiting)
    .map((p) => buildWaitingRoomPatientRecord(p, staff, now))
    .filter((r) => r !== null) as WaitingRoomPatientRecord[];

  // Attach active alerts to each patient
  const alertsByPatient = new Map<string, Alert[]>();
  alerts.forEach((alert) => {
    if (alert.patientId) {
      if (!alertsByPatient.has(alert.patientId)) {
        alertsByPatient.set(alert.patientId, []);
      }
      alertsByPatient.get(alert.patientId)!.push(alert);
    }
  });

  waitingPatients.forEach((record) => {
    record.activeAlerts = alertsByPatient.get(record.patientId) || [];
  });

  // Sort by risk: overdue reassessment first, then longest wait
  waitingPatients.sort((a, b) => {
    if (a.reassessmentOverdue && !b.reassessmentOverdue) return -1;
    if (!a.reassessmentOverdue && b.reassessmentOverdue) return 1;
    return b.waitingDurationMinutes - a.waitingDurationMinutes;
  });

  // Calculate metrics
  const oldestWaitMinutes = waitingPatients.length > 0 ? waitingPatients[0].waitingDurationMinutes : 0;
  const averageWaitMinutes =
    waitingPatients.length > 0
      ? Math.round(waitingPatients.reduce((sum, p) => sum + p.waitingDurationMinutes, 0) / waitingPatients.length)
      : 0;
  const criticalWaitCount = waitingPatients.filter((p) => p.waitingDurationMinutes > 45).length;
  const stalVitalsCount = waitingPatients.filter((p) => p.vitalsAgeMinutes > 30).length;

  const overduReassessments = waitingPatients.filter((p) => p.reassessmentOverdue).length;
  const abnormalVitals = waitingPatients.filter((p) => p.vitalsAbnormal).length;
  const highRiskPatients = waitingPatients.filter(
    (p) =>
      p.hasHighRiskFlag ||
      p.hasSepsisAlertFlag ||
      p.hasDeteriorationRiskFlag ||
      p.highRiskComplaintFlags.length > 0,
  ).length;

  // Build recommendations
  const recommendations: string[] = [];
  if (overduReassessments > 0) {
    recommendations.push(`${overduReassessments} patient(s) need reassessment. Check vitals and complaints.`);
  }
  if (criticalWaitCount > 0) {
    recommendations.push(
      `${criticalWaitCount} patient(s) waiting >45 minutes. Review triage priority and provider availability.`,
    );
  }
  if (abnormalVitals > 0) {
    recommendations.push(`${abnormalVitals} patient(s) have abnormal vitals. Escalate for clinical review.`);
  }
  if (highRiskPatients > 0) {
    recommendations.push(`${highRiskPatients} high-risk patient(s) in waiting room. Prioritize assessment.`);
  }
  if (stalVitalsCount > 0) {
    recommendations.push(`${stalVitalsCount} patient(s) have stale vitals (>30 minutes). Recheck before provider.`);
  }

  return {
    generatedAt: new Date(now).toISOString(),
    totalWaitingPatients: waitingPatients.length,
    criticalReassessmentNeeded: overduReassessments,
    overduReassessments,
    abnormalVitals,
    highRiskPatients,
    patients: waitingPatients,
    riskMetrics: {
      oldestWaitMinutes,
      averageWaitMinutes,
      criticalWaitCount,
      stalVitalsCount,
    },
    recommendations,
  };
}

/**
 * Get high-risk patients for immediate escalation.
 * Filters safety board by critical conditions.
 */
export function getHighRiskWaitingPatients(board: WaitingRoomSafetyBoard): WaitingRoomPatientRecord[] {
  return board.patients.filter(
    (p) =>
      p.reassessmentOverdue ||
      p.vitalsAbnormal ||
      p.hasHighRiskFlag ||
      p.hasSepsisAlertFlag ||
      p.hasDeteriorationRiskFlag ||
      p.waitingDurationMinutes > 60 ||
      p.highRiskComplaintFlags.length > 0,
  );
}

/**
 * Get patients ready for provider assignment.
 * Filters by completed vitals and no overdue reassessment.
 */
export function getReadyForProviderPatients(board: WaitingRoomSafetyBoard): WaitingRoomPatientRecord[] {
  return board.patients.filter(
    (p) => !p.reassessmentOverdue && p.vitalsAgeMinutes < 30 && !p.activeAlerts.some((a) => a.severity === 'Critical'),
  );
}

/**
 * Sort patients by custom criteria (waiting time, priority, risk).
 */
export function sortWaitingRoomPatients(
  patients: WaitingRoomPatientRecord[],
  sortBy: 'waiting-time' | 'priority' | 'risk' = 'risk',
): WaitingRoomPatientRecord[] {
  const sorted = [...patients];

  if (sortBy === 'waiting-time') {
    sorted.sort((a, b) => b.waitingDurationMinutes - a.waitingDurationMinutes);
  } else if (sortBy === 'priority') {
    const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3, P5: 4 };
    sorted.sort(
      (a, b) =>
        (priorityOrder[a.triageLevel as keyof typeof priorityOrder] || 5) -
        (priorityOrder[b.triageLevel as keyof typeof priorityOrder] || 5),
    );
  } else {
    // Risk: overdue reassessment > abnormal vitals > high-risk flags > long wait
    sorted.sort((a, b) => {
      if (a.reassessmentOverdue && !b.reassessmentOverdue) return -1;
      if (!a.reassessmentOverdue && b.reassessmentOverdue) return 1;
      if (a.vitalsAbnormal && !b.vitalsAbnormal) return -1;
      if (!a.vitalsAbnormal && b.vitalsAbnormal) return 1;
      if (a.hasHighRiskFlag && !b.hasHighRiskFlag) return -1;
      if (!a.hasHighRiskFlag && b.hasHighRiskFlag) return 1;
      return b.waitingDurationMinutes - a.waitingDurationMinutes;
    });
  }

  return sorted;
}

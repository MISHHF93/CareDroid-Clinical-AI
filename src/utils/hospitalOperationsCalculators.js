const SUPPORT_ONLY_COPY =
  'Operations planning support only. Does not make autonomous dispatch, staffing, admission, discharge, clinical triage, or treatment decisions.';

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function utilizationTone(percent) {
  if (!Number.isFinite(percent)) return 'neutral';
  if (percent >= 95) return 'critical';
  if (percent >= 85) return 'warning';
  if (percent < 45) return 'warning';
  return 'normal';
}

export const HOSPITAL_OPERATIONS_CALCULATOR_DISCLAIMER = SUPPORT_ONLY_COPY;

export function calculateBedOccupancy({ occupiedBeds, totalBeds, blockedBeds = 0 } = {}) {
  const occupied = toFiniteNumber(occupiedBeds);
  const total = toFiniteNumber(totalBeds);
  const blocked = toFiniteNumber(blockedBeds) ?? 0;
  if (occupied === null || total === null || total <= 0 || occupied < 0 || blocked < 0) return null;
  const usableBeds = Math.max(total - blocked, 0);
  if (usableBeds <= 0 || occupied > total) return null;
  const occupancyPercent = round((occupied / usableBeds) * 100, 1);
  const availableBeds = Math.max(usableBeds - occupied, 0);
  return {
    occupiedBeds: occupied,
    totalBeds: total,
    blockedBeds: blocked,
    usableBeds,
    availableBeds,
    occupancyPercent,
    severity: utilizationTone(occupancyPercent),
    label:
      occupancyPercent >= 95
        ? 'Critical bed occupancy'
        : occupancyPercent >= 85
          ? 'High bed occupancy'
          : occupancyPercent < 45
            ? 'Low bed occupancy'
            : 'Bed occupancy in planning range',
    interpretation:
      'Use this as an operational signal for human bed management review. Confirm census, isolation blocks, staffing, cleaning status, and local escalation rules before acting.',
  };
}

export function calculateStaffingRatio({ patientCount, staffCount, targetPatientsPerStaff = 4 } = {}) {
  const patients = toFiniteNumber(patientCount);
  const staff = toFiniteNumber(staffCount);
  const target = toFiniteNumber(targetPatientsPerStaff) ?? 4;
  if (patients === null || staff === null || patients < 0 || staff <= 0 || target <= 0) return null;
  const patientsPerStaff = round(patients / staff, 2);
  const targetStaff = Math.ceil(patients / target);
  const staffDelta = staff - targetStaff;
  const severity = staffDelta < 0 ? (patientsPerStaff >= target * 1.25 ? 'critical' : 'warning') : 'normal';
  return {
    patientCount: patients,
    staffCount: staff,
    targetPatientsPerStaff: target,
    patientsPerStaff,
    targetStaff,
    staffDelta,
    severity,
    label:
      staffDelta < 0
        ? 'Below target staffing coverage'
        : staffDelta > 0
          ? 'Above target staffing coverage'
          : 'At target staffing coverage',
    interpretation:
      'Ratio is a planning indicator only. Human supervisors must account for acuity, credentials, breaks, local labor rules, and patient-specific needs.',
  };
}

export function calculateTurnaroundTime({
  requestToAssignMinutes = 0,
  travelMinutes = 0,
  serviceMinutes = 0,
  cleanupMinutes = 0,
  targetMinutes = 60,
} = {}) {
  const parts = [requestToAssignMinutes, travelMinutes, serviceMinutes, cleanupMinutes].map(toFiniteNumber);
  const target = toFiniteNumber(targetMinutes) ?? 60;
  if (parts.some((part) => part === null || part < 0) || target <= 0) return null;
  const totalMinutes = round(parts.reduce((sum, part) => sum + part, 0), 1);
  const varianceMinutes = round(totalMinutes - target, 1);
  const severity = varianceMinutes > target * 0.25 ? 'critical' : varianceMinutes > 0 ? 'warning' : 'normal';
  return {
    requestToAssignMinutes: parts[0],
    travelMinutes: parts[1],
    serviceMinutes: parts[2],
    cleanupMinutes: parts[3],
    targetMinutes: target,
    totalMinutes,
    varianceMinutes,
    severity,
    label:
      varianceMinutes > 0
        ? 'Turnaround above target'
        : varianceMinutes < 0
          ? 'Turnaround below target'
          : 'Turnaround at target',
    interpretation:
      'Use turnaround time to review workflow bottlenecks. It does not issue assignments, reprioritize care, or override incident command.',
  };
}

export function calculateResourceUtilizationIndex({
  bedUtilizationPercent,
  staffUtilizationPercent,
  deviceUtilizationPercent,
  fleetUtilizationPercent,
} = {}) {
  const rows = [
    ['Beds', bedUtilizationPercent],
    ['Staff', staffUtilizationPercent],
    ['Devices', deviceUtilizationPercent],
    ['Fleet', fleetUtilizationPercent],
  ]
    .map(([label, value]) => ({ label, value: toFiniteNumber(value) }))
    .filter((row) => row.value !== null);

  if (rows.length === 0 || rows.some((row) => row.value < 0 || row.value > 150)) return null;
  const index = round(rows.reduce((sum, row) => sum + row.value, 0) / rows.length, 1);
  const maxDriver = rows.reduce((max, row) => (row.value > max.value ? row : max), rows[0]);
  return {
    index,
    inputs: rows,
    maxDriver,
    severity: utilizationTone(index),
    label:
      index >= 95
        ? 'Critical utilization index'
        : index >= 85
          ? 'High utilization index'
          : index < 45
            ? 'Low utilization index'
            : 'Utilization index in planning range',
    interpretation:
      'Index averages available utilization signals for command-center discussion. Validate source data and require human approval for resource moves.',
  };
}

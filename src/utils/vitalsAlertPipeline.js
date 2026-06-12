export const VITALS_ALERT_ACTIVE_STATUS = 'active';

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function alertFor({ severity, vital, value, unit, reason }) {
  return { severity, vital, value, unit, reason };
}

export function evaluateVitalsAlerts(nextVitals = {}, previousVitals = {}) {
  const alerts = [];
  const spo2 = nextVitals.spo2;
  const hr = nextVitals.hr;
  const sbp = nextVitals.bpSystolic;
  const temp = nextVitals.temp;
  const gcs = nextVitals.gcs;
  const previousGcs = previousVitals?.gcs;

  if (isNumber(spo2)) {
    if (spo2 < 88) {
      alerts.push(alertFor({ severity: 'critical', vital: 'SpO2', value: spo2, unit: '%', reason: `SpO2 ${spo2}%` }));
    } else if (spo2 <= 93) {
      alerts.push(alertFor({ severity: 'warning', vital: 'SpO2', value: spo2, unit: '%', reason: `SpO2 ${spo2}%` }));
    } else if (spo2 <= 95) {
      alerts.push(alertFor({ severity: 'watch', vital: 'SpO2', value: spo2, unit: '%', reason: `SpO2 ${spo2}%` }));
    }
  }

  if (isNumber(hr)) {
    if (hr < 40 || hr > 150) {
      alerts.push(alertFor({ severity: 'critical', vital: 'HR', value: hr, unit: 'bpm', reason: `HR ${hr}` }));
    } else if ((hr >= 40 && hr <= 50) || (hr >= 120 && hr <= 150)) {
      alerts.push(alertFor({ severity: 'warning', vital: 'HR', value: hr, unit: 'bpm', reason: `HR ${hr}` }));
    }
  }

  if (isNumber(sbp)) {
    if (sbp < 80) {
      alerts.push(alertFor({ severity: 'critical', vital: 'SBP', value: sbp, unit: 'mmHg', reason: `SBP ${sbp}` }));
    } else if ((sbp >= 80 && sbp <= 90) || (sbp >= 180 && sbp <= 200)) {
      alerts.push(alertFor({ severity: 'warning', vital: 'SBP', value: sbp, unit: 'mmHg', reason: `SBP ${sbp}` }));
    }
  }

  if (isNumber(gcs) && isNumber(previousGcs) && previousGcs - gcs >= 2) {
    alerts.push(
      alertFor({
        severity: 'critical',
        vital: 'GCS',
        value: gcs,
        unit: '',
        reason: `GCS dropped from ${previousGcs} to ${gcs} - deteriorating neuro`,
      })
    );
  }

  if (isNumber(temp) && (temp > 38.5 || temp < 35)) {
    alerts.push(alertFor({ severity: 'warning', vital: 'Temp', value: temp, unit: 'C', reason: `Temp ${temp}C` }));
  }

  return alerts;
}

export function activeVitalsAlerts(patient, severities = ['critical', 'warning', 'watch']) {
  const allowed = new Set(severities);
  return (patient?.vitalsAlerts || []).filter(
    (alert) => alert.status === VITALS_ALERT_ACTIVE_STATUS && allowed.has(alert.severity)
  );
}

export function formatVitalsAlert(alert) {
  if (!alert) return '';
  return `${alert.vital} ${alert.value}${alert.unit || ''}`;
}

export function formatActiveVitalsForCopilot(patients = []) {
  return patients.flatMap((patient) => {
    const alerts = activeVitalsAlerts(patient, ['critical', 'warning']);
    if (!alerts.length) return [];
    const critical = alerts.filter((alert) => alert.severity === 'critical');
    const severity = critical.length ? 'critical' : 'warning';
    const formattedVitals = alerts.map(formatVitalsAlert).join(', ');
    const location = patient.location || patient.roomId || 'No bed';
    const bedLabel = /^bed\b/i.test(String(location)) || location === 'No bed' ? location : `Bed ${location}`;
    const name = patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ');
    return [`ALERT: ${name} ${bedLabel} has ${severity} vitals: ${formattedVitals}`];
  });
}

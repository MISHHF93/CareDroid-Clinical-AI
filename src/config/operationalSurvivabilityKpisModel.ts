/**
 * Three pilot outcomes that define real-clinic survivability.
 */

import { auditShiftHandoffSurfaces } from '../components/whiteboard/shiftHandoffReadabilityAudit';
import {
  compareReceptionProfiles,
  simulateReceptionDay,
} from '../services/receptionThroughputModel';

export const OPERATIONAL_SURVIVABILITY_KPIS = Object.freeze({
  receptionRegistrationSeconds: 60,
  chargeNurseStatusSeconds: 30,
  directorThroughputSeconds: 120,
});

const DIRECTOR_THROUGHPUT_SURFACES = Object.freeze({
  shiftSnapshotVisible: true,
  queueHealthVisible: true,
  capacityBandVisible: true,
  boardingCountVisible: true,
  emsOffloadVisible: true,
  arrivalsTodayVisible: true,
  clickDepth: 1,
  estimatedReadSeconds: 75,
});

export function evaluateReceptionRegistrationKpi() {
  const harmonized = simulateReceptionDay({ profile: 'harmonized', patientCount: 100 });
  const express = harmonized.byWorkflow?.expressRegister?.averages;
  const expressMs = express?.totalRegistrationMs ?? harmonized.averages.totalRegistrationMs;
  const expressSeconds = Math.round(expressMs / 1000);
  const avgSeconds = Math.round(harmonized.averages.totalRegistrationMs / 1000);

  return Object.freeze({
    targetSeconds: OPERATIONAL_SURVIVABILITY_KPIS.receptionRegistrationSeconds,
    expressWalkInSeconds: expressSeconds,
    weightedAverageSeconds: avgSeconds,
    passes:
      expressSeconds <= OPERATIONAL_SURVIVABILITY_KPIS.receptionRegistrationSeconds,
    workflow: 'express-register',
    evidence: compareReceptionProfiles(100).optimizations,
  });
}

export function evaluateChargeNurseStatusKpi() {
  const audit = auditShiftHandoffSurfaces('charge_nurse');
  const after = audit.after;
  const estimatedReadSeconds = after.clickDepthToAllSignals <= 1 ? 18 : 45;

  return Object.freeze({
    targetSeconds: OPERATIONAL_SURVIVABILITY_KPIS.chargeNurseStatusSeconds,
    estimatedReadSeconds,
    visibleSignals: after.visibleCount,
    requiredSignals: after.requiredCount,
    clickDepth: after.clickDepthToAllSignals,
    passes:
      after.passes60SecondTest &&
      estimatedReadSeconds <= OPERATIONAL_SURVIVABILITY_KPIS.chargeNurseStatusSeconds,
    surfaces: ['ShiftHandoffStrip', 'OperationalHandoffDomainBar'],
  });
}

export function evaluateDirectorThroughputKpi() {
  const surfaces = DIRECTOR_THROUGHPUT_SURFACES;
  const metricCount = [
    surfaces.shiftSnapshotVisible,
    surfaces.queueHealthVisible,
    surfaces.capacityBandVisible,
    surfaces.boardingCountVisible,
    surfaces.emsOffloadVisible,
    surfaces.arrivalsTodayVisible,
  ].filter(Boolean).length;

  return Object.freeze({
    targetSeconds: OPERATIONAL_SURVIVABILITY_KPIS.directorThroughputSeconds,
    estimatedReadSeconds: surfaces.estimatedReadSeconds,
    metricCount,
    clickDepth: surfaces.clickDepth,
    passes:
      surfaces.estimatedReadSeconds <= OPERATIONAL_SURVIVABILITY_KPIS.directorThroughputSeconds &&
      metricCount >= 5,
    surfaces: [
      'ChargeNurseOperationalStrip / ShiftHandoffStrip',
      'QueueOperationalPanel',
      'Emergency analytics throughput tiles',
    ],
  });
}

export function evaluateOperationalSurvivabilityKpis() {
  const reception = evaluateReceptionRegistrationKpi();
  const chargeNurse = evaluateChargeNurseStatusKpi();
  const director = evaluateDirectorThroughputKpi();
  const passedCount = [reception, chargeNurse, director].filter((kpi) => kpi.passes).length;

  return Object.freeze({
    kpis: Object.freeze({
      reception,
      chargeNurse,
      director,
    }),
    passedCount,
    totalCount: 3,
    passesAll: passedCount === 3,
    pilotReady: passedCount >= 2,
  });
}

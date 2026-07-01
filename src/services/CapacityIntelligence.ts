import { CapacityScore, PatientState } from '../types/emergency';

export const MAX_ED_PATIENT_CAPACITY = 30;

function scoreRank(score) {
  return (
    {
      [CapacityScore.Green]: 0,
      [CapacityScore.Yellow]: 1,
      [CapacityScore.Orange]: 2,
      [CapacityScore.Red]: 3,
    }[score] ?? 0
  );
}

function highestScore(scores) {
  return scores.reduce(
    (highest, score) => (scoreRank(score) > scoreRank(highest) ? score : highest),
    CapacityScore.Green
  );
}

function occupancyScore(occupancyPercent) {
  if (occupancyPercent >= 95) return CapacityScore.Red;
  if (occupancyPercent >= 80) return CapacityScore.Orange;
  if (occupancyPercent >= 60) return CapacityScore.Yellow;
  return CapacityScore.Green;
}

function boardingScore(boardingCount) {
  if (boardingCount >= 6) return CapacityScore.Red;
  if (boardingCount >= 4) return CapacityScore.Orange;
  if (boardingCount >= 2) return CapacityScore.Yellow;
  return CapacityScore.Green;
}

function reassessmentScore(reassessmentQueueLength) {
  if (reassessmentQueueLength >= 8) return CapacityScore.Red;
  if (reassessmentQueueLength >= 5) return CapacityScore.Orange;
  if (reassessmentQueueLength >= 3) return CapacityScore.Yellow;
  return CapacityScore.Green;
}

export function getCapacitySnapshot({
  patients = [] as any[],
  reassessmentQueueLength = 0,
  maxCapacity = MAX_ED_PATIENT_CAPACITY,
}: any = {}) {
  const currentOccupancy = patients.filter(
    (patient) => patient.state !== PatientState.Discharge
  ).length;
  const boardingCount = patients.filter(
    (patient) => patient.state === PatientState.Admission
  ).length;
  const occupancyPercent = Math.round((currentOccupancy / maxCapacity) * 100);
  const score = highestScore([
    occupancyScore(occupancyPercent),
    boardingScore(boardingCount),
    reassessmentScore(reassessmentQueueLength),
  ]);

  return Object.freeze({
    score,
    maxCapacity,
    currentOccupancy,
    occupancyPercent,
    boardingCount,
    reassessmentQueueLength,
    generatedAt: new Date().toISOString(),
  });
}

export function getCapacityAlertMessage(snapshot) {
  if (![CapacityScore.Orange, CapacityScore.Red].includes(snapshot?.score)) return '';

  return `Capacity Alert: ${snapshot.score} capacity. Occupancy ${snapshot.currentOccupancy}/${snapshot.maxCapacity} (${snapshot.occupancyPercent}%), ${snapshot.boardingCount} boarding, ${snapshot.reassessmentQueueLength} in ReassessmentQueue.`;
}

export const CapacityIntelligence = Object.freeze({
  maxCapacity: MAX_ED_PATIENT_CAPACITY,
  getCapacitySnapshot,
  getCapacityAlertMessage,
});

export default CapacityIntelligence;

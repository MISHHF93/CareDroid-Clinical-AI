/**
 * Practitioner-facing dataset shaping — representative samples without overload.
 */
import { PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS } from '../config/practitionerCleanup.constants';
import { isPractitionerCleanupEnabled } from '../config/practitionerCleanup.config';
import { dedupePatientsByMrn } from './patientSeedUtils';

export { dedupePatientsByMrn } from './patientSeedUtils';

const STATE_PRIORITY = Object.freeze([
  'Waiting',
  'Triage',
  'Assessment',
  'Orders',
  'Results',
  'Admission',
  'Discharge',
]);

function stateRank(state) {
  const index = STATE_PRIORITY.indexOf(state);
  return index === -1 ? STATE_PRIORITY.length : index;
}

/**
 * @template T
 * @param {T[]} patients
 * @param {number} [max]
 */
export function capPatientsForPractitionerView(patients, max = PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS) {
  if (!isPractitionerCleanupEnabled() || patients.length <= max) {
    return patients;
  }

  const buckets = new Map();
  for (const patient of patients) {
    const state = patient.state || 'Unknown';
    const bucket = buckets.get(state) || [];
    bucket.push(patient);
    buckets.set(state, bucket);
  }

  const selected = [] as any[];
  const states = [...buckets.keys()].sort((a, b) => stateRank(a) - stateRank(b));
  let cursor = 0;

  while (selected.length < max && buckets.size > 0) {
    const state = states[cursor % states.length];
    const bucket = buckets.get(state);
    if (!bucket?.length) {
      buckets.delete(state);
      states.splice(states.indexOf(state), 1);
      cursor += 1;
      continue;
    }
    selected.push(bucket.shift());
    if (!bucket.length) {
      buckets.delete(state);
      states.splice(states.indexOf(state), 1);
    }
    cursor += 1;
  }

  return selected.slice(0, max);
}

/**
 * Practitioner seed shaping — dedupe MRNs then cap representative census.
 * @template T
 * @param {T[]} patients
 * @param {number} [max]
 */
export function shapePractitionerSeedPatients(patients, max = PRACTITIONER_WALKTHROUGH_ACTIVE_CENSUS) {
  return capPatientsForPractitionerView(dedupePatientsByMrn(patients), max);
}
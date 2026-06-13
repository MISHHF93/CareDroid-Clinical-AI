const MIGRATION_NAME = '010_migrate_to_unified_patients';
const TARGET_COLLECTION = 'unified_patients';
const BACKUP_METADATA_COLLECTION = 'migration_010_unified_patient_backups';

const PATIENT_SOURCE_COLLECTIONS = [
  'patients',
  'emergency_patients',
  'patient_records',
  'patientrecords',
  'emergency_patient_records',
  'legacy_patients',
];

const RELATED_COLLECTIONS = {
  vitals: ['vital_signs', 'patient_vitals', 'vitals'],
  reassessments: ['reassessments', 'patient_reassessments', 'reassessment_history'],
  stateHistory: ['patient_journeys', 'journey_events', 'state_history', 'patient_state_history'],
  referrals: ['referrals', 'patient_referrals'],
  boarding: ['boarding', 'boarding_events', 'bed_requests', 'bed_assignments'],
  safety: ['safety_incidents'],
  protocols: ['protocol_audit'],
  wearable: ['wearable_data'],
  virtualCare: ['virtual_rechecks'],
  smartIntake: ['smartintakesessions', 'smart_intake_sessions'],
};

const JOURNEY_STATES = new Set([
  'EMS_DISPATCHED',
  'EMS_ON_SCENE',
  'EMS_EN_ROUTE',
  'ARRIVAL',
  'REGISTRATION',
  'TRIAGE',
  'WAITING',
  'ASSESSMENT',
  'ORDERS',
  'RESULTS',
  'DISPOSITION',
  'ADMISSION',
  'ADMISSION_COMPLETED',
  'DISCHARGE',
]);

const STATE_MAP = {
  Arrival: 'ARRIVAL',
  Registration: 'REGISTRATION',
  Triage: 'TRIAGE',
  Waiting: 'WAITING',
  Assessment: 'ASSESSMENT',
  Orders: 'ORDERS',
  Results: 'RESULTS',
  Disposition: 'DISPOSITION',
  Admission: 'ADMISSION',
  Discharge: 'DISCHARGE',
  boarding: 'ADMISSION',
  discharged: 'DISCHARGE',
  admitted: 'ADMISSION',
};

const EMS_STATUSES = new Set(['dispatched', 'on_scene', 'en_route', 'arrived', 'none']);
const BOARDING_STATUSES = new Set(['not_boarded', 'boarding', 'bed_assigned', 'transferred']);
const PROTOCOL_STATUSES = new Set(['pending', 'acknowledged', 'in_progress', 'completed', 'deferred']);

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function backupCollectionName(collectionName, backupId) {
  return `migration_010_backup_${collectionName}_${backupId}`;
}

async function collectionExists(db, name) {
  return db.listCollections({ name }).hasNext();
}

async function existingCollections(db, names) {
  const existing = [];
  for (const name of names) {
    if (await collectionExists(db, name)) existing.push(name);
  }
  return existing;
}

async function readCollection(db, name) {
  if (!(await collectionExists(db, name))) return [];
  return db.collection(name).find({}).toArray();
}

async function backupCollection(db, sourceName, backupId) {
  if (!(await collectionExists(db, sourceName))) {
    return { sourceName, backupName: null, existed: false, count: 0 };
  }

  const backupName = backupCollectionName(sourceName, backupId);
  const docs = await db.collection(sourceName).find({}).toArray();
  if (await collectionExists(db, backupName)) {
    await db.collection(backupName).drop();
  }
  await db.createCollection(backupName);
  if (docs.length) {
    await db.collection(backupName).insertMany(
      docs.map((doc) => ({
        ...doc,
        _migration010Backup: {
          sourceCollection: sourceName,
          backupId,
          createdAt: new Date(),
        },
      })),
      { ordered: false },
    );
  }

  return { sourceName, backupName, existed: true, count: docs.length };
}

function asString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function normalizedKey(value) {
  const stringValue = asString(value);
  return stringValue ? stringValue.toLowerCase() : null;
}

function objectIdString(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.toString) return value.toString();
  return asString(value);
}

function firstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function boundedNumber(value, min, max, fallback = null) {
  const numeric = toNumber(value);
  if (numeric === null) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null);
  if (typeof value === 'string') {
    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [value];
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function normalizeState(value) {
  const raw = asString(value);
  if (!raw) return 'ARRIVAL';
  if (JOURNEY_STATES.has(raw)) return raw;
  if (STATE_MAP[raw]) return STATE_MAP[raw];
  const upper = raw.replace(/[\s-]+/g, '_').toUpperCase();
  if (JOURNEY_STATES.has(upper)) return upper;
  return 'ARRIVAL';
}

function normalizeGender(value) {
  const raw = asString(value);
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (['m', 'male'].includes(lower)) return 'male';
  if (['f', 'female'].includes(lower)) return 'female';
  if (['nonbinary', 'non_binary', 'non-binary'].includes(lower)) return 'non_binary';
  if (['other', 'unknown'].includes(lower)) return lower;
  return raw;
}

function normalizeDps(value, fallback = 4) {
  const score = toNumber(value);
  return [1, 2, 3, 4, 5].includes(score) ? score : fallback;
}

function priorityToDps(value) {
  const raw = asString(value);
  if (!raw) return null;
  const match = raw.match(/[Pp](\d)/) || raw.match(/CTAS(\d)/i) || raw.match(/ESI(\d)/i);
  return match ? normalizeDps(Number(match[1]), null) : null;
}

function normalizeTriageCode(value, priority) {
  const raw = asString(value);
  if (raw && /^(CTAS|ESI)[1-5]$/i.test(raw)) return raw.toUpperCase();
  const dps = priorityToDps(priority);
  return dps ? `CTAS${dps}` : null;
}

function normalizeTriageSystem(code) {
  if (!code) return null;
  if (code.startsWith('CTAS')) return 'CTAS';
  if (code.startsWith('ESI')) return 'ESI';
  return null;
}

function normalizeVitals(record, source = null) {
  if (!record || typeof record !== 'object') return null;
  const sbp = firstPresent(record.sbp, record.bpSystolic, record.systolicBp);
  const dbp = firstPresent(record.dbp, record.bpDiastolic, record.diastolicBp);
  const bp =
    asString(record.bp) ||
    asString(record.bloodPressure) ||
    (sbp || dbp ? [sbp, dbp].filter((part) => part !== undefined && part !== null).join('/') : null);

  const vital = {
    hr: toNumber(firstPresent(record.hr, record.heartRate, record.pulse)),
    bp,
    rr: toNumber(firstPresent(record.rr, record.respiratoryRate)),
    spO2: toNumber(firstPresent(record.spO2, record.spo2, record.o2, record.oxygenSaturation)),
    temp: toNumber(firstPresent(record.temp, record.temperature)),
    gcs: toNumber(record.gcs),
    painScore: boundedNumber(firstPresent(record.painScore, record.pain), 0, 10),
    recordedAt: toDate(firstPresent(record.recordedAt, record.timestamp, record.createdAt, record.time)),
    source: asString(firstPresent(record.source, record.recordedBy, record.deviceType, source)),
  };

  const hasValue = Object.entries(vital).some(([key, value]) => key !== 'source' && value !== null);
  return hasValue ? vital : null;
}

function legacyVitals(vital) {
  if (!vital) return {};
  return {
    hr: vital.hr ?? null,
    bp: vital.bp ?? null,
    o2: vital.spO2 ?? null,
    rr: vital.rr ?? null,
    temperature: vital.temp ?? null,
  };
}

function normalizeMedication(item) {
  if (!item) return null;
  if (typeof item === 'string') return { name: item };
  const name = asString(firstPresent(item.name, item.medication, item.drug));
  if (!name) return null;
  return {
    name,
    dose: asString(item.dose),
    route: asString(item.route),
    frequency: asString(item.frequency),
    lastTakenAt: toDate(firstPresent(item.lastTakenAt, item.last_taken_at)),
  };
}

function normalizeAllergy(item) {
  if (!item) return null;
  if (typeof item === 'string') return { substance: item, severity: 'unknown' };
  const substance = asString(firstPresent(item.substance, item.allergen, item.name));
  if (!substance) return null;
  return {
    substance,
    reaction: asString(item.reaction),
    severity: asString(item.severity) || 'unknown',
  };
}

function normalizeStateHistory(item, fallbackState = 'ARRIVAL') {
  if (!item || typeof item !== 'object') return null;
  return {
    state: normalizeState(firstPresent(item.state, item.to, item.currentState, item.current_state, fallbackState)),
    timestamp: toDate(firstPresent(item.timestamp, item.createdAt, item.updatedAt, item.time)) || new Date(0),
    actor: asString(firstPresent(item.actor, item.staffId, item.userId, item.createdBy)),
    notes: asString(firstPresent(item.notes, item.note, item.summary)),
  };
}

function normalizeReassessment(item, fallbackScore) {
  if (!item || typeof item !== 'object') return null;
  return {
    score: normalizeDps(firstPresent(item.score, item.dpsScore, item.dps_score, item.newDpsScore), fallbackScore),
    reason: asString(firstPresent(item.reason, item.notes, item.note, item.findings)) || 'Migrated reassessment',
    clinician: asString(firstPresent(item.clinician, item.clinicianId, item.actor, item.createdBy)) || 'migration-010',
    timestamp: toDate(firstPresent(item.timestamp, item.reassessedAt, item.createdAt, item.updatedAt)) || new Date(0),
  };
}

function normalizeSafetyAlert(item) {
  if (!item || typeof item !== 'object') return null;
  return {
    incidentId: asString(firstPresent(item.incidentId, item.id, item._id)) || `incident-${Date.now()}`,
    type: asString(firstPresent(item.type, item.eventType, item.title)) || 'safety_alert',
    severity: firstPresent(item.severity, item.priority, 'info'),
    timestamp: toDate(firstPresent(item.timestamp, item.createdAt, item.updatedAt)) || new Date(0),
    resolved: Boolean(firstPresent(item.resolved, item.dismissed, false)),
    resolvedAt: toDate(item.resolvedAt),
    resolution: asString(firstPresent(item.resolution, item.resolutionNotes)),
    resolvedBy: asString(item.resolvedBy),
  };
}

function normalizeProtocol(item) {
  if (!item || typeof item !== 'object') return null;
  const protocolId = asString(firstPresent(item.protocolId, item.id, item.protocol_id, item.eventType));
  if (!protocolId) return null;
  const status = asString(item.status);
  return {
    protocolId,
    protocolName: asString(firstPresent(item.protocolName, item.name, item.protocol_id, item.eventType)) || protocolId,
    triggeredAt: toDate(firstPresent(item.triggeredAt, item.timestamp, item.createdAt)) || new Date(0),
    triggeredBy: asString(firstPresent(item.triggeredBy, item.actor, item.createdBy)),
    status: status && PROTOCOL_STATUSES.has(status) ? status : 'completed',
    compliance: {
      requiredSteps: asArray(item.requiredSteps),
      completedSteps: asArray(item.completedSteps),
      complianceScore: boundedNumber(item.complianceScore, 0, 100),
      lastReviewedAt: toDate(item.lastReviewedAt),
    },
  };
}

function normalizeWearableVital(item) {
  const vital = normalizeVitals(item, 'wearable');
  if (!vital) return null;
  return {
    ...vital,
    deviceId: asString(firstPresent(item.deviceId, item.wearableDeviceId)),
    timestamp: toDate(firstPresent(item.timestamp, item.recordedAt, item.createdAt)) || new Date(0),
    fallDetected: Boolean(item.fallDetected),
  };
}

function normalizeContinuousVital(item) {
  if (!item || typeof item !== 'object') return null;
  const timestamp = toDate(firstPresent(item.timestamp, item.recordedAt, item.createdAt)) || new Date(0);
  const source = asString(firstPresent(item.source, item.deviceType));
  return {
    timestamp,
    heartRate: toNumber(firstPresent(item.heartRate, item.hr)),
    oxygenSaturation: toNumber(firstPresent(item.oxygenSaturation, item.spO2, item.spo2, item.o2)),
    respiratoryRate: toNumber(firstPresent(item.respiratoryRate, item.rr)),
    temperature: toNumber(firstPresent(item.temperature, item.temp)),
    source: ['apple_watch', 'samsung_watch', 'fitbit', 'other'].includes(source) ? source : 'other',
  };
}

function normalizeAiRecommendation(item) {
  if (!item || typeof item !== 'object') return null;
  const text = asString(firstPresent(item.text, item.recommendation, item.summary));
  if (!text) return null;
  return {
    id: asString(firstPresent(item.id, item._id)) || `ai-${Date.now()}`,
    type: asString(item.type) || 'clinical_suggestion',
    text,
    rationale: asString(item.rationale),
    generatedAt: toDate(firstPresent(item.generatedAt, item.createdAt, item.timestamp)) || new Date(0),
    model: asString(item.model),
    reviewStatus: asString(item.reviewStatus) || 'pending_review',
    reviewedBy: asString(item.reviewedBy),
    reviewedAt: toDate(item.reviewedAt),
  };
}

function normalizeIdentifierType(type) {
  const normalized = normalizedKey(type);
  if (!normalized) return null;
  if (['internal', 'mrn', 'phn', 'health_card', 'ems_temporary', 'external_ehr', 'referral_source'].includes(normalized)) {
    return normalized;
  }
  if (normalized === 'healthcard' || normalized === 'health_card_number') return 'health_card';
  return null;
}

function identifier(type, value, verified = false, issuer = null, addedAt = null) {
  const normalizedType = normalizeIdentifierType(type);
  const normalizedValue = asString(value);
  if (!normalizedType || !normalizedValue) return null;
  return {
    type: normalizedType,
    value: normalizedValue,
    issuer: asString(issuer),
    verified: Boolean(verified),
    addedAt: toDate(addedAt) || new Date(0),
  };
}

function identifiersFromPatient(patient) {
  const identifiers = [];
  for (const item of asArray(patient.identifiers)) {
    if (!item || typeof item !== 'object') continue;
    identifiers.push(identifier(item.type, item.value, item.verified, item.issuer, item.addedAt));
  }

  identifiers.push(identifier('internal', patient._id, true, 'legacy_mongodb', patient.createdAt));
  identifiers.push(identifier('mrn', firstPresent(patient.mrn, patient.medicalRecordNumber), Boolean(patient.verified_at), null, patient.createdAt));
  identifiers.push(identifier('phn', firstPresent(patient.phn, patient.personalHealthNumber), Boolean(patient.verified_at), null, patient.createdAt));
  identifiers.push(identifier('health_card', firstPresent(patient.healthCardNumber, patient.health_card, patient.health_card_number), Boolean(patient.verified_at), null, patient.createdAt));
  identifiers.push(identifier('ems_temporary', firstPresent(patient.temporary_encounter_id, patient.temporaryEncounterId), true, null, patient.createdAt));
  identifiers.push(identifier('external_ehr', firstPresent(patient.externalEhrId, patient.fhirPatientId), false, null, patient.createdAt));
  identifiers.push(identifier('referral_source', patient.referralSourceId, false, null, patient.createdAt));

  return uniqueBy(
    identifiers.filter(Boolean),
    (item) => `${item.type}:${normalizedKey(item.value)}`,
  );
}

function patientIdentityKeys(patient) {
  const keys = [];
  const add = (type, value) => {
    const normalized = normalizedKey(value);
    if (normalized) keys.push(`${type}:${normalized}`);
  };

  add('mrn', firstPresent(patient.mrn, patient.medicalRecordNumber));
  add('phn', firstPresent(patient.phn, patient.personalHealthNumber));
  add('health_card', firstPresent(patient.healthCardNumber, patient.health_card, patient.health_card_number));
  add('temporary_encounter_id', firstPresent(patient.temporary_encounter_id, patient.temporaryEncounterId));
  add('ems_unit_id', firstPresent(patient.ems_unit_id, patient.emsUnitId));
  for (const item of asArray(patient.identifiers)) {
    if (item && typeof item === 'object') add(normalizeIdentifierType(item.type) || item.type, item.value);
  }
  add('source_id', objectIdString(patient._id));
  add('legacy_id', patient.id);

  return uniqueBy(keys, (item) => item);
}

function relatedRecordKeys(record) {
  const keys = [];
  const add = (type, value) => {
    const normalized = normalizedKey(value);
    if (normalized) keys.push(`${type}:${normalized}`);
  };

  add('source_id', firstPresent(record.patientId, record.patient_id, record.patient, record.patientObjectId));
  add('legacy_id', firstPresent(record.patientId, record.patient_id, record.patient));
  add('mrn', firstPresent(record.mrn, record.patientMrn, record.medicalRecordNumber));
  add('phn', firstPresent(record.phn, record.patientPhn, record.personalHealthNumber));
  add('health_card', firstPresent(record.healthCardNumber, record.health_card, record.health_card_number));
  add('temporary_encounter_id', firstPresent(record.temporaryEncounterId, record.temporary_encounter_id));
  add('ems_unit_id', firstPresent(record.emsUnitId, record.ems_unit_id));
  return uniqueBy(keys, (item) => item);
}

function buildPatientGroups(sourceDocs) {
  const groups = [];
  const groupByKey = new Map();

  for (const source of sourceDocs) {
    const keys = patientIdentityKeys(source.document);
    const matchedGroups = uniqueBy(
      keys.map((key) => groupByKey.get(key)).filter(Boolean),
      (group) => group.id,
    );
    const group =
      matchedGroups[0] ||
      {
        id: `group-${groups.length + 1}`,
        patients: [],
        keys: new Set(),
        related: Object.fromEntries(Object.keys(RELATED_COLLECTIONS).map((key) => [key, []])),
      };

    group.patients.push(source);
    for (const key of keys) group.keys.add(key);

    if (!groups.includes(group)) groups.push(group);

    for (let index = 1; index < matchedGroups.length; index += 1) {
      const duplicate = matchedGroups[index];
      for (const duplicateSource of duplicate.patients) group.patients.push(duplicateSource);
      for (const duplicateKey of duplicate.keys) group.keys.add(duplicateKey);
      const duplicateIndex = groups.indexOf(duplicate);
      if (duplicateIndex >= 0) groups.splice(duplicateIndex, 1);
    }

    for (const key of group.keys) groupByKey.set(key, group);
  }

  return groups;
}

function attachRelatedRecords(groups, relatedDocs) {
  const groupByKey = new Map();
  for (const group of groups) {
    for (const key of group.keys) groupByKey.set(key, group);
  }

  const unlinked = {};
  for (const [kind, records] of Object.entries(relatedDocs)) {
    unlinked[kind] = 0;
    for (const record of records) {
      const keys = relatedRecordKeys(record.document);
      const group = keys.map((key) => groupByKey.get(key)).find(Boolean);
      if (group) {
        group.related[kind].push(record);
      } else {
        unlinked[kind] += 1;
      }
    }
  }
  return unlinked;
}

function choosePrimaryPatient(group) {
  const patientsCollectionDoc = group.patients.find((source) => source.collection === 'patients');
  return patientsCollectionDoc || group.patients[0];
}

function patientName(patient) {
  const direct = asString(patient.name);
  if (direct) return direct;
  const first = asString(firstPresent(patient.firstName, patient.first_name));
  const last = asString(firstPresent(patient.lastName, patient.last_name));
  const combined = [first, last].filter(Boolean).join(' ');
  return combined || 'Unknown Patient';
}

function patientAge(patient) {
  const age = firstPresent(patient.age, patient.patientAge);
  if (age !== null) return String(age);
  const dob = toDate(firstPresent(patient.dob, patient.date_of_birth, patient.dateOfBirth));
  if (!dob) return 'Unknown';
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const birthdayPassed =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!birthdayPassed) years -= 1;
  return years >= 0 ? String(years) : 'Unknown';
}

function sortedHistory(items) {
  return items.sort((left, right) => {
    const leftTime = toDate(firstPresent(left.timestamp, left.recordedAt, left.triggeredAt))?.getTime() || 0;
    const rightTime = toDate(firstPresent(right.timestamp, right.recordedAt, right.triggeredAt))?.getTime() || 0;
    return leftTime - rightTime;
  });
}

function relatedPayload(group, kind) {
  return (group.related[kind] || []).map((record) => record.document);
}

function transformGroup(group, backupId) {
  const primarySource = choosePrimaryPatient(group);
  const primary = primarySource.document;
  const allPatients = group.patients.map((source) => source.document);
  const newestPatient = [...allPatients].sort((left, right) => {
    const leftTime = toDate(firstPresent(left.updatedAt, left.modifiedAt, left.createdAt))?.getTime() || 0;
    const rightTime = toDate(firstPresent(right.updatedAt, right.modifiedAt, right.createdAt))?.getTime() || 0;
    return rightTime - leftTime;
  })[0];

  const merged = { ...primary, ...newestPatient };
  const identifiers = uniqueBy(
    allPatients.flatMap(identifiersFromPatient),
    (item) => `${item.type}:${normalizedKey(item.value)}`,
  );
  const mrn =
    asString(firstPresent(merged.mrn, merged.medicalRecordNumber)) ||
    identifiers.find((item) => item.type === 'mrn')?.value ||
    null;
  const phn =
    asString(firstPresent(merged.phn, merged.personalHealthNumber)) ||
    identifiers.find((item) => item.type === 'phn')?.value ||
    null;

  const sourceVitals = [
    ...allPatients.flatMap((patient) => asArray(patient.vitalHistory || patient.vital_history)),
    ...allPatients.flatMap((patient) => (Array.isArray(patient.vitals) ? patient.vitals : patient.vitals ? [patient.vitals] : [])),
    ...relatedPayload(group, 'vitals'),
  ];
  const currentVitals =
    normalizeVitals(firstPresent(merged.currentVitals, Array.isArray(merged.vitals) ? merged.vitals.at(-1) : merged.vitals)) ||
    sourceVitals.map((item) => normalizeVitals(item)).filter(Boolean).at(-1) ||
    {};
  const vitalHistory = uniqueBy(
    sortedHistory(sourceVitals.map((item) => normalizeVitals(item)).filter(Boolean)),
    (item) => JSON.stringify([item.recordedAt, item.hr, item.bp, item.rr, item.spO2, item.temp, item.source]),
  );
  if (Object.keys(currentVitals).length && !vitalHistory.length) vitalHistory.push(currentVitals);

  const fallbackState = normalizeState(firstPresent(merged.currentState, merged.current_state, merged.state));
  const stateHistory = uniqueBy(
    sortedHistory([
      ...allPatients.flatMap((patient) => asArray(patient.stateHistory || patient.state_history)),
      ...allPatients.flatMap((patient) => asArray(patient.timeline)),
      ...relatedPayload(group, 'stateHistory'),
    ].map((item) => normalizeStateHistory(item, fallbackState)).filter(Boolean)),
    (item) => JSON.stringify([item.state, item.timestamp, item.actor, item.notes]),
  );
  if (!stateHistory.length) {
    stateHistory.push({
      state: fallbackState,
      timestamp: toDate(firstPresent(merged.arrivalTime, merged.createdAt)) || new Date(0),
      actor: 'migration-010',
      notes: 'Initial state inferred during unified patient migration',
    });
  }

  const dpsScore = normalizeDps(
    firstPresent(merged.dpsScore, merged.dps_score, priorityToDps(firstPresent(merged.priority, merged.triage_code))),
    4,
  );
  const dpsHistory = uniqueBy(
    sortedHistory([
      ...allPatients.flatMap((patient) => asArray(patient.dpsHistory || patient.reassessment_history || patient.reassessmentHistory)),
      ...relatedPayload(group, 'reassessments'),
    ].map((item) => normalizeReassessment(item, dpsScore)).filter(Boolean)),
    (item) => JSON.stringify([item.score, item.reason, item.clinician, item.timestamp]),
  );

  const wearableVitalHistory = uniqueBy(
    [
      ...allPatients.flatMap((patient) => asArray(patient.wearableVitalHistory || patient.wearable_vital_history)),
      ...relatedPayload(group, 'wearable'),
    ].map(normalizeWearableVital).filter(Boolean),
    (item) => JSON.stringify([item.timestamp, item.deviceId, item.hr, item.spO2]),
  );
  const continuousVitals = uniqueBy(
    [
      ...allPatients.flatMap((patient) => asArray(patient.continuousVitals || patient.continuous_vitals)),
      ...relatedPayload(group, 'wearable'),
    ].map(normalizeContinuousVital).filter(Boolean),
    (item) => JSON.stringify([item.timestamp, item.source, item.heartRate, item.oxygenSaturation]),
  );

  const triageCode = normalizeTriageCode(firstPresent(merged.triage?.code, merged.triage_code), merged.priority);
  const emsStatus = asString(firstPresent(merged.emsStatus, merged.ems_status)) || 'none';
  const boardingStatus = asString(merged.boardingStatus) || 'not_boarded';

  const safetyAlerts = uniqueBy(
    [
      ...allPatients.flatMap((patient) => asArray(patient.safetyAlerts || patient.safety_alerts)),
      ...relatedPayload(group, 'safety'),
    ].map(normalizeSafetyAlert).filter(Boolean),
    (item) => `${item.incidentId}:${item.timestamp}`,
  );

  const triggeredProtocols = uniqueBy(
    [
      ...allPatients.flatMap((patient) => asArray(patient.triggeredProtocols || patient.triggered_protocols)),
      ...relatedPayload(group, 'protocols'),
    ].map(normalizeProtocol).filter(Boolean),
    (item) => `${item.protocolId}:${item.triggeredAt}`,
  );

  const smartIntakeSessions = relatedPayload(group, 'smartIntake');
  const intakeMedications = smartIntakeSessions.flatMap((session) => asArray(session.medications));
  const intakeAllergies = smartIntakeSessions.flatMap((session) => asArray(session.allergies));
  const medications = uniqueBy(
    [...allPatients.flatMap((patient) => asArray(patient.medications)), ...intakeMedications]
      .map(normalizeMedication)
      .filter(Boolean),
    (item) => normalizedKey([item.name, item.dose, item.route, item.frequency].filter(Boolean).join('|')),
  );
  const allergies = uniqueBy(
    [...allPatients.flatMap((patient) => asArray(patient.allergies)), ...intakeAllergies]
      .map(normalizeAllergy)
      .filter(Boolean),
    (item) => normalizedKey([item.substance, item.reaction].filter(Boolean).join('|')),
  );

  const aiRecommendations = uniqueBy(
    allPatients.flatMap((patient) => asArray(patient.aiRecommendations || patient.ai_recommendations))
      .map(normalizeAiRecommendation)
      .filter(Boolean),
    (item) => item.id,
  );

  const sourcePatientIds = group.patients.map((source) => ({
    collection: source.collection,
    id: objectIdString(source.document._id),
    legacyId: asString(source.document.id),
  }));

  const unified = {
    _id: primary._id,
    mrn,
    phn,
    name: patientName(merged),
    age: patientAge(merged),
    gender: normalizeGender(firstPresent(merged.gender, merged.sex)),
    dob: firstPresent(merged.dob, merged.date_of_birth, merged.dateOfBirth) || null,
    identifiers,

    phone: asString(merged.phone),
    email: asString(merged.email),
    address: asString(merged.address),
    emergencyContact: merged.emergencyContact || merged.emergency_contact || {},

    chiefComplaint: asString(firstPresent(merged.chiefComplaint, merged.chief_complaint)) || 'Not specified',
    hpi: asString(merged.hpi),
    pmh: asArray(firstPresent(merged.pmh, merged.pastMedicalHistory, merged.past_medical_history)).map(String),
    medications,
    allergies,
    codeStatus: asString(firstPresent(merged.codeStatus, merged.code_status)) || 'unknown',

    currentVitals,
    vitalHistory,
    triage: {
      code: triageCode,
      system: normalizeTriageSystem(triageCode),
      timestamp: toDate(firstPresent(merged.triage?.timestamp, merged.triageTime, merged.triage_time)),
      notes: asString(firstPresent(merged.triage?.notes, merged.triageNotes)),
      nurseId: asString(firstPresent(merged.triage?.nurseId, merged.triageNurseId)),
    },

    currentState: fallbackState,
    stateHistory,
    waitTimeMinutes: toNumber(firstPresent(merged.waitTimeMinutes, merged.wait_time_minutes)) || 0,

    dpsScore,
    lastReassessment: toDate(firstPresent(merged.lastReassessment, merged.last_reassessment)),
    nextReassessmentDue: toDate(firstPresent(merged.nextReassessmentDue, merged.next_reassessment_due)),
    dpsHistory,

    decisionToAdmitTime: toDate(merged.decisionToAdmitTime),
    boardingStartTime: toDate(merged.boardingStartTime),
    boardingStatus: BOARDING_STATUSES.has(boardingStatus) ? boardingStatus : 'not_boarded',
    boardTimeMinutes: toNumber(merged.boardTimeMinutes),
    bedRequest: {
      requestedAt: toDate(firstPresent(merged.bedRequest?.requestedAt, merged.bed_requested_at)),
      requestedBy: asString(firstPresent(merged.bedRequest?.requestedBy, merged.bed_requested_by)),
      service: asString(firstPresent(merged.bedRequest?.service, merged.admittingService)),
      priority: asString(firstPresent(merged.bedRequest?.priority, merged.bedPriority)),
      status: asString(firstPresent(merged.bedRequest?.status, merged.bed_request_status)) || 'not_requested',
    },
    bedAssignment: {
      bedId: asString(firstPresent(merged.bedAssignment?.bedId, merged.bedId, merged.roomId)),
      unit: asString(firstPresent(merged.bedAssignment?.unit, merged.unit)),
      assignedAt: toDate(firstPresent(merged.bedAssignment?.assignedAt, merged.bedAssignedAt)),
      assignedBy: asString(firstPresent(merged.bedAssignment?.assignedBy, merged.bedAssignedBy)),
      transferReadyAt: toDate(firstPresent(merged.bedAssignment?.transferReadyAt, merged.transferReadyAt)),
    },

    triggeredProtocols,
    deteriorationPrediction: merged.deteriorationPrediction || merged.deterioration_prediction || {},

    wearableDeviceId: asString(firstPresent(merged.wearableDeviceId, merged.wearable_device_id)),
    lastWearableSync: toDate(firstPresent(merged.lastWearableSync, merged.last_wearable_sync)),
    wearableVitalHistory,
    fallDetection: merged.fallDetection || merged.fall_detection || {},
    continuousVitals,

    emsStatus: EMS_STATUSES.has(emsStatus) ? emsStatus : 'none',
    emsUnitId: asString(firstPresent(merged.emsUnitId, merged.ems_unit_id)),
    dispatchTimestamp: toDate(firstPresent(merged.dispatchTimestamp, merged.dispatch_timestamp)),
    etaMinutes: toNumber(firstPresent(merged.etaMinutes, merged.eta_minutes)),
    mciBatchId: asString(merged.mciBatchId),
    mciPatientNumber: toNumber(merged.mciPatientNumber),
    triageColor: asString(merged.triageColor),
    surgeActivationId: asString(merged.surgeActivationId),
    fieldTriageTime: toDate(merged.fieldTriageTime),

    virtualCare: {
      recheckScheduled: Boolean(firstPresent(merged.virtualCare?.recheckScheduled, merged.virtualRecheckScheduled, false)),
      recheckTime: toDate(firstPresent(merged.virtualCare?.recheckTime, merged.virtualRecheckTime)),
      recheckCompleted: Boolean(firstPresent(merged.virtualCare?.recheckCompleted, merged.virtualRecheckCompleted, false)),
      telehealthSession: merged.virtualCare?.telehealthSession || {},
    },
    dischargeReadinessScore: boundedNumber(merged.dischargeReadinessScore, 0, 100),
    dischargeCriteriaMet: asArray(merged.dischargeCriteriaMet).map(String),

    aiHandover: asString(firstPresent(merged.aiHandover, merged.ai_handover)),
    aiRecommendations,
    safetyAlerts,
    alerts: uniqueBy(
      allPatients.flatMap((patient) => asArray(patient.alerts || patient.flags)).map(String),
      (item) => item,
    ),

    createdBy: asString(merged.createdBy) || 'migration-010',
    lastModifiedBy: asString(merged.lastModifiedBy) || 'migration-010',
    modifiedAt: new Date(),
    mergeTracking: {
      mergedFromPatientIds: sourcePatientIds.map((source) => `${source.collection}:${source.id || source.legacyId}`).filter(Boolean),
      mergedAt: new Date(),
      mergedBy: 'migration-010',
      reason: sourcePatientIds.length > 1 ? 'Unified schema migration merged matching legacy patient records' : 'Unified schema migration',
    },

    chief_complaint: asString(firstPresent(merged.chief_complaint, merged.chiefComplaint)) || 'Not specified',
    previous_names: asArray(merged.previous_names || merged.previousNames).map(String),
    date_of_birth: asString(firstPresent(merged.date_of_birth, merged.dateOfBirth, merged.dob)),
    sex: asString(firstPresent(merged.sex, merged.gender)),
    ems_status: EMS_STATUSES.has(emsStatus) ? emsStatus : 'none',
    dispatch_timestamp: toDate(firstPresent(merged.dispatch_timestamp, merged.dispatchTimestamp)),
    eta_minutes: toNumber(firstPresent(merged.eta_minutes, merged.etaMinutes)),
    ems_unit_id: asString(firstPresent(merged.ems_unit_id, merged.emsUnitId)),
    dps_score: dpsScore,
    last_reassessment: toDate(firstPresent(merged.last_reassessment, merged.lastReassessment)),
    next_reassessment_due: toDate(firstPresent(merged.next_reassessment_due, merged.nextReassessmentDue)),
    reassessment_history: dpsHistory,
    triage_code: triageCode,
    safety_override: Boolean(merged.safety_override),
    safety_override_reason: asString(merged.safety_override_reason),
    last_safety_violation: toDate(merged.last_safety_violation),
    current_state: fallbackState,
    state_history: stateHistory,
    wait_time_minutes: toNumber(firstPresent(merged.wait_time_minutes, merged.waitTimeMinutes)) || 0,
    vitals: legacyVitals(currentVitals),
    assigned_clinician: asString(firstPresent(merged.assigned_clinician, merged.assignedClinician, merged.assignedStaffId)),
    temporary_encounter_id: asString(firstPresent(merged.temporary_encounter_id, merged.temporaryEncounterId)),
    identity_reconciled: firstPresent(merged.identity_reconciled, merged.identityReconciled, true) !== false,

    migrationMetadata: {
      migration: MIGRATION_NAME,
      backupId,
      migratedAt: new Date(),
      sourcePatientIds,
      sourceCollections: uniqueBy(group.patients.map((source) => source.collection), (item) => item),
      relatedRecordCounts: Object.fromEntries(
        Object.keys(RELATED_COLLECTIONS).map((kind) => [kind, (group.related[kind] || []).length]),
      ),
      referralHistory: relatedPayload(group, 'referrals'),
      boardingHistory: relatedPayload(group, 'boarding'),
      virtualCareHistory: relatedPayload(group, 'virtualCare'),
      smartIntakeAuditHistory: smartIntakeSessions.flatMap((session) => asArray(session.auditLog)),
    },
  };

  return unified;
}

function countSourceHistory(group) {
  const patientDocs = group.patients.map((source) => source.document);
  return {
    stateHistory:
      patientDocs.reduce(
        (total, patient) => total + asArray(patient.stateHistory || patient.state_history).length + asArray(patient.timeline).length,
        0,
      ) + (group.related.stateHistory || []).length,
    reassessmentHistory:
      patientDocs.reduce(
        (total, patient) => total + asArray(patient.dpsHistory || patient.reassessment_history || patient.reassessmentHistory).length,
        0,
      ) + (group.related.reassessments || []).length,
    vitalHistory:
      patientDocs.reduce(
        (total, patient) =>
          total +
          asArray(patient.vitalHistory || patient.vital_history).length +
          (Array.isArray(patient.vitals) ? patient.vitals.length : patient.vitals ? 1 : 0),
        0,
      ) + (group.related.vitals || []).length,
  };
}

async function findUnifiedMatch(collection, unified) {
  const selectors = [];
  if (unified._id) selectors.push({ _id: unified._id });
  if (unified.mrn) selectors.push({ mrn: unified.mrn });
  if (unified.phn) selectors.push({ phn: unified.phn });
  for (const item of unified.identifiers || []) {
    selectors.push({ identifiers: { $elemMatch: { type: item.type, value: item.value } } });
  }
  for (const source of unified.migrationMetadata.sourcePatientIds) {
    const value = source.id || source.legacyId;
    if (value) {
      selectors.push({
        'migrationMetadata.sourcePatientIds': {
          $elemMatch: { collection: source.collection, $or: [{ id: value }, { legacyId: value }] },
        },
      });
    }
  }
  if (!selectors.length) return null;
  return collection.findOne({ $or: selectors });
}

function withoutId(document) {
  const clone = { ...document };
  delete clone._id;
  return clone;
}

function validateTransformedGroups(groups, unifiedPatients) {
  const totals = groups.reduce(
    (acc, group) => {
      const counts = countSourceHistory(group);
      acc.stateHistory += counts.stateHistory;
      acc.reassessmentHistory += counts.reassessmentHistory;
      acc.vitalHistory += counts.vitalHistory;
      return acc;
    },
    { stateHistory: 0, reassessmentHistory: 0, vitalHistory: 0 },
  );
  const migratedTotals = unifiedPatients.reduce(
    (acc, patient) => {
      acc.stateHistory += asArray(patient.stateHistory).length;
      acc.reassessmentHistory += asArray(patient.reassessment_history).length;
      acc.vitalHistory += asArray(patient.vitalHistory).length;
      return acc;
    },
    { stateHistory: 0, reassessmentHistory: 0, vitalHistory: 0 },
  );

  const losses = Object.keys(totals).filter((key) => migratedTotals[key] < totals[key]);
  if (losses.length) {
    throw new Error(
      `Migration validation failed; history counts decreased for ${losses.join(', ')}. Source=${JSON.stringify(
        totals,
      )}, migrated=${JSON.stringify(migratedTotals)}`,
    );
  }

  for (const patient of unifiedPatients) {
    if (!patient.name || !patient.chiefComplaint || !patient.currentState || !patient.dpsScore) {
      throw new Error(`Migration validation failed for patient ${patient._id}: required unified fields missing`);
    }
  }

  return { sourceHistoryTotals: totals, migratedHistoryTotals: migratedTotals };
}

async function ensureTargetIndexes(db) {
  if (!(await collectionExists(db, TARGET_COLLECTION))) {
    await db.createCollection(TARGET_COLLECTION);
  }

  const collection = db.collection(TARGET_COLLECTION);
  await collection.createIndex({ mrn: 1 }, { name: 'idx_unified_patients_mrn', unique: true, sparse: true });
  await collection.createIndex({ phn: 1 }, { name: 'idx_unified_patients_phn', unique: true, sparse: true });
  await collection.createIndex({ currentState: 1 }, { name: 'idx_unified_patients_current_state' });
  await collection.createIndex({ dpsScore: 1 }, { name: 'idx_unified_patients_dps_score' });
  await collection.createIndex({ boardingStartTime: 1 }, { name: 'idx_unified_patients_boarding_start_time' });
  await collection.createIndex({ mciBatchId: 1 }, { name: 'idx_unified_patients_mci_batch_id' });
  await collection.createIndex({ wearableDeviceId: 1 }, { name: 'idx_unified_patients_wearable_device_id' });
  await collection.createIndex({ 'triggeredProtocols.status': 1 }, { name: 'idx_unified_patients_triggered_protocol_status' });
  await collection.createIndex({ nextReassessmentDue: 1 }, { name: 'idx_unified_patients_next_reassessment_due' });
  await collection.createIndex({ emsStatus: 1, etaMinutes: 1 }, { name: 'idx_unified_patients_ems_eta' });
  await collection.createIndex({ 'identifiers.type': 1, 'identifiers.value': 1 }, { name: 'idx_unified_patients_identifier' });
}

module.exports = {
  async up(db) {
    const backupId = `${stamp()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`=== ${MIGRATION_NAME} starting (backup ${backupId}) ===`);

    await ensureTargetIndexes(db);

    const patientCollections = await existingCollections(db, PATIENT_SOURCE_COLLECTIONS);
    const relatedCollectionsByKind = {};
    for (const [kind, names] of Object.entries(RELATED_COLLECTIONS)) {
      relatedCollectionsByKind[kind] = await existingCollections(db, names);
    }

    const backupTargets = uniqueBy(
      [TARGET_COLLECTION, ...patientCollections, ...Object.values(relatedCollectionsByKind).flat()],
      (item) => item,
    );
    const backups = [];
    for (const collectionName of backupTargets) {
      backups.push(await backupCollection(db, collectionName, backupId));
    }

    await db.collection(BACKUP_METADATA_COLLECTION).insertOne({
      migration: MIGRATION_NAME,
      backupId,
      createdAt: new Date(),
      status: 'backup_created',
      targetCollection: TARGET_COLLECTION,
      targetExisted: backups.find((item) => item.sourceName === TARGET_COLLECTION)?.existed || false,
      backups,
    });

    const sourceDocs = [];
    for (const collection of patientCollections) {
      const docs = await readCollection(db, collection);
      sourceDocs.push(...docs.map((document) => ({ collection, document })));
    }

    const relatedDocs = {};
    for (const [kind, collections] of Object.entries(relatedCollectionsByKind)) {
      relatedDocs[kind] = [];
      for (const collection of collections) {
        const docs = await readCollection(db, collection);
        relatedDocs[kind].push(...docs.map((document) => ({ collection, document })));
      }
    }

    if (!sourceDocs.length) {
      await db.collection(BACKUP_METADATA_COLLECTION).updateOne(
        { backupId },
        {
          $set: {
            status: 'completed_no_source_patients',
            completedAt: new Date(),
            validation: { sourcePatientCount: 0, migratedPatientCount: 0 },
          },
        },
      );
      console.log('No legacy patient source documents found; backup completed and migration skipped.');
      return { backupId, migratedPatientCount: 0 };
    }

    const groups = buildPatientGroups(sourceDocs);
    const unlinkedRelatedRecords = attachRelatedRecords(groups, relatedDocs);
    const unifiedPatients = groups.map((group) => transformGroup(group, backupId));
    const validation = validateTransformedGroups(groups, unifiedPatients);

    const target = db.collection(TARGET_COLLECTION);
    let inserted = 0;
    let updated = 0;
    for (const unified of unifiedPatients) {
      const existing = await findUnifiedMatch(target, unified);
      if (existing) {
        await target.updateOne({ _id: existing._id }, { $set: withoutId(unified) });
        updated += 1;
      } else {
        await target.updateOne(
          { _id: unified._id },
          {
            $setOnInsert: { _id: unified._id, createdAt: toDate(unified.createdAt) || new Date() },
            $set: withoutId(unified),
          },
          { upsert: true },
        );
        inserted += 1;
      }
    }

    const migratedPatientCount = await target.countDocuments({ 'migrationMetadata.backupId': backupId });
    if (migratedPatientCount < unifiedPatients.length) {
      throw new Error(
        `Migration validation failed; expected ${unifiedPatients.length} unified records for backup ${backupId}, found ${migratedPatientCount}`,
      );
    }

    const result = {
      backupId,
      sourcePatientCount: sourceDocs.length,
      unifiedGroupCount: groups.length,
      migratedPatientCount,
      inserted,
      updated,
      validation,
      unlinkedRelatedRecords,
      patientCollections,
      relatedCollectionsByKind,
    };

    await db.collection(BACKUP_METADATA_COLLECTION).updateOne(
      { backupId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          validation: result,
        },
      },
    );

    console.log(
      `=== ${MIGRATION_NAME} complete: ${inserted} inserted, ${updated} updated, ${sourceDocs.length} legacy docs represented in ${migratedPatientCount} unified records ===`,
    );
    return result;
  },

  async down() {
    console.log('Use backend/migrations/010_rollback_unified_patients.js or scripts/run-unified-migration.js --rollback to restore from backup.');
  },
};

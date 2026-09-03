import { apiFetchJson, getApiErrorMessage } from './apiClient';

export const PATIENT_MANAGEMENT_ENDPOINTS = Object.freeze({
  workspace: (patientId) => `/api/patients/${encodeURIComponent(patientId)}/workspace`,
  summary: (patientId) => `/api/patients/${encodeURIComponent(patientId)}/summary`,
  timeline: (patientId) => `/api/patients/${encodeURIComponent(patientId)}/timeline`,
  riskScores: (patientId) => `/api/patients/${encodeURIComponent(patientId)}/risk-scores`,
  carePlan: (patientId) => `/api/patients/${encodeURIComponent(patientId)}/care-plan`,
  sourceData: (patientId) => `/api/patients/${encodeURIComponent(patientId)}/source-data`,
  reviewItems: (patientId) => `/api/patients/${encodeURIComponent(patientId)}/review-items`,
  privacyAccessLog: (patientId) =>
    `/api/privacy/patient/${encodeURIComponent(patientId)}/access-log`,
  updatePatient: (patientId) => `/api/patients/${encodeURIComponent(patientId)}`,
  importEhrPatient: '/api/patients/import/ehr',
  importLabs: (patientId) => `/api/patients/${encodeURIComponent(patientId)}/import/labs`,
  importMedications: (patientId) =>
    `/api/patients/${encodeURIComponent(patientId)}/import/medications`,
  importObservations: (patientId) =>
    `/api/patients/${encodeURIComponent(patientId)}/import/observations`,
});

const PATIENT_READ_ENDPOINTS = Object.freeze([
  ['workspace', PATIENT_MANAGEMENT_ENDPOINTS.workspace],
  ['summary', PATIENT_MANAGEMENT_ENDPOINTS.summary],
  ['timeline', PATIENT_MANAGEMENT_ENDPOINTS.timeline],
  ['riskScores', PATIENT_MANAGEMENT_ENDPOINTS.riskScores],
  ['carePlan', PATIENT_MANAGEMENT_ENDPOINTS.carePlan],
  ['sourceData', PATIENT_MANAGEMENT_ENDPOINTS.sourceData],
  ['reviewItems', PATIENT_MANAGEMENT_ENDPOINTS.reviewItems],
  ['privacyAccessLog', PATIENT_MANAGEMENT_ENDPOINTS.privacyAccessLog],
]);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.results)) return value.results;
    if (Array.isArray(value.records)) return value.records;
  }
  return [];
}

function payloadData(payload) {
  return payload?.data && typeof payload.data === 'object' ? payload.data : payload || {};
}

function pickFirstArray(...values) {
  for (const value of values) {
    const array = asArray(value);
    if (array.length) return array;
  }
  return [];
}

function normalizeMedication(item, index) {
  const name =
    item?.name ||
    item?.medication ||
    item?.drug ||
    item?.display ||
    item?.label ||
    `Medication ${index + 1}`;
  return {
    id: item?.id || item?.medicationId || `med-${index}`,
    name,
    dose: item?.dose || item?.dosage || item?.sig || item?.instructions || '',
    status: item?.status || item?.clinicalStatus || item?.intent || 'recorded',
    lastUpdated:
      item?.lastUpdated || item?.recordedAt || item?.effectiveDateTime || item?.date || null,
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizeAllergy(item, index) {
  const severity = String(item?.severity || item?.criticality || item?.risk || '').toLowerCase();
  const isCritical = ['critical', 'high', 'severe', 'life-threatening'].some((token) =>
    severity.includes(token),
  );
  return {
    id: item?.id || item?.allergyId || `allergy-${index}`,
    substance:
      item?.substance || item?.allergen || item?.name || item?.code || `Allergy ${index + 1}`,
    reaction: item?.reaction || item?.manifestation || item?.description || '',
    severity: item?.severity || item?.criticality || item?.risk || 'recorded',
    isCritical,
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizeLab(item, index) {
  const flag = String(item?.flag || item?.interpretation || item?.status || '').toLowerCase();
  const isCritical =
    item?.critical === true ||
    ['critical', 'panic', 'life-threatening'].some((token) => flag.includes(token));
  const abnormal =
    isCritical ||
    item?.abnormal === true ||
    ['high', 'low', 'critical', 'abnormal', 'panic'].some((token) => flag.includes(token));
  return {
    id: item?.id || item?.observationId || `lab-${index}`,
    name: item?.name || item?.test || item?.code || item?.label || `Lab ${index + 1}`,
    value: item?.value ?? item?.result ?? item?.display ?? '--',
    unit: item?.unit || item?.units || '',
    referenceRange: item?.referenceRange || item?.range || item?.normalRange || '',
    flag: item?.flag || item?.interpretation || (abnormal ? 'abnormal' : 'normal'),
    abnormal,
    isCritical,
    resultedAt: item?.resultedAt || item?.issued || item?.recordedAt || item?.date || null,
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizeImaging(item, index) {
  return {
    id: item?.id || item?.orderId || `imaging-${index}`,
    study: item?.study || item?.name || item?.modality || item?.label || `Imaging ${index + 1}`,
    status: item?.status || item?.orderStatus || 'recorded',
    impression: item?.impression || item?.result || item?.finding || item?.summary || '',
    orderedAt: item?.orderedAt || item?.requestedAt || item?.date || null,
    resultedAt: item?.resultedAt || item?.issued || null,
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizeVisit(item, index) {
  return {
    id: item?.id || item?.encounterId || `visit-${index}`,
    date: item?.date || item?.arrivalTime || item?.period?.start || item?.startedAt || null,
    complaint:
      item?.complaint || item?.chiefComplaint || item?.reason || item?.diagnosis || 'Visit',
    disposition: item?.disposition || item?.status || item?.outcome || '',
    location: item?.location || item?.unit || item?.facility || '',
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizeObservation(item, index) {
  const raw = item?.raw && typeof item.raw === 'object' ? item.raw : item || {};
  return {
    id: item?.id || item?.observationId || `observation-${index}`,
    label: item?.label || item?.name || item?.code || `Observation ${index + 1}`,
    value: item?.value ?? item?.result ?? item?.display ?? '--',
    unit: item?.unit || item?.units || '',
    recordedAt: item?.recordedAt || item?.effectiveDateTime || item?.date || null,
    hr: item?.hr ?? item?.heartRate ?? raw.hr ?? raw.heartRate ?? null,
    spo2: item?.spo2 ?? item?.oxygenSaturation ?? raw.spo2 ?? raw.oxygenSaturation ?? null,
    bpSystolic: item?.bpSystolic ?? item?.systolic ?? raw.bpSystolic ?? raw.systolic ?? null,
    bpDiastolic: item?.bpDiastolic ?? item?.diastolic ?? raw.bpDiastolic ?? raw.diastolic ?? null,
    temperature: item?.temperature ?? item?.temp ?? raw.temperature ?? raw.temp ?? null,
    respiratoryRate: item?.respiratoryRate ?? item?.rr ?? raw.respiratoryRate ?? raw.rr ?? null,
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizeNote(item, index) {
  return {
    id: item?.id || item?.documentId || `document-${index}`,
    title: item?.title || item?.type || item?.category || `Document ${index + 1}`,
    body: item?.body || item?.text || item?.summary || item?.content || '',
    author: item?.author || item?.authorName || item?.clinician || '',
    createdAt: item?.createdAt || item?.date || item?.recordedAt || null,
    status: item?.status || 'recorded',
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizeOrderStatus(value) {
  const status = String(value || 'pending').toLowerCase();
  if (
    ['resulted', 'complete', 'completed', 'final', 'reported'].some((token) =>
      status.includes(token),
    )
  ) {
    return 'Resulted';
  }
  if (
    ['cancelled', 'canceled', 'voided', 'stopped', 'discontinued'].some((token) =>
      status.includes(token),
    )
  ) {
    return 'Cancelled';
  }
  return 'Pending';
}

function normalizeOrder(item, index) {
  const status = normalizeOrderStatus(item?.status || item?.orderStatus || item?.resultStatus);
  return {
    id: item?.id || item?.orderId || `order-${index}`,
    type: item?.type || item?.category || item?.service || item?.modality || 'Clinical',
    name:
      item?.name ||
      item?.test ||
      item?.medication ||
      item?.study ||
      item?.label ||
      `Order ${index + 1}`,
    orderedBy: item?.orderedBy || item?.requester || item?.clinician || item?.author || 'Backend',
    orderedAt: item?.orderedAt || item?.requestedAt || item?.createdAt || item?.date || null,
    status,
    result: item?.result || item?.impression || item?.value || item?.summary || '',
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizeDiagnosis(item, index) {
  const code = item?.code || item?.icd10 || item?.icdCode || item?.diagnosisCode || '';
  const label =
    item?.display ||
    item?.description ||
    item?.diagnosis ||
    item?.condition ||
    item?.name ||
    code ||
    `Diagnosis ${index + 1}`;
  return {
    id: item?.id || item?.diagnosisId || code || `diagnosis-${index}`,
    code,
    label,
    status: item?.status || item?.clinicalStatus || item?.verificationStatus || 'recorded',
    confirmed:
      item?.confirmed === true ||
      String(item?.status || item?.verificationStatus || '')
        .toLowerCase()
        .includes('confirm'),
    recordedAt: item?.recordedAt || item?.onsetDateTime || item?.date || null,
    source: item?.source || item?.sourceSystem || 'backend',
    raw: item,
  };
}

function normalizePatientManagementBundle(patientId, payloads) {
  const workspace = payloadData(payloads.workspace);
  const summary = payloadData(payloads.summary);
  const timeline = payloadData(payloads.timeline);
  const carePlan = payloadData(payloads.carePlan);
  const sourceData = payloadData(payloads.sourceData);
  const reviewItems = payloadData(payloads.reviewItems);

  const medications = pickFirstArray(
    sourceData.medications,
    sourceData.medicationHistory,
    sourceData.medicationStatements,
    summary.medications,
    workspace.medications,
    carePlan.medications,
  ).map(normalizeMedication);

  const allergies = pickFirstArray(
    sourceData.allergies,
    sourceData.allergyIntolerances,
    summary.allergies,
    workspace.allergies,
  ).map(normalizeAllergy);

  const labs = pickFirstArray(
    sourceData.labs,
    sourceData.labResults,
    sourceData.observations?.labs,
    summary.labs,
    summary.labResults,
    workspace.labs,
  ).map(normalizeLab);

  const imaging = pickFirstArray(
    sourceData.imaging,
    sourceData.imagingResults,
    sourceData.radiology,
    summary.imaging,
    summary.radiology,
    workspace.imaging,
  ).map(normalizeImaging);

  const visits = pickFirstArray(
    sourceData.visits,
    sourceData.encounters,
    sourceData.previousVisits,
    summary.visits,
    workspace.previousVisits,
  ).map(normalizeVisit);

  const observations = pickFirstArray(
    sourceData.observations,
    sourceData.vitals,
    timeline.observations,
    timeline.events,
  ).map(normalizeObservation);

  const documents = pickFirstArray(
    sourceData.documents,
    sourceData.notes,
    summary.documents,
    summary.notes,
    reviewItems.items,
    reviewItems.reviewItems,
  ).map(normalizeNote);

  const orders = [
    ...pickFirstArray(sourceData.orders, summary.orders, workspace.orders),
    ...pickFirstArray(sourceData.labOrders, sourceData.pendingLabs).map((item) => ({
      ...item,
      type: item?.type || 'Lab',
    })),
    ...pickFirstArray(sourceData.imagingOrders, sourceData.radiologyOrders).map((item) => ({
      ...item,
      type: item?.type || 'Imaging',
    })),
    ...pickFirstArray(sourceData.medicationOrders, sourceData.medicationRequests).map((item) => ({
      ...item,
      type: item?.type || 'Medication',
    })),
    ...asArray(timeline.events)
      .filter((event) => ['OrderPlaced', 'ResultReceived'].includes(event?.type))
      .map((event) => ({
        id: event.id,
        type: event.metadata?.orderType || event.metadata?.type || 'Clinical',
        name: event.metadata?.orderName || event.metadata?.name || event.summary,
        orderedBy: event.staffId || event.actorStaffId || 'Timeline',
        orderedAt: event.timestamp,
        status: event.type === 'ResultReceived' ? 'Resulted' : 'Pending',
        result: event.metadata?.result || event.summary,
        source: 'timeline',
      })),
  ].map(normalizeOrder);

  const diagnoses = pickFirstArray(
    sourceData.diagnoses,
    sourceData.diagnosisCodes,
    sourceData.conditions,
    summary.diagnoses,
    summary.conditions,
    workspace.diagnoses,
    workspace.conditions,
  ).map(normalizeDiagnosis);

  return {
    patientId,
    demographics: workspace.demographics || summary.demographics || null,
    activeEncounter: workspace.activeEncounter || summary.activeEncounter || null,
    medications,
    allergies,
    labs,
    imaging,
    visits,
    observations,
    documents,
    orders,
    diagnoses,
    timelineEvents: asArray(timeline.events),
    riskScores: asArray(payloadData(payloads.riskScores).scores),
    carePlanTasks: asArray(carePlan.tasks),
    raw: payloads,
  };
}

async function requestJson(path, options: any = {}) {
  try {
    const { response, data } = await apiFetchJson(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        error: data?.message || getApiErrorMessage(null, response),
        status: response.status,
      };
    }
    return { ok: true, data, error: '' };
  } catch (error: any) {
    return { ok: false, data: null, error: getApiErrorMessage(error), status: 0 };
  }
}

async function writePatient(endpoint, options) {
  try {
    const { response, data } = await apiFetchJson(endpoint, {
      headers: { 'content-type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: data?.error || data?.message || getApiErrorMessage(null, response),
        data,
      };
    }
    return { ok: true, status: response.status, data };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      message: getApiErrorMessage(error),
      data: null,
    };
  }
}

export function updateEmergencyPatientRecord(patientId, patch) {
  return writePatient(PATIENT_MANAGEMENT_ENDPOINTS.updatePatient(patientId), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function fetchPatientManagementBundle(patientId, options: any = {}) {
  if (!patientId) {
    return { ok: false, data: null, error: 'Patient id is required.' };
  }

  const entries = await Promise.all(
    PATIENT_READ_ENDPOINTS.map(async ([key, buildPath]) => {
      const result = await requestJson((buildPath as any)(patientId), options);
      return [key, result];
    }),
  );

  const results = Object.fromEntries(entries);
  const payloads = Object.fromEntries(
    entries.map(([key, result]) => [key, (result as any).ok ? (result as any).data : null]),
  );
  const failures = entries.filter(([, result]) => !(result as any).ok);
  const anySuccess = entries.some(([, result]) => (result as any).ok);

  return {
    ok: anySuccess,
    partial: anySuccess && failures.length > 0,
    data: anySuccess ? normalizePatientManagementBundle(patientId, payloads) : null,
    error: anySuccess
      ? failures.map(([key, result]) => `${key}: ${(result as any).error}`).join('; ')
      : (failures[0]?.[1] as any)?.error || 'Patient backend details are unavailable.',
    endpointResults: results,
  };
}

export async function postPatientImport(endpoint, payload: any = {}, options: any = {}) {
  return requestJson(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function importEhrPatient(payload: any = {}, options: any = {}) {
  return postPatientImport(PATIENT_MANAGEMENT_ENDPOINTS.importEhrPatient, payload, options);
}

export function importPatientLabs(patientId, payload: any = {}, options: any = {}) {
  return postPatientImport(PATIENT_MANAGEMENT_ENDPOINTS.importLabs(patientId), payload, options);
}

export function importPatientMedications(patientId, payload: any = {}, options: any = {}) {
  return postPatientImport(
    PATIENT_MANAGEMENT_ENDPOINTS.importMedications(patientId),
    payload,
    options,
  );
}

export function importPatientObservations(patientId, payload: any = {}, options: any = {}) {
  return postPatientImport(
    PATIENT_MANAGEMENT_ENDPOINTS.importObservations(patientId),
    payload,
    options,
  );
}

import { patientMatchesSearch } from '../utils/patientSearch';

function patientMatchesQuery(patient, query) {
  return patientMatchesSearch(patient, query);
}

export async function searchPatientsFromBackend(
  query,
  { localPatients = [] as any[], limit = 8 }: any = {},
) {
  const normalizedQuery = String(query || '').trim();
  if (normalizedQuery.length < 2) {
    return {
      ok: true,
      backendSearchAvailable: false,
      query: normalizedQuery,
      results: [],
      message: 'Enter at least 2 characters to search patients.',
    };
  }

  const candidatePatients = localPatients
    .filter((patient) => patientMatchesQuery(patient, normalizedQuery))
    .slice(0, limit);

  if (!candidatePatients.length) {
    return {
      ok: true,
      backendSearchAvailable: false,
      query: normalizedQuery,
      results: [],
      message:
        'No backend patient search route is defined in the current API inventory; no local patient ids matched for backend lookup.',
    };
  }

  const bundles = await Promise.all(
    candidatePatients.map(async (patient) => ({
      patient,
      bundle: await fetchPatientManagementBundle(patient.id),
    })),
  );

  return {
    ok: true,
    backendSearchAvailable: false,
    query: normalizedQuery,
    results: bundles.map(({ patient, bundle }) => ({
      patientId: patient.id,
      mrn: patient.mrn,
      displayName: `${patient.firstName} ${patient.lastName}`,
      chiefComplaint: patient.chiefComplaint,
      complaintCategory: patient.complaintCategory,
      backendVerified: bundle.ok,
      backendDetail: bundle.data,
      error: bundle.ok ? '' : bundle.error,
    })),
    message:
      'No dedicated backend patient search endpoint exists; matched active CareDroid patients were verified through existing patient detail endpoints.',
  };
}

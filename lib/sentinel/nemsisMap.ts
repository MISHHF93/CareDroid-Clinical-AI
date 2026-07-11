/**
 * NEMSIS-oriented mapping for core prehospital elements (subset).
 * Maps common ePCR / CAD fields into CareDroid Sentinel inbound shape.
 * Not a full NEMSIS XSD validator — validates presence of mapped clinical core.
 */

export type NemsisCoreElements = Readonly<{
  /** ePatient.13 / age */
  age?: string | number | null;
  /** ePatient.14 gender */
  sex?: string | null;
  /** eSituation.11 chief complaint */
  chiefComplaint?: string | null;
  /** eVitals group */
  heartRate?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  spo2?: number | null;
  respiratoryRate?: number | null;
  /** eTimes */
  unitNotifiedAt?: string | null;
  unitEnRouteAt?: string | null;
  unitArrivedSceneAt?: string | null;
  unitLeftSceneAt?: string | null;
  unitArrivedDestinationAt?: string | null;
  /** eResponse / unit */
  unitId?: string | null;
  unitCallSign?: string | null;
  /** Priority / acuity */
  priority?: string | null;
  /** Narrative */
  narrative?: string | null;
}>;

export type SentinelNemsisInbound = Readonly<{
  unitId: string;
  unitLabel: string;
  patientAge: string | null;
  patientSex: string | null;
  chiefComplaint: string;
  vitals: Readonly<{
    heartRate: number | null;
    bloodPressure: string | null;
    oxygenSaturation: number | null;
    respiratoryRate: number | null;
  }>;
  times: Readonly<{
    notifiedAt: string | null;
    enRouteAt: string | null;
    onSceneAt: string | null;
    leftSceneAt: string | null;
    atHospitalAt: string | null;
  }>;
  priority: string | null;
  narrative: string | null;
  nemsisMappedFields: readonly string[];
  unmappedKeys: readonly string[];
}>;

const KNOWN_ALIASES: Readonly<Record<string, keyof NemsisCoreElements>> = {
  'ePatient.13': 'age',
  age: 'age',
  patientAge: 'age',
  'ePatient.14': 'sex',
  gender: 'sex',
  sex: 'sex',
  'eSituation.11': 'chiefComplaint',
  chiefComplaint: 'chiefComplaint',
  chief_complaint: 'chiefComplaint',
  complaint: 'chiefComplaint',
  'eVitals.10': 'heartRate',
  hr: 'heartRate',
  heartRate: 'heartRate',
  'eVitals.06': 'systolicBp',
  sbp: 'systolicBp',
  systolicBp: 'systolicBp',
  'eVitals.07': 'diastolicBp',
  dbp: 'diastolicBp',
  diastolicBp: 'diastolicBp',
  'eVitals.12': 'spo2',
  spo2: 'spo2',
  o2: 'spo2',
  oxygenSaturation: 'spo2',
  'eVitals.14': 'respiratoryRate',
  rr: 'respiratoryRate',
  respiratoryRate: 'respiratoryRate',
  'eTimes.03': 'unitNotifiedAt',
  unitNotifiedAt: 'unitNotifiedAt',
  'eTimes.05': 'unitEnRouteAt',
  unitEnRouteAt: 'unitEnRouteAt',
  'eTimes.06': 'unitArrivedSceneAt',
  unitArrivedSceneAt: 'unitArrivedSceneAt',
  'eTimes.09': 'unitLeftSceneAt',
  unitLeftSceneAt: 'unitLeftSceneAt',
  'eTimes.11': 'unitArrivedDestinationAt',
  unitArrivedDestinationAt: 'unitArrivedDestinationAt',
  'eResponse.03': 'unitCallSign',
  unitCallSign: 'unitCallSign',
  callSign: 'unitCallSign',
  unitId: 'unitId',
  ems_unit_id: 'unitId',
  unit: 'unitId',
  priority: 'priority',
  triage_code: 'priority',
  narrative: 'narrative',
  notes: 'narrative',
};

function asNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * Normalize a raw CAD/ePCR/NEMSIS-like payload into Sentinel inbound core.
 */
export function mapNemsisLikePayload(
  payload: Readonly<Record<string, unknown>>,
): SentinelNemsisInbound {
  const core: Partial<Record<keyof NemsisCoreElements, unknown>> = {};
  const unmapped: string[] = [];
  const mapped: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    const alias = KNOWN_ALIASES[key] ?? KNOWN_ALIASES[key.toLowerCase()];
    if (alias) {
      core[alias] = value;
      mapped.push(key);
    } else if (key !== 'raw' && key !== 'metadata') {
      unmapped.push(key);
    }
  }

  // Nested vitals object support
  const vitalsObj = payload.vitals;
  if (vitalsObj && typeof vitalsObj === 'object' && !Array.isArray(vitalsObj)) {
    const v = vitalsObj as Record<string, unknown>;
    if (core.heartRate == null) core.heartRate = v.hr ?? v.heartRate;
    if (core.spo2 == null) core.spo2 = v.o2 ?? v.spo2 ?? v.oxygenSaturation;
    if (core.respiratoryRate == null) core.respiratoryRate = v.rr ?? v.respiratoryRate;
    if (core.systolicBp == null && typeof v.bp === 'string') {
      const m = v.bp.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        core.systolicBp = Number(m[1]);
        core.diastolicBp = Number(m[2]);
      }
    }
  }

  const sbp = asNumber(core.systolicBp);
  const dbp = asNumber(core.diastolicBp);
  const unitId =
    asString(core.unitId) || asString(core.unitCallSign) || 'unknown-unit';
  const unitLabel = asString(core.unitCallSign) || unitId;

  return Object.freeze({
    unitId,
    unitLabel,
    patientAge: core.age != null ? String(core.age) : null,
    patientSex: asString(core.sex),
    chiefComplaint: asString(core.chiefComplaint) || 'Not specified',
    vitals: Object.freeze({
      heartRate: asNumber(core.heartRate),
      bloodPressure: sbp != null && dbp != null ? `${sbp}/${dbp}` : null,
      oxygenSaturation: asNumber(core.spo2),
      respiratoryRate: asNumber(core.respiratoryRate),
    }),
    times: Object.freeze({
      notifiedAt: asString(core.unitNotifiedAt),
      enRouteAt: asString(core.unitEnRouteAt),
      onSceneAt: asString(core.unitArrivedSceneAt),
      leftSceneAt: asString(core.unitLeftSceneAt),
      atHospitalAt: asString(core.unitArrivedDestinationAt),
    }),
    priority: asString(core.priority),
    narrative: asString(core.narrative),
    nemsisMappedFields: Object.freeze(mapped),
    unmappedKeys: Object.freeze(unmapped),
  });
}

export type NemsisValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
  warnings: readonly string[];
}>;

export function validateNemsisCore(inbound: SentinelNemsisInbound): NemsisValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!inbound.unitId || inbound.unitId === 'unknown-unit') {
    errors.push('unitId is required (eResponse / unit identifier)');
  }
  if (!inbound.chiefComplaint || inbound.chiefComplaint === 'Not specified') {
    warnings.push('chiefComplaint missing (eSituation.11)');
  }
  if (
    inbound.vitals.heartRate == null &&
    inbound.vitals.bloodPressure == null &&
    inbound.vitals.oxygenSaturation == null
  ) {
    warnings.push('No vitals mapped (eVitals)');
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  });
}

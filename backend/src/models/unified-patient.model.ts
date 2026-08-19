import { Schema, model, models, type Document, type Model } from 'mongoose';

export type Gender = 'female' | 'male' | 'non_binary' | 'other' | 'unknown';
export type CodeStatus = 'full_code' | 'dnr' | 'dni' | 'dnr_dni' | 'comfort_measures' | 'unknown';
export type TriageAcuityCode =
  | 'CTAS1'
  | 'CTAS2'
  | 'CTAS3'
  | 'CTAS4'
  | 'CTAS5'
  | 'ESI1'
  | 'ESI2'
  | 'ESI3'
  | 'ESI4'
  | 'ESI5';
export type JourneyState =
  | 'EMS_DISPATCHED'
  | 'EMS_ON_SCENE'
  | 'EMS_EN_ROUTE'
  | 'ARRIVAL'
  | 'REGISTRATION'
  | 'TRIAGE'
  | 'WAITING'
  | 'ASSESSMENT'
  | 'ORDERS'
  | 'RESULTS'
  | 'DISPOSITION'
  | 'ADMISSION'
  | 'ADMISSION_COMPLETED'
  | 'DISCHARGE';
export type DPSScore = 1 | 2 | 3 | 4 | 5;
export type EMSStatus = 'dispatched' | 'on_scene' | 'en_route' | 'arrived' | 'none';
export type BoardingStatus = 'not_boarded' | 'boarding' | 'bed_assigned' | 'transferred';
export type ProtocolStatus = 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'deferred';
export type DeteriorationRiskCategory = 'low' | 'moderate' | 'high' | 'critical';
export type TriageColor = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
export type AIReviewStatus = 'pending_review' | 'accepted' | 'rejected' | 'modified';
export type SafetySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface IEmergencyContact {
  name?: string | null;
  relationship?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
}

export interface IPatientIdentifier {
  type:
    | 'internal'
    | 'mrn'
    | 'phn'
    | 'health_card'
    | 'ems_temporary'
    | 'external_ehr'
    | 'referral_source';
  value: string;
  issuer?: string | null;
  verified: boolean;
  addedAt: Date;
}

export interface IClinicalMedication {
  name: string;
  dose?: string | null;
  route?: string | null;
  frequency?: string | null;
  lastTakenAt?: Date | null;
}

export interface IClinicalAllergy {
  substance: string;
  reaction?: string | null;
  severity?: 'mild' | 'moderate' | 'severe' | 'unknown' | null;
}

export interface IVitalSigns {
  hr?: number | null;
  bp?: string | null;
  rr?: number | null;
  spO2?: number | null;
  temp?: number | null;
  gcs?: number | null;
  painScore?: number | null;
  recordedAt?: Date | null;
  source?: string | null;
}

export interface ITriageData {
  code?: TriageAcuityCode | null;
  system?: 'CTAS' | 'ESI' | null;
  timestamp?: Date | null;
  notes?: string | null;
  nurseId?: string | null;
}

export interface IStateHistoryEntry {
  state: JourneyState;
  timestamp: Date;
  actor?: string | null;
  notes?: string | null;
}

export interface IDPSHistoryEntry {
  score: DPSScore;
  reason: string;
  clinician: string;
  timestamp: Date;
}

export interface IBedRequest {
  requestedAt?: Date | null;
  requestedBy?: string | null;
  service?: string | null;
  priority?: string | null;
  status?: 'not_requested' | 'requested' | 'assigned' | 'cancelled' | null;
}

export interface IBedAssignment {
  bedId?: string | null;
  unit?: string | null;
  assignedAt?: Date | null;
  assignedBy?: string | null;
  transferReadyAt?: Date | null;
}

export interface ITriggeredProtocol {
  protocolId: string;
  protocolName: string;
  triggeredAt: Date;
  triggeredBy?: string | null;
  status: ProtocolStatus;
  compliance?: {
    requiredSteps?: string[];
    completedSteps?: string[];
    complianceScore?: number | null;
    lastReviewedAt?: Date | null;
  };
}

export interface IDeteriorationPrediction {
  riskScore?: number | null;
  category?: DeteriorationRiskCategory | null;
  contributingFactors?: string[];
  modelVersion?: string | null;
  predictedAt?: Date | null;
}

export interface IWearableVitalEntry extends IVitalSigns {
  deviceId?: string | null;
  timestamp: Date;
  fallDetected?: boolean;
}

export interface IContinuousVitals {
  timestamp: Date;
  heartRate?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
  source: 'apple_watch' | 'samsung_watch' | 'fitbit' | 'other';
}

export interface IFallDetection {
  detected: boolean;
  detectedAt?: Date | null;
  confidence?: number | null;
  resolvedAt?: Date | null;
  resolutionNotes?: string | null;
}

export interface IVirtualCare {
  recheckScheduled: boolean;
  recheckTime?: Date | null;
  recheckCompleted: boolean;
  telehealthSession?: {
    sessionId?: string | null;
    status?: 'not_scheduled' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | null;
    scheduledAt?: Date | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    clinicianId?: string | null;
  };
}

export interface IAIRecommendation {
  id: string;
  type: 'handover' | 'clinical_suggestion' | 'operational_suggestion' | 'safety_alert';
  text: string;
  rationale?: string | null;
  generatedAt: Date;
  model?: string | null;
  reviewStatus: AIReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
}

export interface ISafetyAlert {
  incidentId: string;
  type: string;
  severity: SafetySeverity | number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date | null;
  resolution?: string | null;
  resolvedBy?: string | null;
}

export interface IMergeTracking {
  mergedFromPatientIds: string[];
  mergedIntoPatientId?: string | null;
  mergedAt?: Date | null;
  mergedBy?: string | null;
  reason?: string | null;
}

export interface IUnifiedPatient extends Document {
  organizationId?: string | null;
  mrn?: string | null;
  phn?: string | null;
  name: string;
  age: string;
  gender?: Gender | string | null;
  dob?: string | Date | null;
  identifiers: IPatientIdentifier[];

  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContact?: IEmergencyContact;

  chiefComplaint: string;
  hpi?: string | null;
  pmh: string[];
  medications: IClinicalMedication[];
  allergies: IClinicalAllergy[];
  codeStatus: CodeStatus;

  currentVitals?: IVitalSigns;
  vitalHistory: IVitalSigns[];
  triage?: ITriageData;

  currentState: JourneyState;
  stateHistory: IStateHistoryEntry[];
  waitTimeMinutes: number;

  dpsScore: DPSScore;
  lastReassessment?: Date | null;
  nextReassessmentDue?: Date | null;
  dpsHistory: IDPSHistoryEntry[];

  decisionToAdmitTime?: Date | null;
  boardingStartTime?: Date | null;
  boardingStatus: BoardingStatus;
  boardTimeMinutes?: number | null;
  bedRequest?: IBedRequest;
  bedAssignment?: IBedAssignment;

  triggeredProtocols: ITriggeredProtocol[];
  deteriorationPrediction?: IDeteriorationPrediction;

  wearableDeviceId?: string | null;
  lastWearableSync?: Date | null;
  wearableVitalHistory: IWearableVitalEntry[];
  fallDetection?: IFallDetection;
  continuousVitals: IContinuousVitals[];

  emsStatus: EMSStatus;
  emsUnitId?: string | null;
  dispatchTimestamp?: Date | null;
  etaMinutes?: number | null;
  mciBatchId?: string | null;
  mciPatientNumber?: number | null;
  triageColor?: TriageColor | null;
  surgeActivationId?: string | null;
  fieldTriageTime?: Date | null;

  virtualCare?: IVirtualCare;
  dischargeReadinessScore?: number | null;
  dischargeCriteriaMet: string[];

  aiHandover?: string | null;
  aiRecommendations: IAIRecommendation[];
  safetyAlerts: ISafetyAlert[];
  alerts: string[];

  createdBy: string;
  lastModifiedBy: string;
  modifiedAt: Date;
  mergeTracking?: IMergeTracking;

  // Legacy fields retained so older CareDroid services can safely migrate to canonical names.
  chief_complaint: string;
  previous_names: string[];
  date_of_birth?: string | null;
  sex?: string | null;
  ems_status: EMSStatus;
  dispatch_timestamp?: Date | null;
  eta_minutes?: number | null;
  ems_unit_id?: string | null;
  dps_score: DPSScore;
  last_reassessment?: Date | null;
  next_reassessment_due?: Date | null;
  reassessment_history: IDPSHistoryEntry[];
  triage_code?: TriageAcuityCode | null;
  safety_override: boolean;
  safety_override_reason?: string | null;
  last_safety_violation?: Date | null;
  current_state: JourneyState;
  state_history: IStateHistoryEntry[];
  wait_time_minutes: number;
  vitals?: {
    hr?: number | null;
    bp?: string | null;
    o2?: number | null;
    rr?: number | null;
    temperature?: number | null;
  };
  assigned_clinician?: string | null;
  temporary_encounter_id?: string | null;
  identity_reconciled: boolean;
}

const nullableString = { type: String, default: null };

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: nullableString,
    relationship: nullableString,
    phone: nullableString,
    alternatePhone: nullableString,
  },
  { _id: false },
);

const PatientIdentifierSchema = new Schema<IPatientIdentifier>(
  {
    type: {
      type: String,
      enum: [
        'internal',
        'mrn',
        'phn',
        'health_card',
        'ems_temporary',
        'external_ehr',
        'referral_source',
      ],
      required: true,
    },
    value: { type: String, required: true },
    issuer: nullableString,
    verified: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const MedicationSchema = new Schema<IClinicalMedication>(
  {
    name: { type: String, required: true },
    dose: nullableString,
    route: nullableString,
    frequency: nullableString,
    lastTakenAt: { type: Date, default: null },
  },
  { _id: false },
);

const AllergySchema = new Schema<IClinicalAllergy>(
  {
    substance: { type: String, required: true },
    reaction: nullableString,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'unknown', null],
      default: null,
    },
  },
  { _id: false },
);

const VitalSignsSchema = new Schema<IVitalSigns>(
  {
    hr: { type: Number, default: null },
    bp: nullableString,
    rr: { type: Number, default: null },
    spO2: { type: Number, default: null },
    temp: { type: Number, default: null },
    gcs: { type: Number, default: null },
    painScore: { type: Number, min: 0, max: 10, default: null },
    recordedAt: { type: Date, default: null },
    source: nullableString,
  },
  { _id: false },
);

const TriageSchema = new Schema<ITriageData>(
  {
    code: {
      type: String,
      enum: [
        'CTAS1',
        'CTAS2',
        'CTAS3',
        'CTAS4',
        'CTAS5',
        'ESI1',
        'ESI2',
        'ESI3',
        'ESI4',
        'ESI5',
        null,
      ],
      default: null,
    },
    system: { type: String, enum: ['CTAS', 'ESI', null], default: null },
    timestamp: { type: Date, default: null },
    notes: nullableString,
    nurseId: nullableString,
  },
  { _id: false },
);

const StateHistorySchema = new Schema<IStateHistoryEntry>(
  {
    state: {
      type: String,
      enum: [
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
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    actor: nullableString,
    notes: nullableString,
  },
  { _id: false },
);

const DPSHistorySchema = new Schema<IDPSHistoryEntry>(
  {
    score: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    reason: { type: String, required: true },
    clinician: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const BedRequestSchema = new Schema<IBedRequest>(
  {
    requestedAt: { type: Date, default: null },
    requestedBy: nullableString,
    service: nullableString,
    priority: nullableString,
    status: {
      type: String,
      enum: ['not_requested', 'requested', 'assigned', 'cancelled', null],
      default: 'not_requested',
    },
  },
  { _id: false },
);

const BedAssignmentSchema = new Schema<IBedAssignment>(
  {
    bedId: nullableString,
    unit: nullableString,
    assignedAt: { type: Date, default: null },
    assignedBy: nullableString,
    transferReadyAt: { type: Date, default: null },
  },
  { _id: false },
);

const TriggeredProtocolSchema = new Schema<ITriggeredProtocol>(
  {
    protocolId: { type: String, required: true },
    protocolName: { type: String, required: true },
    triggeredAt: { type: Date, default: Date.now },
    triggeredBy: nullableString,
    status: {
      type: String,
      enum: ['pending', 'acknowledged', 'in_progress', 'completed', 'deferred'],
      default: 'pending',
    },
    compliance: {
      requiredSteps: { type: [String], default: [] },
      completedSteps: { type: [String], default: [] },
      complianceScore: { type: Number, min: 0, max: 100, default: null },
      lastReviewedAt: { type: Date, default: null },
    },
  },
  { _id: false },
);

const DeteriorationPredictionSchema = new Schema<IDeteriorationPrediction>(
  {
    riskScore: { type: Number, min: 0, max: 100, default: null },
    category: { type: String, enum: ['low', 'moderate', 'high', 'critical', null], default: null },
    contributingFactors: { type: [String], default: [] },
    modelVersion: nullableString,
    predictedAt: { type: Date, default: null },
  },
  { _id: false },
);

const WearableVitalEntrySchema = new Schema<IWearableVitalEntry>(
  {
    deviceId: nullableString,
    timestamp: { type: Date, default: Date.now },
    hr: { type: Number, default: null },
    bp: nullableString,
    rr: { type: Number, default: null },
    spO2: { type: Number, default: null },
    temp: { type: Number, default: null },
    gcs: { type: Number, default: null },
    painScore: { type: Number, min: 0, max: 10, default: null },
    recordedAt: { type: Date, default: null },
    source: nullableString,
    fallDetected: { type: Boolean, default: false },
  },
  { _id: false },
);

const ContinuousVitalsSchema = new Schema<IContinuousVitals>(
  {
    timestamp: { type: Date, default: Date.now },
    heartRate: { type: Number, default: null },
    oxygenSaturation: { type: Number, default: null },
    respiratoryRate: { type: Number, default: null },
    temperature: { type: Number, default: null },
    source: {
      type: String,
      enum: ['apple_watch', 'samsung_watch', 'fitbit', 'other'],
      required: true,
    },
  },
  { _id: false },
);

const FallDetectionSchema = new Schema<IFallDetection>(
  {
    detected: { type: Boolean, default: false },
    detectedAt: { type: Date, default: null },
    confidence: { type: Number, min: 0, max: 1, default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNotes: nullableString,
  },
  { _id: false },
);

const VirtualCareSchema = new Schema<IVirtualCare>(
  {
    recheckScheduled: { type: Boolean, default: false },
    recheckTime: { type: Date, default: null },
    recheckCompleted: { type: Boolean, default: false },
    telehealthSession: {
      sessionId: nullableString,
      status: {
        type: String,
        enum: ['not_scheduled', 'scheduled', 'in_progress', 'completed', 'cancelled', null],
        default: 'not_scheduled',
      },
      scheduledAt: { type: Date, default: null },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      clinicianId: nullableString,
    },
  },
  { _id: false },
);

const AIRecommendationSchema = new Schema<IAIRecommendation>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['handover', 'clinical_suggestion', 'operational_suggestion', 'safety_alert'],
      required: true,
    },
    text: { type: String, required: true },
    rationale: nullableString,
    generatedAt: { type: Date, default: Date.now },
    model: nullableString,
    reviewStatus: {
      type: String,
      enum: ['pending_review', 'accepted', 'rejected', 'modified'],
      default: 'pending_review',
    },
    reviewedBy: nullableString,
    reviewedAt: { type: Date, default: null },
  },
  { _id: false },
);

const SafetyAlertSchema = new Schema<ISafetyAlert>(
  {
    incidentId: { type: String, required: true },
    type: { type: String, required: true },
    severity: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
    resolution: nullableString,
    resolvedBy: nullableString,
  },
  { _id: false },
);

const MergeTrackingSchema = new Schema<IMergeTracking>(
  {
    mergedFromPatientIds: { type: [String], default: [] },
    mergedIntoPatientId: nullableString,
    mergedAt: { type: Date, default: null },
    mergedBy: nullableString,
    reason: nullableString,
  },
  { _id: false },
);

const LegacyVitalsSchema = new Schema(
  {
    hr: { type: Number, default: null },
    bp: nullableString,
    o2: { type: Number, default: null },
    rr: { type: Number, default: null },
    temperature: { type: Number, default: null },
  },
  { _id: false },
);

export const UnifiedPatientSchema = new Schema<IUnifiedPatient>(
  {
    // HEAL-347.49: nullable/no-backfill, same convention as the TypeORM
    // Patient entity's organizationId (HEAL-343) -- own-org-or-legacy-null
    // filtering at the query layer, not a required column, so every
    // existing document and every caller that doesn't pass one keeps
    // working unchanged.
    organizationId: { type: String, default: null },
    // HEAL-233: was `default: null`, which made Mongoose write an
    // explicit `mrn: null` (and `phn: null`) onto every document that
    // didn't specify one. idx_unified_patients_mrn/-phn below are sparse
    // unique indexes -- sparse only excludes documents where the field is
    // genuinely ABSENT, not present-with-value-null, so every "no MRN
    // yet" patient collided on the same indexed null value. This broke
    // the very scenario MCI batch intake exists for: multiple
    // unidentified patients (arriving as literal "John/Jane Doe" before
    // ID is established) created in the same batch -- the second such
    // patient's insert failed with an E11000 duplicate key error.
    // Omitting the field when not provided lets the sparse index work as
    // intended.
    mrn: { type: String },
    phn: { type: String },
    name: { type: String, required: true },
    age: { type: String, default: 'Unknown' },
    gender: { type: String, default: 'unknown' },
    dob: { type: Schema.Types.Mixed, default: null },
    identifiers: { type: [PatientIdentifierSchema], default: [] },

    phone: nullableString,
    email: nullableString,
    address: nullableString,
    emergencyContact: { type: EmergencyContactSchema, default: () => ({}) },

    chiefComplaint: { type: String, default: 'Not specified' },
    hpi: nullableString,
    pmh: { type: [String], default: [] },
    medications: { type: [MedicationSchema], default: [] },
    allergies: { type: [AllergySchema], default: [] },
    codeStatus: {
      type: String,
      enum: ['full_code', 'dnr', 'dni', 'dnr_dni', 'comfort_measures', 'unknown'],
      default: 'unknown',
    },

    currentVitals: { type: VitalSignsSchema, default: () => ({}) },
    vitalHistory: { type: [VitalSignsSchema], default: [] },
    triage: { type: TriageSchema, default: () => ({}) },

    currentState: {
      type: String,
      enum: [
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
      ],
      default: 'ARRIVAL',
    },
    stateHistory: { type: [StateHistorySchema], default: [] },
    waitTimeMinutes: { type: Number, default: 0 },

    dpsScore: { type: Number, enum: [1, 2, 3, 4, 5], default: 4 },
    lastReassessment: { type: Date, default: null },
    nextReassessmentDue: { type: Date, default: null },
    dpsHistory: { type: [DPSHistorySchema], default: [] },

    decisionToAdmitTime: { type: Date, default: null },
    boardingStartTime: { type: Date, default: null },
    boardingStatus: {
      type: String,
      enum: ['not_boarded', 'boarding', 'bed_assigned', 'transferred'],
      default: 'not_boarded',
    },
    boardTimeMinutes: { type: Number, default: null },
    bedRequest: { type: BedRequestSchema, default: () => ({}) },
    bedAssignment: { type: BedAssignmentSchema, default: () => ({}) },

    triggeredProtocols: { type: [TriggeredProtocolSchema], default: [] },
    deteriorationPrediction: { type: DeteriorationPredictionSchema, default: () => ({}) },

    wearableDeviceId: { type: String, default: null },
    lastWearableSync: { type: Date, default: null },
    wearableVitalHistory: { type: [WearableVitalEntrySchema], default: [] },
    fallDetection: { type: FallDetectionSchema, default: () => ({}) },
    continuousVitals: { type: [ContinuousVitalsSchema], default: [] },

    emsStatus: {
      type: String,
      enum: ['dispatched', 'on_scene', 'en_route', 'arrived', 'none'],
      default: 'none',
    },
    emsUnitId: { type: String, default: null },
    dispatchTimestamp: { type: Date, default: null },
    etaMinutes: { type: Number, default: null },
    mciBatchId: { type: String, default: null },
    mciPatientNumber: { type: Number, default: null },
    triageColor: { type: String, enum: ['RED', 'YELLOW', 'GREEN', 'BLACK', null], default: null },
    surgeActivationId: { type: String, default: null },
    fieldTriageTime: { type: Date, default: null },

    virtualCare: { type: VirtualCareSchema, default: () => ({}) },
    dischargeReadinessScore: { type: Number, min: 0, max: 100, default: null },
    dischargeCriteriaMet: { type: [String], default: [] },

    aiHandover: nullableString,
    aiRecommendations: { type: [AIRecommendationSchema], default: [] },
    safetyAlerts: { type: [SafetyAlertSchema], default: [] },
    alerts: { type: [String], default: [] },

    createdBy: { type: String, default: 'system' },
    lastModifiedBy: { type: String, default: 'system' },
    modifiedAt: { type: Date, default: Date.now },
    mergeTracking: { type: MergeTrackingSchema, default: () => ({}) },

    chief_complaint: { type: String, default: 'Not specified' },
    previous_names: { type: [String], default: [] },
    date_of_birth: { type: String, default: null },
    sex: { type: String, default: null },
    ems_status: {
      type: String,
      enum: ['dispatched', 'on_scene', 'en_route', 'arrived', 'none'],
      default: 'none',
    },
    dispatch_timestamp: { type: Date, default: null },
    eta_minutes: { type: Number, default: null },
    ems_unit_id: { type: String, default: null },
    dps_score: { type: Number, enum: [1, 2, 3, 4, 5], default: 4 },
    last_reassessment: { type: Date, default: null },
    next_reassessment_due: { type: Date, default: null },
    reassessment_history: { type: [DPSHistorySchema], default: [] },
    triage_code: {
      type: String,
      enum: [
        'CTAS1',
        'CTAS2',
        'CTAS3',
        'CTAS4',
        'CTAS5',
        'ESI1',
        'ESI2',
        'ESI3',
        'ESI4',
        'ESI5',
        null,
      ],
      default: null,
    },
    safety_override: { type: Boolean, default: false },
    safety_override_reason: { type: String, default: null },
    last_safety_violation: { type: Date, default: null },
    current_state: {
      type: String,
      enum: [
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
      ],
      default: 'ARRIVAL',
    },
    state_history: { type: [StateHistorySchema], default: [] },
    wait_time_minutes: { type: Number, default: 0 },
    vitals: { type: LegacyVitalsSchema, default: () => ({}) },
    assigned_clinician: { type: String, default: null },
    temporary_encounter_id: { type: String, default: null },
    identity_reconciled: { type: Boolean, default: true },
  },
  {
    collection: 'unified_patients',
    timestamps: true,
  },
);

UnifiedPatientSchema.pre('validate', function syncLegacyPatientFields() {
  const patient = this as IUnifiedPatient & { isModified(path: string): boolean };
  const legacyChanged = (path: string) => patient.isModified(path);

  if (legacyChanged('chief_complaint') && patient.chief_complaint) {
    patient.chiefComplaint = patient.chief_complaint;
  }
  patient.chiefComplaint = patient.chiefComplaint || patient.chief_complaint || 'Not specified';
  patient.chief_complaint = patient.chief_complaint || patient.chiefComplaint;
  if (legacyChanged('sex') && patient.sex) {
    patient.gender = patient.sex;
  }
  patient.gender = patient.gender || patient.sex || 'unknown';
  patient.sex = patient.sex || (typeof patient.gender === 'string' ? patient.gender : null);
  if (legacyChanged('date_of_birth') && patient.date_of_birth) {
    patient.dob = patient.date_of_birth;
  }
  patient.dob = patient.dob || patient.date_of_birth || null;
  patient.date_of_birth =
    patient.date_of_birth || (typeof patient.dob === 'string' ? patient.dob : null);

  if (legacyChanged('current_state') && patient.current_state) {
    patient.currentState = patient.current_state;
  }
  patient.currentState = patient.currentState || patient.current_state || 'ARRIVAL';
  patient.current_state = patient.current_state || patient.currentState;
  if (legacyChanged('state_history') && patient.state_history?.length) {
    patient.stateHistory = patient.state_history;
  }
  patient.stateHistory = patient.stateHistory?.length
    ? patient.stateHistory
    : patient.state_history || [];
  patient.state_history = patient.state_history?.length
    ? patient.state_history
    : patient.stateHistory || [];
  if (legacyChanged('wait_time_minutes')) {
    patient.waitTimeMinutes = patient.wait_time_minutes;
  }
  patient.waitTimeMinutes = patient.waitTimeMinutes ?? patient.wait_time_minutes ?? 0;
  patient.wait_time_minutes = patient.wait_time_minutes ?? patient.waitTimeMinutes ?? 0;

  if (legacyChanged('dps_score') && patient.dps_score) {
    patient.dpsScore = patient.dps_score;
  }
  patient.dpsScore = patient.dpsScore || patient.dps_score || 4;
  patient.dps_score = patient.dps_score || patient.dpsScore;
  if (legacyChanged('last_reassessment')) {
    patient.lastReassessment = patient.last_reassessment || null;
  }
  patient.lastReassessment = patient.lastReassessment || patient.last_reassessment || null;
  patient.last_reassessment = patient.last_reassessment || patient.lastReassessment || null;
  if (legacyChanged('next_reassessment_due')) {
    patient.nextReassessmentDue = patient.next_reassessment_due || null;
  }
  patient.nextReassessmentDue =
    patient.nextReassessmentDue || patient.next_reassessment_due || null;
  patient.next_reassessment_due =
    patient.next_reassessment_due || patient.nextReassessmentDue || null;
  if (legacyChanged('reassessment_history') && patient.reassessment_history?.length) {
    patient.dpsHistory = patient.reassessment_history;
  }
  patient.dpsHistory = patient.dpsHistory?.length
    ? patient.dpsHistory
    : patient.reassessment_history || [];
  patient.reassessment_history = patient.reassessment_history?.length
    ? patient.reassessment_history
    : patient.dpsHistory || [];

  if (legacyChanged('ems_status') && patient.ems_status) {
    patient.emsStatus = patient.ems_status;
  }
  patient.emsStatus = patient.emsStatus || patient.ems_status || 'none';
  patient.ems_status = patient.ems_status || patient.emsStatus;
  if (legacyChanged('ems_unit_id')) {
    patient.emsUnitId = patient.ems_unit_id || null;
  }
  patient.emsUnitId = patient.emsUnitId || patient.ems_unit_id || null;
  patient.ems_unit_id = patient.ems_unit_id || patient.emsUnitId || null;
  if (legacyChanged('dispatch_timestamp')) {
    patient.dispatchTimestamp = patient.dispatch_timestamp || null;
  }
  patient.dispatchTimestamp = patient.dispatchTimestamp || patient.dispatch_timestamp || null;
  patient.dispatch_timestamp = patient.dispatch_timestamp || patient.dispatchTimestamp || null;
  if (legacyChanged('eta_minutes')) {
    patient.etaMinutes = patient.eta_minutes ?? null;
  }
  patient.etaMinutes = patient.etaMinutes ?? patient.eta_minutes ?? null;
  patient.eta_minutes = patient.eta_minutes ?? patient.etaMinutes ?? null;

  patient.triage = patient.triage || {};
  if (legacyChanged('triage_code') && patient.triage_code) {
    patient.triage.code = patient.triage_code;
  }
  patient.triage.code = patient.triage.code || patient.triage_code || null;
  patient.triage_code = patient.triage_code || patient.triage.code || null;
  if (patient.triage.code?.startsWith('CTAS')) patient.triage.system = 'CTAS';
  if (patient.triage.code?.startsWith('ESI')) patient.triage.system = 'ESI';

  if (patient.currentVitals && !patient.vitals) {
    patient.vitals = {
      hr: patient.currentVitals.hr,
      bp: patient.currentVitals.bp,
      o2: patient.currentVitals.spO2,
      rr: patient.currentVitals.rr,
      temperature: patient.currentVitals.temp,
    };
  }
  if (patient.vitals) {
    patient.currentVitals = patient.currentVitals || {};
    patient.currentVitals.hr = patient.currentVitals.hr ?? patient.vitals.hr;
    patient.currentVitals.bp = patient.currentVitals.bp ?? patient.vitals.bp;
    patient.currentVitals.spO2 = patient.currentVitals.spO2 ?? patient.vitals.o2;
    patient.currentVitals.rr = patient.currentVitals.rr ?? patient.vitals.rr;
    patient.currentVitals.temp = patient.currentVitals.temp ?? patient.vitals.temperature;
  }

  patient.virtualCare = patient.virtualCare || {
    recheckScheduled: false,
    recheckCompleted: false,
  };
  patient.modifiedAt = new Date();
});

UnifiedPatientSchema.index(
  { mrn: 1 },
  { name: 'idx_unified_patients_mrn', unique: true, sparse: true },
);
UnifiedPatientSchema.index(
  { phn: 1 },
  { name: 'idx_unified_patients_phn', unique: true, sparse: true },
);
UnifiedPatientSchema.index({ currentState: 1 }, { name: 'idx_unified_patients_current_state' });
UnifiedPatientSchema.index({ dpsScore: 1 }, { name: 'idx_unified_patients_dps_score' });
UnifiedPatientSchema.index(
  { boardingStartTime: 1 },
  { name: 'idx_unified_patients_boarding_start_time' },
);
UnifiedPatientSchema.index({ mciBatchId: 1 }, { name: 'idx_unified_patients_mci_batch_id' });
UnifiedPatientSchema.index(
  { wearableDeviceId: 1 },
  { name: 'idx_unified_patients_wearable_device_id' },
);
UnifiedPatientSchema.index(
  { 'triggeredProtocols.status': 1 },
  { name: 'idx_unified_patients_triggered_protocol_status' },
);
UnifiedPatientSchema.index(
  { nextReassessmentDue: 1 },
  { name: 'idx_unified_patients_next_reassessment_due' },
);
UnifiedPatientSchema.index(
  { emsStatus: 1, etaMinutes: 1 },
  { name: 'idx_unified_patients_ems_eta' },
);
UnifiedPatientSchema.index(
  { 'identifiers.type': 1, 'identifiers.value': 1 },
  { name: 'idx_unified_patients_identifier' },
);
UnifiedPatientSchema.index({ organizationId: 1 }, { name: 'idx_unified_patients_organization_id' });

export const UnifiedPatient =
  (models.UnifiedPatient as Model<IUnifiedPatient> | undefined) ||
  model<IUnifiedPatient>('UnifiedPatient', UnifiedPatientSchema);

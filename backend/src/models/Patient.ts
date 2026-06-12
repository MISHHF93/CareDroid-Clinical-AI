import { Schema, model, Document } from 'mongoose';

export interface IReassessmentHistory {
  score: number;
  reason: string;
  clinician: string;
  timestamp: Date;
}

export interface IPatientIdentifier {
  type: 'internal' | 'mrn' | 'health_card' | 'ems_temporary' | 'external_ehr' | 'referral_source';
  value: string;
  issuer?: string;
  verified: boolean;
  addedAt: Date;
}

export interface IPatient extends Document {
  // Basic info
  name: string;
  age: string;
  chief_complaint: string;
  previous_names: string[];
  date_of_birth: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;

  // Prehospital stages
  ems_status: 'dispatched' | 'on_scene' | 'en_route' | 'arrived' | 'none';
  dispatch_timestamp: Date | null;
  eta_minutes: number | null;
  ems_unit_id: string | null;

  // DPS System
  dps_score: 1 | 2 | 3 | 4 | 5;
  last_reassessment: Date | null;
  next_reassessment_due: Date | null;
  reassessment_history: IReassessmentHistory[];

  // Triage
  triage_code: 'CTAS1' | 'CTAS2' | 'CTAS3' | 'CTAS4' | 'CTAS5' | null;

  // Safety
  safety_override: boolean;
  safety_override_reason: string | null;
  last_safety_violation: Date | null;

  // Journey
  current_state: string;
  state_history: Array<{ state: string; timestamp: Date }>;
  wait_time_minutes: number;

  // Clinical
  vitals?: {
    hr?: number;
    bp?: string;
    o2?: number;
    rr?: number;
    temperature?: number;
  };
  assigned_clinician: string | null;
  alerts: string[];
  identifiers: IPatientIdentifier[];
  temporary_encounter_id: string | null;
  identity_reconciled: boolean;
}

const ReassessmentHistorySchema = new Schema<IReassessmentHistory>({
  score: { type: Number, required: true },
  reason: { type: String, required: true },
  clinician: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const PatientIdentifierSchema = new Schema<IPatientIdentifier>({
  type: {
    type: String,
    enum: ['internal', 'mrn', 'health_card', 'ems_temporary', 'external_ehr', 'referral_source'],
    required: true,
  },
  value: { type: String, required: true },
  issuer: { type: String, default: null },
  verified: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now },
});

const PatientSchema = new Schema<IPatient>(
  {
    name: { type: String, required: true },
    age: { type: String, required: true },
    chief_complaint: { type: String, required: true },
    previous_names: { type: [String], default: [] },
    date_of_birth: { type: String, default: null },
    sex: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null },

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
    reassessment_history: { type: [ReassessmentHistorySchema], default: [] },

    triage_code: {
      type: String,
      enum: ['CTAS1', 'CTAS2', 'CTAS3', 'CTAS4', 'CTAS5', null],
      default: null,
    },

    safety_override: { type: Boolean, default: false },
    safety_override_reason: { type: String, default: null },
    last_safety_violation: { type: Date, default: null },

    current_state: { type: String, required: true },
    state_history: { type: [{ state: String, timestamp: Date }], default: [] },
    wait_time_minutes: { type: Number, default: 0 },

    vitals: {
      hr: Number,
      bp: String,
      o2: Number,
      rr: Number,
      temperature: Number,
    },
    assigned_clinician: { type: String, default: null },
    alerts: { type: [String], default: [] },
    identifiers: { type: [PatientIdentifierSchema], default: [] },
    temporary_encounter_id: { type: String, default: null },
    identity_reconciled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Indexes
PatientSchema.index({ dps_score: 1 });
PatientSchema.index({ next_reassessment_due: 1 });
PatientSchema.index({ ems_status: 1 });
PatientSchema.index({ current_state: 1 });
PatientSchema.index({ 'identifiers.type': 1, 'identifiers.value': 1 });
PatientSchema.index({ name: 1, date_of_birth: 1 });
PatientSchema.index({ phone: 1 });
PatientSchema.index({ email: 1 });

export const Patient = model<IPatient>('Patient', PatientSchema);

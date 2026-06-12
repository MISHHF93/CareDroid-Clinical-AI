import { Patient, type IPatientIdentifier } from '../models/Patient';
import { fhirService } from './fhir.service';
import { mpiService } from './mpi.service';
import { ocrService } from './ocr.service';
import { textMiningService } from './text-mining.service';
import {
  DocumentCapture,
  ExtractedAllergy,
  ExtractedDemographics,
  ExtractedMedication,
  FinalIntakeAction,
  IdentityAuditAction,
  IdentityEvidence,
  IntakeInputSource,
  IntakeSession,
  PatientIdentityAuditLog,
  SmartIntakeInput,
  SmartIntakeOutput,
  SmartIntakeSession,
  VerificationDecision,
} from '../models/SmartIntake';

const REQUIRED_CRITICAL_FIELDS = ['firstName', 'lastName', 'dateOfBirth', 'sex'];
const BIOMETRIC_TENANT_DEFAULT = false;

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fieldValue(session: IntakeSession, field: string): unknown {
  const verified = session.evidence.find((item) => item.field === field && item.verified);
  if (verified) return verified.value;
  return session.evidence.find((item) => item.field === field)?.value;
}

function redactedEvidence(evidence: IdentityEvidence): IdentityEvidence {
  if (!evidence.redacted) return evidence;
  return { ...evidence, value: '[redacted until verification]' };
}

export class SmartIntakeService {
  private matcher = mpiService;
  private ocr = ocrService;
  private textMining = textMiningService;
  private fhir = fhirService;

  async createSession(createdBy: string): Promise<IntakeSession> {
    const session = new SmartIntakeSession({
      createdBy,
      biometricConsent: { enabledByTenant: BIOMETRIC_TENANT_DEFAULT, consentGranted: false },
      auditLog: [this.audit('manual_override_used', createdBy, { event: 'session_created' })],
    });
    await session.save();
    return session;
  }

  async addManualEntry(sessionId: string, manual: ExtractedDemographics & { chiefComplaint?: string; staffNotes?: string }, actor: string) {
    const session = await this.getSession(sessionId);
    session.status = 'capturing_inputs';
    session.inputs.push({ source: 'manual_entry', manual, staffNotes: manual.staffNotes });
    this.addEvidenceFromDemographics(session, manual as Record<string, unknown>, 'manual_entry', 1, false);
    session.auditLog.push(this.audit('field_edited', actor, { source: 'manual_entry', fields: Object.keys(manual) }));
    await session.save();
    return this.output(session);
  }

  async addDocument(sessionId: string, document: Partial<DocumentCapture>, actor: string) {
    const session = await this.getSession(sessionId);
    const capture: DocumentCapture = {
      id: document.id || id('doc'),
      type: document.type || 'referral_letter',
      filename: document.filename,
      uploadedBy: actor,
      uploadedAt: new Date(),
      ocrProvider: document.ocrProvider,
      ocrPayload: document.ocrPayload,
      purpose: document.purpose || 'smart_intake_identity_verification',
      verified: false,
    };
    session.documents.push(capture);
    session.inputs.push({ source: this.documentSource(capture.type), documents: [capture] });
    const minedDemographics = this.textMining.extractFromDocument(document);
    this.addEvidenceFromDemographics(session, minedDemographics, this.documentSource(capture.type), 0.55, true);
    session.auditLog.push(this.audit('document_uploaded', actor, { documentId: capture.id, type: capture.type }));
    await session.save();
    return this.output(session);
  }

  async ingestOcrResult(sessionId: string, payload: any, actor: string) {
    const session = await this.getSession(sessionId);
    session.status = 'review_ocr';
    const normalizedPayload = this.ocr.normalizePayload(payload);
    const source = normalizedPayload.source;
    const demographics = normalizedPayload.demographics;
    this.addEvidenceFromDemographics(
      session,
      demographics as Record<string, unknown>,
      source,
      normalizedPayload.confidence,
      true,
    );
    for (const medication of normalizedPayload.medications) session.medications.push(medication);
    for (const allergy of normalizedPayload.allergies) session.allergies.push(allergy);
    session.inputs.push({
      source,
      manual: demographics,
      medications: normalizedPayload.medications,
      allergies: normalizedPayload.allergies,
      staffNotes: normalizedPayload.notes,
    });
    session.auditLog.push(
      this.audit('ocr_extracted', actor, {
        source,
        demographicFields: Object.keys(demographics),
        medications: normalizedPayload.medications.length,
        allergies: normalizedPayload.allergies.length,
      }),
    );
    await session.save();
    return this.output(session);
  }

  async addEMSEvidence(sessionId: string, ems: SmartIntakeInput['ems'], actor: string) {
    const session = await this.getSession(sessionId);
    session.inputs.push({ source: 'ems_prearrival', ems });
    if (ems?.temporaryId) {
      session.evidence.push(this.evidence('emsTemporaryId', ems.temporaryId, 'ems_prearrival', 0.95, false));
    }
    if (ems?.chiefComplaint) {
      session.evidence.push(this.evidence('chiefComplaint', ems.chiefComplaint, 'ems_prearrival', 0.8, true));
    }
    session.auditLog.push(this.audit('ems_evidence_added', actor, { emsUnitId: ems?.emsUnitId }));
    await session.save();
    return this.output(session);
  }

  async match(sessionId: string, actor: string) {
    const session = await this.getSession(sessionId);
    session.status = 'matching';
    const demographics = this.demographicsFromEvidence(session);
    const candidates = await this.matcher.findCandidates(demographics);
    session.matchCandidates = candidates;
    session.duplicateWarning = candidates.some((candidate) => candidate.matchScore >= 85);
    session.auditLog.push(this.audit('candidate_match_generated', actor, { count: candidates.length }));
    if (session.duplicateWarning) {
      session.auditLog.push(this.audit('duplicate_warning_shown', actor, { candidates: candidates.slice(0, 3) }));
    }
    await session.save();
    return this.output(session);
  }

  async verifyField(
    sessionId: string,
    field: string,
    decision: VerificationDecision,
    actor: string,
    editedValue?: unknown,
  ) {
    const session = await this.getSession(sessionId);
    session.status = 'verifying';
    const evidence = session.evidence.find((item) => item.field === field && item.verificationDecision === 'pending');
    if (!evidence) throw new Error(`No pending evidence found for field ${field}`);
    evidence.reviewedBy = actor;
    evidence.reviewedAt = new Date();
    evidence.verificationDecision = decision;
    evidence.verified = decision === 'approved' || decision === 'edited';
    if (decision === 'edited') evidence.value = editedValue;
    if (evidence.verified) session.verifiedSnapshot[field] = evidence.value;
    const action: IdentityAuditAction =
      decision === 'approved' ? 'field_verified' : decision === 'edited' ? 'field_edited' : 'field_rejected';
    session.auditLog.push(this.audit(action, actor, { field, edited: decision === 'edited' }));
    await session.save();
    return this.output(session);
  }

  async linkPatient(sessionId: string, patientId: string, actor: string) {
    const session = await this.getSession(sessionId);
    if (!session.matchCandidates.some((candidate) => candidate.patientId === patientId)) {
      throw new Error('Patient link requires a generated match candidate');
    }
    this.assertCriticalFieldsReviewed(session);
    session.linkedPatientId = patientId;
    session.finalAction = 'link_to_existing_patient';
    session.status = 'completed';
    session.auditLog.push(this.audit('patient_linked', actor, { patientId }));
    await session.save();
    return this.output(session);
  }

  async createPatient(sessionId: string, actor: string) {
    const session = await this.getSession(sessionId);
    this.assertCriticalFieldsReviewed(session);
    if (session.duplicateWarning) {
      const overrideReviewed = session.auditLog.some((entry) => entry.action === 'manual_override_used');
      if (!overrideReviewed) throw new Error('High-confidence duplicate requires manual override before creating a new patient');
    }
    const snapshot = this.fhir.normalizePatientSnapshot(session.verifiedSnapshot as Record<string, any>);
    const patient = new Patient({
      name: `${snapshot.firstName || 'New'} ${snapshot.lastName || 'Patient'}`.trim(),
      age: snapshot.age || 'Unknown',
      chief_complaint: snapshot.chiefComplaint || 'Smart Intake',
      previous_names: snapshot.previousNames || [],
      date_of_birth: snapshot.dateOfBirth || null,
      sex: snapshot.sex || null,
      phone: snapshot.phone || null,
      email: snapshot.email || null,
      address: snapshot.address || null,
      identifiers: this.identifiersFromSnapshot(snapshot, true),
      current_state: 'REGISTRATION',
      state_history: [{ state: 'REGISTRATION', timestamp: new Date() }],
      dps_score: 4,
      alerts: [],
      assigned_clinician: null,
    });
    await patient.save();
    session.linkedPatientId = String(patient._id);
    session.finalAction = 'create_new_patient';
    session.status = 'completed';
    session.auditLog.push(this.audit('patient_created', actor, { patientId: String(patient._id) }));
    await session.save();
    return this.output(session);
  }

  async continueUnknown(sessionId: string, label: 'Unknown Male' | 'Unknown Female' | 'Unknown Patient', actor: string) {
    const session = await this.getSession(sessionId);
    const temporaryEncounterId = id('UNK-ENC');
    const patient = new Patient({
      name: label,
      age: 'Unknown',
      chief_complaint: String(fieldValue(session, 'chiefComplaint') || 'Unknown complaint'),
      sex: label === 'Unknown Male' ? 'Male' : label === 'Unknown Female' ? 'Female' : null,
      current_state: 'ARRIVAL',
      state_history: [{ state: 'ARRIVAL', timestamp: new Date() }],
      temporary_encounter_id: temporaryEncounterId,
      identity_reconciled: false,
      identifiers: [
        {
          type: 'ems_temporary',
          value: temporaryEncounterId,
          verified: true,
          addedAt: new Date(),
        },
      ],
      dps_score: 4,
      alerts: ['Unknown patient identity - reconciliation required'],
      assigned_clinician: null,
    });
    await patient.save();
    session.linkedPatientId = String(patient._id);
    session.temporaryEncounterId = temporaryEncounterId;
    session.finalAction = 'continue_as_unknown_patient';
    session.status = 'completed';
    session.auditLog.push(this.audit('unknown_patient_created', actor, { patientId: String(patient._id), temporaryEncounterId }));
    await session.save();
    return this.output(session);
  }

  async reconcileUnknown(sessionId: string, patientId: string, actor: string) {
    const session = await this.getSession(sessionId);
    const unknown = session.linkedPatientId ? await Patient.findById(session.linkedPatientId) : null;
    if (!unknown) throw new Error('Unknown patient record not found for reconciliation');
    unknown.identity_reconciled = true;
    unknown.alerts.push(`Unknown patient reconciled to ${patientId} by ${actor}`);
    await unknown.save();
    session.linkedPatientId = patientId;
    session.auditLog.push(this.audit('unknown_patient_reconciled', actor, { patientId }));
    await session.save();
    return this.output(session);
  }

  async captureBiometricConsent(sessionId: string, payload: any, actor: string) {
    const session = await this.getSession(sessionId);
    const tenantEnabled = Boolean(payload.enabledByTenant);
    if (!tenantEnabled || !payload.consentGranted) {
      throw new Error('Biometric capture blocked unless tenant approval and patient consent are both active');
    }
    session.biometricConsent = {
      enabledByTenant: tenantEnabled,
      consentGranted: true,
      consentGrantedAt: new Date(),
      purposeStatement: payload.purposeStatement,
      retentionPolicy: payload.retentionPolicy,
      staffAttestation: payload.staffAttestation,
      providerReference: payload.providerReference,
      modality: payload.modality,
    };
    session.auditLog.push(this.audit('biometric_consent_granted', actor, { modality: payload.modality }));
    await session.save();
    return this.output(session);
  }

  async withdrawBiometricConsent(sessionId: string, actor: string) {
    const session = await this.getSession(sessionId);
    session.biometricConsent.consentGranted = false;
    session.biometricConsent.consentWithdrawnAt = new Date();
    session.auditLog.push(this.audit('biometric_consent_withdrawn', actor, {}));
    await session.save();
    return this.output(session);
  }

  async getAuditLog(sessionId: string): Promise<PatientIdentityAuditLog[]> {
    const session = await this.getSession(sessionId);
    return session.auditLog;
  }

  private async getSession(sessionId: string): Promise<IntakeSession> {
    const session = await SmartIntakeSession.findById(sessionId);
    if (!session) throw new Error('Intake session not found');
    return session;
  }

  private addEvidenceFromDemographics(
    session: IntakeSession,
    demographics: Record<string, unknown>,
    source: IntakeInputSource,
    confidence: number,
    redacted: boolean,
  ) {
    for (const [field, value] of Object.entries(demographics)) {
      if (value === undefined || value === null || value === '') continue;
      session.evidence.push(this.evidence(field, value, source, confidence, redacted));
    }
    session.missingFieldWarnings = REQUIRED_CRITICAL_FIELDS
      .filter((field) => !fieldValue(session, field))
      .map((field) => `Missing critical identity field: ${field}`);
  }

  private evidence(
    field: string,
    value: unknown,
    source: IntakeInputSource,
    confidence: number,
    redacted: boolean,
  ): IdentityEvidence {
    return {
      id: id('evidence'),
      source,
      field,
      value,
      confidence,
      verified: false,
      verificationDecision: 'pending',
      purpose: 'smart_intake_identity_verification',
      redacted,
      createdAt: new Date(),
    };
  }

  private demographicsFromEvidence(session: IntakeSession): ExtractedDemographics {
    const fields = [
      'firstName',
      'lastName',
      'previousNames',
      'dateOfBirth',
      'sex',
      'phone',
      'email',
      'address',
      'mrn',
      'healthCardNumber',
      'externalEhrId',
      'referralSourceId',
    ];
    return Object.fromEntries(fields.map((field) => [field, fieldValue(session, field)]).filter(([, value]) => value)) as ExtractedDemographics;
  }

  private output(session: IntakeSession): SmartIntakeOutput {
    const evidence = session.evidence.map((item) => redactedEvidence(item));
    const confidenceScore = evidence.length
      ? Number((evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length).toFixed(2))
      : 0;
    return {
      verifiedPatientSnapshot: session.verifiedSnapshot,
      unverifiedExtractedFields: evidence.filter((item) => !item.verified),
      patientMatchCandidates: session.matchCandidates,
      confidenceScore,
      matchExplanation:
        session.matchCandidates[0]?.explanation ||
        'No match generated yet. Staff confirmation is required before linking or creating records.',
      duplicateWarning: session.duplicateWarning,
      missingFieldWarnings: session.missingFieldWarnings,
      staffVerificationStatus:
        session.status === 'completed'
          ? 'complete'
          : session.status === 'manual_review'
            ? 'manual_review'
            : session.evidence.some((item) => item.verificationDecision !== 'pending')
              ? 'in_progress'
              : 'not_started',
      auditLogEntry: session.auditLog.at(-1) || null,
      finalAction: session.finalAction,
    };
  }

  private assertCriticalFieldsReviewed(session: IntakeSession) {
    const pendingCritical = session.evidence.filter(
      (item) => REQUIRED_CRITICAL_FIELDS.includes(item.field) && item.verificationDecision === 'pending',
    );
    if (pendingCritical.length) {
      throw new Error(`Critical fields require staff review: ${pendingCritical.map((item) => item.field).join(', ')}`);
    }
  }

  private identifiersFromSnapshot(snapshot: Record<string, any>, verified: boolean): IPatientIdentifier[] {
    const now = new Date();
    return [
      ['mrn', snapshot.mrn],
      ['health_card', snapshot.healthCardNumber],
      ['external_ehr', snapshot.externalEhrId],
      ['referral_source', snapshot.referralSourceId],
    ]
      .filter(([, value]) => Boolean(value))
      .map(([type, value]) => ({ type, value, verified, addedAt: now })) as IPatientIdentifier[];
  }

  private documentSource(type: string): IntakeInputSource {
    if (type === 'medication_list') return 'medication_list';
    if (type === 'allergy_list') return 'allergy_list';
    if (type === 'referral_letter') return 'referral_document';
    return 'id_document_scan';
  }

  private audit(action: IdentityAuditAction, actor: string, details: Record<string, unknown>): PatientIdentityAuditLog {
    return {
      id: id('audit'),
      action,
      actor,
      timestamp: new Date(),
      details,
    };
  }
}

export const smartIntakeService = new SmartIntakeService();

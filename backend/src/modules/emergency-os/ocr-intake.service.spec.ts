import { OcrIntakeService } from './ocr-intake.service';
import { PatientDocumentArtifactService } from './patient-document-artifact.service';
import type { EmergencyPatientService } from './emergency-os.services';

function buildDocumentArtifactService(patientIds: string[] = []): PatientDocumentArtifactService {
  const fakePatientService = {
    getPatientEnvelope: () => ({ data: { patients: patientIds.map((id) => ({ id })) } }),
  } as unknown as EmergencyPatientService;
  return new PatientDocumentArtifactService(fakePatientService);
}

describe('OcrIntakeService', () => {
  it('classifies a health card document and extracts identity fields with confidence', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService());
    const job = await service.createJob({
      filename: 'health-card-scan.jpg',
      mimeType: 'image/jpeg',
      rawText:
        'First name: Jordan\nLast name: Rivera\nDate of birth: 1990-04-12\nHealth Card Number: 1234567890',
      actor: 'staff-1',
    });

    expect(job.status).toBe('completed');
    expect(job.documentType).toBe('health_card');
    expect(
      job.extractedFields.some((field) => field.field === 'firstName' && field.value === 'Jordan'),
    ).toBe(true);
    expect(job.overallConfidence).toBeGreaterThan(0);
    expect(job.auditLog.some((entry) => entry.action === 'job_created')).toBe(true);
    expect(job.auditLog.some((entry) => entry.action === 'job_completed')).toBe(true);
  });

  it('flags low-confidence extraction and missing required fields with warnings', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService());
    const job = await service.createJob({
      filename: 'id.jpg',
      documentTypeHint: 'government_id',
      rawText: 'some unrelated scribbled note with no recognizable fields',
      actor: 'staff-1',
    });

    expect(job.status).toBe('completed');
    expect(job.warnings.length).toBeGreaterThan(0);
    expect(job.warnings.some((warning) => warning.includes('Missing required field'))).toBe(true);
  });

  it('never throws on unsupported file types — creates a failed job so staff can continue manually', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService());
    const job = await service.createJob({
      filename: 'malware.exe',
      dataUrl: 'data:application/x-msdownload;base64,AAAA',
      rawText: 'irrelevant',
      actor: 'staff-1',
    });

    expect(job.status).toBe('failed');
    expect(job.errorMessage).toMatch(/unsupported/i);
    expect(job.warnings.some((warning) => warning.includes('Continue with manual intake'))).toBe(
      true,
    );
  });

  it('supports accept/edit/reject field review decisions with an audit trail', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService());
    const job = await service.createJob({
      filename: 'health-card.jpg',
      rawText: 'First name: Jordan\nLast name: Rivera',
      actor: 'staff-1',
    });

    const reviewed = service.reviewField(job.id, 'firstName', {
      decision: 'edited',
      editedValue: 'Jordyn',
      actor: 'nurse-2',
    });

    const field = reviewed.extractedFields.find((entry) => entry.field === 'firstName');
    expect(field?.status).toBe('edited');
    expect(field?.editedValue).toBe('Jordyn');
    expect(field?.reviewedBy).toBe('nurse-2');
    expect(reviewed.auditLog.some((entry) => entry.action === 'field_reviewed')).toBe(true);
  });

  it('applies a completed job to intake only after field review and returns demographics', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService(['patient-1']));
    const job = await service.createJob({
      filename: 'health-card.jpg',
      rawText: 'First name: Jordan\nLast name: Rivera\nDate of birth: 1990-04-12',
      patientId: 'patient-1',
      actor: 'staff-1',
    });

    service.reviewField(job.id, 'firstName', { decision: 'accepted', actor: 'staff-1' });
    service.reviewField(job.id, 'lastName', { decision: 'accepted', actor: 'staff-1' });

    const applied = await service.applyToIntake(job.id, 'staff-1');
    expect(applied.appliedToIntake).toBe(true);
    expect(applied.appliedAt).toBeTruthy();
    expect(applied.appliedDemographics?.firstName).toBe('Jordan');
    expect(applied.appliedDemographics?.lastName).toBe('Rivera');
    expect(applied.auditLog.some((entry) => entry.action === 'applied_to_intake')).toBe(true);
  });

  it('HEAL-246: records a document-artifact-extraction failure in the audit log, not just silently', async () => {
    const documentArtifactService = buildDocumentArtifactService(['patient-1']);
    jest.spyOn(documentArtifactService, 'extract').mockImplementation(() => {
      throw new Error('artifact extraction exploded');
    });
    const service = new OcrIntakeService(documentArtifactService);
    const job = await service.createJob({
      filename: 'health-card.jpg',
      rawText: 'First name: Jordan\nLast name: Rivera\nDate of birth: 1990-04-12',
      patientId: 'patient-1',
      actor: 'staff-1',
    });
    service.reviewField(job.id, 'firstName', { decision: 'accepted', actor: 'staff-1' });
    service.reviewField(job.id, 'lastName', { decision: 'accepted', actor: 'staff-1' });

    const applied = await service.applyToIntake(job.id, 'staff-1');

    expect(applied.appliedToIntake).toBe(true);
    expect(
      applied.auditLog.some(
        (entry) =>
          entry.action === 'applied_to_intake' &&
          entry.details?.action === 'document_artifact_extraction_failed',
      ),
    ).toBe(true);
  });

  it('HEAL-246: records a patient-demographics-update failure in the audit log, not just a warning', async () => {
    const fakePatientService = {
      getPatient: () => ({ id: 'patient-1', firstName: 'Old', lastName: 'Name' }),
      updatePatient: () => {
        throw new Error('patient update exploded');
      },
    } as unknown as EmergencyPatientService;
    const service = new OcrIntakeService(buildDocumentArtifactService(['patient-1']), fakePatientService);
    const job = await service.createJob({
      filename: 'health-card.jpg',
      rawText: 'First name: Jordan\nLast name: Rivera\nDate of birth: 1990-04-12',
      patientId: 'patient-1',
      actor: 'staff-1',
    });
    service.reviewField(job.id, 'firstName', { decision: 'accepted', actor: 'staff-1' });
    service.reviewField(job.id, 'lastName', { decision: 'accepted', actor: 'staff-1' });

    const applied = await service.applyToIntake(job.id, 'staff-1');

    expect(applied.appliedToIntake).toBe(true);
    expect(applied.patientUpdated).toBe(false);
    expect(applied.warnings?.some((warning) => warning.includes('board update was skipped'))).toBe(
      true,
    );
    expect(
      applied.auditLog.some(
        (entry) =>
          entry.action === 'applied_to_intake' &&
          entry.details?.action === 'patient_demographics_update_failed',
      ),
    ).toBe(true);
  });

  it('rejects apply when no fields have been accepted or edited', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService());
    const job = await service.createJob({
      filename: 'health-card.jpg',
      rawText: 'First name: Jordan\nLast name: Rivera',
      actor: 'staff-1',
    });

    await expect(service.applyToIntake(job.id, 'staff-1')).rejects.toThrow(/accepted or edited/i);
  });

  it('auto-accepts high-confidence fields when requested and applies demographics', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService());
    const job = await service.createJob({
      filename: 'health-card.jpg',
      rawText: 'First name: Jordan\nLast name: Rivera\nDate of birth: 1990-04-12',
      actor: 'staff-1',
    });
    // Force high confidence for auto-accept path
    for (const field of job.extractedFields) {
      field.confidence = 0.95;
    }

    const applied = await service.applyToIntake(job.id, 'staff-1', {
      autoAcceptHighConfidence: true,
    });
    expect(applied.appliedToIntake).toBe(true);
    expect(applied.appliedDemographics?.firstName).toBe('Jordan');
  });

  it('rejects applying a job that has not completed', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService());
    const job = await service.createJob({
      filename: 'bad.exe',
      dataUrl: 'data:application/x-msdownload;base64,AAAA',
      actor: 'staff-1',
    });

    await expect(service.applyToIntake(job.id, 'staff-1')).rejects.toThrow(/only completed/i);
  });

  it('reports degraded/down health status once failures dominate recent jobs', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService());

    for (let i = 0; i < 5; i += 1) {
      await service.createJob({
        filename: 'bad.exe',
        dataUrl: 'data:application/x-msdownload;base64,AAAA',
      });
    }

    const health = service.getHealth();
    expect(health.status).toBe('down');
    expect(health.failedJobs).toBeGreaterThanOrEqual(5);
  });

  it('lists jobs filtered by patientId', async () => {
    const service = new OcrIntakeService(buildDocumentArtifactService(['patient-1', 'patient-2']));
    await service.createJob({
      filename: 'a.jpg',
      rawText: 'First name: A',
      patientId: 'patient-1',
    });
    await service.createJob({
      filename: 'b.jpg',
      rawText: 'First name: B',
      patientId: 'patient-2',
    });

    const jobsForPatient1 = service.listJobs({ patientId: 'patient-1' });
    expect(jobsForPatient1).toHaveLength(1);
    expect(jobsForPatient1[0].patientId).toBe('patient-1');
  });
});

import { NotFoundException } from '@nestjs/common';
import { OcrIntakeService } from './ocr-intake.service';
import { PatientDocumentArtifactService } from './patient-document-artifact.service';
import { EmergencyPatientService } from './emergency-os.services';

function makeService() {
  const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
  const patientService = new EmergencyPatientService(workflowLogService as any);
  const documentArtifactService = new PatientDocumentArtifactService(patientService);
  const ocrIntakeService = new OcrIntakeService(documentArtifactService, patientService);
  return { ocrIntakeService, patientService };
}

describe('OcrIntakeService — organization tenant scoping', () => {
  // Whole subsystem (create/list/get/review/apply) previously had zero
  // tenant context threaded through: jobs were never partitioned by
  // organization in storage, and applyToIntake() called
  // patientService.getPatient()/updatePatient() with no organizationId at
  // all -- meaning any WRITE_PHI user of ANY org could write real PHI
  // (name, DOB, sex, phone, MRN) onto another org's patient record just by
  // guessing/learning a jobId.

  it('getJob 404s for a different org, succeeds for the owning org', async () => {
    const { ocrIntakeService } = makeService();
    const created = await ocrIntakeService.createJob({
      patientId: 'p-org-a',
      organizationId: 'org-a',
    });

    expect(() => ocrIntakeService.getJob(created.id, 'org-b')).toThrow(NotFoundException);
    expect(ocrIntakeService.getJob(created.id, 'org-a').id).toBe(created.id);
    // No tenant context on the caller (organizationId undefined) is the
    // established "system/internal call" escape hatch elsewhere in this
    // codebase -- still allowed through here for parity.
    expect(ocrIntakeService.getJob(created.id).id).toBe(created.id);
  });

  it('listJobs excludes a different org, includes the owning org', async () => {
    const { ocrIntakeService } = makeService();
    const jobA = await ocrIntakeService.createJob({
      patientId: 'p-org-a',
      organizationId: 'org-a',
    });
    const jobB = await ocrIntakeService.createJob({
      patientId: 'p-org-b',
      organizationId: 'org-b',
    });

    const scoped = ocrIntakeService.listJobs({ organizationId: 'org-a' });
    expect(scoped.some((entry) => entry.id === jobA.id)).toBe(true);
    expect(scoped.some((entry) => entry.id === jobB.id)).toBe(false);
  });

  it('applyToIntake 404s across orgs and never reaches the patient-write path', async () => {
    const { ocrIntakeService, patientService } = makeService();
    const patient = patientService.createPatient(
      { firstName: 'Real', lastName: 'Patient' } as any,
      'org-b',
    );

    const job = await ocrIntakeService.createJob({
      patientId: patient.id,
      organizationId: 'org-b',
      rawText: 'Jane Doe DOB 1990-01-01',
    });
    // Force a reviewable field so applyToIntake has something authoritative
    // to apply, mirroring what the real OCR provider would produce.
    if (job.extractedFields.length === 0) {
      job.extractedFields.push({
        field: 'firstName',
        value: 'Jane',
        confidence: 0.95,
        status: 'pending',
      } as any);
    }
    ocrIntakeService.reviewField(job.id, job.extractedFields[0].field, { decision: 'accepted' }, 'org-b');

    await expect(
      ocrIntakeService.applyToIntake(job.id, 'attacker', {}, 'org-a'),
    ).rejects.toThrow(NotFoundException);

    // The org-B patient record must be completely untouched by the failed
    // cross-org attempt.
    const untouched = patientService.getPatient(patient.id, 'org-b');
    expect(untouched?.firstName).toBe('Real');
  });

  it('applyToIntake succeeds for the owning org and writes the patient record', async () => {
    const { ocrIntakeService, patientService } = makeService();
    const patient = patientService.createPatient(
      { firstName: 'Old', lastName: 'Name' } as any,
      'org-a',
    );

    const job = await ocrIntakeService.createJob({
      patientId: patient.id,
      organizationId: 'org-a',
    });
    if (job.extractedFields.length === 0) {
      job.extractedFields.push({
        field: 'firstName',
        value: 'New',
        confidence: 0.95,
        status: 'pending',
      } as any);
    }
    ocrIntakeService.reviewField(job.id, job.extractedFields[0].field, { decision: 'accepted' }, 'org-a');

    const applied = await ocrIntakeService.applyToIntake(job.id, 'nurse', {}, 'org-a');
    expect(applied.patientUpdated).toBe(true);

    const updated = patientService.getPatient(patient.id, 'org-a');
    expect(updated?.firstName).toBe('New');
  });
});

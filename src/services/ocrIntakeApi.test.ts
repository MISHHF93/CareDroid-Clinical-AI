import { beforeEach, describe, expect, it, vi } from 'vitest';

const capabilityEnabled = vi.fn((_capability?: string) => true);
const apiFetch = vi.fn();

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: (capability) => capabilityEnabled(capability),
}));

vi.mock('./apiClient', () => ({
  apiFetch: (...args) => apiFetch(...args),
  getApiErrorMessage: () => 'API error',
  parseApiResponse: async (response, { fallback }: any = {}) => response.mockData ?? fallback ?? {},
}));

const { default: OcrIntakeApi } = await import('./ocrIntakeApi');

describe('ocrIntakeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilityEnabled.mockReturnValue(true);
    apiFetch.mockResolvedValue({
      ok: true,
      mockData: { id: 'ocr-job-1', status: 'completed', extractedFields: [] },
    });
  });

  it('creates an OCR job against the canonical intake route', async () => {
    const job = await OcrIntakeApi.createJob({
      filename: 'health-card.jpg',
      rawText: 'First name: Jordan',
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/intake/ocr-jobs',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(job.id).toBe('ocr-job-1');
  });

  it('fetches a single job by id', async () => {
    await OcrIntakeApi.getJob('ocr-job-1');
    expect(apiFetch).toHaveBeenCalledWith('/api/emergency/intake/ocr-jobs/ocr-job-1');
  });

  it('lists jobs filtered by patientId as query params', async () => {
    apiFetch.mockResolvedValue({ ok: true, mockData: { jobs: [] } });
    await OcrIntakeApi.listJobs({ patientId: 'patient-1' });
    expect(apiFetch).toHaveBeenCalledWith('/api/emergency/intake/ocr-jobs?patientId=patient-1');
  });

  it('posts field review decisions', async () => {
    await OcrIntakeApi.reviewField('ocr-job-1', 'firstName', 'edited', 'Jordyn', 'nurse-1');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/intake/ocr-jobs/ocr-job-1/fields/firstName/review',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('applies a job to intake only after identity validation', async () => {
    const validatedJob = {
      id: 'ocr-job-1',
      status: 'completed',
      documentType: 'id',
      provider: 'tesseract',
      extractedText: 'Ada',
      extractedFields: [
        {
          field: 'firstName',
          value: 'Ada',
          confidence: 0.95,
          status: 'accepted',
        },
      ],
      overallConfidence: 0.9,
      warnings: [],
      appliedToIntake: false,
      createdBy: 'nurse-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLog: [],
    };
    apiFetch
      .mockResolvedValueOnce({ ok: true, mockData: validatedJob })
      .mockResolvedValueOnce({ ok: true, mockData: { ...validatedJob, appliedToIntake: true } });

    await OcrIntakeApi.applyToIntake('ocr-job-1', 'nurse-1');
    expect(apiFetch).toHaveBeenCalledWith('/api/emergency/intake/ocr-jobs/ocr-job-1');
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/emergency/intake/ocr-jobs/ocr-job-1/apply',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('refuses apply when OCR identity fields are unvalidated', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      mockData: {
        id: 'ocr-job-1',
        status: 'completed',
        extractedFields: [{ field: 'firstName', value: 'Ada', confidence: 0.9, status: 'pending' }],
        overallConfidence: 0.9,
      },
    });
    await expect(OcrIntakeApi.applyToIntake('ocr-job-1', 'nurse-1')).rejects.toThrow(/validation/i);
    expect(apiFetch).not.toHaveBeenCalledWith(
      '/api/emergency/intake/ocr-jobs/ocr-job-1/apply',
      expect.anything(),
    );
  });

  it('fetches OCR service health', async () => {
    apiFetch.mockResolvedValue({ ok: true, mockData: { status: 'healthy' } });
    const health = await OcrIntakeApi.fetchHealth();
    expect(apiFetch).toHaveBeenCalledWith('/api/emergency/intake/ocr-health');
    expect(health.status).toBe('healthy');
  });

  it('does not call the network when OCR intake capability is disabled', async () => {
    capabilityEnabled.mockReturnValue(false);
    await expect(OcrIntakeApi.createJob({ filename: 'x.jpg' })).rejects.toThrow(/not available/i);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

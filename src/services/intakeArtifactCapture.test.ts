import { beforeEach, describe, expect, it, vi } from 'vitest';

const capabilityEnabled = vi.fn(() => true);
const createJob = vi.fn();
const applyToIntake = vi.fn().mockResolvedValue({});
const trackEvent = vi.fn();
const invokeUnifiedAiConversational = vi.fn().mockResolvedValue({ content: '{}' });

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: (capability) => capabilityEnabled(),
}));

vi.mock('./ocrIntakeApi', () => ({
  default: {
    createJob: (...args) => createJob(...args),
    applyToIntake: (...args) => applyToIntake(...args),
  },
}));

vi.mock('./analyticsService', () => ({
  default: { trackEvent: (...args) => trackEvent(...args) },
}));

vi.mock('./careDroidUnifiedAiNode', () => ({
  invokeUnifiedAiConversational: (...args) => invokeUnifiedAiConversational(...args),
}));

const { captureIntakeArtifact } = await import('./intakeArtifactCapture');

function makeFile(name: string, content = 'health card scan', type = 'image/jpeg'): File {
  return new File([content], name, { type });
}

describe('captureIntakeArtifact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capabilityEnabled.mockReturnValue(true);
  });

  it('uses the backend OCR job result as the primary field source when it completes with fields', async () => {
    createJob.mockResolvedValue({
      id: 'ocr-job-1',
      status: 'completed',
      documentType: 'health_card',
      overallConfidence: 0.82,
      warnings: [],
      extractedFields: [
        { field: 'firstName', value: 'Jordan', status: 'pending' },
        { field: 'lastName', value: 'Rivera', status: 'pending' },
      ],
    });

    const captured = await captureIntakeArtifact({
      file: makeFile('health-card.jpg'),
      artifactId: 'health_card',
      staff: 'Nurse Ada',
    });

    expect(createJob).toHaveBeenCalled();
    expect(captured.source).toBe('backend_ocr');
    expect(captured.demographics.firstName).toBe('Jordan');
    expect(captured.confidence).toBe(0.82);
    expect(captured.ocrJobId).toBe('ocr-job-1');
    expect(captured.ocrJobStatus).toBe('completed');
    expect(captured.ocrFailed).toBe(false);
    expect(applyToIntake).toHaveBeenCalledWith('ocr-job-1', 'Nurse Ada');
  });

  it('falls back to local heuristics and marks the failed job when the OCR job fails', async () => {
    createJob.mockResolvedValue({
      id: 'ocr-job-2',
      status: 'failed',
      documentType: 'health_card',
      overallConfidence: 0,
      warnings: ['Unsupported document file type.'],
      extractedFields: [],
      errorMessage: 'Unsupported document file type.',
    });

    const captured = await captureIntakeArtifact({
      file: makeFile('health-card.jpg', 'First name: Jordan\nLast name: Rivera'),
      artifactId: 'health_card',
    });

    expect(captured.source).not.toBe('backend_ocr');
    expect(captured.ocrFailed).toBe(true);
    expect(captured.ocrWarnings).toContain('Unsupported document file type.');
    expect(captured.auditNote).toMatch(/processing failed/i);
    expect(applyToIntake).not.toHaveBeenCalled();
  });

  it('falls back to local heuristics when the OCR capability is disabled', async () => {
    capabilityEnabled.mockReturnValue(false);

    const captured = await captureIntakeArtifact({
      file: makeFile('health-card.jpg'),
      artifactId: 'health_card',
      supplementalText: 'First name: Jordan\nLast name: Rivera\nHealth Card Number: 123456',
    });

    expect(createJob).not.toHaveBeenCalled();
    expect(captured.ocrJobId).toBeUndefined();
    expect(captured.demographics.firstName).toBe('Jordan');
  });

  it('never throws when the backend OCR request itself errors, and continues intake locally', async () => {
    createJob.mockRejectedValue(new Error('network error'));

    const captured = await captureIntakeArtifact({
      file: makeFile('health-card.jpg', 'First name: Jordan\nLast name: Rivera'),
      artifactId: 'health_card',
    });

    expect(captured).toBeTruthy();
    expect(captured.source).not.toBe('backend_ocr');
  });
});

import { OCRService } from './ocr.service';

describe('OCRService validation gate', () => {
  const service = new OCRService();

  it('does not mark raw OCR as authoritative without human review', () => {
    const payload = service.normalizePayload({
      demographics: { firstName: 'Ada', lastName: 'Lovelace' },
      confidence: 0.9,
    });
    const result = service.validateForAuthoritativeWrite(payload);
    expect(result.authoritative).toBe(false);
    expect(result.reasons).toContain('human_review_required');
  });

  it('allows authoritative write only after human review + confidence + identity', () => {
    const payload = service.normalizePayload({
      demographics: { firstName: 'Ada', lastName: 'Lovelace' },
      confidence: 0.91,
    });
    const result = service.validateForAuthoritativeWrite(payload, { humanReviewed: true });
    expect(result.authoritative).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('rejects low confidence even with human review flag', () => {
    const payload = service.normalizePayload({
      demographics: { firstName: 'Ada' },
      confidence: 0.2,
    });
    const result = service.validateForAuthoritativeWrite(payload, { humanReviewed: true });
    expect(result.authoritative).toBe(false);
    expect(result.reasons).toContain('confidence_below_threshold');
  });
});

import { describe, expect, it } from 'vitest';
import { minimizePhiRequest, minimizePhiText } from './phiMinimize';

describe('phiMinimize', () => {
  it('redacts SSN, phone, email, and secrets', () => {
    const input =
      'Call 555-123-4567 or nurse@hospital.org about 123-45-6789 key_sk_live_abcdefghijklmnop';
    const result = minimizePhiText(input);
    expect(result.redactionCount).toBeGreaterThanOrEqual(3);
    expect(result.text).not.toContain('555-123-4567');
    expect(result.text).not.toContain('123-45-6789');
    expect(result.text).not.toContain('nurse@hospital.org');
    expect(result.text).toContain('[redacted-');
  });

  it('minimizes system + messages on a request', () => {
    const { request, redactionCount, phiMinimized } = minimizePhiRequest({
      systemPrompt: 'Patient MRN: AB-12345678',
      messages: [{ role: 'user', content: 'Email me at doc@example.com' }],
      message: 'DOB: 01/02/1980',
      requestType: 'COPILOT_CHAT' as any,
    });

    expect(phiMinimized).toBe(true);
    expect(redactionCount).toBeGreaterThan(0);
    expect(request.systemPrompt).toContain('[redacted-');
    expect(request.messages?.[0]?.content).toContain('[redacted-email]');
  });
});

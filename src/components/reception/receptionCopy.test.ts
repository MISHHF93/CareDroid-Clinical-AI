import { describe, expect, it } from 'vitest';
import { RECEPTION_COPY } from './receptionCopy';

describe('receptionCopy', () => {
  it('uses plain operational language without product jargon', () => {
    const serialized = JSON.stringify(RECEPTION_COPY);
    expect(serialized).not.toMatch(/Smart Intake/i);
    expect(serialized).not.toMatch(/\bMPI\b/i);
    expect(serialized).not.toMatch(/\bOCR\b/i);
    expect(serialized).not.toMatch(/provisional intake/i);
  });

  it('defines three understandable queue tabs', () => {
    expect(RECEPTION_COPY.queues.tabs.ems).toBe('Ambulance arrivals');
    expect(RECEPTION_COPY.queues.tabs.verification).toBe('Need ID check');
    expect(RECEPTION_COPY.queues.tabs.pretriage).toBe('Waiting for nurse');
  });
});

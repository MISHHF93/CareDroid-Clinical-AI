import { describe, expect, it } from 'vitest';
import {
  auditErrorRecoverySurfaces,
  formatApiRecoveryMessage,
  isLikelyNetworkError,
} from './errorRecoveryModel';

describe('errorRecoveryModel', () => {
  it('formats offline-aware API recovery messages', () => {
    const original = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    expect(formatApiRecoveryMessage(new Error('fail'), 'intake form')).toContain('offline');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: original });
  });

  it('detects likely network errors', () => {
    expect(isLikelyNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isLikelyNetworkError(new Error('Validation failed'))).toBe(false);
  });

  it('audits recovery surfaces', () => {
    const audit = auditErrorRecoverySurfaces();
    expect(audit.passesAudit).toBe(true);
    expect(audit.surfaceCount).toBeGreaterThanOrEqual(8);
  });
});

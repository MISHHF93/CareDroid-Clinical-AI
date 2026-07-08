import { describe, expect, it } from 'vitest';
import {
  formatApiRecoveryMessage,
  isInternalJavaScriptErrorMessage,
  toUserFacingApiErrorMessage,
} from './errorRecoveryModel';

describe('errorRecoveryModel', () => {
  it('detects internal JavaScript error messages', () => {
    expect(
      isInternalJavaScriptErrorMessage("Cannot read properties of undefined (reading 'status')"),
    ).toBe(true);
    expect(isInternalJavaScriptErrorMessage('Request failed (404).')).toBe(false);
  });

  it('replaces internal JavaScript errors with clinician-safe fallback copy', () => {
    expect(
      toUserFacingApiErrorMessage(
        new TypeError("Cannot read properties of undefined (reading 'status')"),
      ),
    ).toBe('Unable to reach the API. Check backend availability and try again.');
  });

  it('formats Smart Intake recovery copy without raw runtime errors', () => {
    expect(
      formatApiRecoveryMessage(
        new TypeError("Cannot read properties of undefined (reading 'status')"),
        'Smart Intake session',
      ),
    ).toBe(
      'Server unavailable. Your Smart Intake session are preserved here. Request failed',
    );
  });
});
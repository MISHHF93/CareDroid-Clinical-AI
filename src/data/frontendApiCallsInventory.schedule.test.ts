/**
 * Scheduled report API calls must be gated (no backend routes).
 */

import { describe, it, expect } from 'vitest';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { analyzeFrontendApiCall } from './backendFrontendExposure';

describe('frontendApiCallsInventory — reports schedule', () => {
  const scheduleCalls = FRONTEND_API_CALLS.filter((c) => c.id.startsWith('reports-schedule'));

  it('lists POST and DELETE schedule endpoints', () => {
    expect(scheduleCalls.map((c) => c.id).sort()).toEqual([
      'reports-schedule-cancel',
      'reports-schedule-create',
    ]);
  });

  it.each(scheduleCalls)('%s is gated-stub with reportsSchedule disabled', (call) => {
    expect(call.capability).toBe('reportsSchedule');
    expect(isBackendCapabilityEnabled('reportsSchedule')).toBe(false);
    const analyzed = analyzeFrontendApiCall(call);
    expect(analyzed.exposure).toBe('gated-stub');
    expect(analyzed.hasBackendRoute).toBe(false);
  });
});

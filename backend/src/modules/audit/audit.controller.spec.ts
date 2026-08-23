import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuditController } from './audit.controller';

describe('AuditController', () => {
  it('rate-limits POST /audit/sync (AUDIT-001: no update/delete route exists on this controller -- ordinary users cannot modify or erase audit evidence over the API -- but this write route previously had no rate limit at all, letting any authenticated user flood the tamper-evident ledger with unlimited fabricated SECURITY_EVENT entries)', () => {
    const handler = AuditController.prototype.syncAuditEvent;

    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
    expect(guards).toContain(ThrottlerGuard);

    // Matches analytics.controller.ts's identical-shape authenticated
    // POST /analytics/events limit (HEAL-347.89). @nestjs/throttler's
    // @Throttle() stores one metadata entry per throttler name, keyed as
    // `${key}${throttlerName}` (e.g. 'THROTTLER:LIMITdefault') rather than
    // a single object under 'THROTTLER:LIMIT' -- confirmed directly against
    // the installed package version rather than assumed.
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(60);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60000);
  });
});

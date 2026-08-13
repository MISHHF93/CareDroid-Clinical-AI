import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const referralPanelSource = readFileSync(join(__dirname, 'ReferralPanel.tsx'), 'utf8');

describe('ReferralPanel double-submit guard', () => {
  it('HEAL-171: guards submitReferral against duplicate-referral double-submit (MB-M1)', () => {
    // createReferral() mints a fresh referral id synchronously, before any
    // await -- same shape as HEAL-162's completeProvisionalIntake bug. The
    // existing `backendPending` state alone is not sufficient: React state
    // updates aren't reflected in the same synchronous execution that reads
    // them, so a plain double-click (or double keyboard-Enter) on Save
    // Draft / Send Referral / Send Transfer could re-enter submitReferral
    // and call createReferral() twice before the first render with
    // disabled={backendPending} ever commits.
    expect(referralPanelSource).toContain('submitReferralInFlightRef');
    expect(referralPanelSource).toMatch(
      /if \(submitReferralInFlightRef\.current\) return;\s*\n\s*submitReferralInFlightRef\.current = true;/,
    );
    // The guard must be set before the synchronous createReferral() call, not after.
    const guardIndex = referralPanelSource.indexOf('submitReferralInFlightRef.current = true;');
    const createCallIndex = referralPanelSource.indexOf('createReferral(payload)');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(createCallIndex).toBeGreaterThan(guardIndex);
    // The ref must be released once the backend sync settles, alongside the
    // existing backendPending reset, so a later legitimate submit still works.
    expect(referralPanelSource).toMatch(
      /\.finally\(\(\) => \{\s*\n\s*setBackendPending\(false\);\s*\n\s*submitReferralInFlightRef\.current = false;/,
    );
    // The existing disabled={backendPending} wiring on all 3 submit buttons
    // must remain in place as the async-window safety net.
    expect(referralPanelSource).toContain("onClick={() => submitReferral('Draft')} disabled={backendPending");
    expect(referralPanelSource).toContain("onClick={() => submitReferral('TransferRequested')} disabled={backendPending");
    expect(referralPanelSource).toContain("onClick={() => submitReferral('Sent')} disabled={backendPending");
  });
});

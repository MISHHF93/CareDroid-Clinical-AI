/**
 * Cancellation registry for background timers.
 *
 * Modules that arm a debounce or interval which outlives the caller register a
 * canceller here, so a teardown path can stop all of them without importing
 * (and therefore loading) each engine.
 *
 * This exists because a timer can outlive the module graph it was scheduled
 * against. In the test suite that surfaced as EnvironmentTeardownErrors -- the
 * unified workflow automation engine's 1.5s debounce firing after a file
 * finished, pulling administrativeAutomationEngine and assetEntitlements into a
 * torn-down environment. Every test passed and the run still exited non-zero.
 *
 * Deliberately dependency-free: the global test setup imports it, so anything it
 * pulled in would load for every test file.
 */
type Canceller = () => void;

const cancellers = new Set<Canceller>();

/** Registers a canceller. Returns an unregister function. */
export function registerBackgroundTimerCanceller(cancel: Canceller): () => void {
  cancellers.add(cancel);
  return () => {
    cancellers.delete(cancel);
  };
}

/** Runs every registered canceller. Safe to call when none are registered. */
export function cancelAllBackgroundTimers(): void {
  for (const cancel of cancellers) {
    try {
      cancel();
    } catch {
      // A canceller that throws must not stop the others from running.
    }
  }
}

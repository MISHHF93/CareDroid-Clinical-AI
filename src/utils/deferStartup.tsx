/**
 * Defer non-critical startup work until after first paint (mobile LCP / INP).
 */

/**
 * @param {() => void | Promise<void>} fn
 * @param {{ timeout?: number }} [options]
 */
export function runWhenIdle(fn, options: any = {}) {
  const { timeout = 3000 } = options;
  if (typeof window === 'undefined') {
    fn();
    return () => {};
  }

  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(
      () => {
        void Promise.resolve(fn()).catch(() => {});
      },
      { timeout }
    );
    return () => window.cancelIdleCallback(id);
  }

  const id = (window as any).setTimeout(() => {
    void Promise.resolve(fn()).catch(() => {});
  }, 1);
  return () => (window as any).clearTimeout(id);
}

/**
 * @param {() => void | Promise<void>} fn
 * @param {number} [delayMs]
 */
export function runAfterFirstPaint(fn, delayMs = 0) {
  if (typeof window === 'undefined') {
    fn();
    return () => {};
  }

  let cancelled = false;
  const run = () => {
    if (cancelled) return;
    void Promise.resolve(fn()).catch(() => {});
  };

  const schedule = () => {
    if (delayMs > 0) {
      window.setTimeout(run, delayMs);
    } else {
      run();
    }
  };

  if (document.readyState === 'complete') {
    runWhenIdle(schedule, { timeout: 2500 });
  } else {
    window.addEventListener('load', () => runWhenIdle(schedule, { timeout: 2500 }), { once: true });
  }

  return () => {
    cancelled = true;
  };
}

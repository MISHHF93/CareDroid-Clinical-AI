/**
 * Schedule non-urgent UI work after idle (recommendations, prefetch).
 */

import { runWhenIdle } from './deferStartup';

/**
 * @param {() => void | Promise<void>} fn
 * @param {{ timeout?: number }} [options]
 */
export function scheduleIdleWork(fn, options = {}) {
  return runWhenIdle(fn, { timeout: options.timeout ?? 2000 });
}

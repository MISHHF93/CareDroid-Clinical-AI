/** Shared startup / reachability timeouts (ms). Tune via env where noted. */

export const BACKEND_PROBE_TIMEOUT_MS = 1_200;

export const BACKEND_OFFLINE_CACHE_MS = 8_000;

export const DEV_SESSION_FETCH_TIMEOUT_MS = 4_000;

export const USER_BOOTSTRAP_MAX_MS = 4_500;

export const CONFIG_LOAD_TIMEOUT_MS = 3_000;

export const TENANT_CONTEXT_TIMEOUT_MS = 5_000;

/** Per-dataset cap when hydrating the emergency store from Nest. */
export const REFRESH_DATASET_TIMEOUT_MS = 4_000;

/** Tighter cap for reception-first startup (whiteboard + bundled reception snapshot). */
export const RECEPTION_DATASET_TIMEOUT_MS = 2_500;

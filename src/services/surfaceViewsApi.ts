import { apiFetchJson, getApiErrorMessage } from './apiClient';

async function guardedJson(path: string, options: any = {}) {
  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message: data?.error || data?.message || getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data, message: data?.message || '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

/**
 * Item 6 -- change-since-last-view. Records that the caller viewed
 * `surfaceKey` right now and returns the PREVIOUS viewedAt (null the first
 * time) in the same call, so a consumer can mark items created after that
 * timestamp as new without a second round trip or a read-then-write race.
 * Degrades to "nothing is new" (never "everything is new") on any failure --
 * a missed highlight is a cosmetic miss, but a false "new" badge on every
 * item every time would train users to ignore the signal.
 */
export async function touchSurfaceView(
  surfaceKey: string,
): Promise<{ ok: boolean; previousViewedAt: string | null }> {
  const result = await guardedJson(`/api/surface-views/${encodeURIComponent(surfaceKey)}`, {
    method: 'POST',
  });
  if (!result.ok) return { ok: false, previousViewedAt: null };
  return { ok: true, previousViewedAt: result.data?.previousViewedAt ?? null };
}

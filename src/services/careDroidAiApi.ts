import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import {
  runCareDroidAI,
  validateCareDroidAIResponse,
  type CareDroidAIRequest,
  type CareDroidAIResponse,
} from '../../lib/ai/careDroidAI';

export const CARE_DROID_AI_NODE_PATH = '/api/ai/node';
export const CARE_DROID_AI_NODE_CONVERSATIONAL_PATH = '/api/ai/node/conversational';

type CareDroidAIRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

// HEAL-347.3: every AI-enrichment consumer that fires several intents
// concurrently for several patients (patientJourneyAiDecisionService's
// Promise.all of 3 intents x N patients, re-triggered every ~12-13s by
// backend workflow-orchestration SSE events) funnels through this one
// transport function -- confirmed live that this can burst 25-40+
// simultaneous /api/ai/node POSTs. Beyond the browser's own per-origin
// connection cap, that volume of concurrent fetch()/JSON-parse/validation
// work was observed live to starve the JS event loop badly enough that
// individual requests' own AbortController timeout (apiFetch's default
// 8s in dev) never fired on schedule -- some requests were still neither
// resolved nor rejected 15+ seconds in. Since computePatientJourneyAiDecisions
// awaits Promise.all([3 intents]), ONE request stuck this way blocks that
// whole per-patient bundle from ever completing (or getting cached), so
// every subsequent ~12s cycle piled 3 more requests for the same patients
// on top of the ones already stuck -- an unbounded, ever-growing backlog
// for as long as the tab stayed open. A hard concurrency cap here is a
// single, central fix: bounding how many requests can be in flight at
// once keeps the browser's connection pool and the event loop responsive
// enough for each request's own timeout to actually fire on schedule,
// which is what lets the existing decisionCache (patientJourneyAiDecisionService.ts)
// start working as designed instead of missing every single cycle.
const MAX_CONCURRENT_AI_NODE_REQUESTS = 4;
let activeAiNodeRequests = 0;
const aiNodeRequestQueue: Array<() => void> = [];

function acquireAiNodeRequestSlot(): Promise<void> {
  if (activeAiNodeRequests < MAX_CONCURRENT_AI_NODE_REQUESTS) {
    activeAiNodeRequests += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    aiNodeRequestQueue.push(() => {
      activeAiNodeRequests += 1;
      resolve();
    });
  });
}

function releaseAiNodeRequestSlot(): void {
  activeAiNodeRequests = Math.max(0, activeAiNodeRequests - 1);
  const next = aiNodeRequestQueue.shift();
  if (next) next();
}

/** Test-only: reset queue/counter state between test cases. */
export function __resetAiNodeConcurrencyStateForTests(): void {
  activeAiNodeRequests = 0;
  aiNodeRequestQueue.length = 0;
}

/** Low-level CareDroid AI node transport (backend + local fallback). Prefer `requestAiChiefStructured`. */
export async function transportCareDroidAINode(
  request: CareDroidAIRequest,
  options: CareDroidAIRequestOptions = {},
): Promise<CareDroidAIResponse> {
  try {
    await acquireAiNodeRequestSlot();
    let response: Response;
    try {
      response = await apiFetch(CARE_DROID_AI_NODE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: options.signal,
        timeoutMs: options.timeoutMs,
      });
    } finally {
      releaseAiNodeRequestSlot();
    }
    const data = await parseApiResponse(response, { fallback: null });

    if (response.ok && validateCareDroidAIResponse(data)) {
      return data;
    }

    if (response.ok && validateCareDroidAIResponse(data?.data)) {
      return data.data;
    }

    throw new Error(getApiErrorMessage(null, response));
  } catch (error) {
    const fallback = await runCareDroidAI({
      ...request,
      context: {
        ...(request.context || {}),
        fallback: 'frontend_local_careDroidAI_node',
      },
    });

    return {
      ...fallback,
      warnings: [
        ...fallback.warnings,
        `Backend AI node unavailable; safe local fallback used. ${getApiErrorMessage(error)}`,
      ],
    };
  }
}

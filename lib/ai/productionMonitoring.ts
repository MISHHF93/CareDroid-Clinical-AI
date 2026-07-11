/**
 * Lightweight production AI monitoring hooks (post-v1).
 * Collects counters in-process; wire to metrics backend later.
 */

export type AiMonitorEventType =
  | 'egress_success'
  | 'egress_failure'
  | 'kill_switch'
  | 'canary_served'
  | 'shadow_candidate'
  | 'unsupported_tool'
  | 'provenance_missing'
  | 'clinician_override'
  | 'retrieval_miss'
  | 'phi_redaction';

export interface AiMonitorEvent {
  type: AiMonitorEventType;
  at: string;
  detail?: Record<string, unknown>;
}

export interface AiMonitorSnapshot {
  since: string;
  counts: Record<AiMonitorEventType, number>;
  lastEvents: AiMonitorEvent[];
}

const MAX_EVENTS = 200;
const counts: Record<AiMonitorEventType, number> = {
  egress_success: 0,
  egress_failure: 0,
  kill_switch: 0,
  canary_served: 0,
  shadow_candidate: 0,
  unsupported_tool: 0,
  provenance_missing: 0,
  clinician_override: 0,
  retrieval_miss: 0,
  phi_redaction: 0,
};
const events: AiMonitorEvent[] = [];
let since = new Date().toISOString();

export function recordAiMonitorEvent(
  type: AiMonitorEventType,
  detail?: Record<string, unknown>,
): void {
  counts[type] = (counts[type] || 0) + 1;
  events.unshift({ type, at: new Date().toISOString(), detail });
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  if (typeof console !== 'undefined' && process.env.AI_MONITOR_LOG === '1') {
    console.info('[AI_MONITOR]', type, detail || {});
  }
}

export function getAiMonitorSnapshot(): AiMonitorSnapshot {
  return {
    since,
    counts: { ...counts },
    lastEvents: events.slice(0, 50),
  };
}

export function resetAiMonitor(): void {
  for (const key of Object.keys(counts) as AiMonitorEventType[]) {
    counts[key] = 0;
  }
  events.length = 0;
  since = new Date().toISOString();
}

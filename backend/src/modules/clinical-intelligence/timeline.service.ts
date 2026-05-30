import { Injectable } from '@nestjs/common';

export interface TimelineEvent {
  id: string;
  kind: 'calculator' | 'ai' | 'device' | 'telemetry' | 'fleet' | 'workflow' | 'audit' | 'alert';
  title: string;
  detail: string;
  timestamp: string;
  workspaceIds: string[];
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'tl-calc-qsofa',
    kind: 'calculator',
    title: 'qSOFA calculated',
    detail: 'qSOFA score 2; sepsis escalation suggested.',
    timestamp: '2026-05-29T19:54:00.000Z',
    workspaceIds: ['emergency', 'clinical'],
  },
  {
    id: 'tl-ai-diff',
    kind: 'ai',
    title: 'AI differential updated',
    detail: 'Assistant generated PE vs sepsis differential with confidence limits.',
    timestamp: '2026-05-29T19:51:00.000Z',
    workspaceIds: ['clinical', 'research', 'emergency'],
  },
  {
    id: 'tl-device-stale',
    kind: 'device',
    title: 'Device signal stale',
    detail: 'ICU-12 monitor reported weak signal and stale SpO2.',
    timestamp: '2026-05-29T19:46:00.000Z',
    workspaceIds: ['medical-iot', 'operations'],
  },
  {
    id: 'tl-fleet-route',
    kind: 'fleet',
    title: 'Fleet route updated',
    detail: 'Ambulance A-12 reassigned to east bay handoff.',
    timestamp: '2026-05-29T19:38:00.000Z',
    workspaceIds: ['fleet', 'operations'],
  },
  {
    id: 'tl-audit-explain',
    kind: 'audit',
    title: 'Explainability trace viewed',
    detail: 'Reasoning summary and cited sources reviewed.',
    timestamp: '2026-05-29T19:16:00.000Z',
    workspaceIds: ['research', 'admin'],
  },
];

@Injectable()
export class TimelineService {
  listEvents(
    params: { query?: string; workspaceId?: string; kind?: string } = {},
  ): TimelineEvent[] {
    const query = (params.query || '').trim().toLowerCase();
    const workspaceId = params.workspaceId || 'all';
    const kind = params.kind || 'all';

    return TIMELINE_EVENTS.filter((event) => {
      if (workspaceId !== 'all' && !event.workspaceIds.includes(workspaceId)) return false;
      if (kind !== 'all' && event.kind !== kind) return false;
      if (!query) return true;
      return [event.kind, event.title, event.detail].join(' ').toLowerCase().includes(query);
    }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  }
}

import React from 'react';
import type { JourneyEvent } from '../../types/emergency';
import './patient.css';

type PatientTimelineProps = {
  events: JourneyEvent[];
  maxItems?: number;
  className?: string;
};

function fmt(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const HIGHLIGHT_TYPES = new Set(['Triage', 'Arrival', 'VitalsAlertFired', 'ESCALATION', 'DispositionUpdated']);

export function PatientTimeline({ events, maxItems = 20, className }: PatientTimelineProps) {
  const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const visible = sorted.slice(0, maxItems);

  return (
    <ol className={['cd-timeline', className ?? ''].filter(Boolean).join(' ')} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {visible.map((ev) => {
        const highlight = HIGHLIGHT_TYPES.has(ev.type ?? '');
        const title = ev.summary ?? (ev.to ? `→ ${ev.to}` : ev.type ?? 'Event');
        return (
          <li key={ev.id} className="cd-timeline__item">
            <span className={['cd-timeline__dot', highlight ? 'cd-timeline__dot--highlight' : ''].filter(Boolean).join(' ')} aria-hidden="true" />
            <div className="cd-timeline__body">
              <div className="cd-timeline__title">{title}</div>
              <div className="cd-timeline__meta">{fmt(ev.timestamp)}{ev.reason ? ` · ${ev.reason}` : ''}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

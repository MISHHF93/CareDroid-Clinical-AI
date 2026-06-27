import React, { useState, useEffect } from 'react';
import './patient.css';

type WaitTimerProps = {
  arrivalTime: string;
  targetMinutes?: number;
  className?: string;
};

function elapsedMinutes(from: string): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000);
}

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type Urgency = 'safe' | 'watch' | 'warning' | 'imminent' | 'breached';

function urgency(elapsed: number, target?: number): Urgency {
  if (!target) return 'safe';
  const pct = elapsed / target;
  if (pct >= 1)    return 'breached';
  if (pct >= 0.9)  return 'imminent';
  if (pct >= 0.75) return 'warning';
  if (pct >= 0.5)  return 'watch';
  return 'safe';
}

export function WaitTimer({ arrivalTime, targetMinutes, className }: WaitTimerProps) {
  const [elapsed, setElapsed] = useState(() => elapsedMinutes(arrivalTime));

  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedMinutes(arrivalTime)), 30000);
    return () => clearInterval(id);
  }, [arrivalTime]);

  const u = urgency(elapsed, targetMinutes);

  return (
    <span
      className={['cd-wait-timer', u !== 'safe' ? `cd-wait-timer--${u}` : '', className ?? ''].filter(Boolean).join(' ')}
      title={`Waiting ${formatHM(elapsed)}${targetMinutes ? ` / target ${formatHM(targetMinutes)}` : ''}`}
    >
      {formatHM(elapsed)}
    </span>
  );
}

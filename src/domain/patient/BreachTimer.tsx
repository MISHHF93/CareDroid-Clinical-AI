import React, { useState, useEffect } from 'react';
import './patient.css';

type BreachTimerProps = {
  arrivalTime: string;
  targetMinutes: number;
  className?: string;
};

function elapsed(from: string): number {
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000);
}

function formatHM(m: number): string {
  if (m < 0) {
    const a = Math.abs(m);
    const h = Math.floor(a / 60);
    const mm = a % 60;
    return h > 0 ? `−${h}h ${mm}m` : `−${mm}m`;
  }
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `+${h}h ${mm}m` : `+${mm}m`;
}

type Tier = 'safe' | 'watch' | 'warning' | 'imminent' | 'breached';

function tier(el: number, target: number): Tier {
  const pct = el / target;
  if (pct >= 1)    return 'breached';
  if (pct >= 0.9)  return 'imminent';
  if (pct >= 0.75) return 'warning';
  if (pct >= 0.5)  return 'watch';
  return 'safe';
}

export function BreachTimer({ arrivalTime, targetMinutes, className }: BreachTimerProps) {
  const [el, setEl] = useState(() => elapsed(arrivalTime));

  useEffect(() => {
    const id = setInterval(() => setEl(elapsed(arrivalTime)), 30000);
    return () => clearInterval(id);
  }, [arrivalTime]);

  const remaining = targetMinutes - el;
  const t = tier(el, targetMinutes);

  return (
    <span
      className={['cd-breach-timer', `cd-breach-timer--${t}`, className ?? ''].filter(Boolean).join(' ')}
      aria-label={remaining >= 0 ? `${remaining}m until breach` : `Breached ${Math.abs(remaining)}m ago`}
    >
      {t === 'breached' ? formatHM(el - targetMinutes) : `${remaining}m`}
    </span>
  );
}

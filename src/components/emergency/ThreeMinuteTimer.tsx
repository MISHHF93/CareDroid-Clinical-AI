import { useEffect, useState } from 'react';
import './ThreeMinuteTimer.css';

export type ThreeMinuteTimerTone = 'green' | 'amber' | 'critical';

function elapsedSeconds(startTime: string | Date): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resolveTone(seconds: number, targetSeconds: number): ThreeMinuteTimerTone {
  if (seconds >= targetSeconds) return 'critical';
  if (seconds >= targetSeconds - 60) return 'amber';
  return 'green';
}

export type ThreeMinuteTimerProps = {
  startTime: string | Date;
  targetMinutes?: number;
  label?: string;
  compact?: boolean;
  className?: string;
};

export default function ThreeMinuteTimer({
  startTime,
  targetMinutes = 3,
  label = 'Response time',
  compact = false,
  className = '',
}: ThreeMinuteTimerProps) {
  const targetSeconds = targetMinutes * 60;
  const [elapsed, setElapsed] = useState(() => elapsedSeconds(startTime));

  useEffect(() => {
    const id = setInterval(() => setElapsed(elapsedSeconds(startTime)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const tone = resolveTone(elapsed, targetSeconds);
  const isBreach = elapsed >= targetSeconds;

  if (compact) {
    return (
      <span
        className={['three-minute-timer-badge', `three-minute-timer-badge--${tone}`, className]
          .filter(Boolean)
          .join(' ')}
        aria-label={`${label}: ${formatElapsed(elapsed)} elapsed${isBreach ? ', target breached' : ''}`}
        title={
          isBreach
            ? '3-minute target breached'
            : `${formatElapsed(targetSeconds - elapsed)} remaining`
        }
      >
        {formatElapsed(elapsed)}
        {isBreach ? ' !' : ''}
      </span>
    );
  }

  return (
    <article
      className={[
        'three-minute-timer',
        `three-minute-timer--${tone}`,
        isBreach ? 'three-minute-timer--breach' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${label}: ${formatElapsed(elapsed)} elapsed`}
      aria-live="off"
    >
      <div className="three-minute-timer__label">{label}</div>
      <div className="three-minute-timer__clock" aria-atomic="true">
        {formatElapsed(elapsed)}
      </div>
      <div className="three-minute-timer__status">
        {isBreach
          ? `Target breached — ${formatElapsed(elapsed - targetSeconds)} over`
          : `${formatElapsed(targetSeconds - elapsed)} remaining`}
      </div>
    </article>
  );
}

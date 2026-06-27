import React from 'react';
import './clinical.css';

export type DifferentialEntry = {
  id: string;
  diagnosis: string;
  likelihood: number; // 0-100
};

type DifferentialItemProps = {
  entry: DifferentialEntry;
  rank: number;
};

function DifferentialItem({ entry, rank }: DifferentialItemProps) {
  const high = entry.likelihood >= 70;
  return (
    <div className={['cd-diff-item', high ? 'cd-diff-item--high' : ''].filter(Boolean).join(' ')}>
      <span className="cd-diff-item__rank">{rank}</span>
      <span className="cd-diff-item__name">{entry.diagnosis}</span>
      <div className="cd-diff-item__bar-wrap" role="meter" aria-valuenow={entry.likelihood} aria-valuemin={0} aria-valuemax={100}>
        <div className="cd-diff-item__bar" style={{ width: `${entry.likelihood}%` }} />
      </div>
      <span className="cd-diff-item__pct">{entry.likelihood}%</span>
    </div>
  );
}

type DifferentialListProps = {
  entries: DifferentialEntry[];
  className?: string;
};

export function DifferentialList({ entries, className }: DifferentialListProps) {
  const sorted = [...entries].sort((a, b) => b.likelihood - a.likelihood);
  return (
    <div className={['cd-diff-list', className ?? ''].filter(Boolean).join(' ')} aria-label="Differential diagnosis list">
      {sorted.map((e, i) => <DifferentialItem key={e.id} entry={e} rank={i + 1} />)}
    </div>
  );
}

import { Timer } from 'lucide-react';
import type { ReceptionAttentionRow, ReceptionAttentionSnapshot } from './receptionAttentionModel';
import './ReceptionAttentionStrip.css';

export type ReceptionAttentionStripProps = {
  snapshot: ReceptionAttentionSnapshot;
  onSelectRow: (row: ReceptionAttentionRow) => void;
  className?: string;
};

/**
 * Single flat attention surface for reception — no nested card chrome.
 * Max rows come from the snapshot (default 3).
 */
export default function ReceptionAttentionStrip({
  snapshot,
  onSelectRow,
  className = '',
}: ReceptionAttentionStripProps) {
  if (!snapshot.rows.length) {
    return (
      <section
        className={['reception-attention', 'reception-attention--empty', className]
          .filter(Boolean)
          .join(' ')}
        aria-label="Reception attention"
      >
        <p className="reception-attention__status">No active critical items</p>
      </section>
    );
  }

  return (
    <section
      className={['reception-attention', className].filter(Boolean).join(' ')}
      aria-label="Reception attention"
    >
      <header className="reception-attention__header">
        <h2 className="reception-attention__title">Needs attention</h2>
        <span
          className={
            snapshot.criticalCount
              ? 'reception-attention__count reception-attention__count--critical'
              : 'reception-attention__count'
          }
        >
          {snapshot.count}
        </span>
      </header>
      <ul className="reception-attention__list">
        {snapshot.rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className={`reception-attention__row reception-attention__row--${row.tone}${
                row.breached ? ' reception-attention__row--breached' : ''
              }`}
              data-tone={row.tone}
              onClick={() => onSelectRow(row)}
            >
              <span className="reception-attention__row-main">
                <strong>{row.title}</strong>
                <small>{row.detail}</small>
              </span>
              {row.timerLabel ? (
                <span className="reception-attention__timer" aria-label="Response timer">
                  <Timer size={14} aria-hidden />
                  {row.timerLabel}
                </span>
              ) : (
                <span className="reception-attention__cta">Open</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

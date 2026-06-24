import { deriveWhiteboardOperationalEvents } from '../../utils/whiteboardOperationalEvents';
import type { BoardingSignals } from '../../services/boardingSignals';
import type { Patient, Room } from '../../types/emergency';
import './WhiteboardOperationalIconStrip.css';

type WhiteboardOperationalIconStripProps = {
  patient: Patient;
  room?: Room | null;
  consultPending?: boolean;
  resultsPending?: boolean;
  boardingSignals?: BoardingSignals | null;
  compact?: boolean;
  maxIcons?: number;
};

export default function WhiteboardOperationalIconStrip({
  patient,
  room = null,
  consultPending = false,
  resultsPending = false,
  boardingSignals = null,
  compact = true,
  maxIcons = 6,
}: WhiteboardOperationalIconStripProps) {
  const events = deriveWhiteboardOperationalEvents(patient, {
    room,
    consultPending,
    resultsPending,
    boardingSignals,
  }).slice(0, maxIcons);

  if (!events.length) return null;

  return (
    <div
      className={[
        'wb-op-icon-strip',
        compact ? 'wb-op-icon-strip--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Operational status icons"
    >
      {events.map((event) => (
        <span
          key={event.id}
          className={`wb-op-icon-strip__icon wb-op-icon-strip__icon--${event.tone}`}
          title={event.detail ? `${event.label}: ${event.detail}` : event.label}
        >
          <span aria-hidden>{event.glyph}</span>
          {!compact ? <small>{event.label}</small> : null}
        </span>
      ))}
    </div>
  );
}
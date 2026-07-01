import { useMemo } from 'react';
import type { Patient, Room, Staff } from '../../types/emergency';
import { buildDigitalDoorSignSnapshot } from '../../utils/digitalDoorSignModel';
import './DigitalDoorSign.css';

type DigitalDoorSignProps = {
  room: Room;
  patient?: Patient | null;
  staff?: Staff[];
  className?: string;
};

export default function DigitalDoorSign({
  room,
  patient = null,
  staff = [] as any[],
  className = '',
}: DigitalDoorSignProps) {
  const snapshot = useMemo(
    () => buildDigitalDoorSignSnapshot(patient, room, staff),
    [patient, room, staff],
  );

  return (
    <section
      className={['digital-door-sign', className].filter(Boolean).join(' ')}
      aria-label={`Room sign for ${snapshot.roomName}`}
    >
      <header>
        <span className="digital-door-sign__room">{snapshot.roomName}</span>
        <strong className="digital-door-sign__name">{snapshot.patientName}</strong>
        <span className="digital-door-sign__mrn">MRN {snapshot.mrn}</span>
      </header>

      {snapshot.careTeam.length ? (
        <div className="digital-door-sign__team">
          <span>Care team</span>
          <p>{snapshot.careTeam.join(' · ')}</p>
        </div>
      ) : null}

      {snapshot.flags.length ? (
        <ul className="digital-door-sign__flags" aria-label="Clinical flags">
          {snapshot.flags.map((flag) => (
            <li key={flag.id} className={`digital-door-sign__flag--${flag.tone}`}>
              {flag.label}
            </li>
          ))}
        </ul>
      ) : null}

      {snapshot.reminders.length ? (
        <ul className="digital-door-sign__reminders" aria-label="Time-sensitive reminders">
          {snapshot.reminders.map((reminder) => (
            <li key={reminder}>{reminder}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
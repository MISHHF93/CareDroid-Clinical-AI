import {
  getDemoLiveStateDescription,
  getDemoLiveStateLabel,
} from '../utils/demoLiveState';
import './StateSourceNotice.css';

export default function StateSourceNotice({
  title = 'Source state',
  states = [],
  details,
  className = '',
}) {
  const uniqueStates = [...new Set(states)].filter(Boolean);

  return (
    <section
      className={`state-source-notice${className ? ` ${className}` : ''}`}
      role="note"
      aria-label="Demo/live source state"
    >
      <div>
        <strong>{title}</strong>
        {details ? <p>{details}</p> : null}
      </div>
      <ul aria-label="Source state labels">
        {uniqueStates.map((state) => (
          <li key={state}>
            <span>{getDemoLiveStateLabel(state)}</span>
            <small>{getDemoLiveStateDescription(state)}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

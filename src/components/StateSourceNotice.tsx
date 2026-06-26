import {
  getDemoLiveStateDescription,
  getDemoLiveStateLabel,
} from '../utils/demoLiveState';
import Alert from './ui/Alert';
import './StateSourceNotice.css';

const AlertAny = Alert as any;

export default function StateSourceNotice({
  title = 'Source state',
  states = ([] as any[]),
  details,
  className = '',
}) {
  const uniqueStates = [...new Set(states)].filter(Boolean);

  return (
    <AlertAny
      tone="info"
      title={title}
      className={`state-source-notice${className ? ` ${className}` : ''}`}
      role="note"
      aria-label="Demo/live source state"
    >
      {details ? (
        <details className="state-source-notice__details">
          <summary>Source details</summary>
          <p>{details}</p>
        </details>
      ) : null}
      <ul aria-label="Source state labels">
        {uniqueStates.map((state) => (
          <li key={state}>
            <span>{getDemoLiveStateLabel(state)}</span>
            <small>{getDemoLiveStateDescription(state)}</small>
          </li>
        ))}
      </ul>
    </AlertAny>
  );
}

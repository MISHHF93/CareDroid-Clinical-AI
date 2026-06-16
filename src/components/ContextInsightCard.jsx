import { Link } from 'react-router-dom';
import './ContextInsightCard.css';

const STATUS_LABELS = Object.freeze({
  live: 'Live',
  demo: 'Demo insight',
  generated: 'Generated',
  unavailable: 'Unavailable',
  empty: 'Empty',
  'action-required': 'Action required',
});

const STATUS_TONES = Object.freeze({
  live: 'live',
  demo: 'demo',
  generated: 'generated',
  unavailable: 'unavailable',
  empty: 'empty',
  'action-required': 'action',
});

export default function ContextInsightCard({
  title,
  message,
  source,
  status = 'generated',
  confidence,
  actionLabel,
  actionRoute,
  actionOnClick,
  demo = false,
  loading = false,
  error = '',
  timestamp,
}) {
  const resolvedStatus = loading ? 'generated' : error ? 'unavailable' : demo ? 'demo' : status;
  const tone = STATUS_TONES[resolvedStatus] || STATUS_TONES.generated;
  const label = STATUS_LABELS[resolvedStatus] || STATUS_LABELS.generated;
  const displayMessage = loading
    ? 'Preparing context from the current workspace.'
    : error || message || 'No contextual insight is available yet.';

  return (
    <article className={`context-insight-card context-insight-card--${tone}`}>
      <div className="context-insight-card__header">
        <span className="context-insight-card__badge">{label}</span>
        {source ? <span className="context-insight-card__source">{source}</span> : null}
      </div>
      <h3>{title}</h3>
      <p>{displayMessage}</p>
      <div className="context-insight-card__meta">
        {typeof confidence === 'number' ? <span>{Math.round(confidence * 100)}% confidence</span> : null}
        {timestamp ? <time dateTime={timestamp}>{new Date(timestamp).toLocaleString()}</time> : null}
      </div>
      {actionLabel && (actionOnClick || actionRoute) ? (
        actionOnClick ? (
          <button type="button" className="context-insight-card__action" onClick={actionOnClick}>
            {actionLabel}
          </button>
        ) : actionRoute.startsWith('/') ? (
          <Link className="context-insight-card__action" to={actionRoute}>
            {actionLabel}
          </Link>
        ) : (
          <a className="context-insight-card__action" href={actionRoute}>
            {actionLabel}
          </a>
        )
      ) : null}
    </article>
  );
}


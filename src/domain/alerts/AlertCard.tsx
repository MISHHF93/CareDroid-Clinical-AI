import { AlertCircle, AlertTriangle, CheckCircle2, Info, Siren, X } from 'lucide-react';
import type { Alert } from '../../types/emergency';
import { Button } from '../../components/primitives/Button';
import './alerts.css';

type AlertCardProps = {
  alert: Alert;
  onAction?: (alert: Alert) => void;
  onDismiss?: (alert: Alert) => void;
  className?: string;
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function iconForSeverity(severity: Alert['severity']) {
  if (severity === 'Critical') return <Siren size={18} strokeWidth={2.4} />;
  if (severity === 'Warning') return <AlertTriangle size={18} strokeWidth={2.4} />;
  return <Info size={18} strokeWidth={2.4} />;
}

export function AlertCard({ alert, onAction, onDismiss, className }: AlertCardProps) {
  const reviewState = alert.acknowledged || alert.read ? 'Reviewed' : 'Needs review';
  const classNames = [
    'cd-alert-card',
    `cd-alert-card--${alert.severity}`,
    alert.read ? 'cd-alert-card--read' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const ariaLabel = `${alert.severity} alert: ${alert.title}. ${reviewState}.`;

  const body = (
    <>
      <span className={`cd-alert-card__icon cd-alert-card__icon--${alert.severity}`} aria-hidden="true">
        {iconForSeverity(alert.severity)}
      </span>
      <div className="cd-alert-card__body">
        <div className="cd-alert-card__header">
          <div className="cd-alert-card__title">{alert.title}</div>
          <span className={`cd-alert-card__severity cd-alert-card__severity--${alert.severity}`}>
            {alert.severity}
          </span>
        </div>
        <div className="cd-alert-card__msg">{alert.message}</div>
        <div className="cd-alert-card__meta">
          {alert.type ? <span>{alert.type}</span> : null}
          {alert.source ? <span>{alert.source}</span> : null}
          <span>{reviewState}</span>
        </div>
        <div className="cd-alert-card__footer">
          <time className="cd-alert-card__time" dateTime={alert.createdAt}>
            {fmtTime(alert.createdAt)}
          </time>
          {alert.actionLabel && onAction ? (
            <Button
              variant="link"
              size="sm"
              iconLeft={<AlertCircle size={14} />}
              onClick={() => onAction(alert)}
              aria-label={`${alert.actionLabel}: ${alert.title}`}
            >
              {alert.actionLabel}
            </Button>
          ) : null}
          {onDismiss ? (
            <Button
              variant="ghost"
              size="sm"
              iconLeft={alert.acknowledged ? <CheckCircle2 size={14} /> : <X size={14} />}
              onClick={() => onDismiss(alert)}
              aria-label={`Dismiss alert: ${alert.title}`}
            >
              Dismiss
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );

  // Static role strings only — Edge Tools rejects dynamic ARIA roles.
  if (alert.severity === 'Info') {
    return (
      <article className={classNames} role="status" aria-label={ariaLabel}>
        {body}
      </article>
    );
  }
  return (
    <article className={classNames} role="alert" aria-label={ariaLabel}>
      {body}
    </article>
  );
}

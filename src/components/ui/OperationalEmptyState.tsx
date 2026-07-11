import { CdlEmptyIllustration } from '../graphics/CdlGraphicIllustrations';
import { resolveEmptyStateGraphic } from '../../config/cdlGraphicModel';
import './OperationalEmptyState.css';

/**
 * Structured operational empty state — guidance, actions, status, and next steps.
 */
import { dispatchOpenHelpHub } from '../../contexts/HelpHubContext';

export default function OperationalEmptyState({
  icon = '○',
  title,
  guidance,
  status = (undefined as any),
  statusTone = 'stable',
  nextSteps = ([] as any[]),
  actions = (undefined as any),
  helpTopicId = (undefined as string | undefined),
  size = 'card',
  className = '',
  role = 'status',
  ...props
}) {
  const sizeClass =
    size === 'inline' ? 'operational-empty-state--inline' : size === 'panel' ? 'operational-empty-state--panel' : '';
  const classNames = ['operational-empty-state', sizeClass, className].filter(Boolean).join(' ');
  const body = (
    <>
      <span className="operational-empty-state__icon" aria-hidden>
        {icon == null || (typeof icon === 'string' && icon.length <= 2) ? (
          <CdlEmptyIllustration variant={resolveEmptyStateGraphic(title || guidance || '')} />
        ) : (
          icon
        )}
      </span>
      {title ? <h3 className="operational-empty-state__title">{title}</h3> : null}
      {guidance ? <p className="operational-empty-state__guidance">{guidance}</p> : null}
      {status ? (
        <p
          className={[
            'operational-empty-state__status',
            statusTone === 'neutral' ? 'operational-empty-state__status--neutral' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {status}
        </p>
      ) : null}
      {nextSteps.length ? (
        <ul className="operational-empty-state__next">
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      ) : null}
      {actions || helpTopicId ? (
        <div className="operational-empty-state__actions">
          {actions}
          {helpTopicId ? (
            <OperationalEmptyAction
              secondary
              onClick={() => dispatchOpenHelpHub({ tab: 'topics', topicId: helpTopicId })}
            >
              Open procedure guide
            </OperationalEmptyAction>
          ) : null}
        </div>
      ) : null}
    </>
  );

  // Static role strings only (Edge Tools rejects dynamic ARIA roles).
  if (role === 'alert') {
    return (
      <section className={classNames} role="alert" aria-label={title || guidance || 'Empty state'} {...props}>
        {body}
      </section>
    );
  }
  return (
    <section className={classNames} role="status" aria-label={title || guidance || 'Empty state'} {...props}>
      {body}
    </section>
  );
}

export function OperationalEmptyAction({ children, onClick, secondary = false, type = 'button', ...props }) {
  return (
    <button
      type={type as any}
      className={[
        'operational-empty-state__action',
        secondary ? 'operational-empty-state__action--secondary' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

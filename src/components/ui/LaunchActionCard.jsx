import { Link } from 'react-router-dom';
import { NavIcon } from '../../navigation/NavIcon';

export default function LaunchActionCard({
  title,
  description,
  meta,
  action,
  icon,
  iconColor,
  iconSize = 20,
  to,
  onClick,
  ariaLabel,
  className = '',
  classNames = {},
  disabled = false,
}) {
  const content = (
    <>
      {icon ? (
        <span
          className={classNames.icon || 'launch-action-card__icon'}
          style={iconColor ? { color: iconColor } : undefined}
          aria-hidden
        >
          <NavIcon icon={icon} size={iconSize} />
        </span>
      ) : null}
      <span className={classNames.body || 'launch-action-card__body'}>
        <strong className={classNames.title}>{title}</strong>
        {description ? <span className={classNames.description}>{description}</span> : null}
        {meta ? <span className={classNames.meta}>{meta}</span> : null}
      </span>
      {action ? <span className={classNames.action || 'launch-action-card__action'}>{action}</span> : null}
    </>
  );

  if (to) {
    return (
      <Link className={className} to={to} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      {content}
    </button>
  );
}

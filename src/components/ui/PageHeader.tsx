import './PageHeader.css';

export default function PageHeader({
  eyebrow,
  title,
  titleId,
  description,
  actions,
  leadingIcon,
  children,
  compact = false,
  className = '',
  ...props
}) {
  return (
    <header
      className={['cd-page-header', compact ? 'cd-page-header--compact' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <div className="cd-page-header__content">
        {eyebrow ? <p className="cd-page-header__eyebrow">{eyebrow}</p> : null}
        <div className="cd-page-header__title-row">
          {leadingIcon ? (
            <span className="cd-page-header__icon" aria-hidden>
              {leadingIcon}
            </span>
          ) : null}
          <h1 id={titleId} className="cd-page-header__title">
            {title}
          </h1>
        </div>
        {description ? <p className="cd-page-header__description">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="cd-page-header__actions">{actions}</div> : null}
    </header>
  );
}

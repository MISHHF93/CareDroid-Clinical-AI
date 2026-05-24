import './PageHeader.css';

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
  ...props
}) {
  return (
    <header className={['cd-page-header', className].filter(Boolean).join(' ')} {...props}>
      <div className="cd-page-header__content">
        {eyebrow ? <p className="cd-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="cd-page-header__title">{title}</h1>
        {description ? <p className="cd-page-header__description">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="cd-page-header__actions">{actions}</div> : null}
    </header>
  );
}

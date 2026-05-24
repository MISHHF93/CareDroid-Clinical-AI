import React from 'react';
import Card from './card';
import Button from './button';
import Input from './input';
import Badge from './Badge';
import PageHeader from './PageHeader';
import './compact.css';

export function CompactPageHeader(props) {
  return <PageHeader compact {...props} />;
}

export function CompactSectionHeader({ title, description, actions, className = '', ...props }) {
  return (
    <div className={['compact-section-header', className].filter(Boolean).join(' ')} {...props}>
      <div className="compact-section-header__copy">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="compact-section-header__actions">{actions}</div> : null}
    </div>
  );
}

export function CompactCard(props) {
  return <Card compact {...props} />;
}

export function CompactToolCard({ title, description, meta, action, children, className = '', ...props }) {
  return (
    <Card compact hover className={['compact-tool-card', className].filter(Boolean).join(' ')} {...props}>
      <div className="compact-tool-card__body">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
        {meta ? <small>{meta}</small> : null}
      </div>
      {children}
      {action ? <div className="compact-tool-card__action">{action}</div> : null}
    </Card>
  );
}

export function CompactMetricCard({ label, value, hint, tone = 'neutral', className = '', ...props }) {
  return (
    <Card compact className={['compact-metric-card', `compact-metric-card--${tone}`, className].filter(Boolean).join(' ')} {...props}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <p>{hint}</p> : null}
    </Card>
  );
}

export function CompactButton(props) {
  return <Button compact {...props} />;
}

export function CompactInput(props) {
  return <Input compact {...props} />;
}

export function CompactBadge(props) {
  return <Badge compact {...props} />;
}

export function CompactToolbar({ children, className = '', ...props }) {
  return (
    <div className={['compact-toolbar', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}

export function CompactFilterBar(props) {
  return <CompactToolbar className="compact-filter-bar" {...props} />;
}

export function CompactPanel({ children, className = '', ...props }) {
  return (
    <section className={['compact-panel', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </section>
  );
}

function CompactState({ kind, title, description, action, className = '', ...props }) {
  return (
    <div className={['compact-state', `compact-state--${kind}`, className].filter(Boolean).join(' ')} {...props}>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div className="compact-state__action">{action}</div> : null}
    </div>
  );
}

export function CompactEmptyState(props) {
  return <CompactState kind="empty" {...props} />;
}

export function CompactErrorState(props) {
  return <CompactState kind="error" {...props} />;
}

export function CompactLoadingState(props) {
  return <CompactState kind="loading" {...props} />;
}

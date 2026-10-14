import { type ReactNode } from 'react';
import { Activity, AlertCircle, Users, ArrowRight } from 'lucide-react';
import '../../pages/emergency/ReceptionWorkspace.new-header.css';

export type ReceptionHeaderMetric = {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'critical' | 'warning' | 'success';
  icon?: ReactNode;
};

export type ReceptionHeaderProps = {
  metrics: ReceptionHeaderMetric[];
  situation?: {
    status?: string;
    attention?: string;
    owner?: string;
    nextAction?: string;
    tone?: 'neutral' | 'warning' | 'critical';
  };
  primaryActions?: ReactNode;
  queueTabs?: {
    id: string;
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
  }[];
};

export default function ReceptionHeader({
  metrics,
  situation,
  primaryActions,
  queueTabs,
}: ReceptionHeaderProps) {
  const patientCount = metrics[0]?.value ?? situation?.status?.match(/\d+/)?.[0] ?? 0;

  return (
    <header className="reception-header">
      {/* Tier 1: Clinical Bento Operational HUD */}
      <div className="reception-header__bento-hud">
        {/* Card 1: Department Arrival Flow */}
        <div className="reception-hud-card">
          <div className="reception-hud-card__top">
            <span className="reception-hud-card__eyebrow">
              <Users size={12} className="reception-hud-card__icon" aria-hidden="true" />
              Arrival Flow
            </span>
            <span className="reception-hud-card__pulse" aria-hidden="true" />
          </div>
          <div className="reception-hud-card__body">
            <span className="reception-hud-card__value">{patientCount}</span>
            <div className="reception-hud-card__details">
              <span className="reception-hud-card__title">Patients in Reception</span>
              <span className="reception-hud-card__subtext">Live queue volume</span>
            </div>
          </div>
        </div>

        {/* Card 2: Priority Attention */}
        <div
          className={`reception-hud-card${
            situation?.tone === 'critical'
              ? ' reception-hud-card--critical'
              : situation?.tone === 'warning'
                ? ' reception-hud-card--warning'
                : ''
          }`}
        >
          <div className="reception-hud-card__top">
            <span className="reception-hud-card__eyebrow">
              <AlertCircle size={12} className="reception-hud-card__icon" aria-hidden="true" />
              Priority Attention
            </span>
            <span
              className={`reception-hud-badge reception-hud-badge--${
                situation?.tone === 'critical'
                  ? 'critical'
                  : situation?.tone === 'warning'
                    ? 'warning'
                    : 'ok'
              }`}
            >
              {situation?.tone === 'critical'
                ? 'Critical'
                : situation?.tone === 'warning'
                  ? 'Attention'
                  : 'Normal'}
            </span>
          </div>
          <div className="reception-hud-card__body">
            <div className="reception-hud-card__details">
              <span className="reception-hud-card__title" title={situation?.attention}>
                {situation?.attention || 'No critical arrivals flagged'}
              </span>
              <span className="reception-hud-card__subtext">Awaiting clerk triage review</span>
            </div>
          </div>
        </div>

        {/* Card 3: Station Desk */}
        <div className="reception-hud-card">
          <div className="reception-hud-card__top">
            <span className="reception-hud-card__eyebrow">
              <Activity size={12} className="reception-hud-card__icon" aria-hidden="true" />
              Station Desk
            </span>
            <span className="reception-hud-badge reception-hud-badge--desk">Active</span>
          </div>
          <div className="reception-hud-card__body">
            <div className="reception-hud-card__details">
              <span className="reception-hud-card__title">
                {situation?.owner || 'Reception Desk'}
              </span>
              <span className="reception-hud-card__subtext">Authenticated terminal</span>
            </div>
          </div>
        </div>

        {/* Card 4: Next Directive */}
        <div className="reception-hud-card">
          <div className="reception-hud-card__top">
            <span className="reception-hud-card__eyebrow">
              <ArrowRight size={12} className="reception-hud-card__icon" aria-hidden="true" />
              Next Action
            </span>
            <span className="reception-hud-card__shortcut">Ctrl+N</span>
          </div>
          <div className="reception-hud-card__body reception-hud-card__body--stacked">
            <span
              className="reception-hud-card__value reception-hud-card__value--directive"
              title={situation?.nextAction}
            >
              {situation?.nextAction || 'Register walk-in'}
            </span>
          </div>
        </div>
      </div>

      {/* Tier 2: Actions & Queue Tabs */}
      {(primaryActions || queueTabs) && (
        <div className="reception-header__actions">
          {primaryActions && (
            <div className="reception-header__primary-actions">{primaryActions}</div>
          )}

          {queueTabs && queueTabs.length > 0 && (
            <div className="reception-header__queue-tabs" role="tablist">
              {queueTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={tab.active}
                  className={`reception-header__queue-tab${tab.active ? ' reception-header__queue-tab--active' : ''}`}
                  onClick={tab.onClick}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="reception-header__queue-badge">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export function ReceptionHeaderActionButton({
  children,
  onClick,
  primary = false,
  icon,
  title,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  icon?: ReactNode;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`reception-header__action-btn${primary ? ' reception-header__action-btn--primary' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={typeof children === 'string' ? children : title}
    >
      {icon}
      {children}
    </button>
  );
}

import { type ReactNode } from 'react';
import { Activity, AlertCircle, Users } from 'lucide-react';
import '../../pages/emergency/ReceptionWorkspace.new-header.css';

export type ReceptionHeaderMetric = {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'critical' | 'warning' | 'success';
  icon?: ReactNode;
};

export type ReceptionHeaderProps = {
  eyebrow?: string;
  title: string;
  userName: string;
  userRole: string;
  userStatus?: string;
  hospitalSite?: string;
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
  eyebrow = 'Emergency Department',
  title,
  userName,
  userRole,
  userStatus,
  hospitalSite,
  metrics,
  situation,
  primaryActions,
  queueTabs,
}: ReceptionHeaderProps) {
  return (
    <header className="reception-header">
      {/* Top Bar - Branding & User Info */}
      <div className="reception-header__top">
        <div className="reception-header__branding">
          <div>
            {eyebrow && <div className="reception-header__eyebrow">{eyebrow}</div>}
            <h1 className="reception-header__title">{title}</h1>
          </div>
        </div>

        <div className="reception-header__user-info">
          <span className="reception-header__user-name">{userName}</span>
          <span className="reception-header__user-role">{userRole}</span>
          {userStatus && <span className="reception-header__user-status">{userStatus}</span>}
          {hospitalSite && <span className="reception-header__user-status">{hospitalSite}</span>}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="reception-header__metrics">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`reception-metric${metric.tone ? ` reception-metric--${metric.tone}` : ''}`}
          >
            <div className="reception-metric__value">
              {metric.icon}
              {metric.value}
            </div>
            <div className="reception-metric__label">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Situation Brief */}
      {situation && (
        <div
          className={`reception-header__situation${situation.tone ? ` reception-header__situation--${situation.tone}` : ''}`}
        >
          {situation.status && (
            <div className="reception-situation-item">
              <div className="reception-situation-item__label">Happening Now</div>
              <div className="reception-situation-item__value">{situation.status}</div>
            </div>
          )}
          {situation.attention && (
            <div className="reception-situation-item">
              <div className="reception-situation-item__label">Needs Attention</div>
              <div className="reception-situation-item__value">{situation.attention}</div>
            </div>
          )}
          {situation.owner && (
            <div className="reception-situation-item">
              <div className="reception-situation-item__label">Owner</div>
              <div className="reception-situation-item__value">{situation.owner}</div>
            </div>
          )}
          {situation.nextAction && (
            <div className="reception-situation-item">
              <div className="reception-situation-item__label">Next Action</div>
              <div className="reception-situation-item__value">{situation.nextAction}</div>
            </div>
          )}
        </div>
      )}

      {/* Actions & Queue Tabs */}
      {(primaryActions || queueTabs) && (
        <div className="reception-header__actions">
          {primaryActions && (
            <div className="reception-header__primary-actions">{primaryActions}</div>
          )}

          {queueTabs && queueTabs.length > 0 && (
            <div className="reception-header__queue-tabs">
              {queueTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
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
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`reception-header__action-btn${primary ? ' reception-header__action-btn--primary' : ''}`}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

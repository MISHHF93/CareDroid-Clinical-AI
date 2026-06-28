import React from 'react';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { useCareDroidUser } from '../../hooks/useCareDroidUser';
import { getDashboardWidgets, getRoleLabel } from '../../lib/users/roleAccess';
import './RoleDashboardPanel.css';

type RoleDashboardPanelProps = {
  className?: string;
};

function humanizeWidgetId(id: string): string {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function WidgetCard({ widgetId }: { widgetId: string }) {
  const label = humanizeWidgetId(widgetId);
  return (
    <article
      className="cd-role-widget-card"
      aria-label={`${label} widget`}
      tabIndex={0}
    >
      <h3 className="cd-role-widget-card__title">{label}</h3>
      <p className="cd-role-widget-card__body" aria-live="polite">
        Loading {label.toLowerCase()} data…
      </p>
    </article>
  );
}

export function RoleDashboardPanel({ className = '' }: RoleDashboardPanelProps) {
  const { role } = useRolePermissions();
  const { profile } = useCareDroidUser();
  const widgets = getDashboardWidgets(role);

  return (
    <section
      className={['cd-role-dashboard-panel', className].filter(Boolean).join(' ')}
      aria-label="Role dashboard panel"
    >
      <header className="cd-role-dashboard-panel__header">
        <p
          className="cd-role-dashboard-panel__context"
          aria-label="Current role and location"
        >
          {getRoleLabel(role)} — {profile.department} at {profile.hospitalSite}
        </p>
      </header>

      <div className="cd-role-dashboard-panel__section" aria-label="Primary widgets">
        <h2 className="cd-role-dashboard-panel__section-title">Primary</h2>
        <div className="cd-role-dashboard-panel__grid" role="list">
          {widgets.primary.map((id) => (
            <div key={id} role="listitem">
              <WidgetCard widgetId={id} />
            </div>
          ))}
        </div>
      </div>

      {widgets.secondary && widgets.secondary.length > 0 && (
        <div className="cd-role-dashboard-panel__section" aria-label="Secondary widgets">
          <h2 className="cd-role-dashboard-panel__section-title">Secondary</h2>
          <div className="cd-role-dashboard-panel__grid" role="list">
            {widgets.secondary.map((id) => (
              <div key={id} role="listitem">
                <WidgetCard widgetId={id} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default RoleDashboardPanel;

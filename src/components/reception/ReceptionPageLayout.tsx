import { type ReactNode } from 'react';
import './ReceptionPageLayout.css';

export type ReceptionPageLayoutProps = {
  header: ReactNode;
  mainContent: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
};

export default function ReceptionPageLayout({
  header,
  mainContent,
  sidebar,
  footer,
}: ReceptionPageLayoutProps) {
  return (
    <div className="reception-page-layout">
      {/* Fixed Header */}
      <div className="reception-page-layout__header">{header}</div>

      {/* Main Content Area */}
      <div className="reception-page-layout__body">
        <main className="reception-page-layout__main">{mainContent}</main>

        {/* Optional Sidebar */}
        {sidebar && <aside className="reception-page-layout__sidebar">{sidebar}</aside>}
      </div>

      {/* Optional Footer */}
      {footer && <div className="reception-page-layout__footer">{footer}</div>}
    </div>
  );
}

export function ReceptionContentSection({
  title,
  description,
  children,
  actions,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="reception-content-section">
      {(title || actions) && (
        <div className="reception-content-section__header">
          {title && (
            <div>
              <h2 className="reception-content-section__title">{title}</h2>
              {description && (
                <p className="reception-content-section__description">{description}</p>
              )}
            </div>
          )}
          {actions && <div className="reception-content-section__actions">{actions}</div>}
        </div>
      )}
      <div className="reception-content-section__body">{children}</div>
    </section>
  );
}

export function ReceptionCard({
  children,
  padding = 'normal',
  elevated = false,
}: {
  children: ReactNode;
  padding?: 'none' | 'compact' | 'normal' | 'spacious';
  elevated?: boolean;
}) {
  return (
    <div
      className={`reception-card reception-card--${padding}${elevated ? ' reception-card--elevated' : ''}`}
    >
      {children}
    </div>
  );
}

export function ReceptionGrid({
  children,
  columns = 'auto',
  gap = 'normal',
}: {
  children: ReactNode;
  columns?: 'auto' | 1 | 2 | 3 | 4;
  gap?: 'compact' | 'normal' | 'spacious';
}) {
  return (
    <div className={`reception-grid reception-grid--${columns} reception-grid--gap-${gap}`}>
      {children}
    </div>
  );
}

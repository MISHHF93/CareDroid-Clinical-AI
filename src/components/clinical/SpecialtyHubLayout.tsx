import { Link } from 'react-router-dom';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import './SpecialtyHubLayout.css';

export type SpecialtyHubCard = Readonly<{
  to: string;
  title: string;
  description: string;
  /** Maturity of the underlying workflow assistant, from its own WORKFLOW_DETAIL
   * (Tier B = structured checklist workflow; Tier C = monitoring/dashboard concept). */
  tier?: 'Tier B' | 'Tier C';
}>;

export type SpecialtyHubAction = Readonly<{
  to: string;
  label: string;
}>;

/**
 * Shared layout for specialty department hubs that link out to real,
 * pre-existing content rather than fabricating new content (see Education
 * and Cardiology dashboards for the pattern this factors out of).
 */
export default function SpecialtyHubLayout({
  className,
  iconKey = 'activity',
  title,
  description,
  actions,
  cards,
}: {
  className: string;
  iconKey?: string;
  title: string;
  description: string;
  actions: readonly SpecialtyHubAction[];
  cards: readonly SpecialtyHubCard[];
}) {
  return (
    <main className={`specialty-hub-page ${className}`} aria-label={`${title} dashboard`}>
      <header className="specialty-hub-page__header">
        <div className="specialty-hub-page__title-row">
          <GraphicIconBadge iconKey={iconKey} accent="brand" size="md" />
          <div>
            <p className="specialty-hub-page-title-text" data-testid="cd-page-title-text">
              {title}
            </p>
            <p>{description}</p>
          </div>
        </div>
        <div className="specialty-hub-page__actions">
          {actions.map((action) => (
            <Link key={action.to} to={action.to}>
              {action.label}
            </Link>
          ))}
        </div>
      </header>

      <section className="specialty-hub-page__grid" aria-label={`${title} destinations`}>
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="specialty-hub-page__card">
            <div className="specialty-hub-page__card-head">
              <h2>{card.title}</h2>
              {card.tier ? (
                <span
                  className={`specialty-hub-page__tier specialty-hub-page__tier--${card.tier === 'Tier B' ? 'b' : 'c'}`}
                  title={
                    card.tier === 'Tier B'
                      ? 'Structured checklist workflow'
                      : 'Monitoring/dashboard concept'
                  }
                >
                  {card.tier}
                </span>
              ) : null}
            </div>
            <p>{card.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}

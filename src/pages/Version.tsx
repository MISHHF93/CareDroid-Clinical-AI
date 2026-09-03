import { Link } from 'react-router-dom';
import { buildInfoRows } from '../config/buildInfo';
import { PublicPageTemplate, OperationalGrid } from '../components/ui/CareDroidPrimitives';
import { CANONICAL_ROUTES } from '../config/routes.config';
import './Version.css';

export default function Version() {
  return (
    <PublicPageTemplate
      className="version-page"
      eyebrow="Deployment verification"
      title="CareDroid build version"
      description="Compare local, GitHub, and deployed builds. The production site should show the same commit hash as the latest pushed source."
      backHref={CANONICAL_ROUTES.platformStart}
    >
      <OperationalGrid variant="metrics" className="version-page__grid" as="dl">
        {buildInfoRows.map((row) => (
          <div className="version-page__item cdl-surface" key={row.label}>
            <dt>{row.label}</dt>
            <dd title={row.value}>{row.shortValue || row.value}</dd>
          </div>
        ))}
      </OperationalGrid>

      <div className="version-page__actions cdl-zone cdl-zone--primary-actions">
        <Link to={CANONICAL_ROUTES.platformStart} className="version-page__button cd-btn">
          Platform entry
        </Link>
        <Link
          to={CANONICAL_ROUTES.emergencyWhiteboard}
          className="version-page__button version-page__button--secondary cd-btn cd-btn--secondary"
        >
          Clinical workspace
        </Link>
      </div>
    </PublicPageTemplate>
  );
}

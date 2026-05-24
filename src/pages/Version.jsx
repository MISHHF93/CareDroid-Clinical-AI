import { Link } from 'react-router-dom';
import { buildInfoRows } from '../config/buildInfo';
import './Version.css';

export default function Version() {
  return (
    <section className="version-page" aria-labelledby="version-page-title">
      <div className="version-page__hero">
        <p className="version-page__eyebrow">Deployment verification</p>
        <h1 id="version-page-title">CareDroid build version</h1>
        <p>
          Use this page to compare local, GitHub, and Vercel builds. The deployed site should show
          the same commit hash as the latest pushed production source.
        </p>
      </div>

      <dl className="version-page__grid">
        {buildInfoRows.map((row) => (
          <div className="version-page__item" key={row.label}>
            <dt>{row.label}</dt>
            <dd title={row.value}>{row.shortValue || row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="version-page__actions">
        <Link to="/auth" className="version-page__button">
          Check /auth
        </Link>
        <Link to="/tools" className="version-page__button version-page__button--secondary">
          Check /tools
        </Link>
      </div>
    </section>
  );
}

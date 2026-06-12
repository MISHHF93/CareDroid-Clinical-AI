import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { buildCompetencyCredentialingSnapshot } from '../data/competencyCredentialingCatalog';
import { buildUserToolProfile } from '../data/profileToolSegmentation';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './CompetencyCredentialing.css';

export default function Credentials() {
  const { user } = useUser();
  const profile = useMemo(() => buildUserToolProfile({ user }), [user]);
  const snapshot = useMemo(() => buildCompetencyCredentialingSnapshot(profile), [profile]);
  const cmeProgress = Math.round((snapshot.summary.cmeCreditsEarned / snapshot.summary.cmeCreditsTarget) * 100);

  return (
    <section className="credentialing-page">
      <section className="credentialing-hero" aria-labelledby="credentials-title">
        <div className="credentialing-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.clipboardList} size={34} />
        </div>
        <div>
          <p className="credentialing-eyebrow">{snapshot.safetyLabel}</p>
          <h1 id="credentials-title">Credentialing Platform</h1>
          <p>
            Track certifications, CME credits, credential status, renewal needs, and training
            readiness from demo/local credentialing state.
          </p>
        </div>
        <Link className="credentialing-primary-action" to="/competencies">
          View competencies
        </Link>
      </section>

      <section className="credentialing-grid" aria-label="Credentialing status">
        <article className="credentialing-metric">
          <span>Certifications</span>
          <strong>{snapshot.summary.activeCredentials}/{snapshot.summary.totalCredentials}</strong>
          <small>Active credentials</small>
        </article>
        <article className="credentialing-metric">
          <span>CME credits</span>
          <strong>{snapshot.summary.cmeCreditsEarned}</strong>
          <small>{snapshot.summary.cmeCreditsTarget} target credits</small>
        </article>
        <article className="credentialing-metric">
          <span>CME progress</span>
          <strong>{cmeProgress}%</strong>
          <small>Continuing education progress</small>
        </article>
        <article className="credentialing-metric">
          <span>Training status</span>
          <strong>{snapshot.summary.trainingStatus}</strong>
          <small>{snapshot.summary.overallReadiness}% readiness</small>
        </article>
      </section>

      <section className="credentialing-layout">
        <div className="credentialing-panel">
          <div className="credentialing-panel__header">
            <div>
              <p className="credentialing-eyebrow">Credential records</p>
              <h2>Certifications and CME credits</h2>
            </div>
            <span className="credentialing-badge">{snapshot.sourceStatus}</span>
          </div>
          <div className="credentialing-stack">
            {snapshot.credentialRecords.map((record) => (
              <article key={record.id} className="credentialing-card">
                <div className="credentialing-card__header">
                  <div>
                    <strong>{record.title}</strong>
                    <span>{record.issuer}</span>
                  </div>
                  <span className={`credentialing-badge credentialing-badge--${record.status}`}>
                    {record.status}
                  </span>
                </div>
                <small>
                  {record.credits} CME credits
                  {record.expiresAt ? ` - expires ${record.expiresAt}` : ' - completion in progress'}
                </small>
              </article>
            ))}
          </div>
        </div>

        <aside className="credentialing-panel">
          <div className="credentialing-panel__header">
            <div>
              <p className="credentialing-eyebrow">Credentialing summary</p>
              <h2>Renewal and readiness</h2>
            </div>
          </div>
          <div className="credentialing-progress" aria-label="CME credit progress">
            <span style={{ width: `${cmeProgress}%` }} />
          </div>
          <p>
            {snapshot.summary.cmeCreditsEarned} of {snapshot.summary.cmeCreditsTarget} CME credits
            are represented in the demo credentialing state.
          </p>
          <h3>Competency gaps affecting credential readiness</h3>
          <ul className="credentialing-list">
            {snapshot.competencyGaps.map((gap) => <li key={gap}>{gap}</li>)}
          </ul>
          <h3>Recommended actions</h3>
          <ul className="credentialing-list">
            {snapshot.recommendedActions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </aside>
      </section>
    </section>
  );
}

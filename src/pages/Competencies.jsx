import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { buildCompetencyCredentialingSnapshot, COMPETENCY_DOMAINS } from '../data/competencyCredentialingCatalog';
import { buildUserToolProfile } from '../data/profileToolSegmentation';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './CompetencyCredentialing.css';

export default function Competencies() {
  const { user } = useUser();
  const profile = useMemo(() => buildUserToolProfile({ user }), [user]);
  const snapshot = useMemo(() => buildCompetencyCredentialingSnapshot(profile), [profile]);

  return (
    <section className="credentialing-page">
      <section className="credentialing-hero" aria-labelledby="competencies-title">
        <div className="credentialing-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.trophy} size={34} />
        </div>
        <div>
          <p className="credentialing-eyebrow">{snapshot.safetyLabel}</p>
          <h1 id="competencies-title">Competency Platform</h1>
          <p>
            Track simulation completion, skill completion, training status, competency gaps, and
            role-based readiness from demo/local learning state.
          </p>
        </div>
        <Link className="credentialing-primary-action" to="/credentials">
          View credentials
        </Link>
      </section>

      <section className="credentialing-grid" aria-label="Competency status">
        <article className="credentialing-metric">
          <span>Simulation completion</span>
          <strong>{snapshot.summary.simulationCompletion}%</strong>
          <small>Simulation completion tracked</small>
        </article>
        <article className="credentialing-metric">
          <span>Skill completion</span>
          <strong>{snapshot.summary.skillCompletion}%</strong>
          <small>Procedural and workflow skills</small>
        </article>
        <article className="credentialing-metric">
          <span>Training status</span>
          <strong>{snapshot.summary.trainingStatus}</strong>
          <small>{snapshot.summary.overallReadiness}% readiness</small>
        </article>
        <article className="credentialing-metric">
          <span>Competency gaps</span>
          <strong>{snapshot.competencyGaps.length}</strong>
          <small>Practice priorities</small>
        </article>
      </section>

      <section className="credentialing-layout">
        <div className="credentialing-panel">
          <div className="credentialing-panel__header">
            <div>
              <p className="credentialing-eyebrow">Competency records</p>
              <h2>Simulation and skill completion</h2>
            </div>
            <span className={`credentialing-badge credentialing-badge--${snapshot.summary.trainingStatus}`}>
              {snapshot.summary.trainingStatus}
            </span>
          </div>
          <div className="credentialing-stack">
            {snapshot.competencyRecords.map((record) => (
              <article key={record.id} className="credentialing-card">
                <div className="credentialing-card__header">
                  <div>
                    <strong>{record.title}</strong>
                    <span>{record.domain} - {record.type}</span>
                  </div>
                  <span className={`credentialing-badge credentialing-badge--${record.status}`}>
                    {record.status}
                  </span>
                </div>
                <div className="credentialing-progress" aria-label={`${record.title} progress`}>
                  <span style={{ width: `${record.progress}%` }} />
                </div>
                <small>{record.progress}% complete - {record.evidence}</small>
              </article>
            ))}
          </div>
        </div>

        <aside className="credentialing-panel">
          <div className="credentialing-panel__header">
            <div>
              <p className="credentialing-eyebrow">Profile context</p>
              <h2>{profile.role}</h2>
            </div>
            <span className="credentialing-badge">{profile.specialty}</span>
          </div>
          <h3>Tracked domains</h3>
          <div className="credentialing-chip-list">
            {COMPETENCY_DOMAINS.map((domain) => <span key={domain}>{domain}</span>)}
          </div>
          <h3>Competency gaps</h3>
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

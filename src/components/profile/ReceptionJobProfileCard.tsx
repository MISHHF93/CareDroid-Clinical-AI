import { Link } from 'react-router-dom';
import {
  isReceptionFacingRole,
  resolveReceptionProfileForRole,
} from '../../config/receptionUserProfile';
import { getSkillsForArchetype } from '../../config/receptionSkillModel';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import './ReceptionJobProfileCard.css';

export type ReceptionJobProfileCardProps = {
  role: string | null | undefined;
};

/**
 * Read-only reception job profile for the account Profile page.
 * Skills are operational (what the desk does), not manager KPIs.
 */
export default function ReceptionJobProfileCard({ role }: ReceptionJobProfileCardProps) {
  if (!isReceptionFacingRole(role)) return null;

  const profile = resolveReceptionProfileForRole(role);
  const skills = getSkillsForArchetype(profile.id);
  const canCreate = profile.allowedActions.includes(EMERGENCY_ACTIONS.createPatient);

  return (
    <div className="reception-job-profile-card" data-testid="reception-job-profile-card">
      <header className="reception-job-profile-card__header">
        <div>
          <p className="reception-job-profile-card__eyebrow">Reception job profile</p>
          <h3 className="reception-job-profile-card__title">{profile.label}</h3>
          <p className="reception-job-profile-card__description">{profile.description}</p>
        </div>
        <Link className="reception-job-profile-card__cta" to={profile.defaultRoute}>
          Open reception desk
        </Link>
      </header>

      <div className="reception-job-profile-card__guardrail" role="note">
        {canCreate
          ? 'You register and hand off. You do not assign triage acuity or final clinical disposition.'
          : 'This profile cannot create patient charts. Direct arrivals to a registration clerk.'}
      </div>

      {skills.length > 0 ? (
        <section className="reception-job-profile-card__skills" aria-label="Desk skills">
          <h4>Desk skills</h4>
          <ul>
            {skills.map((skill) => (
              <li key={skill.id}>
                <strong>{skill.label}</strong>
                <span>{skill.clerkBehavior}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="reception-job-profile-card__empty">No registration skills on this profile.</p>
      )}

      {profile.keyboardShortcuts.length > 0 ? (
        <section className="reception-job-profile-card__shortcuts" aria-label="Keyboard shortcuts">
          <h4>Shortcuts</h4>
          <ul>
            {profile.keyboardShortcuts.map((item) => (
              <li key={item.keys}>
                <kbd>{item.keys}</kbd>
                <span>{item.action}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

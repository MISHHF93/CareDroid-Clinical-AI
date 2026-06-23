import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { BACKEND_API_CAPABILITY_STATUS } from '../../config/backendApiCapabilities';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import {
  filterAdminOpsLinks,
  getVisibleAdminOpsSections,
} from '../../config/adminOperationsModel';

const SURVEILLANCE_STATUS = [
  { id: 'surveillanceNexus', label: 'Surveillance nexus API', path: CANONICAL_ROUTES.surveillanceNexus },
  { id: 'surveillanceCameras', label: 'Camera registry API' },
  { id: 'surveillanceIotRegistry', label: 'IoT registry API' },
  { id: 'surveillanceHealth', label: 'Health monitoring API' },
  {
    id: 'medicalDeviceRegistry',
    label: 'Medical IoT registry',
    path: CANONICAL_ROUTES.medicalIot,
  },
  { id: 'hospitalMap', label: 'Hospital map API', path: CANONICAL_ROUTES.hospitalMap },
  { id: 'fleetLiveTracking', label: 'Fleet live tracking', path: CANONICAL_ROUTES.fleetCommand },
];

function statusLabel(status) {
  if (status === 'real') return 'Live';
  if (status === 'demo') return 'Demo';
  return 'Disabled';
}

export default function AdminOperationsHome() {
  const { saasRole, profileCopy } = useEffectiveUserProfile();
  const visibleSections = useMemo(() => getVisibleAdminOpsSections(saasRole), [saasRole]);
  const surveillanceLinks = useMemo(
    () =>
      filterAdminOpsLinks(
        saasRole,
        SURVEILLANCE_STATUS.filter((item) => item.path).map((item) => ({
          route: item.path,
          label: item.label,
        })),
      ),
    [saasRole],
  );

  if (!visibleSections.length) {
    return (
      <div className="admin-ops-grid">
        <section className="admin-ops-card">
          <h3>Admin access limited</h3>
          <p>
            Your profile ({profileCopy.personaTitle}) does not include admin operations surfaces.
            Contact your organization administrator to request access.
          </p>
          <Link to={CANONICAL_ROUTES.profile}>Back to profile →</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-ops-grid">
      {visibleSections.map((section) => (
        <section key={section.id} className="admin-ops-card">
          <h3>{section.title}</h3>
          <p>{section.description}</p>
          <Link to={section.primaryLink.route}>{section.primaryLink.label}</Link>
          {section.id === 'surveillance-iot' ? (
            <ul className="admin-ops-status-list">
              {SURVEILLANCE_STATUS.map((item) => (
                <li key={item.id}>
                  <span>{item.label}</span>
                  <strong>{statusLabel(BACKEND_API_CAPABILITY_STATUS[item.id] || 'disabled')}</strong>
                  {item.path && surveillanceLinks.some((link) => link.route === item.path) ? (
                    <Link to={item.path} className="admin-ops-inline-link">
                      view
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {section.secondaryLinks?.length && section.id !== 'surveillance-iot' ? (
            <div className="admin-ops-secondary-links">
              {filterAdminOpsLinks(saasRole, section.secondaryLinks).map((link) => (
                <Link key={link.route} to={link.route}>
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buildUserProfileAccessSummary,
  listUserProfileCatalogOptions,
  USER_PROFILE_CATALOG,
} from '../../config/userProfileCatalog';
import {
  ED_WORKFLOW_LANES,
  listEdAssignableCatalogRoles,
} from '../../config/platformEntryModel';
import { listEdWorkflowAzSteps } from '../../config/edWorkflowIntegrationModel';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { getEmergencyRoleHomeRoute } from '../../config/emergencyRolePermissions';
import { getPlatformEntitlementContext } from '../../data/assetEntitlements';

export default function EdStaffWorkflowAdmin() {
  const [rolePreviewId, setRolePreviewId] = useState('registration-clerk');
  const entitlementContext = useMemo(() => getPlatformEntitlementContext() || {}, []);
  const catalogRoleOptions = useMemo(
    () =>
      listUserProfileCatalogOptions({
        organizationType:
          entitlementContext?.organization?.organizationType || 'hospital',
        entitledPackIds: entitlementContext?.entitledPackIds || [],
      }),
    [entitlementContext],
  );
  const rolePreviewSummary = useMemo(
    () => buildUserProfileAccessSummary(rolePreviewId),
    [rolePreviewId],
  );

  const edRoles = useMemo(
    () =>
      USER_PROFILE_CATALOG.filter(
        (entry) => entry.emergencyRoleId || entry.navigationGroups.includes('emergency'),
      ).sort((a, b) => b.hierarchyLevel - a.hierarchyLevel),
    [],
  );

  const laneAssignments = useMemo(() => listEdAssignableCatalogRoles(), []);
  const workflowAz = useMemo(() => listEdWorkflowAzSteps(), []);

  return (
    <div>
      <section className="admin-ops-card" style={{ marginBottom: 16 }}>
        <h3>ED workflow A–Z (frontend ↔ backend)</h3>
        <p>
          Each step maps to CareDroid routes. Profile and workspace APIs are production-backed;
          emergency reads use demo envelopes until persistence ships.
        </p>
        <ol style={{ marginTop: 12, paddingLeft: 20 }}>
          {workflowAz.map((step) => (
            <li key={step.id} style={{ marginBottom: 8 }}>
              <strong>{step.title}</strong> — {step.summary}
              {step.route ? (
                <>
                  {' '}
                  <Link to={step.route}>Preview route</Link>
                </>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="admin-ops-card" style={{ marginBottom: 16 }}>
        <h3>Emergency department workflow lanes</h3>
        <p>
          Each lane maps to CareDroid surfaces. Administrators assign a canonical SaaS role; the
          catalog resolves navigation, tools, and screen mode.
        </p>
        <div className="admin-ops-lanes" style={{ marginTop: 12 }}>
          {ED_WORKFLOW_LANES.map((lane) => (
            <div key={lane.id} className="admin-ops-lane">
              <strong>{lane.label}</strong>
              <div>
                <p style={{ margin: '0 0 6px' }}>
                  Emergency roles: {lane.emergencyRoles.join(', ')}
                </p>
                <p style={{ margin: 0 }}>
                  Typical SaaS roles: {lane.saasRoles.join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-ops-card" style={{ marginBottom: 16 }}>
        <h3>Role access preview</h3>
        <p className="org-pack-meta">
          Preview what a user sees before assigning <code>{rolePreviewId}</code> in tenant settings.
        </p>
        <label style={{ display: 'grid', gap: 6, maxWidth: 360, marginTop: 12 }}>
          Canonical role
          <select value={rolePreviewId} onChange={(event) => setRolePreviewId(event.target.value)}>
            {catalogRoleOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
        <p style={{ marginTop: 12 }}>{rolePreviewSummary.profileBenefits}</p>
        <ul>
          <li>{rolePreviewSummary.navigationRoutes.length} navigation routes</li>
          <li>Workspaces: {rolePreviewSummary.allowedWorkspaces.join(', ')}</li>
          <li>
            Emergency: {rolePreviewSummary.emergencyRole || 'none'} · landing{' '}
            {getEmergencyRoleHomeRoute(rolePreviewSummary.emergencyRole || rolePreviewId)}
          </li>
        </ul>
        <p style={{ marginTop: 12 }}>
          <Link to={`${CANONICAL_ROUTES.adminOperations}/tenant`}>
            Assign roles in tenant administration →
          </Link>
        </p>
      </section>

      <section className="admin-ops-card">
        <h3>ED-capable catalog roles</h3>
        <table className="admin-ops-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Emergency mapping</th>
              <th>Screen mode</th>
              <th>Benefits</th>
            </tr>
          </thead>
          <tbody>
            {edRoles.map((entry) => (
              <tr key={entry.saasRole}>
                <td>{entry.label}</td>
                <td>{entry.emergencyRoleId || '—'}</td>
                <td>{entry.defaultScreenMode || '—'}</td>
                <td>{entry.profileBenefits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-ops-card" style={{ marginTop: 16 }}>
        <h3>Lane → role quick reference</h3>
        <table className="admin-ops-table">
          <thead>
            <tr>
              <th>Lane</th>
              <th>SaaS role</th>
              <th>Emergency role</th>
              <th>Home route</th>
            </tr>
          </thead>
          <tbody>
            {laneAssignments.map((row) => (
              <tr key={`${row.laneId}-${row.saasRole}`}>
                <td>{row.laneLabel}</td>
                <td>{row.label}</td>
                <td>{row.emergencyRoleId || '—'}</td>
                <td>{getEmergencyRoleHomeRoute(row.emergencyRoleId || row.saasRole)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import { Permission, useUser } from '../../contexts/UserContext';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { useTenantContext } from '../../contexts/TenantContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { fetchCustomerPortalAdministration } from '../../services/customerPortalApi';
import { createCustomerPortalSession, fetchBillingOverview } from '../../services/subscriptionApi';
import './CustomerPortalPage.css';

const RELEASE_NOTES = Object.freeze([
  {
    id: 'customer-portal',
    date: '2026-06-06',
    title: 'Customer portal workspace',
    summary: 'A tenant-scoped home for subscription, entitlements, users, integrations, and support.',
  },
  {
    id: 'asset-entitlements',
    date: '2026-05-30',
    title: 'Asset pack entitlement visibility',
    summary: 'Enabled packs and assets now resolve through organization context before launch.',
  },
  {
    id: 'tenant-engine',
    date: '2026-05-22',
    title: 'Organization tenant engine',
    summary: 'Organization branding, compliance mode, integrations, and workspace defaults are unified.',
  },
]);

const MANAGEMENT_PERMISSIONS = Object.freeze([
  Permission.CONFIGURE_SYSTEM,
  Permission.MANAGE_SUBSCRIPTIONS,
  Permission.MANAGE_USERS,
  Permission.MANAGE_INTEGRATIONS,
]);

function humanize(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function currentUserMembership(users, currentUserId) {
  return asList(users).find((user) => user.userId === currentUserId) || null;
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="customer-portal-section-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`customer-portal-pill customer-portal-pill--${tone}`}>{children}</span>;
}

function EmptyState({ children }) {
  return <p className="customer-portal-empty">{children}</p>;
}

export default function CustomerPortalPage() {
  const { user, hasAnyPermission } = useUser();
  const { tenantContext } = useTenantContext();
  const {
    organization: identityOrganization,
    platformContext,
    workspaces,
    activeWorkspace,
    roleProfile,
    entitledAssetIds,
    refreshPlatformContext,
  } = useUserIdentity();
  const {
    organization: engineOrganization,
    tenant,
    branding,
    integrations: engineIntegrations,
    subscription,
    refreshOrganizationEngine,
  } = useOrganizationContext();

  const [adminModel, setAdminModel] = useState(null);
  const [billing, setBilling] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [supportForm, setSupportForm] = useState({
    subject: '',
    priority: 'normal',
    details: '',
  });
  const [supportRequests, setSupportRequests] = useState([]);
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);

  const resolvedOrganizationId =
    tenantContext?.organizationId || identityOrganization?.id || engineOrganization?.id || '';
  const hasTenantMismatch = Boolean(
    tenantContext?.organizationId &&
      (identityOrganization?.id || engineOrganization?.id) &&
      tenantContext.organizationId !== (identityOrganization?.id || engineOrganization?.id)
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPortal() {
      if (hasTenantMismatch) {
        setError('Tenant context does not match the active organization. Portal data was not loaded.');
        setAdminModel(null);
        setBilling(null);
        setIsLoading(false);
        return;
      }

      if (!resolvedOrganizationId) {
        setError('Select or create an organization before opening the customer portal.');
        setAdminModel(null);
        setBilling(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const [adminResult, billingResult] = await Promise.all([
        fetchCustomerPortalAdministration(resolvedOrganizationId),
        fetchBillingOverview(),
      ]);

      if (cancelled) return;

      if (!adminResult.ok) {
        setError(adminResult.message);
        setAdminModel(null);
      } else {
        setAdminModel(adminResult.data);
        setError('');
      }

      if (billingResult.ok) {
        setBilling(billingResult.data);
      }

      setIsLoading(false);
    }

    loadPortal();
    return () => {
      cancelled = true;
    };
  }, [hasTenantMismatch, resolvedOrganizationId]);

  const membership = currentUserMembership(adminModel?.users, user?.id || tenantContext?.userId);
  const isOrganizationManager =
    ['owner', 'admin'].includes(membership?.membershipRole) ||
    ['admin', 'owner'].includes(user?.role) ||
    hasAnyPermission(MANAGEMENT_PERMISSIONS);

  const portalOrganization = adminModel?.profile || identityOrganization || engineOrganization || {};
  const effectiveBranding = adminModel?.branding || branding || portalOrganization?.branding || {};
  const effectiveTenant = {
    tenantId: portalOrganization?.tenantId || tenant?.tenantId || portalOrganization?.slug,
    complianceMode: portalOrganization?.complianceMode || tenant?.complianceMode || 'hipaa',
    isDemoTenant: Boolean(portalOrganization?.isDemoTenant || tenant?.isDemoTenant),
  };
  const effectiveSubscription = billing?.currentPlan
    ? {
        tier: billing.currentPlan.name || billing.currentPlan.id,
        status: billing.status,
        description: billing.currentPlan.description,
      }
    : adminModel?.subscriptions?.current || subscription || {};
  const integrations = asList(adminModel?.integrations?.length ? adminModel.integrations : engineIntegrations);
  const enabledIntegrations = integrations.filter((integration) => integration.status === 'enabled');
  const requestedIntegrations = integrations.filter((integration) => integration.status === 'requested');
  const enabledProducts = asList(
    platformContext?.assignedProducts?.length
      ? platformContext.assignedProducts
      : adminModel?.noCodeConfiguration?.enabledProductIds?.map((id) => ({ id, name: humanize(id) }))
  );
  const enabledPacks = asList(
    platformContext?.entitledPacks?.length
      ? platformContext.entitledPacks
      : adminModel?.noCodeConfiguration?.enabledPackIds?.map((id) => ({ id, name: humanize(id) }))
  );
  const portalWorkspaces = asList(adminModel?.workspaces?.length ? adminModel.workspaces : workspaces);
  const portalUsers = asList(adminModel?.users);

  const supportContext = useMemo(
    () => ({
      organizationId: resolvedOrganizationId,
      organizationName: portalOrganization?.name || tenantContext?.organizationName || 'Current organization',
      tenantId: effectiveTenant.tenantId || 'current tenant',
      workspaceId: tenantContext?.workspaceId || activeWorkspace?.id || 'current workspace',
      role: membership?.membershipRole || tenantContext?.role || user?.role || 'member',
    }),
    [
      activeWorkspace?.id,
      effectiveTenant.tenantId,
      membership?.membershipRole,
      portalOrganization?.name,
      resolvedOrganizationId,
      tenantContext?.organizationName,
      tenantContext?.role,
      tenantContext?.workspaceId,
      user?.role,
    ]
  );

  const openBillingPortal = async () => {
    setIsOpeningBillingPortal(true);
    const result = await createCustomerPortalSession({ returnUrl: window.location.href });
    if (result.ok && result.data?.url) {
      window.location.assign(result.data.url);
      return;
    }
    setError(result.message || 'Billing portal unavailable.');
    setIsOpeningBillingPortal(false);
  };

  const refreshPortal = async () => {
    await Promise.all([refreshPlatformContext?.(), refreshOrganizationEngine?.()]);
    const result = await fetchCustomerPortalAdministration(resolvedOrganizationId);
    if (result.ok) {
      setAdminModel(result.data);
      setError('');
    } else {
      setError(result.message);
    }
  };

  const submitSupportRequest = (event) => {
    event.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.details.trim()) {
      setError('Support requests need a subject and details.');
      return;
    }

    const request = {
      id: `support-${Date.now()}`,
      ...supportForm,
      status: 'drafted',
      createdAt: new Date().toISOString(),
      context: supportContext,
    };
    setSupportRequests((current) => [request, ...current]);
    setSupportForm({ subject: '', priority: 'normal', details: '' });
    setError('');
  };

  if (isLoading) {
    return <div className="customer-portal-page">Loading customer portal...</div>;
  }

  return (
    <div className="customer-portal-page">
      <header className="customer-portal-hero">
        <div>
          <span className="customer-portal-eyebrow">Customer Portal</span>
          <h1>{effectiveBranding?.displayName || portalOrganization?.name || 'CareDroid deployment'}</h1>
          <p>
            Manage the tenant-scoped CareDroid deployment for{' '}
            {tenantContext?.organizationName || portalOrganization?.name || 'this organization'}.
          </p>
          <div className="customer-portal-hero-meta">
            <StatusPill tone="success">{effectiveTenant.complianceMode}</StatusPill>
            <StatusPill>{effectiveTenant.tenantId || 'tenant scoped'}</StatusPill>
            <StatusPill>{membership?.membershipRole || tenantContext?.role || user?.role || 'member'}</StatusPill>
          </div>
        </div>
        <div className="customer-portal-actions">
          <Button variant="secondary" onClick={refreshPortal}>
            Refresh portal
          </Button>
          {isOrganizationManager && (
            <Link to="/tenant-admin">
              <Button variant="primary">Tenant administration</Button>
            </Link>
          )}
        </div>
      </header>

      {error && <p className="customer-portal-error">{error}</p>}
      {!isOrganizationManager && (
        <p className="customer-portal-notice">
          Your role can view deployment status. Administrative changes are limited to organization owners,
          admins, or users with management permissions.
        </p>
      )}

      <section className="customer-portal-metrics" aria-label="Deployment summary">
        <Card className="customer-portal-metric-card">
          <span>Subscription</span>
          <strong>{effectiveSubscription?.tier || tenantContext?.subscriptionPlan || 'Starter'}</strong>
          <small>{effectiveSubscription?.status || 'active'}</small>
        </Card>
        <Card className="customer-portal-metric-card">
          <span>Products</span>
          <strong>{enabledProducts.length}</strong>
          <small>Enabled for this organization</small>
        </Card>
        <Card className="customer-portal-metric-card">
          <span>Asset packs</span>
          <strong>{enabledPacks.length}</strong>
          <small>{entitledAssetIds?.length || platformContext?.entitledAssetIds?.length || 0} entitled assets</small>
        </Card>
        <Card className="customer-portal-metric-card">
          <span>Users</span>
          <strong>{portalUsers.length || 1}</strong>
          <small>{portalWorkspaces.length} workspaces</small>
        </Card>
      </section>

      <section className="customer-portal-grid">
        <Card className="customer-portal-card customer-portal-card--wide">
          <SectionHeader
            title="Subscription overview"
            subtitle={effectiveSubscription?.description || 'Current plan, billing status, and invoice access.'}
            action={
              <Button
                variant="secondary"
                loading={isOpeningBillingPortal}
                onClick={openBillingPortal}
                disabled={!isOrganizationManager}
              >
                Open billing portal
              </Button>
            }
          />
          <div className="customer-portal-detail-grid">
            <div>
              <span>Plan</span>
              <strong>{effectiveSubscription?.tier || 'Starter'}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{effectiveSubscription?.status || 'active'}</strong>
            </div>
            <div>
              <span>Billing management</span>
              <strong>{isOrganizationManager ? 'Available' : 'Admin required'}</strong>
            </div>
          </div>
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader title="Enabled products" subtitle="Commercial products assigned to this tenant." />
          {enabledProducts.length ? (
            <ul className="customer-portal-list">
              {enabledProducts.map((product) => (
                <li key={product.id || product.slug || product.name}>
                  <strong>{product.name || humanize(product.id || product.slug)}</strong>
                  <span>{product.productType ? humanize(product.productType) : 'Product'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No products are assigned to this organization yet.</EmptyState>
          )}
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader title="Enabled asset packs" subtitle="Solution packs driving tenant entitlements." />
          {enabledPacks.length ? (
            <ul className="customer-portal-list">
              {enabledPacks.map((pack) => (
                <li key={pack.id || pack.slug || pack.name}>
                  <strong>{pack.name || humanize(pack.id || pack.slug)}</strong>
                  <span>{asList(pack.assetIds).length || 'Configured'} assets</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No asset packs are enabled for this organization yet.</EmptyState>
          )}
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader title="Organization profile" subtitle="Tenant identity and deployment settings." />
          <dl className="customer-portal-profile">
            <div>
              <dt>Name</dt>
              <dd>{portalOrganization?.name || tenantContext?.organizationName || 'Current organization'}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{humanize(portalOrganization?.organizationType || 'healthcare')}</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>{portalOrganization?.country || 'Not configured'}</dd>
            </div>
            <div>
              <dt>Compliance mode</dt>
              <dd>{effectiveTenant.complianceMode}</dd>
            </div>
          </dl>
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader title="Workspaces" subtitle="Organization-aware workspace defaults and active context." />
          {portalWorkspaces.length ? (
            <ul className="customer-portal-list">
              {portalWorkspaces.map((workspace) => (
                <li key={workspace.id || workspace.name}>
                  <strong>{workspace.name || humanize(workspace.id)}</strong>
                  <span>
                    {(workspace.id === activeWorkspace?.id || workspace.id === tenantContext?.workspaceId) &&
                      'Active · '}
                    {workspace.type ? humanize(workspace.type) : 'Workspace'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No workspaces are configured yet.</EmptyState>
          )}
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader
            title="Users"
            subtitle="Organization members visible through the scoped administration model."
            action={
              isOrganizationManager ? (
                <Link to="/tenant-admin">
                  <Button variant="secondary" size="sm">
                    Manage users
                  </Button>
                </Link>
              ) : null
            }
          />
          {portalUsers.length ? (
            <ul className="customer-portal-list">
              {portalUsers.map((member) => (
                <li key={member.membershipId || member.userId}>
                  <strong>{member.displayName || member.userId}</strong>
                  <span>
                    {humanize(member.membershipRole || 'member')} ·{' '}
                    {member.roleProfileId ? humanize(member.roleProfileId) : 'No role profile'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>User roster is available after organization memberships sync.</EmptyState>
          )}
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader
            title="Integrations"
            subtitle="Enabled and requested integrations for this tenant."
            action={
              <Link to="/integration-readiness">
                <Button variant="secondary" size="sm">
                  Readiness
                </Button>
              </Link>
            }
          />
          {integrations.length ? (
            <ul className="customer-portal-list">
              {integrations.map((integration) => (
                <li key={integration.slug || integration.id || integration.name}>
                  <strong>{integration.name || humanize(integration.slug || integration.id)}</strong>
                  <span>{humanize(integration.status || 'available')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No integrations are configured yet.</EmptyState>
          )}
          <div className="customer-portal-chip-row">
            <StatusPill tone="success">{enabledIntegrations.length} enabled</StatusPill>
            <StatusPill tone="warning">{requestedIntegrations.length} requested</StatusPill>
          </div>
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader title="Invoices" subtitle="Invoice retrieval placeholder." />
          <p className="customer-portal-empty">
            Invoice PDFs are not exposed through a CareDroid API yet. Organization admins can open the billing
            portal to review invoices, payment methods, and receipts.
          </p>
          <Button
            variant="secondary"
            loading={isOpeningBillingPortal}
            onClick={openBillingPortal}
            disabled={!isOrganizationManager}
          >
            Open invoice portal
          </Button>
        </Card>

        <Card className="customer-portal-card customer-portal-card--wide">
          <SectionHeader
            title="Support requests"
            subtitle="Create a tenant-aware support request draft with deployment context attached."
          />
          <form className="customer-portal-support-form" onSubmit={submitSupportRequest}>
            <label>
              Subject
              <input
                value={supportForm.subject}
                onChange={(event) =>
                  setSupportForm((current) => ({ ...current, subject: event.target.value }))
                }
                placeholder="Example: Enable SSO for clinical workspaces"
              />
            </label>
            <label>
              Priority
              <select
                value={supportForm.priority}
                onChange={(event) =>
                  setSupportForm((current) => ({ ...current, priority: event.target.value }))
                }
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="customer-portal-support-details">
              Details
              <textarea
                value={supportForm.details}
                onChange={(event) =>
                  setSupportForm((current) => ({ ...current, details: event.target.value }))
                }
                placeholder={`Organization: ${supportContext.organizationName}\nWorkspace: ${supportContext.workspaceId}`}
              />
            </label>
            <Button type="submit" variant="primary">
              Draft support request
            </Button>
          </form>
          {supportRequests.length ? (
            <ul className="customer-portal-list customer-portal-support-list">
              {supportRequests.map((request) => (
                <li key={request.id}>
                  <strong>{request.subject}</strong>
                  <span>
                    {humanize(request.priority)} · {formatDate(request.createdAt)} ·{' '}
                    {request.context.organizationName}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No support request drafts in this portal session.</EmptyState>
          )}
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader title="Release notes" subtitle="Customer-facing deployment updates." />
          <ul className="customer-portal-list">
            {RELEASE_NOTES.map((note) => (
              <li key={note.id}>
                <strong>{note.title}</strong>
                <span>
                  {formatDate(note.date)} · {note.summary}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="customer-portal-card">
          <SectionHeader title="Role-aware access" subtitle="Current user's portal context." />
          <dl className="customer-portal-profile">
            <div>
              <dt>Account role</dt>
              <dd>{humanize(user?.role || tenantContext?.role || 'member')}</dd>
            </div>
            <div>
              <dt>Membership</dt>
              <dd>{humanize(membership?.membershipRole || 'member')}</dd>
            </div>
            <div>
              <dt>Role profile</dt>
              <dd>{roleProfile?.label || humanize(membership?.roleProfileId || 'not assigned')}</dd>
            </div>
            <div>
              <dt>Management</dt>
              <dd>{isOrganizationManager ? 'Enabled' : 'Read only'}</dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}

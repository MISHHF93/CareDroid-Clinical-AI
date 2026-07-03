import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import { CareDroidPage } from '../components/ui/CareDroidPrimitives';
import Button from '../components/ui/button';
import { Drawer } from '../components/ui/Drawer';
import FeatureGate from '../components/FeatureGate';
import { useFeature } from '../hooks/useFeature';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { Permission, useUser } from '../contexts/UserContext';
import {
  requestComplianceAccountDeletion,
  requestComplianceDataExport,
} from '../services/complianceApi';
import { fetchIdentityProviderRegistry } from '../services/enterpriseIdentityApi';
import { fetchTenantDataIsolationAudit } from '../services/tenantIsolationApi';
import {
  createCheckoutSession,
  createCustomerPortalSession,
  fetchCurrentSubscription,
  fetchSubscriptionPlans,
} from '../services/subscriptionApi';
import { fetchMyAuditLogs } from '../services/auditApi';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';
import './Settings.css';

const DATA_DELETE_CONFIRMATION = 'DELETE MY DATA';

const PAYMENT_STATUS_MESSAGES = {
  active: 'Your subscription is active.',
  trialing: 'Your subscription is currently trialing.',
  past_due: 'Payment is past due. Open the billing portal to update payment details.',
  incomplete: 'Payment setup is incomplete. Continue checkout or manage billing.',
  incomplete_expired: 'Payment setup expired. Start checkout again from an available plan.',
  canceled: 'Your subscription is canceled.',
};

function downloadJsonExport(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const exportDate = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `caredroid-data-export-${exportDate}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const Settings = () => {
  const surfaces = usePractitionerSurfaceVisibility();
  const [notifications, setNotifications] = useState(true);
  const [safetyBanner, setSafetyBanner] = useState(true);
  const [privacyDrawerAction, setPrivacyDrawerAction] = useState<any>(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState({ type: 'idle', message: '' });
  const [exportAcknowledged, setExportAcknowledged] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingAction, setBillingAction] = useState('');
  const [billingStatus, setBillingStatus] = useState({ type: 'idle', message: '' });
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [identityRegistry, setIdentityRegistry] = useState<any>(null);
  const [identityStatus, setIdentityStatus] = useState('');
  const [tenantIsolationAudit, setTenantIsolationAudit] = useState<any>(null);
  const [tenantIsolationStatus, setTenantIsolationStatus] = useState('');
  const [auditLogState, setAuditLogState] = useState({
    status: 'loading',
    message: '',
    logs: [],
  });
  const { user, authToken, isAuthenticated, isLoading: authLoading, hasPermission } = useUser();
  const { success, error } = useNotificationActions();
  const { enabled: auditLogEnabled } = useFeature('audit_log');
  const accountEmail = user?.email || '';
  const canLoadBilling = Boolean(isAuthenticated || authToken || user);
  const canViewPlatformAdmin = [
    Permission.MANAGE_USERS,
    Permission.MANAGE_SUBSCRIPTIONS,
    Permission.CONFIGURE_SYSTEM,
    Permission.VIEW_ANALYTICS,
  ].some((permission) => hasPermission?.(permission));

  const deleteReady = useMemo(
    () =>
      deleteEmail.trim().toLowerCase() === accountEmail.toLowerCase() &&
      deletePhrase.trim() === DATA_DELETE_CONFIRMATION,
    [accountEmail, deleteEmail, deletePhrase]
  );

  const handleSave = () => {
    success('Settings saved', 'Settings saved.');
  };

  useEffect(() => {
    let cancelled = false;

    async function loadBilling() {
      if (authLoading) return;
      if (!canLoadBilling) {
        setBillingLoading(false);
        setBillingStatus({
          type: 'idle',
          message: 'Billing API unavailable in demo mode � subscription data stays local during the build phase.',
        });
        return;
      }

      setBillingLoading(true);
      const [currentResult, plansResult] = await Promise.all([
        fetchCurrentSubscription(),
        fetchSubscriptionPlans(),
      ]);
      if (cancelled) return;

      if (currentResult.ok) {
        setSubscription(currentResult.data);
      }
      if (plansResult.ok) {
        const backendPlans = plansResult.data || [];
        setPlans(backendPlans);
        setSelectedPlanId((current) => current || backendPlans[0]?.id || '');
      }

      if (!currentResult.ok || !plansResult.ok) {
        setBillingStatus({
          type: 'error',
          message: currentResult.message || plansResult.message || 'Unable to load billing data.',
        });
      } else {
        setBillingStatus({ type: 'idle', message: '' });
      }
      setBillingLoading(false);
    }

    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [authLoading, canLoadBilling]);

  useEffect(() => {
    let cancelled = false;
    if (!auditLogEnabled) {
      setAuditLogState({ status: 'idle', message: '', logs: [] });
      return () => {
        cancelled = true;
      };
    }
    setAuditLogState((current) => ({ ...current, status: 'loading', message: '' }));
    fetchMyAuditLogs(20).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setAuditLogState({ status: 'ready', message: '', logs: result.logs || [] });
      } else {
        setAuditLogState({
          status: 'error',
          message: result.message || 'Unable to load audit log.',
          logs: [],
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auditLogEnabled]);

  useEffect(() => {
    let cancelled = false;

    fetchIdentityProviderRegistry().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setIdentityRegistry(result.data);
        setIdentityStatus('');
      } else {
        setIdentityRegistry(null);
        setIdentityStatus(result.message || 'Unable to load identity provider registry.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return undefined;
    if (!canLoadBilling) {
      setTenantIsolationAudit(null);
      setTenantIsolationStatus('Open admin console as a tenant administrator to view the isolation audit.');
      return undefined;
    }

    fetchTenantDataIsolationAudit().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTenantIsolationAudit(result.data);
        setTenantIsolationStatus('');
      } else {
        setTenantIsolationAudit(null);
        setTenantIsolationStatus(result.message || 'Unable to load tenant isolation audit.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, canLoadBilling]);

  const openPrivacyDrawer = (action) => {
    setPrivacyDrawerAction(action);
    setPrivacyStatus({ type: 'idle', message: '' });
    setExportAcknowledged(false);
    setDeleteEmail('');
    setDeletePhrase('');
  };

  const closePrivacyDrawer = () => {
    if (privacyLoading) return;
    setPrivacyDrawerAction(null);
  };

  const handleExportData = async () => {
    if (!exportAcknowledged || privacyLoading) return;
    setPrivacyLoading(true);
    setPrivacyStatus({ type: 'loading', message: 'Requesting your data export...' });

    const result = await requestComplianceDataExport();
    setPrivacyLoading(false);

    if (!result.ok) {
      const message = result.message || 'Unable to export data.';
      setPrivacyStatus({ type: 'error', message });
      error('Export failed', message);
      return;
    }

    downloadJsonExport(result.data);
    setPrivacyStatus({
      type: 'success',
      message: 'Data export generated and downloaded. Review it in a secure location.',
    });
    success('Data export ready', 'Your CareDroid data export was generated.');
  };

  const handleDeleteData = async () => {
    if (!deleteReady || privacyLoading) return;
    setPrivacyLoading(true);
    setPrivacyStatus({ type: 'loading', message: 'Submitting irreversible deletion request...' });

    const result = await requestComplianceAccountDeletion(deleteEmail.trim());
    setPrivacyLoading(false);

    if (!result.ok) {
      const message = result.message || 'Unable to delete account data.';
      setPrivacyStatus({ type: 'error', message });
      error('Deletion failed', message);
      return;
    }

    setPrivacyStatus({
      type: 'success',
      message:
        result.data?.message ||
        'Account data deletion completed. Audit history may be retained in anonymized form for compliance.',
    });
    success('Deletion completed', 'Your account data deletion request completed.');
  };

  const openReturnedUrl = (url) => {
    if (!url) {
      setBillingStatus({ type: 'error', message: 'The backend did not return a billing URL.' });
      return;
    }
    window.location.assign(url);
  };

  const handleCheckout = async () => {
    if (!canLoadBilling || !selectedPlanId) return;
    setBillingAction('checkout');
    setBillingStatus({ type: 'loading', message: 'Creating checkout session...' });

    const result = await createCheckoutSession({
      tier: selectedPlanId,
      successUrl: window.location.href,
      cancelUrl: window.location.href,
    });
    setBillingAction('');

    if (!result.ok) {
      setBillingStatus({ type: 'error', message: result.message || 'Unable to start checkout.' });
      error('Checkout unavailable', result.message || 'Unable to start checkout.');
      return;
    }

    setBillingStatus({ type: 'success', message: 'Checkout session created. Redirecting...' });
    openReturnedUrl(result.data?.url);
  };

  const handleCustomerPortal = async () => {
    if (!canLoadBilling) return;
    setBillingAction('portal');
    setBillingStatus({ type: 'loading', message: 'Opening customer portal...' });

    const result = await createCustomerPortalSession({ returnUrl: window.location.href });
    setBillingAction('');

    if (!result.ok) {
      setBillingStatus({ type: 'error', message: result.message || 'Unable to open customer portal.' });
      error('Billing portal unavailable', result.message || 'Unable to open customer portal.');
      return;
    }

    setBillingStatus({ type: 'success', message: 'Customer portal session created. Redirecting...' });
    openReturnedUrl(result.data?.url);
  };

  const isExportDrawer = privacyDrawerAction === 'export';
  const isDeleteDrawer = privacyDrawerAction === 'delete';
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const paymentMessage =
    PAYMENT_STATUS_MESSAGES[subscription?.status] ||
    (subscription?.status ? `Backend status: ${subscription.status}` : 'No current subscription returned by the backend.');

  return (
    <CareDroidPage
      className="platform-settings-page settings-page"
      eyebrow="Platform administration"
      title="Settings"
      description={
        surfaces.settings.showNestedSubtitles
          ? 'Configure CareDroid preferences, notifications, billing, and compliance controls.'
          : undefined
      }
    >
      <Card>

        {surfaces.settings.showPlatformStrip && canViewPlatformAdmin ? (
          <div className="settings-platform-strip">
            <div className="settings-platform-strip__title">Organization platform</div>
            <p className="settings-platform-strip__description">
              Admin, billing, product, and configuration hubs are separated from normal preferences.
            </p>
            <div className="settings-platform-strip__actions">
              {hasPermission?.(Permission.VIEW_ANALYTICS) || hasPermission?.(Permission.MANAGE_USERS) ? (
                <Link to="/organization">
                  <Button variant="secondary">Organization dashboard</Button>
                </Link>
              ) : null}
              {hasPermission?.(Permission.MANAGE_USERS) ? (
                <Link to="/tenant-admin">
                  <Button variant="secondary">Tenant admin</Button>
                </Link>
              ) : null}
              {hasPermission?.(Permission.MANAGE_SUBSCRIPTIONS) ? (
                <Link to="/billing">
                  <Button variant="secondary">Billing</Button>
                </Link>
              ) : null}
              {hasPermission?.(Permission.VIEW_ANALYTICS) ? (
                <Link to="/products">
                  <Button variant="ghost">Products</Button>
                </Link>
              ) : null}
              {hasPermission?.(Permission.CONFIGURE_SYSTEM) ? (
                <Link to="/configuration-studio">
                  <Button variant="ghost">Configuration studio</Button>
                </Link>
              ) : null}
              {hasPermission?.(Permission.CONFIGURE_SYSTEM) ? (
                <Link to="/settings/features">
                  <Button variant="secondary">Feature management</Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="settings-toggle-grid">
          <div className="settings-toggle-row">
            <div>
              <div className="settings-toggle-row__title">Notifications</div>
              <div className="settings-toggle-row__description">AI results and alerts</div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </div>

          <div className="settings-toggle-row">
            <div>
              <div className="settings-toggle-row__title">Safety banner</div>
              <div className="settings-toggle-row__description">Always show clinical disclaimer</div>
            </div>
            <input
              type="checkbox"
              checked={safetyBanner}
              onChange={() => setSafetyBanner(!safetyBanner)}
            />
          </div>

          <section className="settings-privacy-card" aria-labelledby="privacy-data-title">
            <div className="settings-privacy-card__header">
              <div>
                <h3 id="privacy-data-title">Privacy &amp; Data</h3>
                <p>
                  Export your account data or request account data deletion using protected
                  compliance routes. These actions require your active signed-in session.
                </p>
              </div>
              <span className="settings-privacy-card__badge">Protected</span>
            </div>

            <div className="settings-privacy-warning">
              Data exports may contain PHI or account identifiers. Deletion is irreversible and
              may retain anonymized audit records where required for compliance.
            </div>

            {privacyStatus.type !== 'idle' && !privacyDrawerAction && (
              <div className={`settings-privacy-status settings-privacy-status--${privacyStatus.type}`}>
                {privacyStatus.message}
              </div>
            )}

            <div className="settings-privacy-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => openPrivacyDrawer('export')}
              >
                Request data export
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => openPrivacyDrawer('delete')}
              >
                Request data deletion
              </Button>
            </div>
          </section>

          <FeatureGate feature="audit_log">
            <section className="settings-billing-card" aria-labelledby="settings-audit-log-title">
              <div className="settings-billing-card__header">
                <div>
                  <h3 id="settings-audit-log-title">Audit Log</h3>
                  <p>
                    Last 20 current-user audit events from the protected backend audit trail,
                    including CareDroid sync events when available.
                  </p>
                </div>
                <span className="settings-billing-card__badge">Audit</span>
              </div>

              {auditLogState.status === 'loading' ? (
                <div className="settings-billing-empty">Loading audit events...</div>
              ) : auditLogState.status === 'error' ? (
                <div className="settings-billing-empty">{auditLogState.message}</div>
              ) : auditLogState.logs.length ? (
                <div className="settings-audit-log-list">
                  {auditLogState.logs.slice(0, 20).map((log: any) => (
                    <article key={log.id || `${log.action}-${log.timestamp}`} className="settings-audit-log-item">
                      <div>
                        <strong>{log.action || 'audit_event'}</strong>
                        <span>{log.resource || 'No resource recorded'}</span>
                      </div>
                      <time dateTime={log.timestamp || log.createdAt}>
                        {log.timestamp || log.createdAt
                          ? new Date(log.timestamp || log.createdAt).toLocaleString()
                          : 'No timestamp'}
                      </time>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="settings-billing-empty">No audit events returned by the backend.</div>
              )}
            </section>
          </FeatureGate>

          {surfaces.settings.showEnterpriseSections ? (
          <section className="settings-billing-card" aria-labelledby="enterprise-identity-title">
            <div className="settings-billing-card__header">
              <div>
                <h3 id="enterprise-identity-title">Enterprise Identity</h3>
                <p>
                  Identity Provider Registry for SSO, SAML, OIDC, Azure AD, Okta, and Google
                  Workspace readiness.
                </p>
              </div>
              <span className="settings-billing-card__badge">Registry</span>
            </div>

            {identityStatus ? (
              <div className="settings-billing-empty">{identityStatus}</div>
            ) : (
              <>
                <div className="settings-billing-summary">
                  <div>
                    <span className="settings-billing-label">Supported</span>
                    <strong>{identityRegistry?.summary?.supported ?? 0}</strong>
                  </div>
                  <div>
                    <span className="settings-billing-label">Planned</span>
                    <strong>{identityRegistry?.summary?.planned ?? 0}</strong>
                  </div>
                  <div>
                    <span className="settings-billing-label">Unavailable</span>
                    <strong>{identityRegistry?.summary?.unavailable ?? 0}</strong>
                  </div>
                </div>

                <div className="settings-billing-plan-details">
                  {(identityRegistry?.providers || []).map((provider) => (
                    <div key={provider.id}>
                      <strong>{provider.name}</strong>
                      <span>
                        {provider.status} � {provider.protocol}
                        {provider.entryPath ? ` � ${provider.entryPath}` : ''}
                      </span>
                      <span>{provider.notes}</span>
                    </div>
                  ))}
                  {!identityRegistry?.providers?.length && <span>Loading identity providers...</span>}
                </div>
              </>
            )}
          </section>
          ) : null}

          {surfaces.settings.showEnterpriseSections ? (
          <section className="settings-billing-card" aria-labelledby="tenant-isolation-title">
            <div className="settings-billing-card__header">
              <div>
                <h3 id="tenant-isolation-title">Tenant Data Isolation Audit</h3>
                <p>
                  Organization, user, workspace, asset, analytics, and audit-log controls that
                  prevent cross-tenant data access.
                </p>
              </div>
              <span className="settings-billing-card__badge">Tenant admin</span>
            </div>

            {tenantIsolationStatus ? (
              <div className="settings-billing-empty">{tenantIsolationStatus}</div>
            ) : (
              <>
                <div className="settings-billing-summary">
                  <div>
                    <span className="settings-billing-label">Status</span>
                    <strong>{tenantIsolationAudit?.status || 'Loading department data...'}</strong>
                  </div>
                  <div>
                    <span className="settings-billing-label">Domains audited</span>
                    <strong>{tenantIsolationAudit?.summary?.auditedDomains ?? 0}</strong>
                  </div>
                  <div>
                    <span className="settings-billing-label">Cross-tenant read</span>
                    <strong>
                      {tenantIsolationAudit?.summary?.crossTenantReadAllowed === false
                        ? 'Blocked'
                        : 'Loading department data...'}
                    </strong>
                  </div>
                </div>

                <div className="settings-billing-plan-details">
                  {(tenantIsolationAudit?.domains || []).map((domain) => (
                    <div key={domain.id}>
                      <strong>{domain.name}</strong>
                      <span>
                        {domain.status} � {domain.tenantBoundary}
                      </span>
                      <span>{domain.residualRisk}</span>
                    </div>
                  ))}
                  {!tenantIsolationAudit?.domains?.length && (
                    <span>Loading tenant isolation audit...</span>
                  )}
                </div>
              </>
            )}
          </section>
          ) : null}

          <section className="settings-billing-card" aria-labelledby="settings-billing-title">
            <div className="settings-billing-card__header">
              <div>
                <h3 id="settings-billing-title">Billing</h3>
                <p>
                  View your backend-returned subscription status and open Stripe checkout or
                  the customer portal from protected subscription routes.
                </p>
              </div>
              <span className="settings-billing-card__badge">Demo mode</span>
            </div>

            {!canLoadBilling ? (
              <div className="settings-billing-empty">
                Billing data loads when the backend subscription API is available. During the build
                phase, plan and checkout actions may stay disabled.
              </div>
            ) : (
              <>
                <div className="settings-billing-summary" aria-busy={billingLoading}>
                  <div>
                    <span className="settings-billing-label">Current plan</span>
                    <strong>{billingLoading ? 'Loading department data...' : subscription?.tier || 'Not returned'}</strong>
                  </div>
                  <div>
                    <span className="settings-billing-label">Payment status</span>
                    <strong>{billingLoading ? 'Loading department data...' : subscription?.status || 'Not returned'}</strong>
                  </div>
                  <div>
                    <span className="settings-billing-label">Current period ends</span>
                    <strong>
                      {subscription?.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : 'Not returned'}
                    </strong>
                  </div>
                </div>

                <div className={`settings-billing-payment-state settings-billing-payment-state--${subscription?.status || 'unknown'}`}>
                  {paymentMessage}
                  {subscription?.cancelAtPeriodEnd ? ' Cancellation is scheduled at the period end.' : ''}
                </div>

                {billingStatus.type !== 'idle' && (
                  <div className={`settings-privacy-status settings-privacy-status--${billingStatus.type}`}>
                    {billingStatus.message}
                  </div>
                )}

                <div className="settings-billing-actions">
                  <label className="settings-billing-plan-select">
                    <span>Checkout plan</span>
                    <select
                      value={selectedPlanId}
                      onChange={(event) => setSelectedPlanId(event.target.value)}
                      disabled={billingLoading || plans.length === 0}
                    >
                      {plans.length === 0 ? (
                        <option value="">No backend plans returned</option>
                      ) : (
                        plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name || plan.id}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCheckout}
                    loading={billingAction === 'checkout'}
                    disabled={billingLoading || !selectedPlanId || billingAction === 'portal'}
                  >
                    Start checkout
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCustomerPortal}
                    loading={billingAction === 'portal'}
                    disabled={billingLoading || billingAction === 'checkout'}
                  >
                    Open customer portal
                  </Button>
                </div>

                {selectedPlan && (
                  <div className="settings-billing-plan-details">
                    <strong>{selectedPlan.name || selectedPlan.id}</strong>
                    {'price' in selectedPlan && selectedPlan.price != null && (
                      <span>Backend price value: {selectedPlan.price}</span>
                    )}
                    {Array.isArray(selectedPlan.features) && selectedPlan.features.length > 0 && (
                      <ul>
                        {selectedPlan.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <div className="settings-footer-actions">
          <Button onClick={handleSave}>Save changes</Button>
          <Link to="/profile" className="settings-back-link">
            Back to Profile
          </Link>
        </div>
      </Card>

      <Drawer
        isOpen={Boolean(privacyDrawerAction)}
        onClose={closePrivacyDrawer}
        side="right"
        size="md"
        title={isDeleteDrawer ? 'Confirm data deletion' : 'Confirm data export'}
        className="settings-privacy-drawer"
        closeOnEscape={!privacyLoading}
        closeOnOverlay={!privacyLoading}
        footer={
          (<div className="settings-privacy-drawer__footer">
            <Button
              type="button"
              variant="secondary"
              onClick={closePrivacyDrawer}
              disabled={privacyLoading}
            >
              Close
            </Button>
            {isExportDrawer && (
              <Button
                type="button"
                variant="primary"
                onClick={handleExportData}
                loading={privacyLoading}
                disabled={!exportAcknowledged || privacyLoading}
              >
                Generate export
              </Button>
            )}
            {isDeleteDrawer && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteData}
                loading={privacyLoading}
                disabled={!deleteReady || privacyLoading}
              >
                Permanently delete data
              </Button>
            )}
          </div>) as any
        }
      >
        <div className="settings-privacy-drawer__body">
          {isExportDrawer && (
            <>
              <p>
                This sends a protected request to generate your account data export. Keep the
                downloaded file private because it can include account, profile, subscription, 2FA,
                and audit metadata.
              </p>
              <label className="settings-confirm-check">
                <input
                  type="checkbox"
                  checked={exportAcknowledged}
                  onChange={(event) => setExportAcknowledged(event.target.checked)}
                  disabled={privacyLoading}
                />
                <span>I understand the export may contain sensitive data and will store it securely.</span>
              </label>
            </>
          )}

          {isDeleteDrawer && (
            <>
              <div className="settings-destructive-panel">
                <strong>This action is irreversible.</strong>
                <p>
                  The backend will delete account-linked data for the signed-in user. Audit events may
                  be anonymized and retained where required by compliance safeguards.
                </p>
              </div>
              <label className="settings-confirm-field">
                <span>Confirm account email</span>
                <input
                  type="email"
                  value={deleteEmail}
                  onChange={(event) => setDeleteEmail(event.target.value)}
                  placeholder={accountEmail || 'you@example.com'}
                  disabled={privacyLoading}
                />
              </label>
              <label className="settings-confirm-field">
                <span>
                  Type <code>{DATA_DELETE_CONFIRMATION}</code>
                </span>
                <input
                  value={deletePhrase}
                  onChange={(event) => setDeletePhrase(event.target.value)}
                  placeholder={DATA_DELETE_CONFIRMATION}
                  disabled={privacyLoading}
                />
              </label>
            </>
          )}

          {privacyStatus.type !== 'idle' && (
            <div className={`settings-privacy-status settings-privacy-status--${privacyStatus.type}`}>
              {privacyStatus.message}
            </div>
          )}
        </div>
      </Drawer>
    </CareDroidPage>
  );
};

export default Settings;

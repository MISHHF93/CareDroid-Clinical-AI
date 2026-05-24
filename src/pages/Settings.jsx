import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import { Drawer } from '../components/ui/Drawer';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import {
  requestComplianceAccountDeletion,
  requestComplianceDataExport,
} from '../services/complianceApi';
import {
  createCheckoutSession,
  createCustomerPortalSession,
  fetchCurrentSubscription,
  fetchSubscriptionPlans,
} from '../services/subscriptionApi';
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
  const [notifications, setNotifications] = useState(true);
  const [safetyBanner, setSafetyBanner] = useState(true);
  const [privacyDrawerAction, setPrivacyDrawerAction] = useState(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState({ type: 'idle', message: '' });
  const [exportAcknowledged, setExportAcknowledged] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingAction, setBillingAction] = useState('');
  const [billingStatus, setBillingStatus] = useState({ type: 'idle', message: '' });
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const { preference, resolvedTheme, setPreference } = useTheme();
  const { user, authToken, isAuthenticated, isLoading: authLoading } = useUser();
  const { success, error } = useNotificationActions();
  const accountEmail = user?.email || '';
  const canLoadBilling = Boolean(isAuthenticated || authToken || user);

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
          message: 'Sign in to view subscription billing.',
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
    <div className="settings-page">
      <Card style={{ width: '100%', maxWidth: '840px' }}>
        <h2 style={{ marginTop: 0 }}>Settings</h2>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Configure CareDroid preferences and notifications.
        </p>

        <div style={{ marginTop: '20px', display: 'grid', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--panel-border)'
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>Theme preference</div>
              <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
                System, light, or dark (active: {resolvedTheme})
              </div>
            </div>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
              style={{
                background: 'transparent',
                color: 'var(--text-color)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: '6px 10px'
              }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--panel-border)'
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>Notifications</div>
              <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>AI results and alerts</div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--panel-border)'
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>Safety banner</div>
              <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>Always show clinical disclaimer</div>
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

          <section className="settings-billing-card" aria-labelledby="settings-billing-title">
            <div className="settings-billing-card__header">
              <div>
                <h3 id="settings-billing-title">Billing</h3>
                <p>
                  View your backend-returned subscription status and open Stripe checkout or
                  the customer portal from protected subscription routes.
                </p>
              </div>
              <span className="settings-billing-card__badge">Auth required</span>
            </div>

            {!canLoadBilling ? (
              <div className="settings-billing-empty">
                Sign in to view current plan/status, checkout, and customer portal actions.
              </div>
            ) : (
              <>
                <div className="settings-billing-summary" aria-busy={billingLoading}>
                  <div>
                    <span className="settings-billing-label">Current plan</span>
                    <strong>{billingLoading ? 'Loading...' : subscription?.tier || 'Not returned'}</strong>
                  </div>
                  <div>
                    <span className="settings-billing-label">Payment status</span>
                    <strong>{billingLoading ? 'Loading...' : subscription?.status || 'Not returned'}</strong>
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

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <Button onClick={handleSave}>Save changes</Button>
          <Link to="/assistant" style={{ color: 'var(--accent-green)', textDecoration: 'none', alignSelf: 'center' }}>
            Back to Assistant
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
          <div className="settings-privacy-drawer__footer">
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
          </div>
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
    </div>
  );
};

export default Settings;

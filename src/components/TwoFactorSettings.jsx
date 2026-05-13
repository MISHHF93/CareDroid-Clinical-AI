import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/button';
import Card from '../components/ui/card';
import { apiFetch, apiFetchJson } from '../services/apiClient';
import { useNotificationActions } from '../hooks/useNotificationActions';
import logger from '../utils/logger';

/**
 * TwoFactorSettings Component
 * 
 * Manages 2FA settings in ProfileSettings page
 */
const TwoFactorSettings = ({ authToken }) => {
  const navigate = useNavigate();
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const [disableToken, setDisableToken] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const { success, error: notifyError, info } = useNotificationActions();

  useEffect(() => {
    fetchTwoFactorStatus();
  }, []);

  const fetchTwoFactorStatus = async () => {
    setLoading(true);
    try {
      const { response, data } = await apiFetchJson('/api/two-factor/status', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to fetch 2FA status');
      }
      setTwoFactorStatus(data);
    } catch (error) {
      logger.error('Failed to load 2FA status', { error });
      notifyError('2FA status', 'Failed to load 2FA status.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableTwoFactor = () => {
    navigate('/two-factor-setup');
  };

  const handleDisableTwoFactor = async () => {
    if (!disableToken || disableToken.length < 6) {
      info('Code required', 'Please enter your 2FA code.');
      return;
    }

    setDisabling(true);
    try {
      const response = await apiFetch('/api/two-factor/disable', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: disableToken }),
      });

      if (!response.ok) {
        throw new Error('Invalid 2FA code');
      }

      success('2FA disabled', 'Two-factor authentication disabled.');
      setShowDisableModal(false);
      setDisableToken('');
      fetchTwoFactorStatus();
    } catch (error) {
      notifyError('Disable failed', 'Failed to disable 2FA. Check your code.');
      logger.error('Failed to disable 2FA', { error });
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <Card style={{ padding: '24px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Two-Factor Authentication</h3>
        <div style={{ color: 'var(--muted-text)' }}>Loading...</div>
      </Card>
    );
  }

  return (
    <>
      <Card style={{ padding: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '8px' }}>Two-Factor Authentication</h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--muted-text)',
              lineHeight: '1.5',
            }}>
              Add an extra layer of security to your account by requiring a code from your phone in addition to your password.
            </p>
          </div>
          {twoFactorStatus?.enabled ? (
            <div style={{
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '12px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#00FF88',
              whiteSpace: 'nowrap',
            }}>
              ✓ Enabled
            </div>
          ) : (
            <div style={{
              background: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.3)',
              borderRadius: '12px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#6B7280',
              whiteSpace: 'nowrap',
            }}>
              Disabled
            </div>
          )}
        </div>

        {twoFactorStatus?.enabled ? (
          <div>
            <div style={{
              background: 'var(--card-background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                fontSize: '14px',
              }}>
                <div>
                  <div style={{ color: 'var(--muted-text)', marginBottom: '4px' }}>
                    Backup Codes Remaining
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {twoFactorStatus.backupCodesRemaining || 0} of 10
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted-text)', marginBottom: '4px' }}>
                    Last Used
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {twoFactorStatus.lastUsedAt
                      ? new Date(twoFactorStatus.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 184, 0, 0.1)',
              border: '1px solid rgba(255, 184, 0, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              color: '#FFB800',
              marginBottom: '16px',
            }}>
              ⚠️ <strong>Warning:</strong> Disabling 2FA will make your account less secure.
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowDisableModal(true)}
              style={{ width: '100%' }}
            >
              Disable 2FA
            </Button>
          </div>
        ) : (
          <div>
            <div style={{
              background: 'var(--card-background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Two-factor authentication provides an additional layer of security by requiring both your password and a code from your phone to sign in.
              </div>
            </div>

            <Button
              onClick={handleEnableTwoFactor}
              style={{ width: '100%' }}
            >
              Enable 2FA
            </Button>
          </div>
        )}
      </Card>

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <Card style={{
            maxWidth: '400px',
            width: '90%',
            padding: '24px',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Disable Two-Factor Authentication</h3>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              lineHeight: '1.5',
            }}>
              To confirm, please enter your 2FA code from your authenticator app.
            </p>

            <input
              type="text"
              placeholder="000000"
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
              maxLength={8}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                fontSize: '20px',
                textAlign: 'center',
                letterSpacing: '0.5em',
                fontFamily: 'monospace',
                marginBottom: '16px',
              }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableToken('');
                }}
                style={{ flex: 1 }}
                disabled={disabling}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDisableTwoFactor}
                disabled={disabling || disableToken.length < 6}
                style={{ flex: 1 }}
              >
                {disabling ? 'Disabling...' : 'Disable 2FA'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default TwoFactorSettings;

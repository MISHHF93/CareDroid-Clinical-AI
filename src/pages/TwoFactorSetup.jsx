import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/button';
import Card from '../components/ui/card';
import Input from '../components/ui/input';
import { apiFetchJson } from '../services/apiClient';
import { useNotificationActions } from '../hooks/useNotificationActions';
import logger from '../utils/logger';
import { useUser } from '../contexts/UserContext';

/**
 * TwoFactorSetup Component
 * 
 * Allows users to enable 2FA by:
 * 1. Generating a secret and QR code
 * 2. Scanning with Google Authenticator/Authy
 * 3. Verifying the first token
 * 4. Receiving backup codes
 */
const TwoFactorSetup = ({ authToken }) => {
  const navigate = useNavigate();
  const { authToken: contextAuthToken } = useUser();
  const effectiveAuthToken = authToken || contextAuthToken;
  const [step, setStep] = useState('generate'); // 'generate', 'verify', 'backup'
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const { success, error: notifyError, info } = useNotificationActions();

  useEffect(() => {
    generateSecret();
  }, []);

  const generateSecret = async () => {
    setLoading(true);
    try {
      const { response, data } = await apiFetchJson('/api/two-factor/generate', {
        headers: effectiveAuthToken ? { Authorization: `Bearer ${effectiveAuthToken}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to generate 2FA secret');
      }
      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch (err) {
      notifyError('2FA setup failed', 'Failed to generate 2FA secret. Please try again.');
      logger.error('Failed to generate 2FA secret', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async (e) => {
    e.preventDefault();

    if (!token || token.length < 6) {
      info('Invalid code', 'Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const { response, data } = await apiFetchJson('/api/two-factor/enable', {
        method: 'POST',
        headers: {
          ...(effectiveAuthToken ? { Authorization: `Bearer ${effectiveAuthToken}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret, token }),
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Invalid verification code');
      }
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
      success('2FA enabled', 'Save your backup codes.');
    } catch (err) {
      notifyError('Invalid code', 'Please try again.');
      logger.error('Invalid 2FA verification code', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText).then(() => {
      success('Backup codes copied', 'Backup codes copied to clipboard.');
    }).catch(() => {
      notifyError('Copy failed', 'Failed to copy backup codes.');
    });
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caredroid-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success('Backup codes downloaded', 'Backup codes downloaded.');
  };

  const handleFinish = () => {
    navigate('/profile-settings');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <Card style={{ padding: '32px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              🔐
            </div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}>
              Set Up Two-Factor Authentication
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--muted-text)',
            }}>
              Add an extra layer of security to your CareDroid account
            </p>
          </div>

          {/* Step 1: Generate and Scan QR Code */}
          {step === 'generate' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: 'var(--text-primary)',
                }}>
                  Step 1: Scan QR Code
                </h3>
                <ol style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6',
                  paddingLeft: '20px',
                }}>
                  <li>Install Google Authenticator or Authy on your mobile device</li>
                  <li>Open the app and scan the QR code below</li>
                  <li>Enter the 6-digit code from the app to verify</li>
                </ol>
              </div>

              {loading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'var(--muted-text)',
                }}>
                  Generating QR code...
                </div>
              ) : qrCode ? (
                <div style={{
                  textAlign: 'center',
                  marginBottom: '24px',
                }}>
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    width={280}
                    height={280}
                    decoding="async"
                    style={{
                      maxWidth: '280px',
                      width: '100%',
                      border: '2px solid var(--border)',
                      borderRadius: '12px',
                      padding: '16px',
                      background: 'var(--app-surface-1)',
                    }}
                  />
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--muted-text)',
                    marginTop: '12px',
                  }}>
                    Can't scan? Enter this key manually: <br />
                    <code style={{
                      background: 'var(--card-background)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      marginTop: '4px',
                      display: 'inline-block',
                    }}>
                      {secret}
                    </code>
                  </p>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'var(--text-error)',
                }}>
                  Failed to generate QR code. Please refresh the page.
                </div>
              )}

              <Button
                onClick={() => setStep('verify')}
                disabled={!qrCode}
                style={{ width: '100%' }}
              >
                Continue to Verification
              </Button>
            </div>
          )}

          {/* Step 2: Verify Token */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyAndEnable}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: 'var(--text-primary)',
                }}>
                  Step 2: Verify Setup
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  marginBottom: '16px',
                }}>
                  Enter the 6-digit code from your authenticator app to verify the setup.
                </p>
              </div>

              <Input
                type="text"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
                maxLength={8}
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '0.5em',
                  fontFamily: 'monospace',
                  marginBottom: '16px',
                }}
                autoComplete="off"
              />

              <div style={{
                display: 'flex',
                gap: '12px',
              }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep('generate')}
                  style={{ flex: 1 }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || token.length < 6}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Backup Codes */}
          {step === 'backup' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  color: 'var(--text-primary)',
                }}>
                  Step 3: Save Backup Codes
                </h3>
                <div style={{
                  background: 'rgba(255, 184, 0, 0.1)',
                  border: '1px solid rgba(255, 184, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#FFB800',
                    margin: 0,
                  }}>
                    ⚠️ <strong>Important:</strong> Save these backup codes in a secure location. 
                    Each code can only be used once if you lose access to your authenticator app.
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--card-background)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '16px',
                fontFamily: 'monospace',
                fontSize: '14px',
              }}>
                {backupCodes.map((code, index) => (
                  <div key={index} style={{
                    padding: '8px',
                    borderBottom: index < backupCodes.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    {code}
                  </div>
                ))}
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCopyBackupCodes}
                  style={{ flex: 1 }}
                >
                  📋 Copy Codes
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDownloadBackupCodes}
                  style={{ flex: 1 }}
                >
                  💾 Download Codes
                </Button>
              </div>

              <Button
                onClick={handleFinish}
                style={{ width: '100%' }}
              >
                Finish Setup
              </Button>
            </div>
          )}
        </Card>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
        }}>
          <button
            onClick={() => navigate('/profile-settings')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted-text)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;

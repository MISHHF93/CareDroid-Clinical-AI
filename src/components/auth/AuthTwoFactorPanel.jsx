import React, { useState } from 'react';
import Button from '../ui/button';
import Input from '../ui/input';
import { apiFetchJson } from '../../services/apiClient';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import AuthDevBypassSection from './AuthDevBypassSection';

export default function AuthTwoFactorPanel({
  userId,
  twoFactorChallengeToken,
  onAuthSuccess,
  onCancel,
}) {
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const { success, error } = useNotificationActions();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!twoFactorToken || twoFactorToken.length < 6) {
      error('Invalid code', 'Enter the 6-digit code from your app.');
      return;
    }

    try {
      const { response, data } = await apiFetchJson('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token: twoFactorToken,
          challengeToken: twoFactorChallengeToken,
        }),
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Invalid 2FA code');
      }

      if (data?.accessToken) {
        onAuthSuccess?.(data.accessToken, data.user);
        success('Signed in', 'You are authenticated.');
      }
    } catch {
      error('Invalid code', 'Try again or use a backup code.');
    }
  };

  return (
    <section className="auth-twofa" aria-labelledby="auth-twofa-title">
      <AuthDevBypassSection onAuthSuccess={onAuthSuccess} compact />

      <div className="auth-twofa__icon" aria-hidden>
        <NavIcon icon={CHROME_ICONS.lock} size={40} />
      </div>
      <h2 id="auth-twofa-title" className="auth-twofa__title">
        Two-factor authentication
      </h2>
      <p className="auth-twofa__hint">Enter the code from your authenticator app.</p>

      <form onSubmit={handleSubmit}>
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={twoFactorToken}
          onChange={(event) =>
            setTwoFactorToken(event.target.value.replace(/\D/g, '').slice(0, 8))
          }
          maxLength={8}
          className="auth-twofa__input"
          autoFocus
          aria-label="Authentication code"
        />
        <div className="auth-twofa__actions">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Back
          </Button>
          <Button type="submit" disabled={twoFactorToken.length < 6}>
            Verify
          </Button>
        </div>
      </form>

      <div className="auth-twofa__backup">
        <button type="button" className="auth-text-btn" onClick={() => setTwoFactorToken('')}>
          Clear code
        </button>
      </div>
    </section>
  );
}

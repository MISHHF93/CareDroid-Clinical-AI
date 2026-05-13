import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import appConfig from '../config/appConfig';
import { apiFetch } from '../services/apiClient';
import { useNotificationActions } from '../hooks/useNotificationActions';
import logger from '../utils/logger';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [magicEmail, setMagicEmail] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [userId, setUserId] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const bypassToken = appConfig.dev.bearerToken;
  const { success, error, info } = useNotificationActions();
  const showDevBypass = !import.meta.env.PROD && Boolean(bypassToken);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, fullName: form.name };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();

      if (data?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setUserId(data.userId);
        info('Two-factor required', 'Enter the code from your authenticator app.');
        return;
      }

      if (data?.accessToken) {
        onAuthSuccess?.(data.accessToken);
      } else {
        success('Registration complete', 'Check your email to verify your account.');
      }
    } catch {
      error('Sign-in failed', 'Check your email and password, then try again.');
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();

    if (!twoFactorToken || twoFactorToken.length < 6) {
      error('Invalid code', 'Enter the 6-digit code from your app.');
      return;
    }

    try {
      const response = await apiFetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: twoFactorToken }),
      });

      if (!response.ok) {
        throw new Error('Invalid 2FA code');
      }

      const data = await response.json();

      if (data?.accessToken) {
        onAuthSuccess?.(data.accessToken);
        success('Signed in', 'You are authenticated.');
      }
    } catch {
      error('Invalid code', 'Try again or use a backup code.');
    }
  };

  const handleCancelTwoFactor = () => {
    setRequiresTwoFactor(false);
    setUserId(null);
    setTwoFactorToken('');
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!magicEmail.trim()) {
      info('Email required', 'Enter your work email to receive a link.');
      return;
    }

    try {
      const response = await apiFetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail.trim() }),
      });

      if (!response.ok) {
        throw new Error('Magic link failed');
      }

      success('Check your email', 'We sent a sign-in link if the address is recognized.');
    } catch {
      error('Could not send link', 'Try again or use email and password.');
    }
  };

  const pingSso = async (path, label) => {
    try {
      const response = await apiFetch(path);
      const data = await response.json().catch(() => ({}));
      info(label, data?.message || 'SSO is not configured for this deployment.');
    } catch {
      info('Unavailable', `${label} is not available right now.`);
    }
  };

  const handleDevBypass = () => {
    try {
      const mockUser = {
        id: 'dev-user',
        email: 'dev@caredroid.local',
        name: 'Development User',
        role: 'admin',
        fullName: 'Development User',
        isEmailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem('caredroid_user_profile', JSON.stringify(mockUser));
      localStorage.setItem('caredroid_access_token', bypassToken);
      logger.info('Dev bypass: stored token and profile');

      if (onAuthSuccess) {
        onAuthSuccess(bypassToken, mockUser);
      }
      info('Signing in', 'Development session started.');
    } catch (err) {
      logger.error('Dev bypass failed', { err });
    }
  };

  return (
    <div className="auth-panel">
      {requiresTwoFactor ? (
        <section className="auth-twofa" aria-labelledby="auth-twofa-title">
          <div className="auth-twofa__icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.lock} size={40} />
          </div>
          <h2 id="auth-twofa-title" className="auth-twofa__title">
            Two-factor authentication
          </h2>
          <p className="auth-twofa__hint">Enter the code from your authenticator app.</p>

          <form onSubmit={handleTwoFactorSubmit}>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
              maxLength={8}
              className="auth-twofa__input"
              autoFocus
              aria-label="Authentication code"
            />
            <div className="auth-twofa__actions">
              <Button type="button" variant="secondary" onClick={handleCancelTwoFactor}>
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
      ) : (
        <>
          <header className="auth-panel__header">
            <h1 className="auth-panel__title">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
            <p className="auth-panel__subtitle">
              {mode === 'login'
                ? 'Use your institutional or personal credentials.'
                : 'Set up access for your clinical workspace.'}
            </p>
          </header>

          <div className="auth-segment" role="tablist" aria-label="Account mode">
            <button
              type="button"
              role="tab"
              className="auth-segment__btn"
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              className="auth-segment__btn"
              aria-selected={mode === 'signup'}
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <Input
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
            <Input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              type="password"
              name="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <Button type="submit" className="auth-form__submit">
              {mode === 'login' ? 'Continue' : 'Create account'}
            </Button>
          </form>

          <details className="auth-extras">
            <summary>More sign-in options</summary>
            <div className="auth-extras__body">
              <p className="auth-divider">Magic link</p>
              <form className="auth-row-inline" onSubmit={handleMagicLink}>
                <Input
                  type="email"
                  placeholder="Work email"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  autoComplete="email"
                />
                <Button type="submit">Send link</Button>
              </form>

              <p className="auth-divider">Institution</p>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => pingSso('/api/auth/oidc', 'OIDC SSO')}
              >
                <span className="auth-link-btn__icon" aria-hidden>
                  <NavIcon icon={CHROME_ICONS.shield} size={18} />
                </span>
                Sign in with OIDC (organization)
              </button>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => pingSso('/api/auth/saml', 'SAML SSO')}
              >
                <span className="auth-link-btn__icon" aria-hidden>
                  <NavIcon icon={CHROME_ICONS.lock} size={18} />
                </span>
                Sign in with SAML (organization)
              </button>

              <p className="auth-divider">Social</p>
              <a className="auth-link-btn" href="/api/auth/google">
                <span className="auth-link-btn__icon" aria-hidden>
                  <NavIcon icon={CHROME_ICONS.user} size={18} />
                </span>
                Continue with Google
              </a>
              <a className="auth-link-btn" href="/api/auth/linkedin">
                <span className="auth-link-btn__icon" aria-hidden>
                  <NavIcon icon={CHROME_ICONS.users} size={18} />
                </span>
                Continue with LinkedIn
              </a>

              {showDevBypass && (
                <>
                  <p className="auth-divider">Development</p>
                  <button type="button" className="auth-link-btn auth-dev" onClick={handleDevBypass}>
                    <span className="auth-link-btn__icon" aria-hidden>
                      <NavIcon icon={CHROME_ICONS.zap} size={18} />
                    </span>
                    Skip auth (local dev only)
                  </button>
                </>
              )}
            </div>
          </details>

          <footer className="auth-panel__footer">
            <Link className="auth-back-link" to="/">
              ← Back to home
            </Link>
          </footer>
        </>
      )}
    </div>
  );
};

export default Auth;

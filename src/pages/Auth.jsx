import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import appConfig from '../config/appConfig';
import { apiFetch, apiFetchJson, buildApiUrl } from '../services/apiClient';
import {
  GoogleLogo,
  LinkedInLogo,
  InstitutionOidcIcon,
  InstitutionSamlIcon,
} from '../components/auth/AuthProviderIcons';
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
  /** Token stored for Division mode bypass (defaults in appConfig when env unset). */
  const divisionToken = (appConfig.dev.bearerToken || '').trim() || 'dev-bypass-token';
  const showDivisionMode = !appConfig.features.hideDivisionMode;
  const { success, error, info } = useNotificationActions();
  const googleAuthUrl = buildApiUrl('/api/auth/google');
  const linkedinAuthUrl = buildApiUrl('/api/auth/linkedin');
  const [searchParams, setSearchParams] = useSearchParams();
  const oauthBannerShown = useRef(false);

  useEffect(() => {
    if (oauthBannerShown.current) return;
    if (searchParams.get('error') !== 'oauth') return;
    oauthBannerShown.current = true;
    error(
      'Sign-in failed',
      'OAuth did not return a token. Confirm provider credentials and FRONTEND_URL on the API server.',
    );
    const next = new URLSearchParams(searchParams);
    next.delete('error');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : { email: form.email, password: form.password, fullName: form.name };

      const { response, data } = await apiFetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Authentication failed');
      }

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
      const { response, data } = await apiFetchJson('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: twoFactorToken }),
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Invalid 2FA code');
      }

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

  const applyDevSession = (mockUser, label) => {
    try {
      localStorage.setItem('caredroid_user_profile', JSON.stringify(mockUser));
      localStorage.setItem('caredroid_access_token', divisionToken);
      logger.info('Division mode bypass: stored token and profile', { label });

      if (onAuthSuccess) {
        onAuthSuccess(divisionToken, mockUser);
      }
      info('Signing in', `${label} — entering app without verification.`);
    } catch (err) {
      logger.error('Dev bypass failed', { err });
    }
  };

  const handleDemoSession = () => {
    applyDevSession(
      {
        id: 'demo-user',
        email: 'demo@caredroid.local',
        name: 'Demo Clinician',
        role: 'physician',
        fullName: 'Demo Clinician',
        isEmailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      },
      'Free demo session',
    );
  };

  const handleDeveloperSession = () => {
    applyDevSession(
      {
        id: 'dev-user',
        email: 'dev@caredroid.local',
        name: 'Development User',
        role: 'admin',
        fullName: 'Development User',
        isEmailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      },
      'Division mode (admin)',
    );
  };

  const divisionModeSection = (opts = {}) => {
    const { compact } = opts;
    if (!showDivisionMode) return null;
    return (
      <section
        className={`auth-dev-oneclick${compact ? ' auth-dev-oneclick--compact' : ''}`}
        aria-label="Division mode — bypass verification"
      >
        <p className="auth-division-tag">Division mode</p>
        <Button
          type="button"
          variant="success"
          size="lg"
          onClick={handleDeveloperSession}
          leftIcon={<NavIcon icon={CHROME_ICONS.zap} size={20} aria-hidden />}
        >
          Enter app — no verification
        </Button>
        <p className="auth-dev-oneclick__hint">
          Skips password, OAuth, and 2FA for UI work. Uses token from{' '}
          <code className="auth-dev-code">VITE_DEV_BEARER_TOKEN</code> (default <code className="auth-dev-code">dev-bypass-token</code>).
          Your API must accept that JWT or calls return 401. Hide on real PHI deploys:{' '}
          <code className="auth-dev-code">VITE_HIDE_DIVISION_MODE=true</code>.
        </p>
        <button type="button" className="auth-text-btn auth-dev-oneclick__alt" onClick={handleDemoSession}>
          Demo clinician profile instead
        </button>
      </section>
    );
  };

  return (
    <div className="auth-root">
      {requiresTwoFactor ? (
        <section className="auth-twofa" aria-labelledby="auth-twofa-title">
          {divisionModeSection({ compact: true })}

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
          {divisionModeSection()}

          <header className="auth-panel__header">
            <h1 className="auth-panel__title">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
            <p className="auth-panel__subtitle">
              {mode === 'login'
                ? 'Use your institutional or personal credentials.'
                : 'Set up access for your clinical workspace.'}
            </p>
          </header>

          <p className="auth-segment-caption" id="auth-mode-caption">
            Choose <strong>Sign in</strong> or <strong>Create account</strong> (same page as <code className="auth-dev-code">/auth</code>).
          </p>
          <div
            className="auth-segment"
            role="tablist"
            aria-label="Sign in or create account"
            aria-describedby="auth-mode-caption"
          >
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

          <div className="auth-oauth-stack" aria-label="Sign-in options">
            <a className="auth-oauth-btn" href={googleAuthUrl}>
              <span className="auth-oauth-btn__brand" aria-hidden>
                <GoogleLogo size={22} />
              </span>
              <span className="auth-oauth-btn__label">
                {mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
              </span>
            </a>
            <a className="auth-oauth-btn" href={linkedinAuthUrl}>
              <span className="auth-oauth-btn__brand" aria-hidden>
                <LinkedInLogo size={22} />
              </span>
              <span className="auth-oauth-btn__label">
                {mode === 'signup' ? 'Sign up with LinkedIn' : 'Continue with LinkedIn'}
              </span>
            </a>

            <p className="auth-divider">Institution</p>
            <button
              type="button"
              className="auth-oauth-btn"
              onClick={() => pingSso('/api/auth/oidc', 'OIDC SSO')}
            >
              <span className="auth-oauth-btn__brand" aria-hidden>
                <InstitutionOidcIcon size={22} />
              </span>
              <span className="auth-oauth-btn__label">Sign in with OIDC (organization)</span>
            </button>
            <button
              type="button"
              className="auth-oauth-btn"
              onClick={() => pingSso('/api/auth/saml', 'SAML SSO')}
            >
              <span className="auth-oauth-btn__brand" aria-hidden>
                <InstitutionSamlIcon size={22} />
              </span>
              <span className="auth-oauth-btn__label">Sign in with SAML (organization)</span>
            </button>
          </div>

          <p className="auth-or-divider" role="presentation">
            <span>or use email</span>
          </p>

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

          <section className="auth-magic" aria-label="Magic link sign-in">
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
          </section>

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

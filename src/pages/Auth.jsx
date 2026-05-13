import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import appConfig from '../config/appConfig';
import { apiFetch, buildApiUrl } from '../services/apiClient';
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
  const bypassToken = (appConfig.dev.bearerToken || '').trim();
  const { success, error, info } = useNotificationActions();
  const [allowLocalQuickDev, setAllowLocalQuickDev] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = window.location.hostname;
    const p = window.location.port;
    const localHost =
      h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
    const vitePreview = p === '4173';
    setAllowLocalQuickDev(localHost || vitePreview);
  }, []);

  const devBypassAllowedHost =
    import.meta.env.DEV || appConfig.features.showDemoAuth || allowLocalQuickDev;
  const showQuickDev = Boolean(bypassToken) && devBypassAllowedHost;
  const showDevBypassHiddenHint = Boolean(bypassToken) && !devBypassAllowedHost;
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

  const applyDevSession = (mockUser, label) => {
    try {
      localStorage.setItem('caredroid_user_profile', JSON.stringify(mockUser));
      localStorage.setItem('caredroid_access_token', bypassToken);
      logger.info('Dev bypass: stored token and profile', { label });

      if (onAuthSuccess) {
        onAuthSuccess(bypassToken, mockUser);
      }
      info('Signing in', `${label} — local session started.`);
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
      'Developer (admin)',
    );
  };

  return (
    <div className="auth-root">
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

          {showQuickDev && (
            <section className="auth-dev-oneclick" aria-label="Developer bypass sign-in">
              <Button
                type="button"
                variant="success"
                size="lg"
                onClick={handleDeveloperSession}
                leftIcon={<NavIcon icon={CHROME_ICONS.zap} size={20} aria-hidden />}
              >
                One-click developer sign-in
              </Button>
              <p className="auth-dev-oneclick__hint">
                No password — opens the app immediately using{' '}
                <code className="auth-dev-code">VITE_DEV_BEARER_TOKEN</code>. Only on dev server, localhost,{' '}
                <code className="auth-dev-code">vite preview</code> (port 4173), or when{' '}
                <code className="auth-dev-code">VITE_SHOW_DEMO_AUTH=true</code>. Your API must accept that token or
                requests will return 401.
              </p>
              <button type="button" className="auth-text-btn auth-dev-oneclick__alt" onClick={handleDemoSession}>
                Use demo clinician profile instead
              </button>
            </section>
          )}

          {showDevBypassHiddenHint && (
            <section className="auth-dev-hidden-hint" role="status">
              <p className="auth-dev-hidden-hint__title">Developer one-click sign-in is configured but hidden here</p>
              <p className="auth-dev-hidden-hint__body">
                This host is not treated as a dev environment. Add{' '}
                <code className="auth-dev-code">VITE_SHOW_DEMO_AUTH=true</code> to this deployment&apos;s build
                environment (e.g. Vercel), or open the app on <code className="auth-dev-code">localhost</code> /{' '}
                <code className="auth-dev-code">npm run dev</code>. Sign-in and create-account use the tabs below.
              </p>
            </section>
          )}

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

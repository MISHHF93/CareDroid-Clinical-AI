import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import AuthDevBypassSection from '../components/auth/AuthDevBypassSection';
import AuthSignInPanel from '../components/auth/AuthSignInPanel';
import AuthSignUpPanel from '../components/auth/AuthSignUpPanel';
import AuthTwoFactorPanel from '../components/auth/AuthTwoFactorPanel';
import { sanitizeReturnUrl } from '../auth/authSession';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState('login');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorState, setTwoFactorState] = useState({ userId: null, twoFactorChallengeToken: '' });
  const { branding } = useWhiteLabel();
  const { error } = useNotificationActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const oauthBannerShown = useRef(false);
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'));
  const inviteToken = searchParams.get('invite') || '';

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

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (requestedMode === 'signup' || requestedMode === 'login') {
      setMode(requestedMode);
    }
  }, [searchParams]);

  const handleRequiresTwoFactor = ({ userId, twoFactorChallengeToken }) => {
    setRequiresTwoFactor(true);
    setTwoFactorState({ userId, twoFactorChallengeToken });
  };

  const handleCancelTwoFactor = () => {
    setRequiresTwoFactor(false);
    setTwoFactorState({ userId: null, twoFactorChallengeToken: '' });
  };

  if (requiresTwoFactor) {
    return (
      <div className="auth-root">
        <AuthTwoFactorPanel
          userId={twoFactorState.userId}
          twoFactorChallengeToken={twoFactorState.twoFactorChallengeToken}
          onAuthSuccess={onAuthSuccess}
          onCancel={handleCancelTwoFactor}
        />
      </div>
    );
  }

  return (
    <div className="auth-root">
      <AuthDevBypassSection onAuthSuccess={onAuthSuccess} />

      <header className="auth-panel__header">
        <h1 className="auth-panel__title">
          {mode === 'login'
            ? branding.loginTitle || 'Sign in'
            : `Create account for ${branding.displayName || 'CareDroid'}`}
        </h1>
        <p className="auth-panel__subtitle">
          {mode === 'login'
            ? branding.loginSubtitle || 'Use your institutional or personal credentials.'
            : 'Set up access for your clinical workspace.'}
        </p>
      </header>

      <p className="auth-segment-caption" id="auth-mode-caption">
        Choose <strong>Sign in</strong> or <strong>Create account</strong>.
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

      {mode === 'login' ? (
        <AuthSignInPanel
          onAuthSuccess={onAuthSuccess}
          onRequiresTwoFactor={handleRequiresTwoFactor}
          returnUrl={returnUrl}
          inviteToken={inviteToken}
        />
      ) : (
        <AuthSignUpPanel
          onAuthSuccess={onAuthSuccess}
          returnUrl={returnUrl}
          inviteToken={inviteToken}
        />
      )}

      <footer className="auth-panel__footer">
        <a className="auth-back-link" href="/">
          ← Back to home
        </a>
      </footer>
    </div>
  );
};

export default Auth;

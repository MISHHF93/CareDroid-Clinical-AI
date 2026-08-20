import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CAREDROID_PRODUCT } from '../../config/caredroidProduct.config';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { sanitizeReturnUrl, resolvePostAuthDestination } from '../../auth/authSession';
import {
  loginWithPassword,
  registerAccount,
  verifyTwoFactorLogin,
  persistRealSession,
  isTwoFactorChallenge,
  type RealLoginSuccess,
} from '../../services/realAuthApi';
import { ensureDevBackendSession, isDev } from '../../services/devBackendAuth';
import { AUTH_CONFIG } from '../../config/auth.config';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import './AuthPage.css';

type Mode = 'login' | 'signup';

function completeRealSession(result: RealLoginSuccess, returnUrl: string | null) {
  persistRealSession(result);
  const destination = resolvePostAuthDestination({ returnUrl, user: result.user, profile: result.user });
  // Hard navigation, not client-side routing: UserProvider only reads the
  // stored session once, in its initial useState() -- a full reload is what
  // makes it re-mount and pick up the just-written real session cleanly,
  // the same pattern devBackendAuth.ts's persistDevSession() already relies on.
  window.location.href = destination;
}

export default function AuthPage({ initialMode = 'login' }: { initialMode?: Mode }) {
  const [searchParams] = useSearchParams();
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'));

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [twoFactor, setTwoFactor] = useState<{ userId: string; challengeToken: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Programmatic focus instead of the autoFocus prop -- same "ready to type
  // immediately" UX, but scoped to exactly when each field actually appears
  // (jsx-a11y/no-autofocus: the prop fires focus unconditionally on every
  // mount with no way to make it context-aware, which is the real complaint).
  const twoFactorInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (twoFactor) twoFactorInputRef.current?.focus();
  }, [twoFactor]);

  const emailInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!twoFactor) emailInputRef.current?.focus();
  }, [twoFactor, mode]);

  const handleLogin = async () => {
    const result = await loginWithPassword(email.trim(), password);
    if (isTwoFactorChallenge(result)) {
      const challengeToken = String((result.twoFactorChallenge as { token?: string })?.token || '');
      setTwoFactor({ userId: result.userId, challengeToken });
      setNotice('Enter the verification code from your authenticator app.');
      return;
    }
    completeRealSession(result, returnUrl);
  };

  const handleRegister = async () => {
    await registerAccount(email.trim(), password, fullName.trim());
    // login() does not require emailVerified, so a freshly-registered account
    // can sign in immediately -- matches how this dev environment has no
    // outbound email service configured to deliver a verification link yet.
    const result = await loginWithPassword(email.trim(), password);
    if (isTwoFactorChallenge(result)) {
      const challengeToken = String((result.twoFactorChallenge as { token?: string })?.token || '');
      setTwoFactor({ userId: result.userId, challengeToken });
      setNotice('Account created. Enter the verification code from your authenticator app.');
      return;
    }
    completeRealSession(result, returnUrl);
  };

  const handleTwoFactorSubmit = async () => {
    if (!twoFactor) return;
    const result = await verifyTwoFactorLogin(twoFactor.userId, twoFactorCode.trim(), twoFactor.challengeToken);
    completeRealSession(result, returnUrl);
  };

  // HEAL-347.14: explicit, one-click local-dev bypass -- distinct from a real
  // login (never sets authMode: 'real'). Structurally incapable of doing
  // anything in a real deployment: this button doesn't even render unless
  // isDev is true, ensureDevBackendSession() hits the backend's own
  // /auth/dev-session endpoint, and THAT endpoint independently refuses to
  // issue a token outside local development or an explicit
  // ENABLE_DEV_AUTH_BYPASS opt-in (auth.service.ts's createDevSession()) --
  // a tampered/forced client-side isDev check alone can't reach a real
  // session this way in a real deployment.
  const handleDevBypass = async () => {
    // HEAL-347.15: devBackendAuth.ts's persistDevSession() deliberately
    // refuses to overwrite an ALREADY-stored demo-persona profile (HEAL-319's
    // guard against a late-resolving background fetch clobbering a user's
    // explicit persona choice) -- correct for that original background-race
    // scenario, but this button click IS the user's explicit, deliberate
    // choice, so the same guard was silently swallowing it: the token would
    // be issued and stored, but the profile write got skipped, leaving
    // whatever demo-persona authMode was already there (e.g. 'open-access'
    // from a prior /start visit) -- RequireRealSession doesn't recognize
    // that as a dev-bypass session, so the click just bounced back to
    // /login with no visible error. Clearing the stored profile first
    // guarantees this explicit action always wins.
    localStorage.removeItem(AUTH_CONFIG.userProfileStorageKey);
    localStorage.removeItem(AUTH_CONFIG.tokenStorageKey);
    const session = await ensureDevBackendSession({ force: true });
    // HEAL-347.17: UserContext.tsx's OWN ambient bootstrap effect (see
    // HEAL-347.16 below) also calls ensureDevBackendSession() -- unforced --
    // on every mount, including this login page itself, since before the
    // user ever clicks. If its own USER_BOOTSTRAP_MAX_MS timeout fires in
    // the window between the localStorage.removeItem() calls above and this
    // call's fetch resolving, its fallback (readStoredUser() ||
    // userRef.current || OPEN_ACCESS_USER) writes the generic open-access
    // "Dr. Cara George" persona + the shared placeholder bearer token right
    // back into storage -- confirmed live via direct localStorage
    // inspection (a fresh bypass click landed as authMode:
    // 'explicit-dev-bypass' stamped onto id: 'open-access-user', not the
    // real backend account). Re-reading localStorage here to patch just the
    // authMode field (the previous approach) inherits whatever that race
    // left behind. Requiring session.user and session.source ===
    // 'dev-session', then writing the final profile directly from this
    // call's own response instead of reading storage back, means the result
    // only ever depends on OUR fetch -- concurrent writes from the ambient
    // effect can no longer end up baked into the identity this click
    // produces.
    if (!session?.token || session.source !== 'dev-session' || !session.user) {
      throw new Error(session?.error || 'Dev session bypass is unavailable right now.');
    }
    localStorage.setItem(AUTH_CONFIG.tokenStorageKey, session.token);
    // HEAL-347.16: UserContext.tsx's OWN background bootstrap effect already
    // calls ensureDevBackendSession() on every app mount in dev mode,
    // regardless of user intent -- it's what's always let a developer skip
    // logging in locally. That ambient session also lands with
    // authMode: 'local-dev-demo' (persistDevSession()'s own stamp), so
    // RequireRealSession can't use that value to recognize "the user
    // explicitly clicked Bypass sign-in" -- literally every dev-mode visitor
    // reaches that state within a couple seconds either way, which would
    // make the gate meaningless in dev. Stamp a marker that only THIS
    // explicit click ever sets.
    localStorage.setItem(
      AUTH_CONFIG.userProfileStorageKey,
      JSON.stringify({ ...session.user, authMode: 'explicit-dev-bypass', isDevAuthBypass: true }),
    );
    window.location.href = returnUrl && returnUrl !== '/' ? returnUrl : '/';
  };

  const handleDevBypassClick = async () => {
    setError('');
    setNotice('');
    setPending(true);
    try {
      await handleDevBypass();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dev session bypass is unavailable right now.');
      setPending(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setPending(true);
    try {
      if (twoFactor) {
        await handleTwoFactorSubmit();
      } else if (mode === 'login') {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth-page" style={{ background: MEDICAL_THEME.surfacePage }}>
      <div className="auth-page__card" style={{ background: MEDICAL_THEME.surfaceCard, boxShadow: MEDICAL_THEME.shadowModal }}>
        <div className="auth-page__brand">
          <strong>CareDroid</strong>
          <span>{CAREDROID_PRODUCT.tagline}</span>
        </div>

        {twoFactor ? (
          <>
            <h1 className="auth-page__title">Verify your identity</h1>
            <p className="auth-page__subtitle">{notice}</p>
          </>
        ) : (
          <>
            <h1 className="auth-page__title">{mode === 'login' ? 'Log in' : 'Create your account'}</h1>
            <p className="auth-page__subtitle">
              {mode === 'login'
                ? 'Sign in with your CareDroid credentials.'
                : 'Register a real CareDroid account.'}
            </p>
          </>
        )}

        {error ? (
          <div className="auth-page__error" role="alert">
            {error}
          </div>
        ) : null}
        {notice && !twoFactor ? (
          <div className="auth-page__notice" role="status">
            {notice}
          </div>
        ) : null}

        <form className="auth-page__form" onSubmit={handleSubmit}>
          {twoFactor ? (
            <label className="auth-page__field">
              <span>Verification code</span>
              <input
                ref={twoFactorInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value)}
                placeholder="123456"
                required
              />
            </label>
          ) : (
            <>
              {mode === 'signup' ? (
                <label className="auth-page__field">
                  <span>Full name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Dr. Jordan Rivera"
                    required
                  />
                </label>
              ) : null}
              <label className="auth-page__field">
                <span>Email</span>
                <input
                  ref={emailInputRef}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@hospital.org"
                  required
                />
              </label>
              <label className="auth-page__field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  minLength={mode === 'signup' ? 8 : undefined}
                  required
                />
              </label>
            </>
          )}

          <button type="submit" className="auth-page__submit" disabled={pending}>
            {pending
              ? 'Please wait…'
              : twoFactor
                ? 'Verify'
                : mode === 'login'
                  ? 'Log in'
                  : 'Create account'}
          </button>
        </form>

        {!twoFactor ? (
          <div className="auth-page__switch">
            {mode === 'login' ? (
              <>
                Don&rsquo;t have an account?{' '}
                <button
                  type="button"
                  className="auth-page__link-button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setNotice('');
                  }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-page__link-button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setNotice('');
                  }}
                >
                  Log in
                </button>
              </>
            )}
          </div>
        ) : null}

        {isDev && !twoFactor ? (
          <button
            type="button"
            className="auth-page__dev-bypass"
            onClick={handleDevBypassClick}
            disabled={pending}
          >
            Bypass sign-in (local dev only)
          </button>
        ) : null}

        <div className="auth-page__footer">
          <Link to={CANONICAL_ROUTES.platformStart}>Explore the CareDroid demo instead</Link>
        </div>
      </div>
    </div>
  );
}

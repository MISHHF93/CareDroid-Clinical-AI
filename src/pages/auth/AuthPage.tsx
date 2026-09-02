import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CAREDROID_PRODUCT } from '../../config/caredroidProduct.config';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { ariaInvalid } from '../../utils/ariaInvalid';
import { sanitizeReturnUrl, resolvePostAuthDestination } from '../../auth/authSession';
import {
  loginWithPassword,
  registerAccount,
  verifyTwoFactorLogin,
  persistRealSession,
  isTwoFactorChallenge,
  type RealLoginSuccess,
} from '../../services/realAuthApi';
import { ensureDevBackendSession, isBackendAbsent, isDev } from '../../services/devBackendAuth';
import { AUTH_CONFIG } from '../../config/auth.config';
import { buildOpenAccessDemoUser } from '../../config/demoPersonaModel';
import './AuthPage.css';

type Mode = 'login' | 'signup';

function completeRealSession(result: RealLoginSuccess, returnUrl: string | null) {
  persistRealSession(result);
  const destination = resolvePostAuthDestination({
    returnUrl,
    user: result.user,
    profile: result.user,
  });
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
  const [twoFactor, setTwoFactor] = useState<{ userId: string; challengeToken: string } | null>(
    null,
  );
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
    const result = await verifyTwoFactorLogin(
      twoFactor.userId,
      twoFactorCode.trim(),
      twoFactor.challengeToken,
    );
    completeRealSession(result, returnUrl);
  };

  // Explicit, one-click developer bypass -- distinct from a real login (never
  // sets authMode: 'real').
  //
  // The button now renders in every environment (product decision: one
  // developer entry point, always in the same place). Visibility is NOT the
  // security control and never was: the only thing that decides whether a
  // token is actually issued is the backend's own /auth/dev-session endpoint,
  // which refuses outside local development unless BOTH
  // ENABLE_DEV_AUTH_BYPASS and ALLOW_DEMO_AUTH_IN_PRODUCTION are explicitly
  // set (auth.service.ts's createDevSession()). So in an ordinary production
  // deployment this button is inert and surfaces the server's own refusal
  // message rather than silently doing nothing. Do not "simplify" that
  // server-side gate away to make the button work in production -- that gate
  // is what keeps this from being a credential-free path into patient data.
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
    // A generous timeout, deliberately above the ambient bootstrap's 4s: this
    // is a human who clicked a button and is watching the spinner, and the
    // backend's dev-session bootstrap on a COLD process (bcrypt + org/
    // workspace/pack checks on sqlite) measures 5-16s while a warm one takes
    // ~0.3s. Aborting a deliberate click at 4s during a restart window is what
    // produced "Dev session bypass is unavailable right now" with no cause.
    const session = await ensureDevBackendSession({ force: true, timeoutMs: 20_000 });
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
      // A frontend-only deployment has no session service to call at all: Vercel
      // builds the Vite app and its rewrites deliberately exclude /api, so this
      // POST reaches no server. Stranding the user behind "unavailable right now"
      // is the wrong answer there -- with no backend there is also no patient
      // data, only the bundled demo dataset, so a local identity is the honest
      // thing to hand them.
      //
      // Narrow on purpose. status 0 (never reached a server) and 404 (no such
      // route) mean "there is no backend here". On a production build the
      // resolver short-circuits before calling anything and reports
      // source: 'production', so that case is settled by an explicit probe
      // instead of an assumption. A 401/403 from a real server is a deliberate
      // refusal and still fails, because the server-side gate saying no must keep
      // meaning no. This does not touch that gate.
      const backendAbsent =
        session?.status === 0 ||
        session?.status === 404 ||
        (session?.source === 'production' && (await isBackendAbsent()));
      if (!backendAbsent) {
        throw new Error(session?.error || 'Dev session bypass is unavailable right now.');
      }

      // On the production short-circuit there may be no stored token at all, and
      // an empty string reads as "signed out" downstream. There is no server to
      // authenticate against here, so this is a marker, not a credential.
      localStorage.setItem(AUTH_CONFIG.tokenStorageKey, session.token || 'local-demo-session');
      localStorage.setItem(
        AUTH_CONFIG.userProfileStorageKey,
        JSON.stringify({
          ...buildOpenAccessDemoUser(),
          authMode: 'explicit-dev-bypass',
          isDevAuthBypass: true,
          // Set only here. The route gate uses it to admit this session outside
          // dev, so it must never be stamped on a session that came from a real
          // backend -- see useUnauthenticatedRedirectGate.
          isLocalDemoFallback: true,
        }),
      );
      window.location.href = returnUrl && returnUrl !== '/' ? returnUrl : '/';
      return;
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
    <main className="auth-page">
      <section className="auth-page__story" aria-label="About CareDroid">
        <div className="auth-page__story-inner">
          <div className="auth-page__brand-lockup">
            <span className="auth-page__brand-mark" aria-hidden="true">
              <Activity size={22} strokeWidth={2.1} />
            </span>
            <span className="auth-page__brand-copy">
              <strong>CareDroid</strong>
              <span>Clinical OS</span>
            </span>
          </div>

          <div className="auth-page__story-copy">
            <span className="auth-page__eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              Emergency care, clearly orchestrated
            </span>
            <h2>Calm command for the moments that move fastest.</h2>
            <p>
              One operational workspace for arrivals, queues, capacity, handoffs, and human-reviewed
              clinical intelligence.
            </p>
          </div>

          <div className="auth-page__workspace-preview" aria-hidden="true">
            <div className="auth-page__preview-head">
              <span>
                <Activity size={15} /> Department pulse
              </span>
              <span className="auth-page__live-indicator">Live workspace</span>
            </div>
            <div className="auth-page__preview-grid">
              <div>
                <span>Arrivals</span>
                <strong>12</strong>
                <small>4 inbound</small>
              </div>
              <div>
                <span>Rooms ready</span>
                <strong>8/10</strong>
                <small>Stable capacity</small>
              </div>
              <div>
                <span>Reassessments</span>
                <strong>03</strong>
                <small>Need attention</small>
              </div>
            </div>
            <div className="auth-page__preview-flow">
              <span className="auth-page__flow-step auth-page__flow-step--complete">Arrival</span>
              <span className="auth-page__flow-line" />
              <span className="auth-page__flow-step auth-page__flow-step--active">Triage</span>
              <span className="auth-page__flow-line" />
              <span className="auth-page__flow-step">Care</span>
              <span className="auth-page__flow-line" />
              <span className="auth-page__flow-step">Disposition</span>
            </div>
          </div>

          <div className="auth-page__principles">
            <span>
              <ShieldCheck size={16} /> Human-reviewed decisions
            </span>
            <span>
              <CheckCircle2 size={16} /> Role-aware workflows
            </span>
          </div>
        </div>
      </section>

      <section className="auth-page__access" aria-label="CareDroid account access">
        <div className="auth-page__mobile-brand">
          <span className="auth-page__brand-mark" aria-hidden="true">
            <Activity size={20} strokeWidth={2.1} />
          </span>
          <strong>CareDroid</strong>
        </div>

        <div className="auth-page__card">
          <div className="auth-page__card-heading">
            <span className="auth-page__secure-label">
              <LockKeyhole size={13} aria-hidden="true" /> Secure workspace
            </span>
            {twoFactor ? (
              <>
                <h1 className="auth-page__title">Verify your identity</h1>
                <p className="auth-page__subtitle">{notice}</p>
              </>
            ) : (
              <>
                <h1 className="auth-page__title">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="auth-page__subtitle">
                  {mode === 'login'
                    ? 'Sign in to continue to your clinical workspace.'
                    : 'Create secure access to your CareDroid workspace.'}
                </p>
              </>
            )}
          </div>

          {error ? (
            <div className="auth-page__error" role="alert" id="auth-page-error">
              {error}
            </div>
          ) : null}
          {notice && !twoFactor ? (
            <div className="auth-page__notice" role="status">
              {notice}
            </div>
          ) : null}

          {!twoFactor ? (
            <div className="auth-page__dev-access">
              <div>
                <span>{isDev ? 'Local development' : 'Developer access'}</span>
                <p>
                  {isDev
                    ? 'Open a fully provisioned clinical workspace without credentials.'
                    : 'Requires the server-side developer bypass to be enabled for this deployment.'}
                </p>
              </div>
              <button
                type="button"
                className="auth-page__dev-enter"
                onClick={handleDevBypassClick}
                disabled={pending}
              >
                <span>{pending ? 'Entering…' : 'Enter CareDroid now'}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {!twoFactor ? (
            <div className="auth-page__divider" role="separator">
              <span>or use your account</span>
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
                  {...ariaInvalid(error)}
                  aria-describedby={error ? 'auth-page-error' : undefined}
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
                  <span>Email address</span>
                  <input
                    ref={emailInputRef}
                    type="email"
                    autoComplete="email"
                    {...ariaInvalid(error)}
                    aria-describedby={error ? 'auth-page-error' : undefined}
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
                    {...ariaInvalid(error)}
                    aria-describedby={error ? 'auth-page-error' : undefined}
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
              <span>
                {pending
                  ? 'Please wait…'
                  : twoFactor
                    ? 'Verify identity'
                    : mode === 'login'
                      ? 'Log in securely'
                      : 'Create account'}
              </span>
              {!pending ? <ArrowRight size={17} aria-hidden="true" /> : null}
            </button>
          </form>

          {!twoFactor ? (
            <div className="auth-page__switch">
              {mode === 'login' ? (
                <>
                  New to CareDroid?{' '}
                  <button
                    type="button"
                    className="auth-page__link-button"
                    onClick={() => {
                      setMode('signup');
                      setError('');
                      setNotice('');
                    }}
                  >
                    Create an account
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

          {!isDev && !twoFactor ? (
            <div className="auth-page__footer">
              <Link to={CANONICAL_ROUTES.platformStart}>Explore the CareDroid demo instead</Link>
            </div>
          ) : null}

          <p className="auth-page__session-note">
            <LockKeyhole size={13} aria-hidden="true" /> Encrypted session · Access is logged and
            role-aware
          </p>
        </div>

        <p className="auth-page__legal">{CAREDROID_PRODUCT.safetyLine}</p>
      </section>
    </main>
  );
}

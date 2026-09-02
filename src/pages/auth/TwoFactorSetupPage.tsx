import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, KeyRound, Copy } from 'lucide-react';
import {
  disableTwoFactor,
  enableTwoFactor,
  fetchTwoFactorStatus,
  generateTwoFactorSecret,
  type TwoFactorSecret,
  type TwoFactorStatus,
} from '../../services/twoFactorApi';
import { ariaInvalid } from '../../utils/ariaInvalid';
import './TwoFactorSetupPage.css';

type Phase = 'loading' | 'idle' | 'enrolling' | 'saved' | 'error';

/**
 * Security settings screen for two-factor authentication.
 *
 * TwoFactorEnforcementGuard rejects a high-privilege request with "2FA is
 * required for your role. Please enable it in your security settings." Until
 * this page existed there were no such settings to reach, so enforcement could
 * not be switched on without stranding every admin and physician. Every call
 * here goes to TwoFactorController, which was already live and route-inventoried.
 */
export default function TwoFactorSetupPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [secret, setSecret] = useState<TwoFactorSecret | null>(null);
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const result = await fetchTwoFactorStatus();
    if (!result.ok) {
      setError(result.message);
      setPhase('error');
      return;
    }
    setStatus(result.data);
    setPhase('idle');
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const beginEnrollment = async () => {
    setBusy(true);
    setError('');
    const result = await generateTwoFactorSecret();
    setBusy(false);
    if (!result.ok || !result.data) {
      setError(result.message || 'Could not start enrollment.');
      return;
    }
    setSecret(result.data);
    setPhase('enrolling');
  };

  const confirmEnrollment = async (event: FormEvent) => {
    event.preventDefault();
    if (!secret) return;
    setBusy(true);
    setError('');
    const result = await enableTwoFactor(secret.secret, token.trim());
    setBusy(false);
    if (!result.ok || !result.data) {
      // A wrong code is rejected without enabling anything, so keep the user on
      // this step to retype it rather than sending them back to a fresh secret.
      setError(result.message || 'That code was not accepted. Check your authenticator and try again.');
      return;
    }
    setBackupCodes(result.data.backupCodes || []);
    setToken('');
    setPhase('saved');
    void loadStatus();
  };

  const turnOff = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const result = await disableTwoFactor(token.trim());
    setBusy(false);
    if (!result.ok) {
      setError(result.message || 'That code was not accepted.');
      return;
    }
    setToken('');
    setSecret(null);
    setBackupCodes([]);
    void loadStatus();
  };

  const copyCodes = () => {
    try {
      void navigator.clipboard?.writeText(backupCodes.join('\n'));
    } catch {
      // Clipboard is unavailable in some embedded browsers. The codes stay on
      // screen to be written down, so this is not worth surfacing as an error.
    }
  };

  return (
    <main className="two-factor-page" aria-labelledby="two-factor-heading">
      <header className="two-factor-page__header">
        <h1 id="two-factor-heading">Two-factor authentication</h1>
        <p>
          Adds a second step at sign-in using an authenticator app. Required for admin and
          physician roles wherever your hospital enforces it.
        </p>
      </header>

      {error ? (
        <div className="two-factor-page__error" role="alert" id="two-factor-error">
          {error}
        </div>
      ) : null}

      {phase === 'loading' ? (
        <p className="two-factor-page__loading" role="status">
          <Loader2 aria-hidden="true" className="two-factor-page__spin" /> Checking your security settings...
        </p>
      ) : null}

      {phase !== 'loading' && status ? (
        <section className="two-factor-page__status" aria-label="Current status">
          <span className={status.enabled ? 'is-on' : 'is-off'}>
            {status.enabled ? <ShieldCheck aria-hidden="true" /> : <ShieldAlert aria-hidden="true" />}
            {status.enabled ? 'Enabled' : 'Not enabled'}
          </span>
          {status.enabled ? (
            <dl>
              <div>
                <dt>Backup codes left</dt>
                <dd>{status.backupCodesRemaining}</dd>
              </div>
              <div>
                <dt>Last used</dt>
                <dd>{status.lastUsedAt ? new Date(status.lastUsedAt).toLocaleString() : 'Never'}</dd>
              </div>
            </dl>
          ) : null}
        </section>
      ) : null}

      {phase === 'idle' && status && !status.enabled ? (
        <button type="button" className="two-factor-page__primary" onClick={beginEnrollment} disabled={busy}>
          <KeyRound aria-hidden="true" /> Set up two-factor authentication
        </button>
      ) : null}

      {phase === 'enrolling' && secret ? (
        <section className="two-factor-page__enroll" aria-label="Set up your authenticator">
          <ol className="two-factor-page__steps">
            <li>
              Scan this code with your authenticator app.
              <img src={secret.qrCode} alt="QR code for setting up two-factor authentication" />
            </li>
            <li>
              Or enter the key by hand:
              <code className="two-factor-page__secret">{secret.secret}</code>
            </li>
          </ol>
          <form onSubmit={confirmEnrollment}>
            <label className="two-factor-page__field">
              <span>Six-digit code from your app</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="123456"
                required
                {...ariaInvalid(error)}
                aria-describedby={error ? 'two-factor-error' : undefined}
              />
            </label>
            <button
              type="submit"
              className="two-factor-page__primary"
              disabled={busy || token.trim().length < 6}
            >
              {busy ? 'Verifying...' : 'Turn on'}
            </button>
          </form>
        </section>
      ) : null}

      {phase === 'saved' && backupCodes.length ? (
        <section className="two-factor-page__codes" aria-label="Backup codes">
          <h2>Save your backup codes</h2>
          <p>Each code works once if you lose your phone. This is the only time they are shown.</p>
          <ul>
            {backupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <button type="button" onClick={copyCodes}>
            <Copy aria-hidden="true" /> Copy codes
          </button>
        </section>
      ) : null}

      {phase !== 'loading' && status?.enabled && phase !== 'saved' ? (
        <form className="two-factor-page__disable" onSubmit={turnOff}>
          <label className="two-factor-page__field">
            <span>Enter a current code to turn two-factor off</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="123456"
              required
              {...ariaInvalid(error)}
              aria-describedby={error ? 'two-factor-error' : undefined}
            />
          </label>
          <button
            type="submit"
            className="two-factor-page__danger"
            disabled={busy || token.trim().length < 6}
          >
            Turn off
          </button>
        </form>
      ) : null}
    </main>
  );
}

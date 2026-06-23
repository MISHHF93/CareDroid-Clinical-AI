import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { useUser } from '../contexts/UserContext';
import { AuthApi } from '../services/authApi';
import {
  hydrateAuthenticatedSession,
  resolvePostAuthDestination,
  sanitizeReturnUrl,
} from '../auth/authSession';

/**
 * OAuth completes with #token=... on this route (backend redirects to FRONTEND_URL/auth-callback).
 * Manual paste remains for troubleshooting.
 */
const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthToken, setUser } = useUser();
  const { info } = useNotificationActions();
  const fragmentParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '',
  );
  const initialToken = fragmentParams.get('token') || params.get('token') || '';
  const nextPath = fragmentParams.get('next') || params.get('next') || params.get('returnUrl') || '/';
  const inviteToken = params.get('invite') || '';
  const [token, setToken] = useState(initialToken);
  const autoHandled = useRef(false);
  const safeNextPath = sanitizeReturnUrl(nextPath);

  useEffect(() => {
    const fromUrl = initialToken;
    if (!fromUrl || autoHandled.current) return;
    autoHandled.current = true;

    (async () => {
      setAuthToken(fromUrl);
      const hydrated = await hydrateAuthenticatedSession(fromUrl);
      if (hydrated.user) {
        setUser({ ...hydrated.user, authMode: 'authenticated' });
      }
      if (inviteToken) {
        await AuthApi.acceptWorkspaceInvitation(inviteToken, fromUrl);
      }
      navigate(
        resolvePostAuthDestination({
          user: hydrated.user,
          profile: hydrated.profile,
          returnUrl: safeNextPath,
        }),
        { replace: true },
      );
    })();
  }, [initialToken, setAuthToken, setUser, navigate, safeNextPath, inviteToken]);

  const handleSave = () => {
    const trimmed = token.trim();
    if (!trimmed) {
      info('Token required', 'Paste an access token to continue.');
      return;
    }
    setAuthToken(trimmed);
    navigate(safeNextPath, { replace: true });
  };

  if (initialToken) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <Card style={{ width: '100%', maxWidth: '480px' }}>
          <h2 style={{ marginTop: 0 }}>Completing sign-in…</h2>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
            Loading your profile and routing to your workspace.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <Card style={{ width: '100%', maxWidth: '720px' }}>
        <h2 style={{ marginTop: 0 }}>Complete sign-in</h2>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          If your browser did not receive a token automatically, paste the access token from your provider or API
          response.
        </p>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={4}
          placeholder="Paste access token"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid var(--panel-border)',
            background: 'var(--panel-bg)',
            color: 'var(--text-color)',
            marginTop: '12px',
          }}
        />
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button onClick={handleSave}>Continue</Button>
          <Link to="/auth">Back to sign in</Link>
        </div>
      </Card>
    </div>
  );
};

export default AuthCallback;

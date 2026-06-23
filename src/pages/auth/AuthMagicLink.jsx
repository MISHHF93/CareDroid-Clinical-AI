import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthApi } from '../../services/authApi';
import { useUser } from '../../contexts/UserContext';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import {
  hydrateAuthenticatedSession,
  resolvePostAuthDestination,
  sanitizeReturnUrl,
} from '../../auth/authSession';
import '../Auth.css';

export default function AuthMagicLink() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const returnUrl = sanitizeReturnUrl(params.get('returnUrl'));
  const { setAuthToken, setUser } = useUser();
  const { error, success } = useNotificationActions();
  const handled = useRef(false);

  useEffect(() => {
    if (!token || handled.current) return;
    handled.current = true;

    (async () => {
      const result = await AuthApi.verifyMagicLink(token);
      if (!result.ok || !result.data?.accessToken) {
        error('Sign-in failed', result.message || 'Magic link is invalid or expired.');
        return;
      }

      const accessToken = result.data.accessToken as string;
      setAuthToken(accessToken);
      const hydrated = await hydrateAuthenticatedSession(accessToken);
      if (hydrated.user) {
        setUser({ ...hydrated.user, authMode: 'authenticated' });
      }
      success('Signed in', 'Magic link accepted.');
      navigate(
        resolvePostAuthDestination({
          user: hydrated.user,
          profile: hydrated.profile,
          returnUrl,
        }),
        { replace: true },
      );
    })();
  }, [token, returnUrl, setAuthToken, setUser, navigate, error, success]);

  return (
    <AuthLayout title="Signing you in…" subtitle="Completing magic link authentication.">
      <p className="auth-panel__hint">You will be redirected momentarily.</p>
    </AuthLayout>
  );
}

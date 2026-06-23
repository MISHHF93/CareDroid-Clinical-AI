import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/button';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthApi } from '../../services/authApi';
import { buildAuthUrl } from '../../auth/authSession';
import { useUser } from '../../contexts/UserContext';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import '../Auth.css';

export default function AuthInviteAccept() {
  const [params] = useSearchParams();
  const inviteToken = params.get('token') || '';
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const { authToken, isRealSession } = useUser();
  const { success, error } = useNotificationActions();

  useEffect(() => {
    if (!inviteToken) {
      setLoading(false);
      return;
    }
    AuthApi.previewWorkspaceInvitation(inviteToken).then((result) => {
      setPreview(result.ok ? result.data : null);
      setLoading(false);
    });
  }, [inviteToken]);

  const handleAccept = async () => {
    if (!inviteToken || !authToken) return;
    const result = await AuthApi.acceptWorkspaceInvitation(inviteToken, authToken);
    if (!result.ok) {
      error('Invite failed', result.message || 'Unable to accept invitation.');
      return;
    }
    success('Workspace joined', 'You now have access to the invited workspace.');
  };

  if (!inviteToken) {
    return (
      <AuthLayout title="Workspace invite" subtitle="Invite token is missing from this link.">
        <Link to={CANONICAL_ROUTES.auth}>Go to sign in</Link>
      </AuthLayout>
    );
  }

  if (loading) {
    return <AuthLayout title="Loading invite…" subtitle="Checking invitation details." />;
  }

  if (!preview) {
    return (
      <AuthLayout title="Invite unavailable" subtitle="This invitation is invalid or has expired.">
        <Link to={CANONICAL_ROUTES.auth}>Go to sign in</Link>
      </AuthLayout>
    );
  }

  const workspaceName = preview.workspaceName || preview.workspace?.name || 'Workspace';
  const role = preview.role || 'member';

  return (
    <AuthLayout
      title="Join workspace"
      subtitle={`You have been invited to ${workspaceName} as ${role}.`}
    >
      {isRealSession ? (
        <Button type="button" onClick={handleAccept}>
          Accept invitation
        </Button>
      ) : (
        <div className="auth-form">
          <p className="auth-panel__hint">Sign in or create an account to accept this invite.</p>
          <Link
            className="auth-oauth-btn auth-oauth-btn--link"
            to={buildAuthUrl({ mode: 'login', inviteToken })}
          >
            Sign in to accept
          </Link>
          <Link
            className="auth-oauth-btn auth-oauth-btn--link"
            to={buildAuthUrl({ mode: 'signup', inviteToken })}
          >
            Create account to accept
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}

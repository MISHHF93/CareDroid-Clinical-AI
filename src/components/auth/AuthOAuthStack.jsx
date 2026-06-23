import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildApiUrl, apiFetch } from '../../services/apiClient';
import { AuthApi } from '../../services/authApi';
import { buildAuthUrl } from '../../auth/authSession';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import {
  GoogleLogo,
  LinkedInLogo,
  InstitutionOidcIcon,
  InstitutionSamlIcon,
} from './AuthProviderIcons';

export default function AuthOAuthStack({ mode = 'login', returnUrl, inviteToken }) {
  const { info } = useNotificationActions();
  const [providers, setProviders] = useState([]);

  const googleAuthUrl = buildApiUrl('/api/auth/google');
  const linkedinAuthUrl = buildApiUrl('/api/auth/linkedin');
  const invitePath = inviteToken
    ? buildAuthUrl({ mode: 'signup', returnUrl, inviteToken })
    : null;

  useEffect(() => {
    AuthApi.fetchIdentityProviders().then((result) => {
      if (result.ok && Array.isArray(result.data?.providers)) {
        setProviders(result.data.providers);
      }
    });
  }, []);

  const pingSso = async (path, label) => {
    try {
      const response = await apiFetch(path);
      const data = await response.json().catch(() => ({}));
      info(label, data?.message || 'SSO is not configured for this deployment.');
    } catch {
      info('Unavailable', `${label} is not available right now.`);
    }
  };

  const configuredProviders = providers.filter((provider) => provider.status === 'configured');

  return (
    <div className="auth-oauth-stack" aria-label="Sign-in options">
      <a className="auth-oauth-btn" href={googleAuthUrl}>
        <span className="auth-oauth-btn__brand" aria-hidden>
          <GoogleLogo size={22} />
        </span>
        <span className="auth-oauth-btn__label">
          {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
        </span>
      </a>
      <a className="auth-oauth-btn" href={linkedinAuthUrl}>
        <span className="auth-oauth-btn__brand" aria-hidden>
          <LinkedInLogo size={22} />
        </span>
        <span className="auth-oauth-btn__label">
          {mode === 'signup' ? 'Sign up with LinkedIn' : 'Sign in with LinkedIn'}
        </span>
      </a>

      <p className="auth-divider">Institution</p>
      {configuredProviders.length > 0 ? (
        configuredProviders.map((provider) => (
          <a
            key={provider.id}
            className="auth-oauth-btn"
            href={buildApiUrl(provider.entryUrl || `/api/auth/${provider.id}`)}
          >
            <span className="auth-oauth-btn__brand" aria-hidden>
              <InstitutionOidcIcon size={22} />
            </span>
            <span className="auth-oauth-btn__label">Sign in with {provider.label}</span>
          </a>
        ))
      ) : (
        <>
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
        </>
      )}

      <Link className="auth-oauth-btn auth-oauth-btn--link" to={invitePath || '/auth/invite'}>
        <span className="auth-oauth-btn__label">Join with workspace invite</span>
      </Link>
    </div>
  );
}

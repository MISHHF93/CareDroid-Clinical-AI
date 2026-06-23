import { apiFetchJson } from './apiClient';

async function requestJson(path: string, options: RequestInit = {}) {
  const { response, data } = await apiFetchJson(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return {
    ok: response.ok,
    data: data as Record<string, unknown>,
    message: (data?.message as string) || '',
  };
}

export const AuthApi = {
  forgotPassword(email: string) {
    return requestJson('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, password: string) {
    return requestJson('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  verifyEmail(token: string) {
    return requestJson(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  },

  verifyMagicLink(token: string) {
    return requestJson(`/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`);
  },

  fetchIdentityProviders() {
    return requestJson('/api/auth/identity-providers');
  },

  previewWorkspaceInvitation(token: string) {
    return requestJson(`/api/workspaces/invitations/${encodeURIComponent(token)}`);
  },

  acceptWorkspaceInvitation(token: string, accessToken: string) {
    return requestJson(`/api/workspaces/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};

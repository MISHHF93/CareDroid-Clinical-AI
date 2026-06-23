import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/button';
import Input from '../ui/input';
import { apiFetch, apiFetchJson } from '../../services/apiClient';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import AuthOAuthStack from './AuthOAuthStack';

export default function AuthSignInPanel({
  onAuthSuccess,
  onRequiresTwoFactor,
  returnUrl,
  inviteToken,
}) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [magicEmail, setMagicEmail] = useState('');
  const { success, error } = useNotificationActions();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const { response, data } = await apiFetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Authentication failed');
      }

      if (data?.requiresTwoFactor) {
        onRequiresTwoFactor?.({
          userId: data.userId,
          twoFactorChallengeToken: data.twoFactorChallenge || data.challengeToken || '',
        });
        return;
      }

      if (data?.accessToken) {
        onAuthSuccess?.(data.accessToken, data.user);
      }
    } catch {
      error('Sign-in failed', 'Check your email and password, then try again.');
    }
  };

  const handleMagicLink = async (event) => {
    event.preventDefault();
    if (!magicEmail.trim()) return;

    try {
      const response = await apiFetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: magicEmail.trim() }),
      });
      if (!response.ok) throw new Error('Magic link failed');
      success('Check your email', 'We sent a sign-in link if the address is recognized.');
    } catch {
      error('Could not send link', 'Try again or use email and password.');
    }
  };

  return (
    <>
      <AuthOAuthStack mode="login" returnUrl={returnUrl} inviteToken={inviteToken} />

      <p className="auth-or-divider" role="presentation">
        <span>or use email</span>
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />
        <div className="auth-form__row">
          <Link className="auth-text-btn" to="/auth/forgot-password">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="auth-form__submit">
          Sign in
        </Button>
      </form>

      <section className="auth-magic" aria-label="Magic link sign-in">
        <p className="auth-divider">Magic link</p>
        <form className="auth-row-inline" onSubmit={handleMagicLink}>
          <Input
            type="email"
            placeholder="Work email"
            value={magicEmail}
            onChange={(event) => setMagicEmail(event.target.value)}
            autoComplete="email"
          />
          <Button type="submit">Send link</Button>
        </form>
      </section>
    </>
  );
}

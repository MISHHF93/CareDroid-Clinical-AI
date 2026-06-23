import React, { useState } from 'react';
import Button from '../ui/button';
import Input from '../ui/input';
import { apiFetchJson } from '../../services/apiClient';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import AuthOAuthStack from './AuthOAuthStack';

export default function AuthSignUpPanel({ onAuthSuccess, returnUrl, inviteToken }) {
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const { success, error } = useNotificationActions();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const { response, data } = await apiFetchJson('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.name,
        }),
      });

      if (!response.ok) {
        throw new Error(data?.message || 'Registration failed');
      }

      if (data?.accessToken) {
        onAuthSuccess?.(data.accessToken, data.user);
        return;
      }

      success(
        'Registration complete',
        'Check your email to verify your account, then sign in. Your role will be assigned by an administrator.',
      );
    } catch (err) {
      error('Sign-up failed', err?.message || 'Unable to create your account.');
    }
  };

  return (
    <>
      <AuthOAuthStack mode="signup" returnUrl={returnUrl} inviteToken={inviteToken} />

      <p className="auth-or-divider" role="presentation">
        <span>or use email</span>
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Full name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
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
          autoComplete="new-password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />
        <p className="auth-panel__hint">
          Your clinical role is assigned by your organization administrator after sign-up.
        </p>
        <Button type="submit" className="auth-form__submit">
          Create account
        </Button>
      </form>
    </>
  );
}

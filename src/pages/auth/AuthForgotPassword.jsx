import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthApi } from '../../services/authApi';
import { buildAuthUrl } from '../../auth/authSession';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import '../Auth.css';

export default function AuthForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { success, error } = useNotificationActions();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await AuthApi.forgotPassword(email.trim());
    if (result.ok) {
      setSubmitted(true);
      success('Check your email', 'If an account exists, a reset link has been sent.');
      return;
    }
    error('Request failed', result.message || 'Unable to send reset email.');
  };

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and we will send a password reset link."
      footerExtra={
        <Link className="auth-text-btn" to={CANONICAL_ROUTES.auth}>
          ← Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <p className="auth-panel__hint">
          If an account exists for <strong>{email}</strong>, you will receive a reset link shortly.
        </p>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <Button type="submit" className="auth-form__submit">
            Send reset link
          </Button>
        </form>
      )}
      <p className="auth-panel__hint">
        Remember your password?{' '}
        <Link to={buildAuthUrl()}>Sign in</Link>
      </p>
    </AuthLayout>
  );
}

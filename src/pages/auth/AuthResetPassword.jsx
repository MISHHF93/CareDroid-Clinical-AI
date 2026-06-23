import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthApi } from '../../services/authApi';
import { buildAuthUrl } from '../../auth/authSession';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import '../Auth.css';

export default function AuthResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { success, error } = useNotificationActions();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      error('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      error('Passwords do not match', 'Confirm your new password.');
      return;
    }

    const result = await AuthApi.resetPassword(token, password);
    if (!result.ok) {
      error('Reset failed', result.message || 'Invalid or expired reset link.');
      return;
    }

    success('Password updated', 'You can now sign in with your new password.');
    navigate(buildAuthUrl(), { replace: true });
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="Request a new password reset email.">
        <Link to="/auth/forgot-password">Request reset link</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" subtitle="Choose a new password for your account.">
      <form className="auth-form" onSubmit={handleSubmit}>
        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <Input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <Button type="submit" className="auth-form__submit">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}

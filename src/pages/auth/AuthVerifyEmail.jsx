import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthApi } from '../../services/authApi';
import { buildAuthUrl } from '../../auth/authSession';
import { useSearchParams } from 'react-router-dom';
import '../Auth.css';

export default function AuthVerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    AuthApi.verifyEmail(token).then((result) => {
      if (result.ok) {
        setStatus('success');
        setMessage('Your email has been verified. You can now sign in.');
        return;
      }
      setStatus('error');
      setMessage(result.message || 'Verification link is invalid or expired.');
    });
  }, [token]);

  return (
    <AuthLayout
      title={status === 'success' ? 'Email verified' : 'Email verification'}
      subtitle={
        status === 'loading'
          ? 'Confirming your email address…'
          : message
      }
    >
      {status !== 'loading' ? (
        <p className="auth-panel__hint">
          <Link to={buildAuthUrl()}>Continue to sign in</Link>
        </p>
      ) : null}
    </AuthLayout>
  );
}

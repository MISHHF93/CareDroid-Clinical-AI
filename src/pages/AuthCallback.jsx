import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { useUser } from '../contexts/UserContext';

/**
 * OAuth completes with ?token=... on this route (backend redirects to FRONTEND_URL/auth-callback).
 * Manual paste remains for troubleshooting.
 */
const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthToken } = useUser();
  const { info } = useNotificationActions();
  const initialToken = params.get('token') || '';
  const [token, setToken] = useState(initialToken);
  const autoHandled = useRef(false);

  useEffect(() => {
    const fromUrl = params.get('token');
    if (!fromUrl || autoHandled.current) return;
    autoHandled.current = true;
    setAuthToken(fromUrl);
    navigate('/home', { replace: true });
  }, [params, setAuthToken, navigate]);

  const handleSave = () => {
    const trimmed = token.trim();
    if (!trimmed) {
      info('Token required', 'Paste an access token to continue.');
      return;
    }
    setAuthToken(trimmed);
    navigate('/home', { replace: true });
  };

  if (initialToken) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <Card style={{ width: '100%', maxWidth: '480px' }}>
          <h2 style={{ marginTop: 0 }}>Completing sign-in…</h2>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>You will be redirected to Home.</p>
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
        <Button onClick={handleSave} style={{ marginTop: '14px' }}>
          Save token
        </Button>
        <div style={{ marginTop: '18px', fontSize: '12px', color: 'var(--muted-text)' }}>
          <Link to="/assistant" style={{ color: '#00FF88', textDecoration: 'none' }}>
            ← Back to Assistant
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default AuthCallback;

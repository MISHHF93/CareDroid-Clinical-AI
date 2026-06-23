import React from 'react';
import Button from '../ui/button';
import { createDevAuthSession, isDevAuthBypassEnabled } from '../../auth/devAuthBypass';
import { useNotificationActions } from '../../hooks/useNotificationActions';
import logger from '../../utils/logger';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';

export default function AuthDevBypassSection({ onAuthSuccess, compact = false }) {
  const enableDevAuthBypass = isDevAuthBypassEnabled();
  const { error, info } = useNotificationActions();

  if (!enableDevAuthBypass) return null;

  const handleDirectSignIn = async () => {
    try {
      const session = await createDevAuthSession();
      onAuthSuccess?.(session.token, session.user);
      info(
        'Signing in',
        session.backendBacked
          ? 'Platform access started with API support.'
          : 'Platform access started with local UI data while backend APIs are unavailable.',
      );
    } catch (err) {
      logger.error('Platform access failed', { err });
      error('Platform access failed', 'Unable to start the platform access session.');
    }
  };

  return (
    <section
      className={`auth-dev-oneclick${compact ? ' auth-dev-oneclick--compact' : ''}`}
      aria-label="Platform access"
    >
      <p className="auth-division-tag">Platform access</p>
      <Button
        type="button"
        variant="success"
        size="lg"
        onClick={handleDirectSignIn}
        leftIcon={<NavIcon icon={CHROME_ICONS.zap} size={20} aria-hidden />}
      >
        Enter Platform
      </Button>
      <p className="auth-dev-oneclick__hint">
        Uses a clinician access session and routes into the same app shell as every other sign-in
        method.
      </p>
    </section>
  );
}

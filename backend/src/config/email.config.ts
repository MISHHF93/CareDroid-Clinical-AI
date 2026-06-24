import { registerAs } from '@nestjs/config';
import { getEnvironmentConfig } from './environment.config';

export default registerAs('email', () => {
  const config = getEnvironmentConfig();

  return {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: {
      name: 'CareDroid',
      address: process.env.SMTP_FROM_EMAIL || 'noreply@caredroid.health',
    },
    templates: {
      verification: {
        subject: 'Verify your email - CareDroid',
        expiryMinutes: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY || '60', 10),
      },
      passwordReset: {
        subject: 'Reset your password - CareDroid',
        expiryMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRY || '30', 10),
      },
      twoFactorCode: {
        subject: 'Your two-factor authentication code',
      },
    },
    frontendUrl: config.server.frontendUrl,
  };
});

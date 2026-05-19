import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  issuer: 'caredroid-api',
  audience: 'caredroid-app',
}));

export const oauthConfig = registerAs('oauth', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackUrl:
      process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3000/api/auth/linkedin/callback',
    scope: ['r_liteprofile', 'r_emailaddress'],
  },
}));

export const sessionConfig = registerAs('session', () => ({
  idleTimeout: parseInt(process.env.SESSION_IDLE_TIMEOUT || '1800000', 10), // 30 min
  absoluteTimeout: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT || '28800000', 10), // 8 hours
}));

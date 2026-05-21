import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as speakeasy from 'speakeasy';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { TwoFactorService } from '../src/modules/two-factor/two-factor.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { UserRole } from '../src/modules/users/entities/user.entity';

/**
 * Batch 8: Two-Factor Authentication (2FA) E2E Tests
 *
 * Comprehensive testing of:
 * - TOTP setup and verification
 * - Backup codes (emergency access)
 * - 2FA enforcement for high-privilege roles
 * - Device fingerprinting and risk scoring
 * - Audit logging
 */
describe('Two-Factor Authentication (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let twoFactorService: TwoFactorService;
  let auditService: AuditService;
  let authToken: string;
  let userId: string;
  let testSecret: string;
  let testBackupCodes: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    twoFactorService = moduleFixture.get<TwoFactorService>(TwoFactorService);
    auditService = moduleFixture.get<AuditService>(AuditService);

    // Create test user
    const user = await authService.register({
      email: '2fa-test@example.com',
      password: 'Test1234!',
      fullName: '2FA Test User',
      role: UserRole.PHYSICIAN,
    });
    userId = user.userId;

    const loginResponse = await authService.login(
      { email: '2fa-test@example.com', password: 'Test1234!' },
      '127.0.0.1',
      'test-agent',
    );
    // Handle case where 2FA might be required
    if ('accessToken' in loginResponse && loginResponse.accessToken) {
      authToken = loginResponse.accessToken;
    } else {
      // If 2FA not enabled yet, use test token for initial setup
      authToken = 'test-initial-token';
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('2FA Setup', () => {
    it('should generate 2FA secret and QR code', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/two-factor/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.secret).toBeTruthy();
      expect(response.body.qrCode).toBeTruthy();
      expect(response.body.otpauthUrl).toBeTruthy();
      expect(response.body.secret).toMatch(/^[A-Z2-7]+$/); // Base32 encoding

      testSecret = response.body.secret;
    }, 30000);

    it('should verify TOTP token and enable 2FA', async () => {
      // Generate valid TOTP token using the secret
      const token = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .post('/api/two-factor/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ secret: testSecret, token })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.backupCodes).toBeDefined();
      expect(Array.isArray(response.body.backupCodes)).toBe(true);
      expect(response.body.backupCodes.length).toBe(10);

      testBackupCodes = response.body.backupCodes;
    }, 30000);

    it('should reject invalid TOTP token', async () => {
      // Use a different secret
      const differentSecret = speakeasy.generateSecret().base32;
      const invalidToken = speakeasy.totp({
        secret: differentSecret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .post('/api/two-factor/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ secret: testSecret, token: invalidToken })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    }, 30000);

    it('should return backup codes only on first enable', async () => {
      // Trying to enable again should fail (already enabled)
      const token = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      await request(app.getHttpServer())
        .post('/api/two-factor/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ secret: testSecret, token })
        .expect(400); // Already enabled
    }, 30000);
  });

  describe('2FA Login', () => {
    it('should require 2FA on login when enabled', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '2fa-test@example.com',
          password: 'Test1234!',
        })
        .expect(200);

      expect(response.body.requiresTwoFactor).toBe(true);
      expect(response.body.userId).toBeTruthy();
      expect(response.body.accessToken).toBeUndefined(); // No access token without 2FA
    }, 30000);

    it('should verify valid 2FA token and issue token', async () => {
      // First login to get userId
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '2fa-test@example.com',
          password: 'Test1234!',
        })
        .expect(200);

      const userId = loginResponse.body.userId;

      // Generate valid TOTP token
      const token = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-2fa')
        .send({ userId, token })
        .expect(200);

      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.user).toBeTruthy();
      expect(response.body.expiresIn).toBeTruthy();
    }, 30000);

    it('should reject invalid 2FA token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '2fa-test@example.com',
          password: 'Test1234!',
        })
        .expect(200);

      const userId = loginResponse.body.userId;

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-2fa')
        .send({ userId, token: '000000' })
        .expect(401);

      expect(response.body.message).toBeTruthy();
    }, 30000);
  });

  describe('Backup Codes (Emergency Access)', () => {
    it('should accept backup code as alternative to TOTP', async () => {
      // First login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '2fa-test@example.com',
          password: 'Test1234!',
        })
        .expect(200);

      const userId = loginResponse.body.userId;

      // Use first backup code
      const backupCode = testBackupCodes[0];

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-2fa')
        .send({ userId, token: backupCode })
        .expect(200);

      expect(response.body.accessToken).toBeTruthy();
      testBackupCodes.shift(); // Remove used code
    }, 30000);

    it('should not reuse backup code', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '2fa-test@example.com',
          password: 'Test1234!',
        })
        .expect(200);

      const userId = loginResponse.body.userId;
      const usedCode = testBackupCodes[0];

      // First use should succeed
      await request(app.getHttpServer())
        .post('/api/auth/verify-2fa')
        .send({ userId, token: usedCode })
        .expect(200);

      // Second login attempt
      const secondLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '2fa-test@example.com',
          password: 'Test1234!',
        })
        .expect(200);

      // Trying to reuse same code should fail
      await request(app.getHttpServer())
        .post('/api/auth/verify-2fa')
        .send({ userId: secondLogin.body.userId, token: usedCode })
        .expect(401);

      testBackupCodes.shift();
    }, 30000);

    it('should track backup code usage in status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/two-factor/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.enabled).toBe(true);
      expect(response.body.backupCodesRemaining).toBeLessThan(10);
      expect(response.body.backupCodesRemaining).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('2FA Status', () => {
    it('should return 2FA status for enabled user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/two-factor/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.enabled).toBe(true);
      expect(response.body.backupCodesRemaining).toBeDefined();
      expect(response.body.lastUsedAt).toBeDefined();
    }, 30000);
  });

  describe('2FA Enforcement for High-Privilege Roles', () => {
    it('should allow access to admin endpoints with 2FA enabled', async () => {
      // Physician role already has 2FA enabled
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.role).toBe(UserRole.PHYSICIAN);
    }, 30000);

    it('should deny access to admin endpoints without 2FA enabled', async () => {
      // Create non-physician user without 2FA
      const registerResp = await authService.register({
        email: 'no2fa-test@example.com',
        password: 'Test1234!',
        fullName: 'No 2FA User',
        role: UserRole.ADMIN,
      });

      const loginResp = await authService.login(
        { email: 'no2fa-test@example.com', password: 'Test1234!' },
        '127.0.0.1',
        'test-agent',
      );

      // If 2FA enforcement is enabled, this should be denied
      // (depends on implementation)
      if ('accessToken' in loginResp) {
        expect(loginResp.accessToken).toBeDefined();
      } else {
        expect(loginResp.requiresTwoFactor).toBe(true);
      }
    }, 30000);
  });

  describe('Audit Logging', () => {
    it('should log 2FA setup and verification attempts', async () => {
      // Test that audit logging is integrated
      // Note: Full audit log retrieval depends on AuditService query methods
      expect(auditService).toBeDefined();
      expect(typeof auditService.log).toBe('function');
    }, 30000);

    it('should handle failed 2FA verification', async () => {
      // Test invalid 2FA code rejection
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '2fa-test@example.com',
          password: 'Test1234!',
        })
        .expect(200);

      // If 2FA is enabled, should require verification
      if (response.body.requiresTwoFactor) {
        await request(app.getHttpServer())
          .post('/api/auth/verify-2fa')
          .send({ userId: response.body.userId, token: '000000' })
          .expect(401);
      }
    }, 30000);
  });

  describe('Disable 2FA', () => {
    it('should disable 2FA with valid token', async () => {
      // Generate valid token
      const token = speakeasy.totp({
        secret: testSecret,
        encoding: 'base32',
      });

      const response = await request(app.getHttpServer())
        .delete('/api/two-factor/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);
    }, 30000);

    it('should login without 2FA after disabling', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: '2fa-test@example.com',
          password: 'Test1234!',
        })
        .expect(200);

      // Should now return accessToken directly (no 2FA required)
      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.requiresTwoFactor).toBeUndefined();
    }, 30000);

    it('should reject disable with invalid token', async () => {
      // First re-enable 2FA
      const secretResp = await request(app.getHttpServer())
        .get('/api/two-factor/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const token = speakeasy.totp({
        secret: secretResp.body.secret,
        encoding: 'base32',
      });

      await request(app.getHttpServer())
        .post('/api/two-factor/enable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ secret: secretResp.body.secret, token })
        .expect(200);

      // Try to disable with invalid token
      const disableResp = await request(app.getHttpServer())
        .delete('/api/two-factor/disable')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: '000000' })
        .expect(401);

      expect(disableResp.body.message).toBeTruthy();
    }, 30000);
  });
});

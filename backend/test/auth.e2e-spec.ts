import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module';
import { jwtConfig, oauthConfig, sessionConfig } from '../src/config/auth.config';
import { User } from '../src/modules/users/entities/user.entity';
import { UserProfile } from '../src/modules/users/entities/user-profile.entity';
import { OAuthAccount } from '../src/modules/users/entities/oauth-account.entity';
import { Subscription } from '../src/modules/subscriptions/entities/subscription.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { TwoFactor } from '../src/modules/two-factor/entities/two-factor.entity';
import { BiometricConfig } from '../src/modules/auth/entities/biometric-config.entity';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [jwtConfig, oauthConfig, sessionConfig],
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            User,
            UserProfile,
            OAuthAccount,
            Subscription,
            AuditLog,
            TwoFactor,
            BiometricConfig,
          ],
          synchronize: true,
          logging: false,
        }),
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test${Date.now()}@example.com`,
          password: 'Password123!',
          fullName: 'E2E Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('userId');
          expect(res.body).toHaveProperty('email');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
        })
        .expect(400);
    });

    it('should fail with weak password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    const testUser = {
      email: `login${Date.now()}@example.com`,
      password: 'Password123!',
      fullName: 'Login Test User',
    };

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(testUser);
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(testUser)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;

    beforeAll(async () => {
      const user = {
        email: `me${Date.now()}@example.com`,
        password: 'Password123!',
        fullName: 'Me Test User',
      };
      await request(app.getHttpServer()).post('/auth/register').send(user);

      const loginRes = await request(app.getHttpServer()).post('/auth/login').send(user);
      accessToken = loginRes.body.accessToken;
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });
});

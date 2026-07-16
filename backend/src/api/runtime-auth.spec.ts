import express from 'express';
import request from 'supertest';
import type { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { Permission } from '../modules/auth/enums/permission.enum';
import { User, UserRole } from '../modules/users/entities/user.entity';
import {
  createLegacyApiAuthMiddleware,
  createRuntimeJwtAuthenticator,
  createSocketJwtAuthMiddleware,
  type RuntimeJwtAuthenticator,
} from './runtime-auth';
describe('runtime authentication', () => {
  it('verifies access tokens and reloads the active user', async () => {
    const verifyAsync = jest.fn().mockResolvedValue({ sub: 'user-1', tokenUse: 'access' });
    const findOne = jest
      .fn()
      .mockResolvedValue({ id: 'user-1', role: UserRole.PHYSICIAN, isActive: true });
    const authenticate = createRuntimeJwtAuthenticator(
      { verifyAsync } as unknown as JwtService,
      {
        get: jest.fn().mockReturnValue({
          secret: 'test-secret',
          issuer: 'caredroid-api',
          audience: 'caredroid-app',
        }),
      } as unknown as ConfigService,
      { findOne } as unknown as Repository<User>,
    );
    await expect(authenticate('Bearer signed-token')).resolves.toMatchObject({
      id: 'user-1',
      role: UserRole.PHYSICIAN,
    });
    expect(verifyAsync).toHaveBeenCalledWith(
      'signed-token',
      expect.objectContaining({ issuer: 'caredroid-api', audience: 'caredroid-app' }),
    );
  });
  it('requires PHI permissions on legacy Express routes', async () => {
    const studentAuthenticator: RuntimeJwtAuthenticator = jest
      .fn()
      .mockResolvedValue({ id: 'student-1', role: UserRole.STUDENT, isActive: true });
    const app = express();
    app.use(createLegacyApiAuthMiddleware(studentAuthenticator));
    app.get('/patients', (_req, res) => res.json({ status: 'ok' }));
    await request(app).get('/patients').set('Authorization', 'Bearer token').expect(403);
  });
  it('accepts socket auth tokens only for permitted users', async () => {
    const authenticate: RuntimeJwtAuthenticator = jest
      .fn()
      .mockResolvedValue({ id: 'nurse-1', role: UserRole.NURSE, isActive: true });
    const socket = {
      handshake: { auth: { token: 'signed-token' }, headers: {} },
      data: {},
    } as unknown as Socket;
    const next = jest.fn();
    await createSocketJwtAuthMiddleware(authenticate, Permission.READ_PHI)(socket, next);
    expect(authenticate).toHaveBeenCalledWith('Bearer signed-token');
    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user).toEqual({ id: 'nurse-1', role: UserRole.NURSE });
  });
});

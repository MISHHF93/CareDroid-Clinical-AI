import type { Request, RequestHandler } from 'express';
import type { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { Permission } from '../modules/auth/enums/permission.enum';
import { hasPermission } from '../modules/auth/config/role-permissions.config';
import { User } from '../modules/users/entities/user.entity';

type RuntimeJwtPayload = {
  sub?: string;
  tokenUse?: string;
};

export type RuntimeAuthenticatedUser = Pick<User, 'id' | 'role' | 'isActive'>;
export type RuntimeJwtAuthenticator = (
  authorization: string | string[] | undefined,
) => Promise<RuntimeAuthenticatedUser>;

export function createRuntimeJwtAuthenticator(
  jwtService: JwtService,
  configService: ConfigService,
  userRepository: Repository<User>,
): RuntimeJwtAuthenticator {
  const jwtConfig = configService.get<{
    secret: string;
    issuer: string;
    audience: string;
  }>('jwt');

  if (!jwtConfig?.secret || !jwtConfig.issuer || !jwtConfig.audience) {
    throw new Error('JWT runtime configuration is incomplete.');
  }

  return async (authorization) => {
    const rawAuthorization = Array.isArray(authorization) ? authorization[0] : authorization;
    const match = rawAuthorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match) {
      throw new Error('Authentication required.');
    }

    const payload = await jwtService.verifyAsync<RuntimeJwtPayload>(match[1], {
      secret: jwtConfig.secret,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    if (!payload.sub || payload.tokenUse !== 'access') {
      throw new Error('Invalid access token.');
    }

    const user = await userRepository.findOne({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!user?.isActive) {
      throw new Error('Invalid access token.');
    }

    return user;
  };
}

export function createLegacyApiAuthMiddleware(
  authenticate: RuntimeJwtAuthenticator,
): RequestHandler {
  return async (request: Request, response, next) => {
    try {
      const user = await authenticate(request.headers.authorization);
      const requiredPermission = ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
        ? Permission.READ_PHI
        : Permission.WRITE_PHI;

      if (!hasPermission(user.role, requiredPermission)) {
        response.status(403).json({ error: 'Insufficient permissions.' });
        return;
      }

      const authenticatedRequest = request as Request & {
        user?: RuntimeAuthenticatedUser;
      };
      authenticatedRequest.user = user;
      next();
    } catch {
      response.status(401).json({ error: 'Authentication required.' });
    }
  };
}

export function createSocketJwtAuthMiddleware(
  authenticate: RuntimeJwtAuthenticator,
  requiredPermission: Permission,
) {
  return async (socket: Socket, next: (error?: Error) => void) => {
    try {
      const auth = socket.handshake.auth as Record<string, unknown>;
      const authToken = typeof auth.token === 'string' ? auth.token : '';
      const authorization = authToken
        ? authToken.replace(/^(?!Bearer )/i, 'Bearer ')
        : socket.handshake.headers.authorization;
      const user = await authenticate(authorization);

      if (!hasPermission(user.role, requiredPermission)) {
        next(new Error('Insufficient permissions.'));
        return;
      }

      socket.data.user = {
        id: user.id,
        role: user.role,
      };
      next();
    } catch {
      next(new Error('Authentication required.'));
    }
  };
}

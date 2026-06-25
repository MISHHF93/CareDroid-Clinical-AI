import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtQueryAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const bearer =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length)
        : '';
    const queryToken = typeof request.query?.token === 'string' ? request.query.token : '';
    const token = bearer || queryToken;

    if (!token) {
      throw new UnauthorizedException('Missing access token for realtime stream.');
    }

    try {
      const payload = this.jwtService.verify(token, {
        ignoreExpiration: false,
      }) as { tokenUse?: string };

      if (payload.tokenUse && payload.tokenUse !== 'access') {
        throw new UnauthorizedException('Invalid token type for realtime stream.');
      }

      (request as Request & { user?: unknown }).user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}

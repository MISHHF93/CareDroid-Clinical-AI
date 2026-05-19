import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { TwoFactorService } from '../../two-factor/two-factor.service';

/**
 * TwoFactorEnforcementGuard
 *
 * Enforces 2FA for high-privilege roles (admin, physician)
 * Can be applied at controller or method level with decorator:
 * @TwoFactorRequired(['admin', 'physician'])
 */
@Injectable()
export class TwoFactorEnforcementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from decorator
    const requiredRoles = this.reflector.get<string[]>('twoFactorRequired', context.getHandler());

    if (!requiredRoles) {
      return true; // No 2FA requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if user has a role that requires 2FA
    const userRoleRequires2FA = requiredRoles.some((role) => user.role === role);

    if (!userRoleRequires2FA) {
      return true; // User role doesn't require 2FA
    }

    // Get 2FA status
    const twoFactorStatus = await this.twoFactorService.getStatus(user.id);

    if (!twoFactorStatus.enabled) {
      throw new UnauthorizedException(
        '2FA is required for your role. Please enable it in your security settings.',
      );
    }

    return true;
  }
}

/**
 * Decorator to mark endpoints that require 2FA for certain roles
 * Usage: @TwoFactorRequired(['admin', 'physician'])
 */
export const TwoFactorRequired = (roles: UserRole[]) => SetMetadata('twoFactorRequired', roles);

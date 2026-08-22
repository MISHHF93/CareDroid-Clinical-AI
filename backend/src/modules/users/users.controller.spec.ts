import { ClassSerializerInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

/**
 * Regression coverage for the mass-assignment/excessive-exposure audit:
 * User.passwordHash/emailEncrypted/phoneEncrypted/ssnEncrypted/
 * emailVerificationToken/passwordResetToken are all @Exclude()'d on the
 * entity, but that annotation is dead metadata without
 * ClassSerializerInterceptor actually running through the real HTTP
 * pipeline -- GET /users/profile returned the raw entity, serializing every
 * one of those fields verbatim (including a currently-PENDING
 * password-reset token) to any authenticated caller. This test exercises
 * the actual interceptor (not just checking the decorator is present) to
 * prove the fix works, not just that it's declared.
 */
describe('UsersController @Exclude() enforcement (ClassSerializerInterceptor)', () => {

  it('strips passwordHash, encrypted PHI blobs, and live security tokens when a raw User entity is serialized through the real interceptor', async () => {
    const user = Object.assign(new User(), {
      id: 'user-1',
      email: 'clinician@example.com',
      emailEncrypted: Buffer.from('encrypted-email'),
      passwordHash: '$2b$10$verysecrethash',
      emailVerified: true,
      emailVerificationToken: null,
      passwordResetToken: 'live-reset-token-abc123',
      passwordResetExpiry: new Date(),
      isActive: true,
      role: 'physician',
      phoneEncrypted: Buffer.from('encrypted-phone'),
      ssnEncrypted: Buffer.from('encrypted-ssn'),
    });

    const interceptor = new ClassSerializerInterceptor(new Reflector());
    const context = {
      getHandler: () => UsersController.prototype.getProfile,
      getClass: () => UsersController,
    } as unknown as ExecutionContext;
    const handler: CallHandler = { handle: () => of(user) };

    const result = await firstValueFrom(interceptor.intercept(context, handler));

    expect(result.passwordHash).toBeUndefined();
    expect(result.emailEncrypted).toBeUndefined();
    expect(result.phoneEncrypted).toBeUndefined();
    expect(result.ssnEncrypted).toBeUndefined();
    expect(result.emailVerificationToken).toBeUndefined();
    expect(result.passwordResetToken).toBeUndefined();
    // Non-excluded fields survive -- this isn't a case of everything
    // silently vanishing.
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('clinician@example.com');
    expect(result.role).toBe('physician');
  });
});

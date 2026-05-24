import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly auditService: AuditService,
  ) {}

  async findById(
    id: string,
    requestingUserId?: string,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
  ) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile', 'subscription'],
    });

    // Log profile access (PHI)
    if (requestingUserId && user) {
      await this.auditService.log({
        userId: requestingUserId,
        action: AuditAction.PHI_ACCESS,
        resource: `user/${id}/profile`,
        ipAddress,
        userAgent,
        phiAccessed: true,
        metadata: {
          accessType: 'profile_read',
          targetUserId: id,
          includedRelations: ['profile', 'subscription'],
        },
      });
    }

    return user;
  }

  async findByEmail(
    email: string,
    requestingUserId?: string,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
  ) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile', 'subscription'],
    });

    // Log profile access (PHI)
    if (requestingUserId && user) {
      await this.auditService.log({
        userId: requestingUserId,
        action: AuditAction.PHI_ACCESS,
        resource: `user/email-lookup`,
        ipAddress,
        userAgent,
        phiAccessed: true,
        metadata: {
          accessType: 'email_lookup',
          foundUserId: user.id,
        },
      });
    }

    return user;
  }

  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>,
    requestingUserId?: string,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
  ) {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const allowedFields: Array<keyof UserProfile> = [
      'fullName',
      'firstName',
      'lastName',
      'institution',
      'specialty',
      'licenseNumber',
      'country',
      'languagePreference',
      'timezone',
      'avatarUrl',
    ];
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates || {})
        .filter(
          ([key, value]) => allowedFields.includes(key as keyof UserProfile) && value !== undefined,
        )
        .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
    ) as Partial<UserProfile>;

    if (Object.keys(sanitizedUpdates).length === 0) {
      throw new BadRequestException('No supported profile fields were provided.');
    }

    const oldValues = { ...profile };
    Object.assign(profile, sanitizedUpdates);
    const savedProfile = await this.profileRepository.save(profile);

    // Log profile modification (PHI)
    if (requestingUserId) {
      await this.auditService.log({
        userId: requestingUserId,
        action: AuditAction.PROFILE_UPDATE,
        resource: `user/${userId}/profile`,
        ipAddress,
        userAgent,
        phiAccessed: true,
        metadata: {
          modifiedFields: Object.keys(sanitizedUpdates),
          changes: Object.entries(sanitizedUpdates).map(([key, newValue]) => ({
            field: key,
            oldValue: oldValues[key],
            newValue,
          })),
        },
      });
    }

    return savedProfile;
  }
}

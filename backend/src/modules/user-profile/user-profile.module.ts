import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { UserActivityModule } from '../user-activity/user-activity.module';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { UserPreference } from './entities/user-preference.entity';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, UserPreference, ProfessionalProfile]),
    AuditModule,
    WorkspacesModule,
    UserActivityModule,
    PersonalizationModule,
  ],
  controllers: [UserProfileController],
  providers: [UserProfileService],
  exports: [UserProfileService],
})
export class UserProfileModule {}

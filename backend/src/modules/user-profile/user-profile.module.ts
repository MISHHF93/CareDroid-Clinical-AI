import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { UserActivityModule } from '../user-activity/user-activity.module';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ActivityService } from './activity.service';
import { ProfessionalProfile } from './entities/professional-profile.entity';
import { UserPreferencesModule } from './user-preferences.module';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from './user-profile.service';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, ProfessionalProfile]),
    UserPreferencesModule,
    AuditModule,
    WorkspacesModule,
    UserActivityModule,
    PersonalizationModule,
  ],
  controllers: [UserProfileController],
  providers: [UserProfileService, WorkspaceService, ActivityService],
  exports: [UserProfileService, UserPreferencesModule, WorkspaceService, ActivityService],
})
export class UserProfileModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActivity } from './entities/user-activity.entity';
import { UserActivityController } from './user-activity.controller';
import { UserActivityService } from './user-activity.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserActivity])],
  controllers: [UserActivityController],
  providers: [UserActivityService],
  exports: [UserActivityService],
})
export class UserActivityModule {}

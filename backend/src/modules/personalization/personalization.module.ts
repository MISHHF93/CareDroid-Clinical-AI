import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedPrompt } from './entities/saved-prompt.entity';
import { UserAiPreference } from './entities/user-ai-preference.entity';
import { PersonalizationController } from './personalization.controller';
import { PersonalizationService } from './personalization.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserAiPreference, SavedPrompt])],
  controllers: [PersonalizationController],
  providers: [PersonalizationService],
  exports: [PersonalizationService],
})
export class PersonalizationModule {}

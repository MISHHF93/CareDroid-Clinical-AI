import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { UserActivityModule } from '../user-activity/user-activity.module';
import { ClinicalMemoryService } from './clinical-memory.service';
import { ClinicalMemoryEntry } from './entities/clinical-memory-entry.entity';
import { LongMemoryEntry } from './entities/long-memory-entry.entity';
import { ShortMemoryEntry } from './entities/short-memory-entry.entity';
import { LongMemoryService } from './long-memory.service';
import { MemoryFabricService } from './memory-fabric.service';
import { MemoryController } from './memory.controller';
import { ShortMemoryService } from './short-memory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShortMemoryEntry, LongMemoryEntry, ClinicalMemoryEntry]),
    ArtifactsModule,
    PersonalizationModule,
    PlatformAssetsModule,
    UserActivityModule,
  ],
  controllers: [MemoryController],
  providers: [ShortMemoryService, LongMemoryService, ClinicalMemoryService, MemoryFabricService],
  exports: [ShortMemoryService, LongMemoryService, ClinicalMemoryService, MemoryFabricService],
})
export class MemoryModule {}

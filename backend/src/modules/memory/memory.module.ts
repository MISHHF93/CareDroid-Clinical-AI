import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalMemoryService } from './clinical-memory.service';
import { ClinicalMemoryEntry } from './entities/clinical-memory-entry.entity';
import { LongMemoryEntry } from './entities/long-memory-entry.entity';
import { ShortMemoryEntry } from './entities/short-memory-entry.entity';
import { LongMemoryService } from './long-memory.service';
import { MemoryController } from './memory.controller';
import { ShortMemoryService } from './short-memory.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShortMemoryEntry, LongMemoryEntry, ClinicalMemoryEntry])],
  controllers: [MemoryController],
  providers: [ShortMemoryService, LongMemoryService, ClinicalMemoryService],
  exports: [ShortMemoryService, LongMemoryService, ClinicalMemoryService],
})
export class MemoryModule {}

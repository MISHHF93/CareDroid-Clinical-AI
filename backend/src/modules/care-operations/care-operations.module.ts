import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { EmergencyOsModule } from '../emergency-os/emergency-os.module';
import { CareTaskEntity } from './entities/care-task.entity';
import { CareOperationsService } from './care-operations.service';
import { CareOperationsController } from './care-operations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CareTaskEntity]), AuthModule, EmergencyOsModule],
  controllers: [CareOperationsController],
  providers: [CareOperationsService],
  exports: [CareOperationsService],
})
export class CareOperationsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SurfaceViewEntity } from './entities/surface-view.entity';
import { SurfaceViewsService } from './surface-views.service';
import { SurfaceViewsController } from './surface-views.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SurfaceViewEntity]), AuthModule],
  controllers: [SurfaceViewsController],
  providers: [SurfaceViewsService],
  exports: [SurfaceViewsService],
})
export class SurfaceViewsModule {}

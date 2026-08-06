import { Module } from '@nestjs/common';
import { AppNavigatorController } from './app-navigator.controller';
import { AppNavigatorService } from './app-navigator.service';

@Module({
  controllers: [AppNavigatorController],
  providers: [AppNavigatorService],
  exports: [AppNavigatorService],
})
export class AppNavigatorModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NativeAiController } from './native-ai.controller';
import { NativeAiService } from './native-ai.service';

@Module({
  imports: [AuthModule],
  controllers: [NativeAiController],
  providers: [NativeAiService],
  exports: [NativeAiService],
})
export class NativeAiModule {}

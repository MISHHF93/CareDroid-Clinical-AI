import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService } from './artifacts.service';
import { AssetRegistryService } from './asset-registry.service';
import { Artifact } from './entities/artifact.entity';
import { ArtifactVersion } from './entities/artifact-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Artifact, ArtifactVersion])],
  controllers: [ArtifactsController],
  providers: [ArtifactsService, AssetRegistryService],
  exports: [ArtifactsService, AssetRegistryService],
})
export class ArtifactsModule {}

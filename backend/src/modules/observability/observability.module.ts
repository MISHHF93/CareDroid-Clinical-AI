import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class ObservabilityService {
  constructor(private readonly platformGovernance: PlatformGovernanceService) {}

  async getSystemHealth() {
    const observability = await this.platformGovernance.recentObservability();
    return {
      frontendVersion: process.env.FRONTEND_VERSION || process.env.npm_package_version || 'local',
      backendVersion: process.env.BACKEND_VERSION || process.env.npm_package_version || 'local',
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'unknown',
      buildTimestamp: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
      apiHealth: 'ok',
      vercelEnvironment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'local',
      deploymentStatus: 'guarded',
      observability,
    };
  }
}

@Controller('system-health')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class ObservabilityController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get()
  @Permissions(Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY)
  getSystemHealth() {
    return this.observability.getSystemHealth();
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}

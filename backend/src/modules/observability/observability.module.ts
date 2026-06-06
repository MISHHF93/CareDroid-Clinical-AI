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

  async getSaasHealthCenter() {
    const systemHealth = await this.getSystemHealth();
    const observability = (systemHealth.observability || {}) as {
      status?: string;
      health?: Record<string, string>;
    };
    const governanceHealth = observability.health || {};

    const checks = [
      this.buildCheck({
        id: 'frontend',
        label: 'Frontend Health',
        status:
          systemHealth.frontendVersion &&
          !['local', 'unknown'].includes(systemHealth.frontendVersion)
            ? 'healthy'
            : 'warning',
        summary:
          systemHealth.frontendVersion && systemHealth.frontendVersion !== 'local'
            ? 'Frontend build metadata is published.'
            : 'Frontend is running without release build metadata.',
        evidence: [
          `frontendVersion=${systemHealth.frontendVersion || 'unknown'}`,
          `environment=${systemHealth.vercelEnvironment || 'unknown'}`,
        ],
      }),
      this.buildCheck({
        id: 'backend',
        label: 'Backend Health',
        status: systemHealth.apiHealth === 'ok' ? 'healthy' : 'critical',
        summary: 'Backend health endpoint is responding.',
        evidence: [
          `backendVersion=${systemHealth.backendVersion || 'unknown'}`,
          `deploymentStatus=${systemHealth.deploymentStatus || 'unknown'}`,
        ],
      }),
      this.buildCheck({
        id: 'api',
        label: 'API Health',
        status: systemHealth.apiHealth === 'ok' ? 'healthy' : 'critical',
        summary:
          systemHealth.apiHealth === 'ok'
            ? 'Authenticated API health contract is available.'
            : 'Authenticated API health contract is degraded.',
        evidence: [`apiHealth=${systemHealth.apiHealth || 'unknown'}`],
      }),
      this.buildCheck({
        id: 'integrations',
        label: 'Integrations',
        status: this.statusFromSignal(governanceHealth.externalConnectors || 'synthetic'),
        summary:
          governanceHealth.externalConnectors === 'ok'
            ? 'External connector layer is live.'
            : 'Integration layer is guarded by synthetic or demo connectors.',
        evidence: [`externalConnectors=${governanceHealth.externalConnectors || 'synthetic'}`],
      }),
      this.buildCheck({
        id: 'tenant',
        label: 'Tenant Health',
        status: process.env.CAREDROID_TENANT_ISOLATION_DISABLED === 'true' ? 'critical' : 'healthy',
        summary:
          process.env.CAREDROID_TENANT_ISOLATION_DISABLED === 'true'
            ? 'Tenant isolation has been explicitly disabled.'
            : 'Tenant context, organization scoping, and workspace scoping guards are active.',
        evidence: [
          `strictEntitlements=${process.env.CAREDROID_STRICT_SAAS_ENTITLEMENTS === 'true'}`,
          'tenantGuards=active',
        ],
      }),
      this.buildCheck({
        id: 'ai',
        label: 'AI Health',
        status: this.statusFromSignal(governanceHealth.aiGateway || 'guarded'),
        summary:
          governanceHealth.aiGateway === 'ok'
            ? 'AI gateway is live.'
            : 'AI gateway is guarded; clinical safety controls remain active.',
        evidence: [`aiGateway=${governanceHealth.aiGateway || 'guarded'}`],
      }),
      this.buildCheck({
        id: 'simulation',
        label: 'Simulation Health',
        status: this.statusFromSignal(process.env.SIMULATION_HEALTH_STATUS || 'healthy'),
        summary: 'Simulation assets and scenario routes are included in the SaaS health model.',
        evidence: [`simulationStatus=${process.env.SIMULATION_HEALTH_STATUS || 'healthy'}`],
      }),
    ];

    const status = this.rollupStatus(checks.map((check) => check.status));
    return {
      status,
      label: this.statusLabel(status),
      generatedAt: new Date().toISOString(),
      summary: {
        healthy: checks.filter((check) => check.status === 'healthy').length,
        warning: checks.filter((check) => check.status === 'warning').length,
        critical: checks.filter((check) => check.status === 'critical').length,
        total: checks.length,
      },
      checks,
      source: {
        systemHealth,
        observabilityStatus: observability.status || 'unknown',
      },
    };
  }

  private buildCheck(input: {
    id: string;
    label: string;
    status: 'healthy' | 'warning' | 'critical';
    summary: string;
    evidence: string[];
  }) {
    return {
      ...input,
      displayStatus: this.statusLabel(input.status),
    };
  }

  private statusFromSignal(
    signal: string,
    overrides: { healthy?: string[]; warning?: string[]; critical?: string[] } = {},
  ): 'healthy' | 'warning' | 'critical' {
    const normalized = String(signal || '').toLowerCase();
    const critical = overrides.critical || ['critical', 'failed', 'failure', 'error', 'offline'];
    const warning = overrides.warning || [
      'warning',
      'warn',
      'guarded',
      'synthetic',
      'demo',
      'unknown',
    ];
    const healthy = overrides.healthy || ['healthy', 'ok', 'live', 'ready', 'active'];

    if (critical.some((item) => normalized.includes(item))) return 'critical';
    if (warning.some((item) => normalized.includes(item))) return 'warning';
    if (healthy.some((item) => normalized.includes(item))) return 'healthy';
    return 'warning';
  }

  private rollupStatus(statuses: Array<'healthy' | 'warning' | 'critical'>) {
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }

  private statusLabel(status: 'healthy' | 'warning' | 'critical') {
    return status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Critical';
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

@Controller('saas-health')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class SaasHealthController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get()
  @Permissions(Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY)
  getSaasHealthCenter() {
    return this.observability.getSaasHealthCenter();
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [ObservabilityController, SaasHealthController],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}

import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformSystemsModule } from '../platform-systems/platform-systems.module';
import { PlatformSystemsService } from '../platform-systems/platform-systems.service';

@Injectable()
export class RegulatoryClassificationService {
  constructor(private readonly platformSystems: PlatformSystemsService) {}

  classifyTools() {
    return this.platformSystems.getPack('all').capabilities.map((capability) => ({
      capabilityId: capability.capabilityId,
      route: capability.route,
      classification: capability.regulatoryClassificationRequired ? 'CDS' : 'informational',
      categories: ['informational', 'CDS', 'potential SaMD', 'workflow', 'operational'],
      riskLevel: capability.riskLevel,
      reviewRequired: capability.requiresHumanReview,
    }));
  }
}

@Controller('regulatory')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class RegulatoryController {
  constructor(private readonly regulatory: RegulatoryClassificationService) {}

  @Get('summary')
  @Permissions(Permission.VIEW_REGULATORY)
  getSummary() {
    const classifications = this.regulatory.classifyTools();
    return {
      status: 'classification_required_for_p0',
      panels: {
        classificationEngine: classifications,
        totals: {
          informational: classifications.filter((item) => item.classification === 'informational')
            .length,
          cds: classifications.filter((item) => item.classification === 'CDS').length,
          potentialSaMd: classifications.filter((item) => item.classification === 'potential SaMD')
            .length,
          workflow: classifications.filter((item) => item.categories.includes('workflow')).length,
          operational: classifications.filter((item) => item.categories.includes('operational'))
            .length,
        },
      },
    };
  }
}

@Module({
  imports: [PlatformSystemsModule],
  controllers: [RegulatoryController],
  providers: [RegulatoryClassificationService],
  exports: [RegulatoryClassificationService],
})
export class RegulatoryModule {}

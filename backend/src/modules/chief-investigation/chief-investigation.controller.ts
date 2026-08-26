/**
 * Chief Investigation Controller
 *
 * HTTP entry point for the first Agent Command Platform vertical slice:
 * a bounded "investigate this patient's deterioration" command. See
 * CLINICAL_AGENT_COMMAND_PLATFORM.md for the architecture this proves out.
 *
 * Autonomy boundary enforced here is identical to the service: LEVEL_0
 * (observe/calculate) + LEVEL_2 (prepare). No endpoint on this controller
 * can mutate clinical state — prepared actions surface as AiActionProposals
 * that require human approval through the existing /ai/action-proposals flow.
 */

import { Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantIsolationGuard } from '../tenant-context/tenant-isolation.guard';
import { TenantScoped, WorkspaceScoped } from '../tenant-context/tenant-scope.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ChiefInvestigationService } from './chief-investigation.service';

@ApiTags('chief-investigation')
@Controller('chief-investigation')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
@TenantScoped()
@ApiBearerAuth()
export class ChiefInvestigationController {
  constructor(private readonly chiefInvestigation: ChiefInvestigationService) {}

  @Post('deterioration/:patientId')
  @WorkspaceScoped({ permissions: [Permission.READ_PHI] })
  @ApiOperation({
    summary:
      'Run the deterministic deterioration investigation for a patient (OBSERVE + PREPARE only; no clinical mutation).',
  })
  @ApiResponse({ status: 201, description: 'Investigation run completed with truthful states and prepared actions.' })
  async runDeteriorationInvestigation(@Param('patientId') patientId: string, @Req() req: any) {
    return this.chiefInvestigation.runDeteriorationInvestigation({
      patientId,
      requestedByUserId: req.user.id,
      organizationId: req.tenantContext?.organizationId,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Get(':runId')
  @WorkspaceScoped({ permissions: [Permission.READ_PHI] })
  @ApiOperation({ summary: 'Retrieve a previously completed investigation run by id.' })
  @ApiResponse({ status: 200, description: 'Investigation run.' })
  getRun(@Param('runId') runId: string, @Req() req: any) {
    const run = this.chiefInvestigation.getRun(runId, req.tenantContext?.organizationId);
    if (!run) {
      throw new NotFoundException(`No investigation run found for id ${runId}`);
    }
    return run;
  }
}

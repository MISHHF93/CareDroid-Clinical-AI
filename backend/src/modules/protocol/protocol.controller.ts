import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ClinicalProtocolService } from '../../services/clinical-protocol.service';

// NAME COLLISION, NOT A ROUTE COLLISION (found 2026-08-12, repo-wide export-collision audit):
// `modules/clinical/protocol.controller.ts` also exports a class named `ProtocolController`,
// mounted at `/protocols` (plural) -- a genuinely different concept (content CRUD over
// ProtocolService) from this one (`/protocol`, singular, symptom/vitals-matching decision
// support). No behavior risk since NestJS routes on the decorated path not the class name, but
// an auto-import or a search for "ProtocolController" can land on the wrong file. See
// docs/architecture/CARE_DROID_MASTER_BACKLOG.md.
@ApiTags('protocol')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('protocol')
export class ProtocolController {
  constructor(private readonly protocolService: ClinicalProtocolService) {}

  @Get()
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Clinical protocol trigger service info' })
  info() {
    return {
      path: '/protocol',
      version: 'v1',
      description: 'clinical protocol triggers',
      status: 'active',
      protocols: this.protocolService.listProtocols(),
    };
  }

  @Get('health')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Clinical protocol service health' })
  health() {
    return this.protocolService.checkHealth();
  }

  @Get('evaluate')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Match clinical protocols against a chief complaint, flags, or vitals' })
  evaluate(
    @Query('chiefComplaint') chiefComplaint?: string,
    @Query('chief_complaint') chiefComplaintSnake?: string,
    @Query('flags') flagsRaw?: string,
    @Query('hr') hr?: string,
    @Query('sbp') sbp?: string,
    @Query('temp') temp?: string,
    @Query('spo2') spo2?: string,
  ) {
    const resolvedChiefComplaint = chiefComplaint || chiefComplaintSnake || '';
    const flags = (flagsRaw || '')
      .split(',')
      .map((flag) => flag.trim())
      .filter(Boolean);

    if (!resolvedChiefComplaint && flags.length === 0) {
      throw new BadRequestException('chiefComplaint or flags are required');
    }

    const vitals = {
      hr: hr === undefined ? undefined : Number(hr),
      sbp: sbp === undefined ? undefined : Number(sbp),
      temp: temp === undefined ? undefined : Number(temp),
      spo2: spo2 === undefined ? undefined : Number(spo2),
    };

    const matches = this.protocolService.matchProtocols({
      chiefComplaint: resolvedChiefComplaint,
      flags,
      vitals,
    });

    return {
      matchedCount: matches.length,
      protocols: matches,
      humanReviewRequired: matches.some((protocol) => protocol.humanReviewRequired),
    };
  }
}

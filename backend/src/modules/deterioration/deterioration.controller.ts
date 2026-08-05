import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { DeteriorationPredictionV3Service } from '../../services/deterioration-prediction-v3.service';
import { PredictDeteriorationDto } from './dto/predict-deterioration.dto';

@ApiTags('deterioration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('deterioration')
export class DeteriorationController {
  constructor(private readonly deteriorationService: DeteriorationPredictionV3Service) {}

  @Get()
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Deterioration prediction service info' })
  info() {
    return {
      path: '/deterioration',
      version: 'v1',
      description: 'deterioration prediction',
      status: 'active',
      modelVersion: 'deterioration-v3-deterministic',
    };
  }

  @Get('health')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Deterioration prediction model health' })
  health() {
    return this.deteriorationService.checkHealth();
  }

  @Post('predict')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Predict deterioration risk from triage context and vitals' })
  predict(@Body() body: PredictDeteriorationDto) {
    const triageCode = body.triageCode || body.triage_code;
    const riskFlags = body.riskFlags || body.risk_flags;
    const hasContext = Boolean(triageCode || body.vitals || riskFlags);
    if (!hasContext) {
      throw new BadRequestException('triageCode, vitals, or riskFlags are required');
    }

    const prediction = this.deteriorationService.predict({
      age: body.age,
      triageCode,
      vitals: body.vitals,
      riskFlags,
    });

    return { prediction };
  }
}

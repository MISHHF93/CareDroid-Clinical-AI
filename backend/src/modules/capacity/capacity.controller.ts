import { Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { CapacityService } from '../../services/capacity.service';

/**
 * Real logic (getCapacityDashboard in CapacityService) requires a live
 * Mongoose connection. Return a clean 503 rather than an unhandled 500 when
 * it isn't configured/connected, instead of gating route *existence* behind
 * ENABLE_MONGOOSE_EMERGENCY_OS the way the legacy Express mount did --
 * matches the SurgeController precedent (Cycle A/243).
 */
function assertMongoReady(): void {
  if (mongoose.connection.readyState !== 1) {
    throw new ServiceUnavailableException(
      'Capacity dashboard requires MongoDB (set ENABLE_MONGOOSE_EMERGENCY_OS=true and MONGODB_URI).',
    );
  }
}

/**
 * Migrated off the legacy bare-Express capacity.routes.ts (Cycle 277,
 * dual-persistence architecture cleanup -- see CareDroid-Project-Scorecard.html
 * Cycle 276 for the full scope). Route path matches the real frontend caller
 * (src/services/emergencyAnalyticsApi.ts's fetchEmergencyCapacityDashboard,
 * used by useOperationsHubLiveFeeds.ts and HospitalMapDashboard.tsx) exactly
 * -- the old bare /api/capacity/dashboard mount was never the path any real
 * caller used.
 */
@ApiTags('capacity')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('emergency/capacity')
export class CapacityController {
  constructor(private readonly capacityService: CapacityService) {}

  @Get('dashboard')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Department capacity score, triggers, and recommendations' })
  async dashboard() {
    assertMongoReady();
    return this.capacityService.getCapacityDashboard();
  }
}

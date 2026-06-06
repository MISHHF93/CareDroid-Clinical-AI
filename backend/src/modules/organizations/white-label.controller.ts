import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';

@ApiTags('white-label')
@Controller('white-label')
export class WhiteLabelController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Public tenant white-label branding by tenant id or slug' })
  async getWhiteLabel(@Param('tenantId') tenantId: string) {
    return this.organizationsService.getPublicWhiteLabel(tenantId);
  }
}

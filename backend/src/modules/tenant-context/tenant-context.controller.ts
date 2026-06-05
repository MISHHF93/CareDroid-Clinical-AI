import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantContextService } from './tenant-context.service';

@ApiTags('tenant')
@Controller('tenant')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TenantContextController {
  constructor(private readonly tenantContextService: TenantContextService) {}

  @Get('context')
  @ApiOperation({ summary: 'Get current request tenant context' })
  async getContext(@Req() req: any) {
    return req.tenantContext || this.tenantContextService.resolveForRequest(req.user, req.headers);
  }
}

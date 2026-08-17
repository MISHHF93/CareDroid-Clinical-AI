import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProtocolService } from './protocol.service';
import { CreateProtocolDto, UpdateProtocolDto, SearchProtocolDto } from './dto/protocol.dto';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

// NAME COLLISION, NOT A ROUTE COLLISION (found 2026-08-12, repo-wide export-collision audit):
// `modules/protocol/protocol.controller.ts` also exports a class named `ProtocolController`,
// mounted at `/protocol` (singular) -- a genuinely different concept (symptom/vitals-matching
// decision support) from this one (`/protocols`, plural, content CRUD over ProtocolService).
// No behavior risk since NestJS routes on the decorated path not the class name, but an
// auto-import or a search for "ProtocolController" can land on the wrong file -- no disclosing
// comment existed before this one. See docs/architecture/CARE_DROID_MASTER_BACKLOG.md.
@ApiTags('protocols')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('protocols')
export class ProtocolController {
  constructor(private readonly protocolService: ProtocolService) {}

  @Get()
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get all protocols with search/filter' })
  @ApiResponse({ status: 200, description: 'Protocols retrieved successfully' })
  async findAll(@Query() searchDto: SearchProtocolDto) {
    return this.protocolService.findAll(searchDto);
  }

  @Get('categories')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get all protocol categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async getCategories() {
    return this.protocolService.getCategories();
  }

  @Get(':id')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get protocol by ID' })
  @ApiResponse({ status: 200, description: 'Protocol found' })
  async findOne(@Param('id') id: string) {
    return this.protocolService.findOne(id);
  }

  @Post()
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create new protocol (admin only)' })
  @ApiResponse({ status: 201, description: 'Protocol created' })
  async create(@Body() createProtocolDto: CreateProtocolDto) {
    return this.protocolService.create(createProtocolDto);
  }

  @Put(':id')
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Update protocol (admin only)' })
  @ApiResponse({ status: 200, description: 'Protocol updated' })
  async update(@Param('id') id: string, @Body() updateProtocolDto: UpdateProtocolDto) {
    return this.protocolService.update(id, updateProtocolDto);
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_PHI)
  @ApiOperation({ summary: 'Delete protocol (admin only)' })
  @ApiResponse({ status: 200, description: 'Protocol deleted' })
  async remove(@Param('id') id: string) {
    return this.protocolService.remove(id);
  }
}

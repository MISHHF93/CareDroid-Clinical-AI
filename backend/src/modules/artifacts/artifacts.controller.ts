import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ArtifactQueryDto } from './dto/artifact-query.dto';
import { CreateArtifactDto } from './dto/create-artifact.dto';
import { UpdateArtifactDto } from './dto/update-artifact.dto';
import { ArtifactsService } from './artifacts.service';

@ApiTags('artifacts')
@Controller('artifacts')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  // HEAL-347.90: this controller's own write side (create/update below)
  // already requires WRITE_PHI, but the reads had no permission decorator
  // at all -- any authenticated user could list/browse the full artifact
  // catalog, including entries of type 'protocol', while the DEDICATED
  // /protocols CRUD controller gates the same content category behind
  // READ_PHI. Matching this file's own write-side convention (uniform
  // gating regardless of the specific artifact type) rather than trying to
  // split reads by type.
  @Get()
  @UseGuards(AuthorizationGuard)
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Search and filter artifact knowledge assets' })
  async list(@Query() query: ArtifactQueryDto) {
    return this.artifactsService.list(query);
  }

  @Get('graph')
  @UseGuards(AuthorizationGuard)
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get artifact relationship graph nodes and edges' })
  async graph(@Query() query: ArtifactQueryDto) {
    return this.artifactsService.getRelationshipGraph(query);
  }

  @Post()
  @UseGuards(AuthorizationGuard)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create an artifact knowledge asset (admin only)' })
  async create(@Body() dto: CreateArtifactDto) {
    return this.artifactsService.create(dto);
  }

  @Get(':id')
  @UseGuards(AuthorizationGuard)
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get an artifact knowledge asset by id' })
  async findOne(@Param('id') id: string) {
    return this.artifactsService.findOne(id);
  }

  @Get(':id/versions')
  @UseGuards(AuthorizationGuard)
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get artifact version history' })
  async versions(@Param('id') id: string) {
    return this.artifactsService.getVersionHistory(id);
  }

  @Patch(':id')
  @UseGuards(AuthorizationGuard)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({
    summary: 'Update an artifact knowledge asset and snapshot the version (admin only)',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateArtifactDto) {
    return this.artifactsService.update(id, dto);
  }
}

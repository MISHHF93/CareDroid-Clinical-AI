import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

  @Get()
  @ApiOperation({ summary: 'Search and filter artifact knowledge assets' })
  async list(@Query() query: ArtifactQueryDto) {
    return this.artifactsService.list(query);
  }

  @Get('graph')
  @ApiOperation({ summary: 'Get artifact relationship graph nodes and edges' })
  async graph(@Query() query: ArtifactQueryDto) {
    return this.artifactsService.getRelationshipGraph(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create an artifact knowledge asset' })
  async create(@Body() dto: CreateArtifactDto) {
    return this.artifactsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an artifact knowledge asset by id' })
  async findOne(@Param('id') id: string) {
    return this.artifactsService.findOne(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get artifact version history' })
  async versions(@Param('id') id: string) {
    return this.artifactsService.getVersionHistory(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an artifact knowledge asset and snapshot the version' })
  async update(@Param('id') id: string, @Body() dto: UpdateArtifactDto) {
    return this.artifactsService.update(id, dto);
  }
}

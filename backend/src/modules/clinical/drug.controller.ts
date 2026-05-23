import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DrugService } from './drug.service';
import { CreateDrugDto, UpdateDrugDto, SearchDrugDto } from './dto/drug.dto';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

@ApiTags('drugs')
@Controller('drugs')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  @Get()
  @ApiOperation({ summary: 'Get all drugs with search/filter' })
  @ApiResponse({ status: 200, description: 'Drugs retrieved successfully' })
  async findAll(@Query() searchDto: SearchDrugDto) {
    return this.drugService.findAll(searchDto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all drug categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async getCategories() {
    return this.drugService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get drug by ID' })
  @ApiResponse({ status: 200, description: 'Drug found' })
  async findOne(@Param('id') id: string) {
    return this.drugService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), AuthorizationGuard)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new drug (admin only)' })
  @ApiResponse({ status: 201, description: 'Drug created' })
  async create(@Body() createDrugDto: CreateDrugDto) {
    return this.drugService.create(createDrugDto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), AuthorizationGuard)
  @RequirePermission(Permission.WRITE_PHI)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update drug (admin only)' })
  @ApiResponse({ status: 200, description: 'Drug updated' })
  async update(@Param('id') id: string, @Body() updateDrugDto: UpdateDrugDto) {
    return this.drugService.update(id, updateDrugDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AuthorizationGuard)
  @RequirePermission(Permission.DELETE_PHI)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete drug (admin only)' })
  @ApiResponse({ status: 200, description: 'Drug deleted' })
  async remove(@Param('id') id: string) {
    return this.drugService.remove(id);
  }
}

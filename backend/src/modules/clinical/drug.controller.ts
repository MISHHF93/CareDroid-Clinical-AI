import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DrugService } from './drug.service';
import { CreateDrugDto, UpdateDrugDto, SearchDrugDto } from './dto/drug.dto';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

@ApiTags('drugs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('drugs')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  @Get()
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get all drugs with search/filter' })
  @ApiResponse({ status: 200, description: 'Drugs retrieved successfully' })
  async findAll(@Query() searchDto: SearchDrugDto) {
    return this.drugService.findAll(searchDto);
  }

  @Get('categories')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get all drug categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async getCategories() {
    return this.drugService.getCategories();
  }

  @Get(':id')
  @RequirePermission(Permission.READ_PHI)
  @ApiOperation({ summary: 'Get drug by ID' })
  @ApiResponse({ status: 200, description: 'Drug found' })
  async findOne(@Param('id') id: string) {
    return this.drugService.findOne(id);
  }

  @Post()
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Create new drug (admin only)' })
  @ApiResponse({ status: 201, description: 'Drug created' })
  async create(@Body() createDrugDto: CreateDrugDto) {
    return this.drugService.create(createDrugDto);
  }

  @Put(':id')
  @RequirePermission(Permission.WRITE_PHI)
  @ApiOperation({ summary: 'Update drug (admin only)' })
  @ApiResponse({ status: 200, description: 'Drug updated' })
  async update(@Param('id') id: string, @Body() updateDrugDto: UpdateDrugDto) {
    return this.drugService.update(id, updateDrugDto);
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_PHI)
  @ApiOperation({ summary: 'Delete drug (admin only)' })
  @ApiResponse({ status: 200, description: 'Drug deleted' })
  async remove(@Param('id') id: string) {
    return this.drugService.remove(id);
  }
}

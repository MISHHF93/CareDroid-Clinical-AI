import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { TenantIsolationGuard } from '../tenant-context/tenant-isolation.guard';
import {
  SkipTenantIsolation,
  TenantScoped,
  WorkspaceScoped,
} from '../tenant-context/tenant-scope.decorator';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import { SetActiveWorkspaceDto } from './dto/set-active-workspace.dto';
import { UpdateWorkspaceToolsDto } from './dto/update-workspace-tools.dto';
import { WorkspaceContextService } from './workspace-context.service';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@Controller('workspaces')
@UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
@TenantScoped()
@ApiBearerAuth()
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly workspaceContextService: WorkspaceContextService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List current-user workspaces and active workspace state' })
  async list(@Req() req: any) {
    return this.workspacesService.listForUser(req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workspace owned by the current user' })
  async create(@Req() req: any, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.createWorkspace(req.user, dto);
  }

  @Post('active')
  @SkipTenantIsolation()
  @ApiOperation({ summary: 'Switch current user active workspace' })
  async setActive(@Req() req: any, @Body() dto: SetActiveWorkspaceDto) {
    return this.workspacesService.setActiveWorkspace(
      req.user,
      dto.workspaceId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('context')
  @ApiOperation({ summary: 'Get active workspace context for dashboard, assets, recommendations, assistant, and shortcuts' })
  async context(@Req() req: any) {
    return this.workspaceContextService.getCurrentContext(req.user);
  }

  @Get(':workspaceId/context')
  @WorkspaceScoped()
  @ApiOperation({ summary: 'Get workspace-specific context for the current user' })
  async workspaceContext(@Req() req: any, @Param('workspaceId') workspaceId: string) {
    this.assertTenantWorkspace(req, workspaceId);
    return this.workspaceContextService.getContextForWorkspace(req.user, workspaceId);
  }

  @Get(':workspaceId')
  @WorkspaceScoped()
  @ApiOperation({ summary: 'Get a workspace visible to the current user' })
  async getWorkspace(@Req() req: any, @Param('workspaceId') workspaceId: string) {
    this.assertTenantWorkspace(req, workspaceId);
    return this.workspacesService.getWorkspaceForUser(req.user, workspaceId);
  }

  @Get(':workspaceId/members')
  @WorkspaceScoped({ admin: 'workspace', permissions: ['MANAGE_WORKSPACE'] })
  @ApiOperation({ summary: 'List workspace members for workspace managers' })
  async members(@Req() req: any, @Param('workspaceId') workspaceId: string) {
    this.assertTenantWorkspace(req, workspaceId);
    return this.workspacesService.listMembers(req.user, workspaceId);
  }

  @Post(':workspaceId/invitations')
  @WorkspaceScoped({ admin: 'workspace', permissions: ['MANAGE_WORKSPACE'] })
  @ApiOperation({ summary: 'Invite a user to a workspace' })
  async invite(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteWorkspaceMemberDto,
  ) {
    this.assertTenantWorkspace(req, workspaceId);
    return this.workspacesService.inviteMember(req.user, workspaceId, dto);
  }

  @Get(':workspaceId/tools')
  @WorkspaceScoped()
  @ApiOperation({ summary: 'Get workspace tool availability for current user' })
  async tools(@Req() req: any, @Param('workspaceId') workspaceId: string) {
    this.assertTenantWorkspace(req, workspaceId);
    return this.workspacesService.getTools(req.user, workspaceId);
  }

  @Patch(':workspaceId/tools')
  @WorkspaceScoped({ admin: 'workspace', permissions: ['MANAGE_WORKSPACE'] })
  @ApiOperation({ summary: 'Update workspace tool availability' })
  async updateTools(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceToolsDto,
  ) {
    this.assertTenantWorkspace(req, workspaceId);
    return this.workspacesService.updateTools(req.user, workspaceId, dto.enabledToolIds);
  }

  private assertTenantWorkspace(req: any, workspaceId: string) {
    if (req.tenantContext?.workspaceId && req.tenantContext.workspaceId !== workspaceId) {
      throw new ForbiddenException('Requested workspace does not match tenant context.');
    }
  }
}

import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@Controller('workspaces/invitations')
export class WorkspaceInvitationsController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Preview a workspace invitation' })
  async preview(@Param('token') token: string) {
    return this.workspacesService.previewInvitation(token);
  }

  @Post(':token/accept')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a workspace invitation' })
  async accept(@Param('token') token: string, @Req() req: any) {
    return this.workspacesService.acceptInvitation(req.user, token);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SavedPromptDto } from './dto/saved-prompt.dto';
import { UpdatePersonalizationDto } from './dto/update-personalization.dto';
import { PersonalizationService } from './personalization.service';

@ApiTags('personalization')
@Controller('personalization')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PersonalizationController {
  constructor(private readonly personalizationService: PersonalizationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current-user AI personalization profile' })
  async me(@Req() req: any) {
    return this.personalizationService.getForUser(req.user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current-user AI personalization profile' })
  async update(@Req() req: any, @Body() dto: UpdatePersonalizationDto) {
    return this.personalizationService.updateForUser(req.user.id, dto);
  }

  @Get('me/recommendations')
  @ApiOperation({ summary: 'Get current-user recommendation set' })
  async recommendations(@Req() req: any, @Query('allowedToolIds') allowedToolIds?: string) {
    const allowed = allowedToolIds
      ? allowedToolIds
          .split(',')
          .map((toolId) => toolId.trim())
          .filter(Boolean)
      : [];
    return this.personalizationService.recommendationsForUser(req.user.id, allowed);
  }

  @Post('me/saved-prompts')
  @ApiOperation({ summary: 'Save a reusable current-user prompt' })
  async savePrompt(@Req() req: any, @Body() dto: SavedPromptDto) {
    return this.personalizationService.savePrompt(req.user.id, dto);
  }

  @Delete('me/saved-prompts/:promptId')
  @ApiOperation({ summary: 'Delete a saved prompt' })
  async deletePrompt(@Req() req: any, @Param('promptId') promptId: string) {
    return this.personalizationService.deletePrompt(req.user.id, promptId);
  }
}

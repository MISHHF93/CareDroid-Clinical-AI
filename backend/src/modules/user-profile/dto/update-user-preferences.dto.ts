import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsString()
  theme?: 'light' | 'dark' | 'system';

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  defaultDashboard?: string;

  @IsOptional()
  @IsBoolean()
  compactMode?: boolean;

  @IsOptional()
  @IsObject()
  accessibility?: Record<string, any>;

  @IsOptional()
  @IsObject()
  calculatorPreferences?: Record<string, any>;

  @IsOptional()
  @IsObject()
  toolPreferences?: Record<string, any>;

  @IsOptional()
  @IsObject()
  aiAssistantPreferences?: Record<string, any>;

  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, any>;
}

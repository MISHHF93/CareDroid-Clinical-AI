import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AutomationAuditStatus } from '../entities/automation-audit-event.entity';

export class AutomationAuditEntityDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class AutomationAuditConditionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsBoolean()
  result: boolean;
}

export class AutomationAuditAiInvolvementDto {
  @IsBoolean()
  involved: boolean;

  @IsString()
  @IsOptional()
  summary?: string;
}

export class AutomationAuditReviewerDto {
  @IsBoolean()
  required: boolean;

  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateAutomationAuditEventDto {
  @IsString()
  @IsNotEmpty()
  triggerFired: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationAuditConditionDto)
  conditionsEvaluated: AutomationAuditConditionDto[];

  @IsString()
  @IsNotEmpty()
  actionSelected: string;

  @ValidateNested()
  @Type(() => AutomationAuditEntityDto)
  user: AutomationAuditEntityDto;

  @ValidateNested()
  @Type(() => AutomationAuditEntityDto)
  tenant: AutomationAuditEntityDto;

  @ValidateNested()
  @Type(() => AutomationAuditEntityDto)
  workspace: AutomationAuditEntityDto;

  @ValidateNested()
  @Type(() => AutomationAuditAiInvolvementDto)
  aiInvolvement: AutomationAuditAiInvolvementDto;

  @IsString()
  @IsNotEmpty()
  toolCalled: string;

  @IsString()
  @IsNotEmpty()
  backendEndpoint: string;

  @IsEnum(AutomationAuditStatus)
  status: AutomationAuditStatus;

  @IsDateString()
  @IsOptional()
  timestamp?: string;

  @ValidateNested()
  @Type(() => AutomationAuditReviewerDto)
  reviewer: AutomationAuditReviewerDto;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  error?: string;
}

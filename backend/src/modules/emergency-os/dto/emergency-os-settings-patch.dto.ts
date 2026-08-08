import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { CareDroidScreenMode, OperationalIntelligenceMode } from '../emergency-os.types';

/**
 * Formalizes PATCH /api/emergency/settings's real payload shape, mirrored
 * field-for-field off EmergencyOsSettingsContract/EmergencyOsSettingsPatch
 * (backend/src/modules/emergency-os/emergency-os.types.ts) -- the same
 * contract src/services/emergencySettingsApi.tsx's own EmergencyOsSettings
 * JSDoc typedef already describes for its real callers. EmergencySettingsService
 * .updateSettings deep-merges this onto existing settings (mergeSettings is
 * recursive), so every field at every level stays optional here too, matching
 * the source type's own Partial<...> patch semantics -- this is a PATCH, not
 * a full replace. Nested keyed blobs with no fixed key set (alertRules,
 * thresholds.reassessmentIntervals) stay loosely typed objects, not deep-
 * validated, matching this codebase's established convention for genuinely
 * open-ended Record<string, X> settings (governance/clinical-intelligence DTO
 * cycles, and this same file's OrganizationsController siblings).
 */

const CARE_DROID_SCREEN_MODES = [
  'TRIAGE_SCREEN',
  'REGISTRATION_SCREEN',
  'CHARGE_NURSE_SCREEN',
  'PHYSICIAN_SCREEN',
  'EMS_SCREEN',
  'WAITING_ROOM_DISPLAY',
  'COMMAND_CENTER_DISPLAY',
  'ADMIN_SCREEN',
  'READ_ONLY_DISPLAY',
] as const;

const OPERATIONAL_INTELLIGENCE_MODES = ['rule_based', 'ml_assisted', 'hybrid'] as const;

export class EmergencyOsModuleSettingDto {
  @IsString() id!: string;
  @IsString() label!: string;
  @IsBoolean() enabled!: boolean;
}

export class EmergencyOsAiSettingsPatchDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsBoolean() triageAssistEnabled?: boolean;
  @IsOptional() @IsBoolean() summarizationEnabled?: boolean;
  @IsOptional() @IsBoolean() humanReviewRequired?: boolean;
}

export class EmergencyOsIntegrationSettingsPatchDto {
  @IsOptional() @IsBoolean() ehrEnabled?: boolean;
  @IsOptional() @IsString() fhirEndpoint?: string;
  @IsOptional() @IsString() hl7InterfaceId?: string;
  @IsOptional() @IsBoolean() deviceTelemetryEnabled?: boolean;
}

export class EmergencyOsProvincialHealthSettingsPatchDto {
  @IsOptional() @IsBoolean() connectorEnabled?: boolean;
  @IsOptional() @IsString() jurisdiction?: string;
  @IsOptional() @IsString() lookupMode?: string;
  @IsOptional() @IsBoolean() healthCardValidation?: boolean;
}

export class EmergencyOsNotificationSettingsPatchDto {
  @IsOptional() @IsBoolean() inAppEnabled?: boolean;
  @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @IsOptional() @IsBoolean() smsEnabled?: boolean;
  @IsOptional() @IsNumber() escalationMinutes?: number;
  @IsOptional() @IsString() quietHoursStart?: string;
  @IsOptional() @IsString() quietHoursEnd?: string;
}

export class EmergencyOsReassessmentThresholdsPatchDto {
  @IsOptional() @IsNumber() P1?: number;
  @IsOptional() @IsNumber() P2?: number;
  @IsOptional() @IsNumber() P3?: number;
  @IsOptional() @IsNumber() P4?: number;
  @IsOptional() @IsNumber() P5?: number;
  @IsOptional() @IsNumber() overdueGraceMinutes?: number;
}

export class EmergencyOsCapacityThresholdsPatchDto {
  @IsOptional() @IsNumber() departmentCapacityTarget?: number;
  @IsOptional() @IsNumber() warningPercent?: number;
  @IsOptional() @IsNumber() criticalPercent?: number;
  @IsOptional() @IsNumber() maxWaitingPatients?: number;
}

export class EmergencyOsEmsThresholdsPatchDto {
  @IsOptional() @IsNumber() offloadTargetMinutes?: number;
  @IsOptional() @IsNumber() criticalEtaMinutes?: number;
  @IsOptional() @IsBoolean() autoCreateArrival?: boolean;
}

export class EmergencyOsBoardingThresholdsPatchDto {
  @IsOptional() @IsNumber() escalationMinutes?: number;
  @IsOptional() @IsNumber() criticalMinutes?: number;
  @IsOptional() @IsNumber() maxBoarders?: number;
  @IsOptional() @IsNumber() inpatientNotifyMinutes?: number;
}

export class EmergencyOsThresholdsPatchDto {
  @IsOptional() @IsNumber() waitWarningMinutes?: number;
  @IsOptional() @IsNumber() waitCriticalMinutes?: number;
  @IsOptional() @IsNumber() capacityWarningPercent?: number;
  @IsOptional() @IsNumber() emsOffloadTargetMinutes?: number;
  @IsOptional() @IsObject() reassessmentIntervals?: Record<string, number>;
}

export class EmergencyOsOperationalIntelligenceSettingsPatchDto {
  @IsBoolean() operationalIntelligenceEnabled!: boolean;
  @IsIn(OPERATIONAL_INTELLIGENCE_MODES) operationalIntelligenceMode!: OperationalIntelligenceMode;
  @IsBoolean() modelMonitoringEnabled!: boolean;
  @IsBoolean() driftMonitoringEnabled!: boolean;
  @IsBoolean() recommendationsEnabled!: boolean;
  @IsBoolean() autoAlertingEnabled!: boolean;
  @IsBoolean() humanReviewRequired!: true;
  @IsBoolean() modelHealthVisibleToAdmins!: boolean;
  @IsBoolean() dataFreshnessVisible!: boolean;
  @IsNumber() operationalIntelligencePollingInterval!: number;
}

export class EmergencyOsSettingsPatchDto {
  @IsOptional() @IsString() tenantName?: string;
  @IsOptional() @IsString() defaultWorkspace?: string;
  @IsOptional() @IsIn(CARE_DROID_SCREEN_MODES) defaultScreenMode?: CareDroidScreenMode;
  @IsOptional()
  @IsArray()
  @IsIn(CARE_DROID_SCREEN_MODES, { each: true })
  enabledScreenModes?: CareDroidScreenMode[];
  @IsOptional() @IsBoolean() readOnlyDisplayMode?: boolean;
  @IsOptional() @IsBoolean() commandCenterMode?: boolean;
  @IsOptional() @IsNumber() wallDisplayRefreshInterval?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmergencyOsModuleSettingDto)
  enabledModules?: EmergencyOsModuleSettingDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsAiSettingsPatchDto)
  aiSettings?: EmergencyOsAiSettingsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsIntegrationSettingsPatchDto)
  integrationSettings?: EmergencyOsIntegrationSettingsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsProvincialHealthSettingsPatchDto)
  provincialHealthSettings?: EmergencyOsProvincialHealthSettingsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsNotificationSettingsPatchDto)
  notificationSettings?: EmergencyOsNotificationSettingsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsReassessmentThresholdsPatchDto)
  reassessmentThresholds?: EmergencyOsReassessmentThresholdsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsCapacityThresholdsPatchDto)
  capacityThresholds?: EmergencyOsCapacityThresholdsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsEmsThresholdsPatchDto)
  emsThresholds?: EmergencyOsEmsThresholdsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsBoardingThresholdsPatchDto)
  boardingThresholds?: EmergencyOsBoardingThresholdsPatchDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsThresholdsPatchDto)
  thresholds?: EmergencyOsThresholdsPatchDto;

  @IsOptional() @IsNumber() departmentCapacityTarget?: number;

  @IsOptional() @IsObject() alertRules?: Record<string, { enabled: boolean; severity: string }>;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyOsOperationalIntelligenceSettingsPatchDto)
  operationalIntelligenceSettings?: EmergencyOsOperationalIntelligenceSettingsPatchDto;

  @IsOptional() @IsString() updatedAt?: string;
}

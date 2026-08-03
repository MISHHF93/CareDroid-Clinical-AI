import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cycle 255: input validation for SettingsFeaturesController's
 * updateFeatureSettings route. Mirrors organizations.service.ts's own
 * already-declared inline input type for updateEmergencyFeatureSetting()
 * field-for-field (that method itself enforces featureId/enabled at
 * runtime with BadRequestException, so both stay optional here rather than
 * duplicating that check at the validation layer). A real caller exists
 * (src/services/emergencySettingsApi.tsx's updateSettingsFeatureFlag(),
 * invoked from src/store/emergencyStore.ts) sending exactly these 4 fields.
 */
export class UpdateFeatureSettingDto {
  @IsOptional() @IsString() @MaxLength(200) featureId?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @MaxLength(200) changedBy?: string;
  @IsOptional() @IsString() timestamp?: string;
}

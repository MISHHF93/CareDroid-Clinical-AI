import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AlarmActionDto {
  // sentinelApi.ts's acknowledgeSentinelAlarm() sends `reason: reason || null`
  // (an explicit null, not just an omitted key) -- @IsOptional() skips
  // validation for both null and undefined, so this accepts both.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

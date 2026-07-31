import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cycle 252: input validation for IntegrationsController's 5 @Body()
 * routes (FHIR connection create/test/sync, HL7 message test/replay-
 * preview). All 5 dispatch purely through PlatformSystemsService.demo()
 * (confirmed by direct read -- no real persistence, no field-specific
 * logic; matches item #30's finding that FHIR/HL7 integration is
 * confirmed placeholder-only despite being a billed Institutional-tier
 * feature).
 *
 * A registry sweep (platformSystems.tsx) found both `fhir-connector` and
 * `hl7-bridge` capability entries wired `method: 'GET'` pointing at the
 * connections/interfaces list endpoints, not these POST routes -- so
 * PlatformSystemPage.tsx's generic demo button never reaches any of the
 * 5. One real, deliberate caller does exist in source
 * (emergencySettingsApi.tsx's `testIntegrationConnection()`, sending
 * `{testOnly: true}` to both the FHIR test and HL7 test-message routes)
 * but it is itself never invoked from any real component today (confirmed
 * by a full sweep -- only referenced from a shared test-mock file) --
 * real, deliberately-written code, just not yet wired to a UI trigger.
 * Its `testOnly` field is honored on both DTOs below alongside this
 * controller's own pre-existing unit-test fixtures (`baseUrl`, `ping`,
 * `fullSync`, `message`, `targetSystem`).
 */

export class CreateFhirConnectionDto {
  @IsOptional() @IsString() @MaxLength(500) baseUrl?: string;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class TestFhirConnectionDto {
  @IsOptional() @IsBoolean() testOnly?: boolean;
  @IsOptional() @IsBoolean() ping?: boolean;
}

export class SyncFhirConnectionDto {
  @IsOptional() @IsBoolean() fullSync?: boolean;
}

export class TestHl7MessageDto {
  @IsOptional() @IsBoolean() testOnly?: boolean;
  @IsOptional() @IsString() @MaxLength(8000) message?: string;
}

export class PreviewHl7MessageReplayDto {
  @IsOptional() @IsString() @MaxLength(120) targetSystem?: string;
}

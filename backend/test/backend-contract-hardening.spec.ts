import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ValidationPipe, type ArgumentMetadata } from '@nestjs/common';
import { StartSimulationDto } from '../src/modules/simulation/simulation.types';
import { CreateTrainingRunDto } from '../src/modules/training/training.types';
import { CreateEvaluationRunDto } from '../src/modules/evaluation/evaluation.types';
import {
  CreateClinicalPolicyDto,
  GovernanceDecisionDto,
  ConsentActionDto,
} from '../src/modules/platform-governance';
import {
  SuggestCalculatorDto,
  DraftReferralDto,
} from '../src/modules/platform-systems/dto/clinical-intelligence-actions.dto';
import {
  PostReceptionHandoffDto,
  RecordClinicalCalculatorResultDto,
} from '../src/modules/emergency-os/dto/emergency-os-actions.dto';
import { ImportLabsDto } from '../src/modules/platform-systems/dto/patient-clinical-data-actions.dto';
import { TestFhirConnectionDto } from '../src/modules/platform-systems/dto/integrations-actions.dto';
import {
  HandoverRequestDto,
  Process112CallDto,
} from '../src/modules/emergency-os/dto/emergency-os-research-actions.dto';

const root = join(__dirname, '..');

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('backend contract hardening', () => {
  it('enables Nest rawBody support for Stripe webhook verification', () => {
    const main = read('src/main.ts');

    expect(main).toContain('rawBody: true');
    expect(read('src/modules/subscriptions/subscriptions.controller.ts')).toContain('req.rawBody');
  });

  it('protects clinical content write routes with authorization permissions', () => {
    for (const controller of [
      read('src/modules/clinical/drug.controller.ts'),
      read('src/modules/clinical/protocol.controller.ts'),
    ]) {
      expect(controller).toContain("UseGuards(AuthGuard('jwt'), AuthorizationGuard)");
      expect(controller).toContain('@RequirePermission(Permission.WRITE_PHI)');
      expect(controller).toContain('@RequirePermission(Permission.DELETE_PHI)');
    }
  });

  it('uses DTO classes for chat and tool execution request bodies', () => {
    expect(read('src/modules/chat/chat.controller.ts')).toContain('class ChatMessageDto');
    expect(
      read('src/modules/medical-control-plane/tool-orchestrator/dto/tool-execution.dto.ts'),
    ).toContain('class ToolExecutionBodyDto');
    expect(read('src/modules/subscriptions/subscriptions.controller.ts')).toContain(
      'CustomerPortalDto',
    );
  });

  /**
   * Cycle 241: Nest's global ValidationPipe (whitelist: true,
   * forbidNonWhitelisted: true, set in main.ts) only runs class-validator
   * checks when a @Body() parameter's declared type is a real `class`.
   * ValidationPipe.toValidate() explicitly skips [String, Boolean, Number,
   * Array, Object] metatypes and returns the raw parsed body untouched --
   * and a TypeScript `interface`/`type` alias reflects as plain `Object` at
   * runtime (interfaces don't exist in emitted JS), so any @Body() typed as
   * an interface, inline object literal, `Record<>`, or `any` gets ZERO
   * whitelist/validation protection, silently, regardless of the global
   * pipe config. A codebase-wide audit (see body-validation-coverage.spec.ts)
   * found 135 such parameters; this test proves the mechanism concretely on
   * 3 that were fixed this cycle (interface -> class, same field set).
   */
  it('a body DTO declared as a class actually gets whitelist-validated by the real global ValidationPipe (Cycle 241)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const bodyMetadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
      type: 'body',
      metatype,
      data: undefined,
    });

    // Legitimate payloads (only declared fields) still pass through cleanly.
    await expect(
      pipe.transform({ scenarioId: 'abc', role: 'physician' }, bodyMetadata(StartSimulationDto)),
    ).resolves.toMatchObject({ scenarioId: 'abc', role: 'physician' });

    // An extra, undeclared field is now rejected. Before this cycle,
    // StartSimulationDto/CreateTrainingRunDto/CreateEvaluationRunDto were
    // plain `interface`s -- structurally identical payloads would have
    // passed through this exact pipe config completely unchecked.
    await expect(
      pipe.transform(
        { scenarioId: 'abc', injectedField: 'unexpected' },
        bodyMetadata(StartSimulationDto),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { modelName: 'gpt', injectedField: 'unexpected' },
        bodyMetadata(CreateTrainingRunDto),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { modelName: 'gpt', injectedField: 'unexpected' },
        bodyMetadata(CreateEvaluationRunDto),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  /**
   * Cycle 247: same proof, this time for the largest single cluster in
   * body-validation-coverage.spec.ts's baseline -- GovernanceController's 33
   * routes and PlatformGovernanceController's 6 (39 total, all previously
   * @Body() body: Record<string, unknown/any>). GovernanceDecisionDto in
   * particular is reused across 13 different routes, so it's the highest-
   * leverage single DTO to prove live here.
   */
  it('governance/consent DTO classes actually get whitelist-validated by the real global ValidationPipe (Cycle 247)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const bodyMetadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
      type: 'body',
      metatype,
      data: undefined,
    });

    await expect(
      pipe.transform(
        { capabilityId: 'clinical-governance', policyType: 'clinical_safety', version: 'v2' },
        bodyMetadata(CreateClinicalPolicyDto),
      ),
    ).resolves.toMatchObject({ capabilityId: 'clinical-governance', version: 'v2' });
    await expect(
      pipe.transform(
        { capabilityId: 'clinical-governance', unexpectedColumn: 'drop-me' },
        bodyMetadata(CreateClinicalPolicyDto),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { decision: 'approve', notes: 'looks fine' },
        bodyMetadata(GovernanceDecisionDto),
      ),
    ).resolves.toMatchObject({ decision: 'approve', notes: 'looks fine' });
    await expect(
      pipe.transform(
        { decision: 'approve', arbitraryField: 'unexpected' },
        bodyMetadata(GovernanceDecisionDto),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { status: 'active', source: 'patient_portal' },
        bodyMetadata(ConsentActionDto),
      ),
    ).resolves.toMatchObject({ status: 'active', source: 'patient_portal' });
    await expect(
      pipe.transform({ status: 'active', ssn: '000-00-0000' }, bodyMetadata(ConsentActionDto)),
    ).rejects.toThrow(BadRequestException);
  });

  /**
   * Cycle 248: same proof for ClinicalIntelligenceController's 13 routes,
   * all pure PlatformSystemsService.demo() passthroughs. Confirms the
   * shared PlatformDemoContractFieldsDto base (the one real caller's fixed
   * shape today) plus each subclass's documented intended fields still
   * whitelist-validate correctly through inheritance.
   */
  it('clinical-intelligence DTO classes actually get whitelist-validated by the real global ValidationPipe (Cycle 248)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const bodyMetadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
      type: 'body',
      metatype,
      data: undefined,
    });

    await expect(
      pipe.transform(
        { capabilityId: 'calculator-recommender-ai', patientId: 'demo-patient', mode: 'demo' },
        bodyMetadata(SuggestCalculatorDto),
      ),
    ).resolves.toMatchObject({ capabilityId: 'calculator-recommender-ai', mode: 'demo' });
    await expect(
      pipe.transform({ chiefComplaint: 'chest pain' }, bodyMetadata(SuggestCalculatorDto)),
    ).resolves.toMatchObject({ chiefComplaint: 'chest pain' });
    await expect(
      pipe.transform(
        { chiefComplaint: 'chest pain', injectedField: 'unexpected' },
        bodyMetadata(SuggestCalculatorDto),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform({ specialty: 'cardiology', reason: 'NSTEMI' }, bodyMetadata(DraftReferralDto)),
    ).resolves.toMatchObject({ specialty: 'cardiology', reason: 'NSTEMI' });
    await expect(
      pipe.transform(
        { specialty: 'cardiology', ssn: '000-00-0000' },
        bodyMetadata(DraftReferralDto),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  /**
   * Cycle 249: same proof for EmergencyOsController's largest cluster.
   * PostReceptionHandoffDto specifically proves the real-caller-discovered
   * `queue` field survives whitelist (it would previously have been an
   * unrelated extra field the backend just ignored; now it must be
   * declared or the real caller's request would 400).
   * RecordClinicalCalculatorResultDto proves a route with several required
   * (not just optional) fields still accepts a complete real payload and
   * rejects both an injected field and a missing required one.
   */
  it('emergency-os DTO classes actually get whitelist-validated by the real global ValidationPipe (Cycle 249)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const bodyMetadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
      type: 'body',
      metatype,
      data: undefined,
    });

    await expect(
      pipe.transform(
        { patientId: 'pt-1', source: 'quick-intake', queue: 'triage-pending' },
        bodyMetadata(PostReceptionHandoffDto),
      ),
    ).resolves.toMatchObject({ patientId: 'pt-1', queue: 'triage-pending' });
    await expect(
      pipe.transform(
        { patientId: 'pt-1', unexpectedField: 'unexpected' },
        bodyMetadata(PostReceptionHandoffDto),
      ),
    ).rejects.toThrow(BadRequestException);

    const validCalculatorResult = {
      calculatorId: 'news2',
      patientId: 'pt-1',
      inputs: { respiratoryRate: 22 },
      score: 5,
      riskCategory: 'medium',
      interpretation: 'Monitor closely.',
      disclaimer: 'Clinical decision support only.',
      referenceLine: 'RCP NEWS2',
    };
    await expect(
      pipe.transform(validCalculatorResult, bodyMetadata(RecordClinicalCalculatorResultDto)),
    ).resolves.toMatchObject({ calculatorId: 'news2', score: 5 });
    await expect(
      pipe.transform(
        { ...validCalculatorResult, injectedField: 'unexpected' },
        bodyMetadata(RecordClinicalCalculatorResultDto),
      ),
    ).rejects.toThrow(BadRequestException);
    const { riskCategory: _omit, ...missingRequiredField } = validCalculatorResult;
    await expect(
      pipe.transform(missingRequiredField, bodyMetadata(RecordClinicalCalculatorResultDto)),
    ).rejects.toThrow(BadRequestException);
  });

  /**
   * Cycle 250: same proof for emergency-os.research.controller.ts's DTOs,
   * this time exercising nested @ValidateNested() arrays/objects (labs[],
   * location) rather than just flat fields -- confirms a bad value inside
   * a nested object is caught, not just top-level whitelist violations.
   */
  it('emergency-os research DTO classes actually get whitelist-validated by the real global ValidationPipe, including nested objects (Cycle 250)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const bodyMetadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
      type: 'body',
      metatype,
      data: undefined,
    });

    await expect(
      pipe.transform(
        {
          patientId: 'patient-1',
          patient: { chiefComplaint: 'Chest pain', labs: [{ name: 'Troponin', value: 0.12 }] },
        },
        bodyMetadata(HandoverRequestDto),
      ),
    ).resolves.toMatchObject({ patientId: 'patient-1' });
    await expect(
      pipe.transform(
        { patientId: 'patient-1', patient: { labs: [{ name: 'Troponin', unexpectedField: 'x' }] } },
        bodyMetadata(HandoverRequestDto),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { callId: '112-test', location: { lat: 43.65, lng: -79.38, accuracy: 20 } },
        bodyMetadata(Process112CallDto),
      ),
    ).resolves.toMatchObject({ callId: '112-test' });
    await expect(
      pipe.transform(
        { callId: '112-test', location: { lat: 43.65, unexpectedField: 'x' } },
        bodyMetadata(Process112CallDto),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  /**
   * Cycle 251: same proof for PatientClinicalDataController's DTOs.
   * ImportLabsDto extends the shared PlatformDemoContractFieldsDto base
   * (Cycle 248) via class inheritance -- this confirms whitelist
   * validation still works correctly through that inheritance chain, not
   * just on a flat, single-class DTO.
   */
  it('patient-clinical-data DTO classes actually get whitelist-validated by the real global ValidationPipe (Cycle 251)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const bodyMetadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
      type: 'body',
      metatype,
      data: undefined,
    });

    await expect(
      pipe.transform(
        { panel: 'BMP', patientId: 'pt-001', mode: 'demo' },
        bodyMetadata(ImportLabsDto),
      ),
    ).resolves.toMatchObject({ panel: 'BMP', patientId: 'pt-001' });
    await expect(
      pipe.transform({ panel: 'BMP', unexpectedField: 'x' }, bodyMetadata(ImportLabsDto)),
    ).rejects.toThrow(BadRequestException);
  });

  /**
   * Cycle 252: same proof for IntegrationsController's DTOs.
   * TestFhirConnectionDto's `testOnly` field is the one real (if currently
   * unreachable) payload shape found in source
   * (emergencySettingsApi.tsx's testIntegrationConnection()) -- confirms
   * that exact shape passes cleanly while an unrelated injected field
   * still gets rejected.
   */
  it('integrations DTO classes actually get whitelist-validated by the real global ValidationPipe (Cycle 252)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const bodyMetadata = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
      type: 'body',
      metatype,
      data: undefined,
    });

    await expect(
      pipe.transform({ testOnly: true }, bodyMetadata(TestFhirConnectionDto)),
    ).resolves.toMatchObject({ testOnly: true });
    await expect(
      pipe.transform({ testOnly: true, unexpectedField: 'x' }, bodyMetadata(TestFhirConnectionDto)),
    ).rejects.toThrow(BadRequestException);
  });
});

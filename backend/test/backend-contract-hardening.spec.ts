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
});

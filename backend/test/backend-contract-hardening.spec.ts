import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ValidationPipe, type ArgumentMetadata } from '@nestjs/common';
import { StartSimulationDto } from '../src/modules/simulation/simulation.types';
import { CreateTrainingRunDto } from '../src/modules/training/training.types';
import { CreateEvaluationRunDto } from '../src/modules/evaluation/evaluation.types';

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
});

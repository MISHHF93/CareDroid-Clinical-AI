import { readFileSync } from 'fs';
import { join } from 'path';

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
    expect(read('src/modules/medical-control-plane/tool-orchestrator/dto/tool-execution.dto.ts')).toContain(
      'class ToolExecutionBodyDto',
    );
    expect(read('src/modules/subscriptions/subscriptions.controller.ts')).toContain('CustomerPortalDto');
  });
});

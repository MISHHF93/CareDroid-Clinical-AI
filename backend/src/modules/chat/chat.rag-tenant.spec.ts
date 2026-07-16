/**
 * Cycle 67 / D4 — chat → RAG tenant wiring contract.
 * Full HTTP e2e is CI-only; this locks the call-site contract that processMessage
 * receives organizationId from the controller and forwards it into ragService.retrieve.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ChatService RAG tenant isolation contract (D4)', () => {
  const serviceSource = readFileSync(join(__dirname, 'chat.service.ts'), 'utf8');
  const controllerSource = readFileSync(join(__dirname, 'chat.controller.ts'), 'utf8');

  it('controller extracts organizationId from the authenticated user profile', () => {
    expect(controllerSource).toMatch(
      /organizationId\s*=\s*req\?\.user\?\.profile\?\.organizationId/,
    );
    expect(controllerSource).toContain('organizationId');
    expect(controllerSource).toMatch(/processMessage\([\s\S]*organizationId/);
  });

  it('processMessage accepts organizationId and passes it to ragService.retrieve', () => {
    expect(serviceSource).toMatch(/async processMessage\([\s\S]*organizationId\?: string/);
    // Both general and clinical RAG call sites
    const retrieveBlocks = serviceSource.match(/ragService\.retrieve\([^)]*\{[\s\S]*?\}/g) || [];
    expect(retrieveBlocks.length).toBeGreaterThanOrEqual(1);
    for (const block of retrieveBlocks) {
      expect(block).toContain('organizationId');
    }
  });

  it('does not hard-code a foreign organizationId into retrieve options', () => {
    expect(serviceSource).not.toMatch(
      /ragService\.retrieve\([\s\S]{0,200}organizationId:\s*['"]org-/i,
    );
  });
});

import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * EmergencyPatientService is currently in-memory-authoritative: every
 * per-request read/write goes through `this.patients` directly, with
 * `persistPatientToDatabase()` firing fire-and-forget for durability only
 * (see SCORECARD.md roadmap item #2). This is race-safe today *only*
 * because every per-request method body is fully synchronous — Node's
 * run-to-completion model makes a synchronous method atomic with respect
 * to every other request, with no yield point where a second call could
 * interleave a read against a half-applied write.
 *
 * That safety is currently accidental, not structural: nothing stops a
 * future edit from adding an `await` (e.g. an async validation call)
 * inside a read-modify-write method and silently reintroducing a real
 * race condition. This test makes the invariant explicit and enforced:
 * the only methods allowed to contain `await` are the one-time startup
 * rehydration path (`onModuleInit` / `rehydrateBoardFromDatabase`),
 * never a per-request method.
 */
describe('EmergencyPatientService — synchronous-method atomicity invariant (SCORECARD item #2)', () => {
  const SOURCE_PATH = join(__dirname, 'emergency-os.services.ts');
  const ALLOWED_ASYNC_METHODS = ['onModuleInit', 'rehydrateBoardFromDatabase'];

  function extractClassBody(source: string, className: string): string {
    const startMarker = `export class ${className}`;
    const startIndex = source.indexOf(startMarker);
    if (startIndex === -1) {
      throw new Error(`Could not find "${startMarker}" in ${SOURCE_PATH}`);
    }
    const afterStart = source.slice(startIndex + startMarker.length);
    const nextClassMatch = afterStart.match(/\n@Injectable\(\)\nexport class /);
    const endIndex = nextClassMatch ? nextClassMatch.index! : afterStart.length;
    return afterStart.slice(0, endIndex);
  }

  function methodNameContaining(classBody: string, awaitIndex: number): string {
    const before = classBody.slice(0, awaitIndex);
    const methodMatches = [
      ...before.matchAll(/\n {2}(?:private |public |protected )?(?:async )?([a-zA-Z_][\w]*)\s*\(/g),
    ];
    const last = methodMatches[methodMatches.length - 1];
    return last ? last[1] : '<unknown method>';
  }

  it('contains `await` only inside the one-time startup rehydration path, never a per-request method', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const classBody = extractClassBody(source, 'EmergencyPatientService');

    const awaitOffsets: number[] = [];
    const awaitRegex = /\bawait\b/g;
    let match: RegExpExecArray | null;
    while ((match = awaitRegex.exec(classBody)) !== null) {
      awaitOffsets.push(match.index);
    }

    expect(awaitOffsets.length).toBeGreaterThan(0); // sanity: onModuleInit's own await must still be found

    const offendingMethods = awaitOffsets
      .map((offset) => methodNameContaining(classBody, offset))
      .filter((methodName) => !ALLOWED_ASYNC_METHODS.includes(methodName));

    expect(offendingMethods).toEqual([]);
  });
});

/**
 * Cross-repo contract parity audit (frontend WorkspaceContractSchema <->
 * backend WorkspaceSchema). Same pattern as src/data/executorMappingAudit.test.ts:
 * reads the backend's schema source as text rather than importing it as a
 * compiled module, since a real cross-stack import would silently break in
 * production (the backend's Docker build context is `./backend`, which never
 * copies the repo-root `lib/` directory -- see workspaceContracts.ts's header
 * comment). This is the regression guard that makes "hand-mirrored" schemas
 * safe: if either file's field list drifts from the other, this test fails
 * immediately instead of the two payloads silently disagreeing at runtime.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  WorkspaceContractSchema,
  WorkspaceProfileContractSchema,
  WorkspaceShortcutContractSchema,
} from './workspaceContracts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendSchemaSource = readFileSync(
  join(__dirname, '../../backend/src/modules/workspaces/workspace.contracts.ts'),
  'utf8',
);

function extractZodObjectFields(source: string, exportedConstName: string): string[] {
  const start = source.indexOf(`export const ${exportedConstName} = z.object({`);
  if (start === -1) {
    throw new Error(
      `could not find "export const ${exportedConstName} = z.object({" in backend schema source`,
    );
  }
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let end = bodyStart;
  for (let i = bodyStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(bodyStart + 1, end);
  // Top-level field names only: lines starting with an identifier followed by a colon,
  // at zero extra brace-depth relative to the object body (skips nested z.object({...}) fields).
  const fields: string[] = [];
  let nestedDepth = 0;
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (nestedDepth === 0) {
      // Matches both inline zod calls (`foo: z.string()`) and referenced schema
      // constants (`foo: FooSchema`) -- an earlier version of this regex only
      // matched the former and silently missed `workspaceProfile: WorkspaceProfileSchema`,
      // which both real schemas do have (proven by a real .parse() call succeeding
      // on a full sample payload including workspaceProfile).
      const match = line.match(/^([A-Za-z_$][\w$]*):\s*(?:z\.|[A-Z])/);
      if (match) fields.push(match[1]);
    }
    nestedDepth += opens - closes;
  }
  return fields.sort();
}

describe('Workspace contract parity (frontend <-> backend, 2026-08-08)', () => {
  it('WorkspaceContractSchema has exactly the same top-level fields as backend WorkspaceSchema', () => {
    const backendFields = extractZodObjectFields(backendSchemaSource, 'WorkspaceSchema');
    const frontendFields = Object.keys(WorkspaceContractSchema.shape).sort();
    expect(frontendFields).toEqual(backendFields);
  });

  it('WorkspaceProfileContractSchema has exactly the same top-level fields as backend WorkspaceProfileSchema', () => {
    const backendFields = extractZodObjectFields(backendSchemaSource, 'WorkspaceProfileSchema');
    const frontendFields = Object.keys(WorkspaceProfileContractSchema.shape).sort();
    expect(frontendFields).toEqual(backendFields);
  });

  it('WorkspaceShortcutContractSchema has exactly the same top-level fields as backend WorkspaceShortcutSchema', () => {
    const backendFields = extractZodObjectFields(backendSchemaSource, 'WorkspaceShortcutSchema');
    const frontendFields = Object.keys(WorkspaceShortcutContractSchema.shape).sort();
    expect(frontendFields).toEqual(backendFields);
  });

  it('sanity check: the extractor actually finds fields (would silently pass 0-vs-0 if the regex broke)', () => {
    const backendFields = extractZodObjectFields(backendSchemaSource, 'WorkspaceSchema');
    expect(backendFields.length).toBeGreaterThan(10);
  });
});

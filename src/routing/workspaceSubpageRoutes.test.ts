import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  WORKSPACE_EMERGENCY_SUBPAGE_REDIRECTS,
} from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');

describe('workspace subpage routes', () => {
  it('keeps workspace aliases on the CareDroid redirect contract', () => {
    expect(WORKSPACE_EMERGENCY_SUBPAGE_REDIRECTS).toMatchObject({
      whiteboard: '/emergency/whiteboard',
      patients: '/emergency/patients',
      queues: '/emergency/queues',
      'command-center': '/emergency/command-center',
      copilot: '/emergency/copilot',
    });
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/workspace/emergency', to: '/emergency/whiteboard' }),
        expect.objectContaining({ path: '/workspace/emergency/patients', to: '/emergency/patients' }),
        expect.objectContaining({ path: '/workspace/emergency/queues', to: '/emergency/queues' }),
      ])
    );
    expect(appSource).toContain('LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (');
    expect(appSource).toContain('path={CANONICAL_ROUTES.workspace}');
    expect(appSource).not.toContain('function WorkspaceRouteRedirect');
  });

  it('keeps automation analytics unmounted from the active CareDroid app', () => {
    expect(appSource).not.toContain('path={CANONICAL_ROUTES.automationAnalytics}');
    expect(appSource).not.toContain("path=\"/automation-analytics\"");
    expect(appSource).toMatch(/<Route path="\*"\s+element=\{<EmergencyDefaultRedirect \/>\}/);
  });
});

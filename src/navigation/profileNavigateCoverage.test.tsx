import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const WIRED_SURFACE_FILES = [
  'src/components/AppShell.tsx',
  'src/components/Header.tsx',
  'src/components/CopilotPanel.tsx',
  'src/components/CommandPalette.tsx',
  'src/components/EMSCriticalBroadcast.tsx',
  'src/components/ReferralPanel.tsx',
  'src/components/account/DemoPersonaPanel.tsx',
  'src/pages/emergency/ReceptionWorkspace.tsx',
  'src/pages/emergency/pulse/index.tsx',
  'src/pages/tools/ToolsOverview.tsx',
  'src/pages/tools/Calculators.tsx',
  'src/pages/tools/ToolPageLayout.tsx',
  'src/pages/operations/Operations.tsx',
  'src/pages/CommandDashboard.jsx',

  'src/pages/commercial/CommercialPages.tsx',
  'src/pages/PlatformOSPages.tsx',
  'src/pages/tools/ClinicalToolCatalog.tsx',
  'src/pages/emergency/SmartIntake.tsx',
  'src/pages/HospitalMapDashboard.jsx',
  'src/pages/platform/PlatformSystemPage.tsx',
  'src/pages/fleet/FleetPageChrome.jsx',

  'src/components/EMSPipeline.tsx',
  'src/pages/emergency/index.tsx',
  'src/pages/tools/ToolNotFound.tsx',
  'src/pages/tools/CardiologyAssistantPage.tsx',
  'src/navigation/registryToolLaunch.ts',
  'src/services/navigateToEmergencySurface.ts',
];

describe('profileNavigateCoverage', () => {
  it('documents wired surfaces using profile navigation helpers', () => {
    const wired = WIRED_SURFACE_FILES.filter((relativePath) => {
      const absolutePath = join(root, relativePath);
      if (!existsSync(absolutePath)) return false;
      const source = readFileSync(absolutePath, 'utf8');
      return (
        source.includes('useProfileNavigate') ||
        source.includes('navigateProfileAware') ||
        source.includes('navigateWithProfileAccess')
      );
    });
    expect(wired.length).toBeGreaterThanOrEqual(15);
    expect(wired).toContain('src/components/AppShell.tsx');
    expect(wired).toContain('src/pages/emergency/ReceptionWorkspace.tsx');
    expect(wired).toContain('src/pages/emergency/index.tsx');
  });
});

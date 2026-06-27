import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
  'src/pages/Operations.jsx',
  'src/pages/CommandDashboard.jsx',
  'src/pages/Patients.tsx',
  'src/pages/commercial/CommercialPages.jsx',
  'src/pages/PlatformOSPages.jsx',
  'src/pages/tools/ClinicalToolCatalog.tsx',
  'src/pages/emergency/SmartIntake.tsx',
  'src/pages/HospitalMapDashboard.jsx',
  'src/pages/platform/PlatformSystemPage.tsx',
  'src/pages/fleet/FleetPageChrome.jsx',
  'src/components/reception/ArrivalMetricsPanel.tsx',
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
      const source = readFileSync(join(root, relativePath), 'utf8');
      return (
        source.includes('useProfileNavigate') ||
        source.includes('navigateProfileAware') ||
        source.includes('navigateWithProfileAccess')
      );
    });
    expect(wired.length).toBeGreaterThanOrEqual(15);
    expect(wired).toContain('src/components/AppShell.tsx');
    expect(wired).toContain('src/pages/emergency/ReceptionWorkspace.tsx');
    expect(wired).toContain('src/pages/commercial/CommercialPages.jsx');
  });
});

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
  'src/components/EMSCriticalBroadcast.jsx',
  'src/components/ReferralPanel.jsx',
  'src/components/account/DemoPersonaPanel.tsx',
  'src/pages/emergency/ReceptionWorkspace.jsx',
  'src/pages/emergency/pulse/index.tsx',
  'src/pages/tools/ToolsOverview.jsx',
  'src/pages/tools/Calculators.jsx',
  'src/pages/tools/ToolPageLayout.jsx',
  'src/pages/Operations.jsx',
  'src/pages/CommandDashboard.jsx',
  'src/pages/Patients.jsx',
  'src/pages/commercial/CommercialPages.jsx',
  'src/pages/PlatformOSPages.jsx',
  'src/pages/tools/ClinicalToolCatalog.jsx',
  'src/pages/emergency/SmartIntake.jsx',
  'src/pages/HospitalMapDashboard.jsx',
  'src/pages/platform/PlatformSystemPage.jsx',
  'src/pages/fleet/FleetPageChrome.jsx',
  'src/components/reception/ArrivalMetricsPanel.jsx',
  'src/components/EMSPipeline.jsx',
  'src/pages/emergency/index.tsx',
  'src/pages/tools/ToolNotFound.jsx',
  'src/pages/tools/CardiologyAssistantPage.jsx',
  'src/navigation/registryToolLaunch.js',
  'src/services/navigateToEmergencySurface.js',
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
    expect(wired).toContain('src/pages/emergency/ReceptionWorkspace.jsx');
    expect(wired).toContain('src/pages/commercial/CommercialPages.jsx');
  });
});

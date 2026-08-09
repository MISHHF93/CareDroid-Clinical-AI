const BASE = 'http://localhost:3000';

const targets = [
  '/src/components/CopilotPanel.tsx',
  '/lib/patient-orchestration/index.ts',
  '/lib/native-ai/index.ts',
  '/src/components/copilot/CopilotShell.tsx',
  '/src/components/copilot/CopilotRiskLayerPanel.tsx',
  '/src/components/copilot/AiTransparencyDashboard.tsx',
  '/src/hooks/usePatientOrchestration.ts',
  '/src/services/nativeAiCore.ts',
];

for (const path of targets) {
  try {
    const res = await fetch(`${BASE}${path}`);
    const text = await res.text();
    const preview = text.slice(0, 120).replace(/\s+/g, ' ');
    console.log(res.status, path, preview);
    if (!res.ok || text.includes('Pre-transform error') || text.includes('Failed to resolve')) {
      console.log('--- body tail ---');
      console.log(text.slice(-500));
    }
  } catch (error) {
    console.log('ERR', path, error.message);
  }
}
import { readFileSync, writeFileSync } from 'node:fs';

const lines = readFileSync('src/App.jsx', 'utf8').split(/\r?\n/);

function deleteRange(arr, startLine, endLine) {
  return [...arr.slice(0, startLine - 1), ...arr.slice(endLine)];
}

let next = lines;
next = deleteRange(next, 995, 1761);
next = deleteRange(next, 745, 992);
next = deleteRange(next, 288, 353);

const routeImport = [
  '',
  "import {",
  '  PatientsRoute,',
  '  QueueRoute,',
  '  ReassessmentRoute,',
  '  BoardingRoute,',
  '  CapacityRoute,',
  '  CopilotRoute,',
  "} from './pages/emergency/emergencyRoutePages';",
  '',
];

next.splice(287, 0, ...routeImport);

let app = next.join('\n');

const unusedImports = [
  "import PatientCard from './components/PatientCard';\n",
  "import { PatientFlag, PatientState } from './types/emergency';\n",
  "import { EMERGENCY_OS_BRANDING } from './config/emergencyOsBranding.config';\n",
  /import \{\n  useBoardingStatus,\n  useCapacityStatus,\n  useEDCopilot,\n  useEmergencyPatients,\n  useEmergencyQueues,\n  useUpgradeHarnessAuditSummary,\n  useUpgradeHarnessCapacity,\n  useUpgradeHarnessClinicalIntelligence,\n  usePatientJourney,\n  useReassessmentQueue,\n\} from '\.\/hooks\/useEmergencyOs';\n/,
  "import { useEmergencyStore } from './store/emergencyStore';\n",
];

for (const item of unusedImports) {
  app = typeof item === 'string' ? app.replace(item, '') : app.replace(item, '');
}

if (!app.includes('getPlatformHomeRoute')) {
  app = app.replace(
    "import { getEmergencyRoleHomeRoute, EMERGENCY_ROLE_IDS, getReceptionEmbeddedIntakePath, prefersReceptionForPatientCreate } from './config/emergencyRolePermissions';",
    "import { getEmergencyRoleHomeRoute, EMERGENCY_ROLE_IDS, getReceptionEmbeddedIntakePath, prefersReceptionForPatientCreate } from './config/emergencyRolePermissions';\nimport { getPlatformHomeRoute, isReceptionFirstUxEnabled } from './config/receptionFirstUx.config';",
  );
}

app = app.replace(
  'import { lazy, Suspense, useEffect, useMemo } from \'react\';',
  "import { lazy, Suspense } from 'react';",
);

writeFileSync('src/App.jsx', app);
console.log('Patched App.jsx successfully');

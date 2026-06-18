import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = process.env.SOURCE_APP || 'src/App.jsx';
const app = readFileSync(sourcePath, 'utf8').split(/\r?\n/);

const sharedChunks = [
  ...app.slice(287, 353),
  ...app.slice(744, 993),
];

const shared = sharedChunks
  .join('\n')
  .replace('const emergencyRouteStyles', 'export const emergencyRouteStyles')
  .replace('function EmergencyRoutePage', 'export function EmergencyRoutePage')
  .replace('function MetricGrid', 'export function MetricGrid')
  .replace('function PatientGrid', 'export function PatientGrid')
  .replace('function ApiStateBanner', 'export function ApiStateBanner')
  .replace('function DataSourceNote', 'export function DataSourceNote')
  .replace('function isHighRisk', 'export function isHighRisk')
  .replace('function isBoarding', 'export function isBoarding')
  .replace('function displayPatientName', 'export function displayPatientName')
  .replace('function needsReassessmentAttention', 'export function needsReassessmentAttention')
  .replace('const QUEUE_MOVEMENT_STAGES', 'export const QUEUE_MOVEMENT_STAGES')
  .replace('function findUpgradeSignal', 'export function findUpgradeSignal');

writeFileSync(
  'src/pages/emergency/emergencyRouteShared.jsx',
  `import PatientCard from '../../components/PatientCard';\nimport { PatientFlag, PatientState } from '../../types/emergency';\n\n${shared}\n`,
);

const routesHeader = `import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { useEmergencyStore } from '../../store/emergencyStore';
import {
  useBoardingStatus,
  useCapacityStatus,
  useEDCopilot,
  useEmergencyPatients,
  useEmergencyQueues,
  useUpgradeHarnessAuditSummary,
  useUpgradeHarnessCapacity,
  useUpgradeHarnessClinicalIntelligence,
  usePatientJourney,
  useReassessmentQueue,
} from '../../hooks/useEmergencyOs';
import {
  EmergencyRoutePage,
  MetricGrid,
  PatientGrid,
  ApiStateBanner,
  DataSourceNote,
  emergencyRouteStyles,
  isHighRisk,
  isBoarding,
  needsReassessmentAttention,
  QUEUE_MOVEMENT_STAGES,
  findUpgradeSignal,
  displayPatientName,
} from './emergencyRouteShared';

`;

const routes = app
  .slice(993, 1761)
  .join('\n')
  .replace('function PatientsRoute', 'export function PatientsRoute')
  .replace('function QueueRoute', 'export function QueueRoute')
  .replace('function ReassessmentRoute', 'export function ReassessmentRoute')
  .replace('function BoardingRoute', 'export function BoardingRoute')
  .replace('function CapacityRoute', 'export function CapacityRoute')
  .replace('function CopilotRoute', 'export function CopilotRoute');

writeFileSync('src/pages/emergency/emergencyRoutePages.jsx', routesHeader + routes);

console.log('Extracted emergency route modules');

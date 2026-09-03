/**
 * Capabilities implemented in backend / services but not always in toolRegistry sidebar.
 * Used by /tools/catalog to surface "under the skin" features.
 */

import { featureInventory } from './featureInventory';

/** REST chat & AI endpoints (backend/src/modules/chat, ai) */
export const chatAndAiCapabilities = [
  {
    id: 'chat-message',
    name: 'Clinical chat (RAG + tools)',
    category: 'ai',
    description:
      'POST /api/chat/message — intent routing, emergency detection, tool execution, citations.',
    path: '/assistant',
    chatSeed: null,
    apiPath: 'POST /api/chat/message',
  },
  {
    id: 'chat-intent-classify',
    name: 'Intent classifier (NLU)',
    category: 'ai',
    description:
      'POST /api/chat/intent-classify — maps messages to clinical tools and emergencies.',
    path: '/assistant',
    chatSeed: 'Classify this clinical question and suggest the best tool: ',
    apiPath: 'POST /api/chat/intent-classify',
  },
  {
    id: 'chat-analyze-vitals',
    name: 'Vitals analysis',
    category: 'ai',
    description: 'POST /api/chat/analyze-vitals — interpret vital sign sets.',
    path: '/assistant',
    chatSeed:
      'Analyze these vitals and flag abnormalities: HR 110, BP 88/52, RR 24, SpO2 91%, temp 38.9°C',
    apiPath: 'POST /api/chat/analyze-vitals',
  },
  {
    id: 'chat-suggest-action',
    name: 'Suggest next action',
    category: 'ai',
    description: 'POST /api/chat/suggest-action — care pathway suggestions from patient context.',
    path: '/assistant',
    chatSeed: 'What should be the next clinical action for this patient?',
    apiPath: 'POST /api/chat/suggest-action',
  },
  {
    id: 'chat-message-3d',
    name: '3D clinical context chat',
    category: 'ai',
    description: 'POST /api/chat/message-3d — chat with vitals, meds, and problem list context.',
    path: '/assistant',
    chatSeed: 'Using full patient context, help me with the current clinical question.',
    apiPath: 'POST /api/chat/message-3d',
  },
  {
    id: 'ai-query',
    name: 'AI query (direct)',
    category: 'ai',
    description: 'POST /api/ai/query — direct LLM query with usage limits.',
    path: '/assistant',
    chatSeed: null,
    apiPath: 'POST /api/ai/query',
  },
  {
    id: 'ai-structured',
    name: 'Structured AI output',
    category: 'ai',
    description: 'POST /api/ai/structured — JSON-schema clinical responses.',
    path: '/assistant',
    chatSeed: null,
    apiPath: 'POST /api/ai/structured',
  },
];

/** Clinical data APIs (CRUD / reference DB) */
export const clinicalDataApis = [
  {
    id: 'drugs-api',
    name: 'Drug reference database',
    category: 'data',
    description:
      'GET/POST /api/drugs — medication reference records (separate from interaction checker).',
    path: '/tools/drug-checker',
    chatSeed: 'Look up dosing and reference information for metformin.',
    apiPath: 'GET /api/drugs',
  },
  {
    id: 'protocols-api',
    name: 'Protocol library API',
    category: 'data',
    description: 'GET/POST /api/protocols — stored protocol entities (UI also uses chat).',
    path: '/protocols',
    chatSeed: 'Summarize the sepsis bundle protocol for ED management.',
    apiPath: 'GET /api/protocols',
  },
];

/** Emergency & alerts (backend intent + local UI) */
export const emergencyCapabilities = [
  {
    id: 'emergency-nlu',
    name: 'Emergency detection (NLU)',
    category: 'emergency',
    description:
      'Automatic on every chat message — cardiac, neuro, respiratory, trauma, psychiatric patterns.',
    path: '/assistant',
    chatSeed: 'Patient with crushing chest pain and diaphoresis — assess urgency.',
    apiPath: 'Intent classifier phase 0',
  },
  {
    id: 'clinical-alerts-page',
    name: 'Clinical alerts hub',
    category: 'emergency',
    description: 'In-app alerts view (tool-derived alerts + acknowledgment UI).',
    path: '/clinical/alerts',
    chatSeed: null,
    apiPath: null,
  },
];

const FEATURE_ROUTES = {
  'team-management': '/team',
  'audit-logging': '/audit',
  'ai-query-limits': '/settings',
  'offline-access': '/settings',
  'custom-branding': '/settings',
  'drug-interactions': '/tools/drug-checker',
  calculators: '/tools/calculators',
  protocols: '/protocols',
  'lab-interpreter': '/tools/lab-interpreter',
  diagnosis: '/tools/diagnosis',
  procedures: '/tools/procedures',
};

/** Platform / enterprise features from featureInventory.js */
export const platformFeatures = featureInventory.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  description: item.description,
  type: item.type,
  path: FEATURE_ROUTES[item.id] || '/assistant',
  chatSeed: item.prompt || `Help me with ${item.name}.`,
  highlights: item.highlights,
}));

export function getFullCapabilitiesSummary() {
  return {
    chatAndAi: chatAndAiCapabilities.length,
    clinicalData: clinicalDataApis.length,
    emergency: emergencyCapabilities.length,
    platform: platformFeatures.length,
  };
}

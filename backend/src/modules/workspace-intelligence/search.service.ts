import { Injectable } from '@nestjs/common';

export interface SearchResult {
  id: string;
  title: string;
  category: string;
  path?: string;
  description?: string;
  workspaceIds: string[];
}

const BASE_RESULTS: SearchResult[] = [
  {
    id: 'workspace:clinical',
    title: 'Clinical Workspace',
    category: 'workspace',
    path: '/workspace/clinical',
    description: 'Clinical tools and AI context',
    workspaceIds: ['clinical'],
  },
  {
    id: 'workspace:emergency',
    title: 'Emergency Workspace',
    category: 'workspace',
    path: '/workspace/emergency',
    description: 'qSOFA, NEWS2, SOFA, NIHSS, HEART, GRACE',
    workspaceIds: ['emergency'],
  },
  {
    id: 'dashboard:digital-twin',
    title: 'Hospital Digital Twin',
    category: 'dashboard',
    path: '/digital-twin',
    description: 'Floors, rooms, beds, devices, telemetry, occupancy, fleet, alerts',
    workspaceIds: ['operations', 'medical-iot', 'fleet'],
  },
  {
    id: 'route:timeline',
    title: 'Clinical Timeline',
    category: 'timeline',
    path: '/timeline',
    description: 'AI, calculator, telemetry, fleet, workflow, audit, and alert events',
    workspaceIds: ['clinical', 'emergency', 'research'],
  },
  {
    id: 'route:notifications',
    title: 'Notification Center',
    category: 'notification',
    path: '/notifications',
    description: 'Operational inbox with priority and read state',
    workspaceIds: ['clinical', 'emergency', 'operations', 'fleet', 'medical-iot', 'admin'],
  },
  {
    id: 'workflow:chest-pain',
    title: 'Chest Pain Workflow',
    category: 'workflow',
    path: '/workflows?workflow=chest-pain',
    description: 'HEART, ECG Assistant, ACS Assistant, Documentation',
    workspaceIds: ['clinical', 'emergency'],
  },
  {
    id: 'asset:protocols',
    title: 'Protocol Asset Library',
    category: 'asset',
    path: '/assets',
    description: 'Documents, templates, protocols, and missing/orphan asset detection',
    workspaceIds: ['research', 'admin'],
  },
];

@Injectable()
export class SearchService {
  search(params: { query?: string; workspaceId?: string; category?: string } = {}) {
    const query = (params.query || '').trim().toLowerCase();
    const workspaceId = params.workspaceId || 'all';
    const category = params.category || 'all';

    return BASE_RESULTS.filter((result) => {
      if (workspaceId !== 'all' && !result.workspaceIds.includes(workspaceId)) return false;
      if (category !== 'all' && result.category !== category) return false;
      if (!query) return true;
      return [result.id, result.title, result.category, result.path, result.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }
}

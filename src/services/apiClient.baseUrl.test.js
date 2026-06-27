import { afterEach, describe, expect, it, vi } from 'vitest';

const mockAppConfig = vi.hoisted(() => ({
  app: {
    name: 'CareDroid-Clinical-AI',
    version: 'test',
    environment: 'test',
  },
  api: { baseUrl: '', wsUrl: '' },
  features: {},
}));

vi.mock('../config/appConfig', () => ({
  default: mockAppConfig,
}));

import { buildApiUrl, buildStreamUrl } from './apiClient';

describe('API base URL routing', () => {
  afterEach(() => {
    mockAppConfig.api.baseUrl = '';
    mockAppConfig.api.wsUrl = '';
  });

  it('treats configured API URLs as origins to avoid duplicate /api prefixes', () => {
    mockAppConfig.api.baseUrl = 'http://localhost:3000/api';

    expect(buildApiUrl('/api/tools/available')).toBe('http://localhost:3000/api/tools/available');
    expect(buildApiUrl('/tools/available')).toBe('http://localhost:3000/api/tools/available');
    expect(buildStreamUrl('/api/realtime')).toBe('http://localhost:3000/api/realtime');
  });
});

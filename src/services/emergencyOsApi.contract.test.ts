import { describe, expect, it } from 'vitest';
import {
  ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS,
  EMERGENCY_OS_API_ENDPOINTS,
} from './emergencyOsApi';
import { FRONTEND_API_CALLS } from '../data/frontendApiCallsInventory';

const INVENTORY_PATHS = new Set(FRONTEND_API_CALLS.map((entry) => entry.path));

describe('emergencyOsApi contract', () => {
  it('maps every active endpoint key to an inventory path', () => {
    const missing: string[] = [];
    for (const key of ACTIVE_EMERGENCY_OS_API_ENDPOINT_KEYS) {
      const path = EMERGENCY_OS_API_ENDPOINTS[key as keyof typeof EMERGENCY_OS_API_ENDPOINTS];
      if (!path) {
        missing.push(`${key}: undefined`);
        continue;
      }
      const hasInventory =
        INVENTORY_PATHS.has(path) ||
        INVENTORY_PATHS.has(`${path}/:patientId`) ||
        INVENTORY_PATHS.has(`${path}/:surfaceId`) ||
        INVENTORY_PATHS.has(`${path}/review`) ||
        [...INVENTORY_PATHS].some((inventoryPath) => inventoryPath.startsWith(path));
      if (!hasInventory) {
        missing.push(`${key}: ${path}`);
      }
    }
    expect(missing, missing.join(', ')).toEqual([]);
  });
});
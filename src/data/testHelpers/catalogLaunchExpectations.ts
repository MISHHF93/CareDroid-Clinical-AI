import { expect } from 'vitest';

/** Unknown tool-shaped ids resolve to guarded Assistant chat (not empty). */
export function expectUnknownToolCatalogLaunch(launch) {
  expect(launch.path).toBe('/assistant');
  expect(launch.registryId).toBeNull();
  expect(launch.chatSeed).toBeTruthy();
  expect(launch.orchestratorTool).toBeNull();
}

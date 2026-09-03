import { setDepartmentContextStoreReader } from '../../lib/ai/contextEngine';
import { setToolRegistryStoreReader } from '../../lib/ai/toolRegistry';
import { useEmergencyStore } from '../store/emergencyStore';
import { getUnifiedArtifactSources } from './unifiedClinicalToolsBridge';

let registered = false;

/** Wire emergency store into shared AI context + tool registry readers (browser only). */
export function bootstrapAiPlatformIntegrations(): void {
  if (registered || typeof window === 'undefined') return;
  registered = true;

  const readStore = () => useEmergencyStore.getState();
  setDepartmentContextStoreReader(readStore);
  setToolRegistryStoreReader(readStore);
  if (import.meta.env.DEV) {
    void getUnifiedArtifactSources();
  }
}

export function teardownAiPlatformIntegrations(): void {
  setDepartmentContextStoreReader(null);
  setToolRegistryStoreReader(null);
  registered = false;
}

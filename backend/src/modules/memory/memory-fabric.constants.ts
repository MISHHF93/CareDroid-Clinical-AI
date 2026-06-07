export enum MemoryFabricScope {
  ORGANIZATION = 'organization',
  WORKSPACE = 'workspace',
  ROLE = 'role',
  USER = 'user',
  AI = 'ai',
  ARTIFACT = 'artifact',
}

export enum MemoryFabricSignalType {
  PREFERENCES = 'preferences',
  PINNED_ASSET = 'pinned_asset',
  RECENT_ASSET = 'recent_asset',
  SUCCESSFUL_WORKFLOW = 'successful_workflow',
  COMMON_SEARCH = 'common_search',
  AI_CONTEXT = 'ai_context',
  ARTIFACT_REFERENCE = 'artifact_reference',
}

export const MEMORY_FABRIC_TAG = 'memory-fabric';

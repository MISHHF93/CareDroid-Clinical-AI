/**
 * Clinical Intelligence Graph (CIG) — shared contracts + pure projector.
 *
 * PR-1: node/edge/event types, ids, Stage F catalogue
 * PR-2a: neutral board DTO + projectFromNeutralDto (no FE/Nest deps)
 */

export {
  CARE_DROID_CIG_LAYER,
  CIG_PROJECTOR_GENERATION,
  CIG_DISCHARGED_RETENTION_MS,
  CIG_SNAPSHOT_FRESHNESS_MS,
  CIG_PROJECTOR_LAG_DEGRADE_MS,
  CIG_PROJECT_P95_TARGET_MS,
  CIG_OPERATIONAL_CANVAS_ROUTE,
  CIG_SIMULATION_TENANT_PREFIX,
  CIG_DISCLAIMERS,
} from './constants';

export type {
  CigNodeId,
  CigDurability,
  CigPhiClass,
  CigSeverity,
  CigHealth,
  CigEvidenceQuality,
  CigPhiMode,
  CigEntityType,
  CigRelationshipType,
  CigNodeState,
  CigNode,
  CigTenantSnapshotMeta,
  CigEdge,
  CigGraphSnapshot,
  CigViewFilter,
  CigProducerClass,
  CigDomainEvent,
  CigEventCatalogueEntry,
  CigServiceMetadataKey,
} from './types';

export { CIG_SERVICE_METADATA_ALLOWLIST } from './types';

export {
  makeCigNodeId,
  makeKgNodeId,
  parseGraphNodeId,
  kgIdToCigId,
  cigIdToKgId,
  isCigNodeId,
  isKgNodeId,
  makeCigEdgeId,
  makeSimulationTenantId,
  isSimulationTenantId,
  type ParsedCigNodeId,
  type ParsedKgNodeId,
  type ParsedGraphNodeId,
} from './ids';

export {
  CIG_EVENT_CATALOGUE_VERSION,
  CIG_EVENT_CATALOGUE,
  getCigEventCatalogueEntry,
  listCigEventsByProducerClass,
  isEventEligibleForMultiUserTwin,
  buildCigDomainEvent,
} from './events/catalogue';

export type {
  NeutralBoardDto,
  NeutralBoardPatient,
  NeutralBoardStaff,
  NeutralBoardRoom,
  NeutralBoardQueue,
  NeutralBoardAlert,
  NeutralBoardDiagnostic,
  NeutralBoardEmsUnit,
  NeutralBoardDepartment,
  NeutralBoardService,
  NeutralBoardRecommendation,
  NeutralBoardWorkflowStep,
} from './neutralBoardDto';

export {
  projectFromNeutralDto,
  findCigNode,
  findCigNeighbors,
} from './projectFromNeutralDto';

export {
  buildRoom12DelayBoardDto,
  ROOM12_TENANT,
  ROOM12_GENERATED_AT,
} from './fixtures/room12Delay.fixture';

/** Frozen entity type list for runtime validation. */
export const CIG_ENTITY_TYPES = Object.freeze([
  'patient',
  'encounter',
  'note',
  'order',
  'diagnostic',
  'observation',
  'medication',
  'referral',
  'department',
  'room',
  'bed',
  'queue',
  'facility',
  'staff',
  'ems_unit',
  'ambulance',
  'crew',
  'workflow',
  'workflow_step',
  'task',
  'alert',
  'notification',
  'checklist',
  'operational_event',
  'document',
  'policy',
  'protocol',
  'calculator',
  'pathway',
  'ai_recommendation',
  'ai_agent',
  'simulation',
  'service',
  'integration',
  'model',
] as const);

/** Frozen relationship type list for runtime validation. */
export const CIG_RELATIONSHIP_TYPES = Object.freeze([
  'assigned_to',
  'located_in',
  'waiting_in',
  'owns',
  'affects',
  'triggered_by',
  'recommends',
  'part_of',
  'depends_on',
  'connected_to',
  'escalated_to',
  'monitored_by',
  'resulted_in',
  'transitions_to',
  'ordered',
  'resulted_from',
  'documents',
  'cites',
  'blocks',
  'predicts',
  'serves',
  'arrives_as',
] as const);

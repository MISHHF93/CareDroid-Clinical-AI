import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';
import { dateTimeColumnType } from '../portable-column-types';

/**
 * The rest of the Sentinel EMS domain — sentinel_units/outbox/alarms were
 * already created by CreateSentinelTables1772500000000; this covers the
 * remaining 9 Sentinel entities that never had a migration.
 */
export class CreateRemainingSentinelTables1706000700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sentinel_alarm_events',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'alarmId', type: 'varchar', length: '120' },
          { name: 'action', type: 'varchar', length: '32' },
          { name: 'actorId', type: 'varchar', length: '120', isNullable: true },
          { name: 'actorRole', type: 'varchar', length: '64', isNullable: true },
          { name: 'occurredAt', type: 'varchar', length: '64' },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'metadata', type: 'text', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_ai_recommendations',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'kind', type: 'varchar', length: '64' },
          { name: 'summary', type: 'text' },
          { name: 'recommendations', type: 'text' },
          { name: 'evidence', type: 'text' },
          { name: 'confidence', type: 'float' },
          { name: 'modelId', type: 'varchar', length: '80' },
          { name: 'modelVersion', type: 'varchar', length: '40' },
          { name: 'orchestratorVersion', type: 'varchar', length: '40' },
          { name: 'requiresHumanReview', type: 'boolean', default: true },
          { name: 'humanReviewStatus', type: 'varchar', length: '16', default: "'pending'" },
          { name: 'disclaimer', type: 'text' },
          { name: 'sourceState', type: 'varchar', length: '16', default: "'live'" },
          { name: 'generatedAt', type: 'varchar', length: '64' },
          { name: 'linkedEntityType', type: 'varchar', length: '64', isNullable: true },
          { name: 'linkedEntityId', type: 'varchar', length: '120', isNullable: true },
          { name: 'reviewedBy', type: 'varchar', length: '120', isNullable: true },
          { name: 'reviewedAt', type: 'varchar', length: '64', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_ems_episodes',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'unitId', type: 'varchar', length: '120' },
          { name: 'inboundPatientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'status', type: 'varchar', length: '32', default: "'dispatched'" },
          { name: 'dispatchedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'onSceneAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'enRouteHospitalAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'arrivedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'handoffStartedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'handoffCompletedAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'unitAvailableAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'predictedEtaMin', type: 'integer', isNullable: true },
          { name: 'actualTravelMin', type: 'integer', isNullable: true },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_eta_snapshots',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'unitId', type: 'varchar', length: '120' },
          { name: 'etaPointMin', type: 'integer' },
          { name: 'etaLowMin', type: 'integer' },
          { name: 'etaHighMin', type: 'integer' },
          { name: 'confidence', type: 'float' },
          { name: 'method', type: 'varchar', length: '32' },
          { name: 'inputsHash', type: 'varchar', length: '64' },
          { name: 'distanceKm', type: 'float' },
          { name: 'stale', type: 'boolean', default: false },
          { name: 'calculatedAt', type: 'varchar', length: '64' },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_geofences',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'kind', type: 'varchar', length: '32' },
          { name: 'ring', type: 'text' },
          { name: 'active', type: 'boolean', default: true },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_geofence_events',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'unitId', type: 'varchar', length: '120' },
          { name: 'fenceId', type: 'varchar', length: '120' },
          { name: 'transition', type: 'varchar', length: '16' },
          { name: 'occurredAt', type: 'varchar', length: '64' },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_inbound_patients',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'unitId', type: 'varchar', length: '120' },
          { name: 'status', type: 'varchar', length: '32', default: "'en_route'" },
          { name: 'patientLabel', type: 'varchar', length: '200', isNullable: true },
          { name: 'patientAge', type: 'varchar', length: '32', isNullable: true },
          { name: 'patientSex', type: 'varchar', length: '32', isNullable: true },
          { name: 'chiefComplaint', type: 'text' },
          { name: 'priority', type: 'varchar', length: '32', isNullable: true },
          { name: 'vitals', type: 'text', isNullable: true },
          { name: 'times', type: 'text', isNullable: true },
          { name: 'narrative', type: 'text', isNullable: true },
          { name: 'etaPointMin', type: 'integer', isNullable: true },
          { name: 'etaLowMin', type: 'integer', isNullable: true },
          { name: 'etaHighMin', type: 'integer', isNullable: true },
          { name: 'edPatientId', type: 'varchar', length: '120', isNullable: true },
          { name: 'nemsisMappedFields', type: 'text', isNullable: true },
          { name: 'missingFields', type: 'text', isNullable: true },
          { name: 'organizationId', type: 'varchar', length: '120', isNullable: true },
          { name: 'metadata', type: 'text', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_integration_cursors',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'vendorId', type: 'varchar', length: '64' },
          { name: 'lastEventId', type: 'varchar', length: '120', isNullable: true },
          { name: 'lastSequence', type: 'integer', default: 0 },
          { name: 'lastEventAt', type: 'varchar', length: '64', isNullable: true },
          { name: 'metadata', type: 'text', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'sentinel_positions',
        columns: [
          { name: 'id', type: 'varchar', length: '120', isPrimary: true },
          { name: 'unitId', type: 'varchar', length: '120' },
          { name: 'latitude', type: 'float' },
          { name: 'longitude', type: 'float' },
          { name: 'heading', type: 'float', isNullable: true },
          { name: 'speedKmh', type: 'float', isNullable: true },
          { name: 'source', type: 'varchar', length: '64' },
          { name: 'receivedAt', type: 'varchar', length: '64' },
          { name: 'eventSeq', type: 'integer', default: 0 },
          { name: 'sourceEventId', type: 'varchar', length: '120', isNullable: true },
          {
            name: 'createdAt',
            type: dateTimeColumnType(queryRunner),
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sentinel_alarm_events',
      new TableIndex({
        name: 'IDX_sentinel_alarm_events_alarmId_occurredAt',
        columnNames: ['alarmId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_ai_recommendations',
      new TableIndex({
        name: 'IDX_sentinel_ai_recommendations_humanReviewStatus_kind',
        columnNames: ['humanReviewStatus', 'kind'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_ems_episodes',
      new TableIndex({
        name: 'IDX_sentinel_ems_episodes_unitId_status',
        columnNames: ['unitId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_eta_snapshots',
      new TableIndex({
        name: 'IDX_sentinel_eta_snapshots_unitId_calculatedAt',
        columnNames: ['unitId', 'calculatedAt'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_geofences',
      new TableIndex({
        name: 'IDX_sentinel_geofences_organizationId_kind',
        columnNames: ['organizationId', 'kind'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_geofence_events',
      new TableIndex({
        name: 'IDX_sentinel_geofence_events_unitId_occurredAt',
        columnNames: ['unitId', 'occurredAt'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_inbound_patients',
      new TableIndex({
        name: 'IDX_sentinel_inbound_patients_unitId_status',
        columnNames: ['unitId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_inbound_patients',
      new TableIndex({
        name: 'IDX_sentinel_inbound_patients_organizationId_status',
        columnNames: ['organizationId', 'status'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_positions',
      new TableIndex({
        name: 'IDX_sentinel_positions_unitId_receivedAt',
        columnNames: ['unitId', 'receivedAt'],
      }),
    );
    await queryRunner.createIndex(
      'sentinel_positions',
      new TableIndex({
        name: 'IDX_sentinel_positions_unitId_eventSeq',
        columnNames: ['unitId', 'eventSeq'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sentinel_positions', true);
    await queryRunner.dropTable('sentinel_integration_cursors', true);
    await queryRunner.dropTable('sentinel_inbound_patients', true);
    await queryRunner.dropTable('sentinel_geofence_events', true);
    await queryRunner.dropTable('sentinel_geofences', true);
    await queryRunner.dropTable('sentinel_eta_snapshots', true);
    await queryRunner.dropTable('sentinel_ems_episodes', true);
    await queryRunner.dropTable('sentinel_ai_recommendations', true);
    await queryRunner.dropTable('sentinel_alarm_events', true);
  }
}

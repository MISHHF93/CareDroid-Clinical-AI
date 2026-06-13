const MIGRATION_NAME = '010_migrate_to_unified_patients';
const TARGET_COLLECTION = 'unified_patients';
const BACKUP_METADATA_COLLECTION = 'migration_010_unified_patient_backups';

function stamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

async function collectionExists(db, name) {
  return db.listCollections({ name }).hasNext();
}

async function findBackupMetadata(db, backupId) {
  if (!(await collectionExists(db, BACKUP_METADATA_COLLECTION))) {
    throw new Error(`Backup metadata collection ${BACKUP_METADATA_COLLECTION} does not exist`);
  }

  const query = backupId
    ? { migration: MIGRATION_NAME, backupId }
    : { migration: MIGRATION_NAME, status: { $in: ['completed', 'completed_no_source_patients'] } };

  const metadata = await db
    .collection(BACKUP_METADATA_COLLECTION)
    .find(query)
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(1)
    .next();

  if (!metadata) {
    throw new Error(
      backupId
        ? `No backup metadata found for backup ${backupId}`
        : 'No completed unified patient migration backup metadata found',
    );
  }

  return metadata;
}

async function copyCollection(db, sourceName, targetName) {
  if (!(await collectionExists(db, sourceName))) {
    return { sourceName, targetName, copied: 0, existed: false };
  }

  if (await collectionExists(db, targetName)) {
    await db.collection(targetName).drop();
  }
  await db.createCollection(targetName);

  const docs = await db.collection(sourceName).find({}).toArray();
  if (docs.length) {
    await db.collection(targetName).insertMany(
      docs.map((doc) => {
        const clone = { ...doc };
        delete clone._migration010Backup;
        return clone;
      }),
      { ordered: false },
    );
  }

  return { sourceName, targetName, copied: docs.length, existed: true };
}

async function backupCurrentUnifiedPatients(db, rollbackId) {
  if (!(await collectionExists(db, TARGET_COLLECTION))) {
    return { existed: false, backupName: null, count: 0 };
  }

  const backupName = `migration_010_prerollback_${TARGET_COLLECTION}_${rollbackId}`;
  const docs = await db.collection(TARGET_COLLECTION).find({}).toArray();
  if (await collectionExists(db, backupName)) {
    await db.collection(backupName).drop();
  }
  await db.createCollection(backupName);
  if (docs.length) {
    await db.collection(backupName).insertMany(
      docs.map((doc) => ({
        ...doc,
        _migration010PreRollbackBackup: {
          rollbackId,
          createdAt: new Date(),
        },
      })),
      { ordered: false },
    );
  }

  return { existed: true, backupName, count: docs.length };
}

async function restoreUnifiedPatients(db, metadata) {
  const targetBackup = (metadata.backups || []).find((backup) => backup.sourceName === TARGET_COLLECTION);
  if (!targetBackup) {
    throw new Error(`Backup metadata ${metadata.backupId} does not include ${TARGET_COLLECTION}`);
  }

  if (!targetBackup.existed) {
    if (await collectionExists(db, TARGET_COLLECTION)) {
      await db.collection(TARGET_COLLECTION).drop();
    }
    return { restored: 0, targetDropped: true, sourceBackup: null };
  }

  if (!targetBackup.backupName || !(await collectionExists(db, targetBackup.backupName))) {
    throw new Error(`Backup collection ${targetBackup.backupName || '<missing>'} is not available`);
  }

  const restored = await copyCollection(db, targetBackup.backupName, TARGET_COLLECTION);
  return { restored: restored.copied, targetDropped: false, sourceBackup: targetBackup.backupName };
}

async function restoreSourceCollections(db, metadata) {
  const restored = [];
  for (const backup of metadata.backups || []) {
    if (backup.sourceName === TARGET_COLLECTION || !backup.existed || !backup.backupName) continue;
    restored.push(await copyCollection(db, backup.backupName, backup.sourceName));
  }
  return restored;
}

module.exports = {
  async up(db, options = {}) {
    const backupId = options.backupId || process.env.MIGRATION_010_BACKUP_ID;
    const restoreSources =
      options.restoreSources === true || process.env.MIGRATION_010_RESTORE_SOURCE_COLLECTIONS === 'true';
    const metadata = await findBackupMetadata(db, backupId);
    const rollbackId = `${stamp()}_${Math.random().toString(36).slice(2, 8)}`;

    console.log(
      `=== Rolling back ${MIGRATION_NAME} using backup ${metadata.backupId} (rollback ${rollbackId}) ===`,
    );

    const preRollbackBackup = await backupCurrentUnifiedPatients(db, rollbackId);
    const unifiedRestore = await restoreUnifiedPatients(db, metadata);
    const sourceRestores = restoreSources ? await restoreSourceCollections(db, metadata) : [];

    await db.collection(BACKUP_METADATA_COLLECTION).updateOne(
      { backupId: metadata.backupId },
      {
        $push: {
          rollbacks: {
            rollbackId,
            rolledBackAt: new Date(),
            preRollbackBackup,
            unifiedRestore,
            sourceRestores,
            restoreSources,
          },
        },
        $set: {
          lastRollbackAt: new Date(),
          lastRollbackId: rollbackId,
        },
      },
    );

    console.log(
      `=== Rollback complete: restored ${unifiedRestore.restored} ${TARGET_COLLECTION} documents from ${metadata.backupId} ===`,
    );

    return {
      rollbackId,
      backupId: metadata.backupId,
      preRollbackBackup,
      unifiedRestore,
      sourceRestores,
    };
  },

  async down() {
    console.log('Rollback rollback is not supported. Use a newer migration backup if you need to move forward again.');
  },
};

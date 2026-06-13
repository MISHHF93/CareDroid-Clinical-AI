module.exports = {
  async up(db) {
    const collectionName = 'unified_patients';
    const exists = await db.listCollections({ name: collectionName }).hasNext();

    if (!exists) {
      await db.createCollection(collectionName);
    }

    const collection = db.collection(collectionName);

    await collection.createIndex(
      { mrn: 1 },
      { name: 'idx_unified_patients_mrn', unique: true, sparse: true },
    );
    await collection.createIndex(
      { phn: 1 },
      { name: 'idx_unified_patients_phn', unique: true, sparse: true },
    );
    await collection.createIndex(
      { currentState: 1 },
      { name: 'idx_unified_patients_current_state' },
    );
    await collection.createIndex({ dpsScore: 1 }, { name: 'idx_unified_patients_dps_score' });
    await collection.createIndex(
      { boardingStartTime: 1 },
      { name: 'idx_unified_patients_boarding_start_time' },
    );
    await collection.createIndex(
      { mciBatchId: 1 },
      { name: 'idx_unified_patients_mci_batch_id' },
    );
    await collection.createIndex(
      { wearableDeviceId: 1 },
      { name: 'idx_unified_patients_wearable_device_id' },
    );
    await collection.createIndex(
      { 'triggeredProtocols.status': 1 },
      { name: 'idx_unified_patients_triggered_protocol_status' },
    );

    console.log('Unified patients collection and indexes created');
  },

  async down(db) {
    await db.collection('unified_patients').drop().catch(() => {});
  },
};


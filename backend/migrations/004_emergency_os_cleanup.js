// Emergency OS Migration - Remove non-emergency collections and indexes

module.exports = {
  async up(db) {
    console.log('=== Emergency OS Migration - Starting ===');

    // Collections to REMOVE (non-emergency)
    const collectionsToDrop = [
      'icus',
      'labs',
      'research_studies',
      'education_modules',
      'fleet_vehicles',
      'iot_devices',
      'digital_twins',
      'governance_policies',
      'command_centers',
    ];

    // Drop non-emergency collections
    for (const collectionName of collectionsToDrop) {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length > 0) {
        console.log(`Dropping collection: ${collectionName}`);
        await db.collection(collectionName).drop();
      } else {
        console.log(`Collection not found (skipping): ${collectionName}`);
      }
    }

    // Ensure core Emergency OS collections exist
    const coreCollections = ['patients', 'users', 'sessions', 'audit_logs'];

    for (const collectionName of coreCollections) {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        console.log(`Creating collection: ${collectionName}`);
        await db.createCollection(collectionName);
      }
    }

    // Add emergency-specific indexes to patients collection
    console.log('Adding emergency-specific indexes...');

    await db.collection('patients').createIndex(
      { ems_status: 1, eta_minutes: 1 },
      { name: 'idx_ems_inbound' },
    );

    await db.collection('patients').createIndex(
      { dps_score: 1, next_reassessment_due: 1 },
      { name: 'idx_reassessment_schedule' },
    );

    await db.collection('patients').createIndex(
      { current_state: 1, wait_time_minutes: -1 },
      { name: 'idx_queue_order' },
    );

    await db.collection('patients').createIndex(
      { triage_code: 1, current_state: 1 },
      { name: 'idx_triage_queue' },
    );

    // Remove any indexes from non-emergency fields
    const patientIndexes = await db.collection('patients').indexes();
    const emergencyIndexNames = [
      'idx_ems_inbound',
      'idx_reassessment_schedule',
      'idx_queue_order',
      'idx_triage_queue',
    ];

    for (const index of patientIndexes) {
      if (index.name !== '_id_' && !emergencyIndexNames.includes(index.name)) {
        console.log(`Removing legacy index: ${index.name}`);
        await db.collection('patients').dropIndex(index.name);
      }
    }

    console.log('=== Emergency OS Migration - Complete ===');
  },

  async down() {
    console.log('Rollback not supported for emergency OS migration');
    // This migration is one-way to ensure Emergency OS focus.
  },
};

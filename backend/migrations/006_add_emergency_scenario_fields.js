module.exports = {
  async up(db) {
    console.log('Adding emergency scenario fields to patients...');

    await db.collection('patients').updateMany(
      {},
      {
        $set: {
          decisionToAdmitTime: null,
          boardingStartTime: null,
          boardingStatus: 'not_boarded',
          boardTimeMinutes: null,
          virtualRecheckScheduled: false,
          virtualRecheckTime: null,
          virtualRecheckCompleted: false,
          safetyAlerts: [],
          continuousVitals: [],
          triggeredProtocols: [],
          mciBatchId: null,
          mciPatientNumber: null,
          triageColor: null,
          surgeActivationId: null,
          fieldTriageTime: null,
          dischargeReadinessScore: null,
          dischargeCriteriaMet: [],
          wearableDeviceId: null,
          lastWearableSync: null,
          lastModifiedBy: 'migration-006',
          modifiedAt: new Date(),
        },
      },
    );

    await db.collection('patients').createIndex({ boardingStartTime: 1 }, { name: 'idx_boarding_start_time' });
    await db
      .collection('patients')
      .createIndex({ boardingStatus: 1, boardingStartTime: 1 }, { name: 'idx_boarding_status_start' });
    await db.collection('patients').createIndex({ mciBatchId: 1 }, { name: 'idx_mci_batch_id' });
    await db.collection('patients').createIndex({ triageColor: 1 }, { name: 'idx_triage_color' });
    await db.collection('patients').createIndex({ virtualRecheckTime: 1 }, { name: 'idx_virtual_recheck_time' });
    await db
      .collection('patients')
      .createIndex({ 'triggeredProtocols.protocolId': 1 }, { name: 'idx_triggered_protocol_id' });

    console.log('Migration complete');
  },

  async down(db) {
    await db.collection('patients').updateMany(
      {},
      {
        $unset: {
          decisionToAdmitTime: '',
          boardingStartTime: '',
          boardingStatus: '',
          boardTimeMinutes: '',
          virtualRecheckScheduled: '',
          virtualRecheckTime: '',
          virtualRecheckCompleted: '',
          safetyAlerts: '',
          continuousVitals: '',
          triggeredProtocols: '',
          mciBatchId: '',
          mciPatientNumber: '',
          triageColor: '',
          surgeActivationId: '',
          fieldTriageTime: '',
          dischargeReadinessScore: '',
          dischargeCriteriaMet: '',
          wearableDeviceId: '',
          lastWearableSync: '',
          lastModifiedBy: '',
          modifiedAt: '',
        },
      },
    );

    const indexNames = [
      'idx_boarding_start_time',
      'idx_boarding_status_start',
      'idx_mci_batch_id',
      'idx_triage_color',
      'idx_virtual_recheck_time',
      'idx_triggered_protocol_id',
    ];

    for (const indexName of indexNames) {
      await db.collection('patients').dropIndex(indexName).catch(() => {});
    }
  },
};

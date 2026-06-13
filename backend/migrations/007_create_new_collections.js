module.exports = {
  async up(db) {
    const ensureCollection = async (name, options = {}) => {
      const exists = await db.listCollections({ name }).hasNext();
      if (!exists) {
        await db.createCollection(name, options);
      }
    };

    await ensureCollection('surge_events', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['type', 'activationTime', 'status'],
          properties: {
            type: { enum: ['mci', 'disaster', 'local_surge'] },
            estimatedPatientCount: { bsonType: 'int' },
            actualPatientCount: { bsonType: 'int' },
            activationTime: { bsonType: 'date' },
            deactivationTime: { bsonType: ['date', 'null'] },
            status: { enum: ['activated', 'deactivated'] },
          },
        },
      },
    });
    await db.collection('surge_events').createIndex({ status: 1, activationTime: -1 }, { name: 'idx_surge_status_time' });

    await ensureCollection('safety_incidents');
    await db.collection('safety_incidents').createIndex({ timestamp: -1 }, { name: 'idx_safety_timestamp' });
    await db.collection('safety_incidents').createIndex({ severity: 1 }, { name: 'idx_safety_severity' });

    await ensureCollection('virtual_rechecks');
    await db.collection('virtual_rechecks').createIndex({ scheduledTime: 1 }, { name: 'idx_virtual_recheck_schedule' });
    await db.collection('virtual_rechecks').createIndex({ patientId: 1 }, { name: 'idx_virtual_recheck_patient' });

    await ensureCollection('wearable_data');
    await db.collection('wearable_data').createIndex({ patientId: 1, timestamp: -1 }, { name: 'idx_wearable_patient_time' });
    await db.collection('wearable_data').createIndex({ deviceType: 1 }, { name: 'idx_wearable_device_type' });

    await ensureCollection('protocol_audit');
    await db.collection('protocol_audit').createIndex({ patientId: 1, triggeredAt: -1 }, { name: 'idx_protocol_patient_time' });
    await db.collection('protocol_audit').createIndex({ protocolId: 1, triggeredAt: -1 }, { name: 'idx_protocol_id_time' });

    console.log('All new collections created');
  },

  async down(db) {
    const collections = [
      'surge_events',
      'safety_incidents',
      'virtual_rechecks',
      'wearable_data',
      'protocol_audit',
    ];

    for (const collection of collections) {
      await db.collection(collection).drop().catch(() => {});
    }
  },
};

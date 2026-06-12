// Add patient verification fields for Smart Intake

module.exports = {
  async up(db) {
    console.log('Adding patient verification fields...');

    // Add verification fields to patients
    await db.collection('patients').updateMany(
      {},
      {
        $set: {
          verification_status: 'pending',
          verification_method: null,
          verified_at: null,
          verified_by: null,
        },
      },
    );

    // Add indexes for verification queries
    await db.collection('patients').createIndex(
      { verification_status: 1, created_at: 1 },
      { name: 'idx_verification_status' },
    );

    // Add MRN index with sparse (allows missing values)
    await db.collection('patients').createIndex(
      { mrn: 1 },
      { name: 'idx_mrn', sparse: true, unique: true },
    );

    console.log('Patient verification fields added');
  },

  async down(db) {
    await db.collection('patients').updateMany(
      {},
      {
        $unset: {
          verification_status: '',
          verification_method: '',
          verified_at: '',
          verified_by: '',
        },
      },
    );

    await db.collection('patients').dropIndex('idx_verification_status').catch(() => {});
    await db.collection('patients').dropIndex('idx_mrn').catch(() => {});
  },
};

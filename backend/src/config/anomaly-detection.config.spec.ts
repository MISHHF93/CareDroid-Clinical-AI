import anomalyDetectionConfig from './anomaly-detection.config';

describe('anomaly detection config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ANOMALY_DETECTION_ENABLED;
    delete process.env.ANOMALY_DETECTION_URL;
    delete process.env.ANOMALY_DETECTION_TIMEOUT;
    delete process.env.ANOMALY_DETECTION_RETRIES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses safe defaults when the integration is not configured', () => {
    expect(anomalyDetectionConfig()).toEqual({
      enabled: false,
      url: 'http://anomaly-detection:5000',
      timeout: 30000,
      retries: 3,
    });
  });

  it('parses explicit integration settings', () => {
    process.env.ANOMALY_DETECTION_ENABLED = 'true';
    process.env.ANOMALY_DETECTION_URL = 'https://anomaly.example.test';
    process.env.ANOMALY_DETECTION_TIMEOUT = '4500';
    process.env.ANOMALY_DETECTION_RETRIES = '5';

    expect(anomalyDetectionConfig()).toEqual({
      enabled: true,
      url: 'https://anomaly.example.test',
      timeout: 4500,
      retries: 5,
    });
  });
});

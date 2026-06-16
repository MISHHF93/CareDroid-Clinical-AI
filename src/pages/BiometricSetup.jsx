import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAxios } from '../services/apiClient';
import './BiometricSetup.css';
import appConfig from '../config/appConfig';
import logger from '../utils/logger';
import { reportApiError } from '../services/apiErrorHandling';
import { useNotificationActions } from '../hooks/useNotificationActions';

const BiometricSetup = () => {
  const navigate = useNavigate();
  const { success } = useNotificationActions();
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [error, setError] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [stats, setStats] = useState(null);
  const [biometricApi, setBiometricApi] = useState(null);
  const [biometricReady, setBiometricReady] = useState(false);

  useEffect(() => {
    if (!appConfig.features.enableBiometricAuth) {
      return;
    }
    const loadBiometricApi = async () => {
      try {
        const moduleName = '@capacitor/biometric';
        const module = await import(/* @vite-ignore */ moduleName);
        setBiometricApi(module);
        setBiometricReady(true);
      } catch (err) {
        logger.error('Biometric plugin not available', { err });
        setError('Biometric plugin is not available in this build.');
        setBiometricAvailable(false);
      }
    };

    loadBiometricApi();
  }, []);

  useEffect(() => {
    if (!biometricReady || !biometricApi) {
      return;
    }

    checkBiometricAvailability();
    loadBiometricConfig();
  }, [biometricReady, biometricApi]);

  const checkBiometricAvailability = async () => {
    if (!biometricApi?.NativeBiometric) {
      return;
    }
    try {
      const token = localStorage.getItem('caredroid_access_token');
      const [deviceResult, serverResponse] = await Promise.all([
        biometricApi.NativeBiometric.isAvailable(),
        apiAxios.get('/api/auth/biometric/available', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const serverAvailable = serverResponse.data?.serverSupport !== false;
      setBiometricAvailable(Boolean(deviceResult.isAvailable && serverAvailable));
      setBiometricType(deviceResult.biometryType); // 'fingerprint', 'face', 'iris'
    } catch (err) {
      logger.error('Biometric not available', { err });
      reportApiError({
        title: 'Biometric availability check failed',
        message: 'Unable to verify biometric support with the backend.',
        error: err,
        endpoint: '/api/auth/biometric/available',
      });
      setBiometricAvailable(false);
    }
  };

  const loadBiometricConfig = async () => {
    setConfigLoading(true);
    try {
      const token = localStorage.getItem('caredroid_access_token');
      const response = await apiAxios.get('/api/auth/biometric/config', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.configs && response.data.configs.length > 0) {
        setEnrolled(true);
      }

      // Load stats
      const statsResponse = await apiAxios.get('/api/auth/biometric/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(statsResponse.data.stats);
    } catch (err) {
      logger.error('Failed to load biometric config', { err });
      reportApiError({
        title: 'Biometric config load failed',
        message: 'Unable to load biometric device configuration.',
        error: err,
        endpoint: '/api/auth/biometric/config',
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleEnrollBiometric = async () => {
    if (!biometricApi?.NativeBiometric) {
      setError('Biometric plugin is not available.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Get device ID
      const deviceId = await getDeviceId();
      const deviceName = await getDeviceName();

      // Call backend to enroll
      const token = localStorage.getItem('caredroid_access_token');
      const response = await apiAxios.post(
        '/api/auth/biometric/enroll',
        {
          biometricType: biometricType || 'fingerprint',
          deviceId,
          deviceName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Store challenge token securely
      const { challengeToken } = response.data;
      await biometricApi.NativeBiometric.setCredentials({
        username: 'caredroid_user',
        password: challengeToken,
        server: 'caredroid-ai.com',
      });

      setEnrolled(true);
      setError(null);

      success('Biometric authentication enabled', 'This device is now enrolled for biometric sign-in.');
      loadBiometricConfig();
    } catch (err) {
      logger.error('Failed to enroll biometric', { err });
      reportApiError({
        title: 'Biometric enrollment failed',
        message: 'Unable to enable biometric authentication.',
        error: err,
        endpoint: '/api/auth/biometric/enroll',
      });
      setError(err.response?.data?.message || 'Failed to enable biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleTestBiometric = async () => {
    if (!biometricApi?.NativeBiometric) {
      setError('Biometric plugin is not available.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Retrieve stored credentials
      const credentials = await biometricApi.NativeBiometric.getCredentials({
        server: 'caredroid-ai.com',
      });

      // Prompt biometric authentication
      const biometricOptions = {
        reason: 'Authenticate with biometrics',
        title: 'CareDroid-Clinical-AI authentication',
        subtitle: 'Use your biometric to login',
        description: 'Place your finger on the sensor',
      };

      await biometricApi.NativeBiometric.verifyIdentity(biometricOptions);

      // If verification succeeds, call backend
      const deviceId = await getDeviceId();
      const userId = getUserIdFromToken();

      const response = await apiAxios.post('/api/auth/biometric/verify', {
        userId,
        deviceId,
        challengeResponse: credentials.password,
      });

      logger.info('Biometric verification successful', { data: response.data });
      success('Biometric test passed', 'This device can verify biometric authentication.');
    } catch (err) {
      logger.error('Biometric test failed', { err });
      reportApiError({
        title: 'Biometric verification failed',
        message: 'Unable to verify biometric authentication.',
        error: err,
        endpoint: '/api/auth/biometric/verify',
      });
      setError('Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableBiometric = async () => {
    if (!biometricApi?.NativeBiometric) {
      setError('Biometric plugin is not available.');
      return;
    }
    if (!confirm('Are you sure you want to disable biometric authentication?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('caredroid_access_token');
      const deviceId = await getDeviceId();

      await apiAxios.delete(`/api/auth/biometric/delete/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Delete stored credentials
      await biometricApi.NativeBiometric.deleteCredentials({
        server: 'caredroid-ai.com',
      });

      setEnrolled(false);
      setError(null);

      success('Biometric authentication disabled', 'This device is no longer enrolled.');
      loadBiometricConfig();
    } catch (err) {
      logger.error('Failed to disable biometric', { err });
      reportApiError({
        title: 'Biometric disable failed',
        message: 'Unable to delete biometric device configuration.',
        error: err,
        endpoint: '/api/auth/biometric/delete/:deviceId',
      });
      setError('Failed to disable biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceId = async () => {
    const storageKey = 'caredroid_biometric_device_id';
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;

    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `device_${crypto.randomUUID()}`
        : `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, generated);
    return generated;
  };

  const getDeviceName = async () => {
    // In production, use Capacitor Device plugin
    return 'Mobile Device';
  };

  const getUserIdFromToken = () => {
    const token = localStorage.getItem('caredroid_access_token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub;
    } catch {
      return null;
    }
  };

  if (!appConfig.features.enableBiometricAuth) {
    return (
      <div className="biometric-setup">
        <div className="biometric-container">
          <div className="biometric-unavailable">
            <h2>🔒 Biometric Disabled</h2>
            <p>Biometric authentication is disabled by configuration.</p>
            <button onClick={() => navigate('/settings')} className="btn-secondary">
              Back to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!biometricAvailable) {
    return (
      <div className="biometric-setup">
        <div className="biometric-container">
          <div className="biometric-unavailable">
            <h2>⚠️ Biometric Not Available</h2>
            <p>
              Your device does not support biometric authentication, or it is not configured.
            </p>
            <p>Please set up fingerprint or face recognition in your device settings.</p>
            <button onClick={() => navigate('/settings')} className="btn-secondary">
              Back to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="biometric-setup">
      <div className="biometric-container">
        <div className="biometric-header">
          <h1>Biometric Authentication</h1>
          <p>
            Secure your CareDroid-Clinical-AI account with {biometricType === 'face' ? 'Face ID' : 'fingerprint'}
          </p>
        </div>

        <div className="biometric-status">
          {enrolled ? (
            <div className="status-enrolled">
              <div className="status-icon">✓</div>
              <h3>Biometric Enabled</h3>
              <p>Your device is enrolled for biometric authentication</p>
            </div>
          ) : (
            <div className="status-not-enrolled">
              <div className="status-icon">🔒</div>
              <h3>Not Enrolled</h3>
              <p>Enable biometric authentication for quick and secure login</p>
            </div>
          )}
        </div>

        {configLoading && (
          <div className="biometric-stats" role="status" aria-live="polite">
            <h3>Loading biometric settings...</h3>
            <p>Checking enrolled devices and usage statistics.</p>
          </div>
        )}

        {stats && (
          <div className="biometric-stats">
            <h3>Usage Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{stats.totalDevices}</div>
                <div className="stat-label">Enrolled Devices</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.totalUsages}</div>
                <div className="stat-label">Total Logins</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {stats.lastUsed ? new Date(stats.lastUsed).toLocaleDateString() : 'Never'}
                </div>
                <div className="stat-label">Last Used</div>
              </div>
            </div>
          </div>
        )}

        <div className="biometric-info">
          <h3>How It Works</h3>
          <ul>
            <li>🔐 Your biometric data never leaves your device</li>
            <li>🚀 Quick login without entering password</li>
            <li>✨ Enhanced security with hardware-backed authentication</li>
            <li>🔄 Fallback to password if biometric fails</li>
          </ul>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="biometric-actions">
          {!enrolled ? (
            <>
              <button
                onClick={handleEnrollBiometric}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Enrolling...' : 'Enable Biometric Authentication'}
              </button>
              <button onClick={() => navigate('/settings')} className="btn-secondary">
                Maybe Later
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleTestBiometric}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Testing...' : 'Test Biometric Login'}
              </button>
              <button
                onClick={handleDisableBiometric}
                className="btn-danger"
                disabled={loading}
              >
                {loading ? 'Disabling...' : 'Disable Biometric'}
              </button>
              <button onClick={() => navigate('/settings')} className="btn-secondary">
                Back to Settings
              </button>
            </>
          )}
        </div>

        <div className="biometric-notice">
          <p>
            <strong>Note:</strong> Biometric authentication is a convenience feature.
            You can always use your password to login.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BiometricSetup;

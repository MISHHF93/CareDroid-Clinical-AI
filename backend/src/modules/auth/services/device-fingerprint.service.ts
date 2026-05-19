import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Device Fingerprinting Service
 *
 * Creates device fingerprints from request metadata for:
 * - Anomaly detection (login from new device)
 * - Device tracking (remember this device)
 * - Risk scoring
 */
@Injectable()
export class DeviceFingerprintService {
  /**
   * Generate device fingerprint from request
   * Components:
   * - User-Agent
   * - IP address
   * - Accept headers
   */
  generateFingerprint(req: any): string {
    const components = {
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: this.normalizeIpAddress(req.ip),
      acceptLanguage: req.headers['accept-language'] || 'unknown',
      acceptEncoding: req.headers['accept-encoding'] || 'unknown',
    };

    const fingerprintString = Object.values(components).join('|');
    return createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Normalize IP address (handling IPv6 proxies)
   */
  private normalizeIpAddress(ip: string): string {
    if (!ip) return 'unknown';

    // Handle X-Forwarded-For header (proxy scenarios)
    if (ip.includes(',')) {
      return ip.split(',')[0].trim();
    }

    // Remove IPv6 mappings
    if (ip.startsWith('::ffff:')) {
      return ip.slice(7);
    }

    return ip;
  }

  /**
   * Calculate similarity between fingerprints (0 = different, 1 = identical)
   */
  calculateSimilarity(fingerprint1: string, fingerprint2: string): number {
    if (fingerprint1 === fingerprint2) return 1;
    return 0; // Binary comparison - no fuzzy matching
  }

  /**
   * Detect anomalies in device access pattern
   * Returns risk score (0 = low risk, 1 = high risk)
   */
  detectAnomalies(
    currentFingerprint: string,
    previousDevices: Array<{ fingerprint: string; lastUsedAt: Date }>,
  ): { riskScore: number; anomalies: string[] } {
    const anomalies: string[] = [];
    let riskScore = 0;

    if (!previousDevices || previousDevices.length === 0) {
      anomalies.push('first_device');
      riskScore = 0.3; // Lower risk for first device
      return { riskScore, anomalies };
    }

    // Check if fingerprint matches any known device
    const fingerprintMatches = previousDevices.some((d) => d.fingerprint === currentFingerprint);

    if (!fingerprintMatches) {
      anomalies.push('new_device_detected');
      riskScore = 0.7;

      // Additional risk if multiple new devices in short time
      const recentNewDevices = previousDevices.filter((d) => {
        const daysSinceUse = (Date.now() - d.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUse < 7;
      });

      if (recentNewDevices.length >= 2) {
        anomalies.push('multiple_new_devices_recently');
        riskScore = 0.9;
      }
    }

    return { riskScore, anomalies };
  }
}

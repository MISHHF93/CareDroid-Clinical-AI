# CareDroid — Enterprise Threat Model (STRIDE Methodology)

**Document Version:** 2.2.0  
**Status:** Living Security Threat Analysis  
**Lead Authors:** Principal Security Architect, DevSecOps Lead  
**Framework:** Microsoft STRIDE Threat Model for Clinical Systems  

---

## 1. Threat Analysis Matrix

| STRIDE Category | Clinical Threat Scenario | Severity | Mitigation Architecture |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Adversary attempts to impersonate an attending physician to sign narcotic medication orders. | **Critical** | Asymmetric RS256 JWT tokens with short 15-min expiry; MFA required for high-risk order signatures. |
| **Tampering** | Man-in-the-middle manipulation of streaming ECG or vital signs to disguise cardiac ischemia. | **High** | End-to-end mTLS 1.3 encryption on all telemetry streams; HMAC-SHA256 message signing. |
| **Repudiation** | Clinician disputes having over-ridden a CTAS Level 1 sepsis alert. | **High** | Cryptographically chained, append-only immutable audit trail recording user ID, IP hash, and timestamp. |
| **Information Disclosure** | Unauthorized extraction of patient MRN, names, or provincial health numbers from browser memory or logs. | **Critical** | Zero PHI in application logs; automated client-side data masking on public display surfaces; AES-256 storage encryption. |
| **Denial of Service** | DDoS attack flooding emergency WebSocket gateway during mass-casualty incident. | **Critical** | Cloudflare Magic Transit DDoS mitigation; IP rate-limiting via Redis token bucket; local-first offline fallback. |
| **Elevation of Privilege** | Reception clerk manipulating client-side state to gain administrative or prescribing permissions. | **Critical** | Server-side authorization enforcement via NestJS `RolesGuard` and `canonicalAccess.ts`; client-declared roles never trusted. |

---


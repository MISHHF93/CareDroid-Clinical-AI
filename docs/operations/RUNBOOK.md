# CareDroid — Operations Runbook & Incident Response

**Document Version:** 3.0.0  
**Status:** Canonical Operations Runbook & SRE Procedures  
**Lead Authors:** DevSecOps Lead, Site Reliability Engineer, Clinical Operations Lead  
**On-Call Tier:** Level 1 Acute Care SRE On-Call (24/7/365 PagerDuty)  
**Classification:** Enterprise Healthcare Architecture & Due Diligence Authority  

---

## 1. Routine Clinical Environment Diagnostics

### 1.1 Environment Diagnostic Health Check
Before commencing clinical shifts, upgrades, or code modifications, run the diagnostic harness:

```bash
npm run doctor
```

**Diagnostic Verifications Performed:**
1. Node.js (≥ 20.x) and npm runtime environment health.
2. Frontend development port (`:3000`) and Backend NestJS port (`:8000`) availability.
3. Database connection pool and TypeORM entity schema synchronization.
4. Active developer persona (`DEV PERSONA`) reporting from `enrichDemoIdentityFallback`.
5. Living documentation sync status against `docs/generated/`.

### 1.2 Local Stack Orchestration
To start the unified development environment (Vite on `:3000`, NestJS on `:8000`, `/api` transparently proxied):

```bash
npm install && npm --prefix backend install
npm start
```

---

## 2. Emergency Incident Response Procedures

### 2.1 Incident Class 1: Hospital Network Partition / Cloud Outage
- **Symptoms:** Topbar pulse indicator turns Amber/Red; Prometheus alert `CloudUplinkHeartbeatLost`.
- **Automated System Response:**
  1. Frontend immediately switches to local-first mode (`emergencyOsStore` buffers actions to IndexedDB via Dexie.js).
  2. Local Clinical Edge Gateways maintain autonomous monitoring and pod tracking boards over the hospital LAN.
- **SRE Recovery Protocol:**
  1. Verify local LAN status at physical switches.
  2. Confirm on-premise edge gateway services are active: `docker compose ps` on edge node.
  3. Upon wide-area internet recovery, monitor the burst synchronization worker: verify `sync_status = COMPLETED` and zero dropped vital records.

### 2.2 Incident Class 2: Database Replication Lag Exceeding 1.0s
- **Symptoms:** Alert `PostgresReplicationLagSeconds > 1.0` fired; potential stale bed state on whiteboard.
- **Root Causes:** Heavy reporting queries or burst writes during sudden mass-casualty intake.
- **Action Plan:**
  1. Divert all read traffic immediately to primary PostgreSQL node via connection pool re-routing:
     ```bash
     kubectl patch configmap caredroid-config --type merge -p '{"data":{"DB_FORCE_PRIMARY_READS":"true"}}'
     ```
  2. Identify and terminate long-running queries blocking WAL replication:
     ```sql
     SELECT pid, query, age(clock_timestamp(), query_start) 
     FROM pg_stat_activity 
     WHERE state != 'idle' AND age(clock_timestamp(), query_start) > interval '30 seconds';
     ```
  3. Confirm replication lag drops below 200 milliseconds before restoring read-replica routing.

### 2.3 Incident Class 3: Emergency WebSocket Gateway Storm / Reconnection Surge
- **Symptoms:** Redis CPU spike > 85%; WebSocket gateway latency exceeds 500ms.
- **Action Plan:**
  1. Inspect active connection count on NestJS `/emergency-os` gateway.
  2. Enable exponential backoff jitter on client reconnect configurations.
  3. Scale backend WebSocket worker pods horizontally:
     ```bash
     kubectl scale deployment caredroid-backend --replicas=10
     ```

---

## 3. Clinical On-Call Escalation Matrix

```
[Level 1: Clinical User Issue] (Desk Nurse / Physician)
├── Report submitted via ⌘K > "Report Issue" or urgent phone to ED Charge Nurse Desk
└── If software error verified -> PagerDuty auto-escalates to Level 2

[Level 2: Hospital Health Informatics Lead / Local IT]
├── Diagnostic check (npm run doctor / health probe status)
├── Checks hospital local LAN & Edge Gateway appliance status
└── If core system down -> Escalates to CareDroid 24/7 SRE Team (< 5 min SLA)

[Level 3: CareDroid SRE & Principal Systems Architect]
├── Cloud enclave failover / database restart / hotfix deployment
└── Post-incident review: mandatory RCA committed to docs/operations/ within 24 hours
```

---

*This runbook defines the operational, diagnostic, and emergency disaster recovery procedures for CareDroid.*


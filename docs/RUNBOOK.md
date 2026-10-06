# CareDroid — Operations Runbook & Incident Response

**Document Version:** 2.2.0  
**Status:** Canonical Operations Runbook  
**Lead Authors:** DevSecOps Lead, Site Reliability Engineer  
**Emergency Pager Duty:** Level 1 Acute Care On-Call  

---

## 1. Routine Clinical Environment Diagnostics

### 1.1 Fast Environment Diagnostic Check
```bash
npm run doctor
```
Diagnoses:
- Node.js & npm runtime versions.
- Frontend port (:3000) and Backend port (:8000) availability.
- PostgreSQL / SQLite connectivity.
- Active Developer Persona (`DEV PERSONA`).
- TypeORM entity and database migration alignment.

### 1.2 Starting Local Full-Stack Development
```bash
npm install && npm --prefix backend install
npm start           # Frontend on :3000, Backend on :8000, /api automatically proxied
```

---

## 2. Emergency Incident Procedures

### 2.1 Scenario A: Hospital Network Partition / Internet Outage
1. **System Behavior:** Frontend enters local-first fallback mode; IndexedDB stores active patient triage changes.
2. **Clinical Action:** Triage nurses continue vital entries locally; visual banner confirms offline state.
3. **Recovery:** Once connectivity is restored, frontend transmits queued actions via burst synchronization.

### 2.2 Scenario B: Database Replication Lag Exceeding 1.0s
1. **Detection:** Prometheus alert `PostgresReplicationLagSeconds > 1.0`.
2. **Action:** Read traffic is immediately diverted to the primary database instance to prevent stale bed states on Whiteboards.

---


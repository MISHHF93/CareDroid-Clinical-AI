# CareDroid — Data Architecture & Persistence Specification

**Document Version:** 2.2.0  
**Status:** Living Data Architecture Specification  
**Lead Authors:** Principal Data Architect, Senior Backend Lead  
**Databases:** PostgreSQL 16+ (Production), SQLite 3.40+ (Local Dev / Edge Runtime), Redis 7.x  

---

## 1. Relational Entity Relationship Topology

CareDroid models the clinical acute care journey through normalized, relational entity tables managed via TypeORM:

```mermaid
erDiagram
    PATIENT ||--o{ ENCOUNTER : "has"
    ENCOUNTER ||--o{ VITAL_RECORD : "records"
    ENCOUNTER ||--o{ CLINICAL_ORDER : "generates"
    ENCOUNTER ||--o{ AUDIT_LOG : "triggers"
    ENCOUNTER }o--|| BED_LOCATION : "occupies"
    PRACTITIONER ||--o{ ENCOUNTER : "attends"
    PRACTITIONER ||--o{ CLINICAL_ORDER : "signs"
    EMS_INCIDENT ||--o| ENCOUNTER : "transfers"

    PATIENT {
        uuid id PK
        string mrn UK
        string provincialHealthNumber
        string firstName
        string lastName
        date birthDate
        string gender
        jsonb emergencyContact
    }

    ENCOUNTER {
        uuid id PK
        uuid patientId FK
        string encounterNumber UK
        string status
        string ctasLevel
        timestamp arrivalTime
        timestamp triageTime
        timestamp dischargeTime
        string chiefComplaint
        uuid assignedBedId FK
        uuid assignedPhysicianId FK
    }

    VITAL_RECORD {
        uuid id PK
        uuid encounterId FK
        timestamp recordedAt
        int heartRate
        int systolicBp
        int diastolicBp
        int respiratoryRate
        float oxygenSaturation
        float temperatureCelsius
        int painScore
        boolean isSepsisAlert
    }

    CLINICAL_ORDER {
        uuid id PK
        uuid encounterId FK
        uuid practitionerId FK
        string orderType
        string medicationCode
        float dosageQuantity
        string dosageUnits
        string status
        timestamp orderedAt
        timestamp verifiedAt
    }
```

---

## 2. Environment Parity & Migration Policy

1. **Development Environment:** SQLite with TypeORM `synchronize: true` for zero-friction local developer testing.
2. **Production Environment:** PostgreSQL 16 with multi-AZ replication.
3. **Migration Verification Gate:**
   - Any modification to a TypeORM entity requires running:
     ```bash
     npm run db:migration -- <PascalCaseName>
     ```
   - Automated CI executes `npm run db:verify`, booting a throwaway Docker Postgres container, executing the complete migration chain, and failing if the schema differs from TypeORM entities by even a single column or constraint.

---


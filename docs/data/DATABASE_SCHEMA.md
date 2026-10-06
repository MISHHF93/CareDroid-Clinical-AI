# CareDroid — Database Schema & Data Dictionary

**Document Version:** 2.2.0  
**Status:** Living Schema Specification  
**Database:** PostgreSQL 16  
**ORM:** TypeORM  

---

## 1. Primary Table Schemas

### 1.1 `patients`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique immutable patient system identifier. |
| `mrn` | `VARCHAR(32)` | UNIQUE, NOT NULL | Medical Record Number. |
| `health_card_number` | `VARCHAR(32)` | NULLABLE | Provincial health card number (encrypted AES-256). |
| `first_name` | `VARCHAR(64)` | NOT NULL | Patient given legal name. |
| `last_name` | `VARCHAR(64)` | NOT NULL | Patient family name. |
| `birth_date` | `DATE` | NOT NULL | Patient birth date. |
| `gender` | `VARCHAR(16)` | NOT NULL | Administrative gender. |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT NOW() | System creation timestamp. |

### 1.2 `encounters`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique emergency encounter identifier. |
| `patient_id` | `UUID` | FK -> patients.id | Associated patient reference. |
| `encounter_number` | `VARCHAR(32)` | UNIQUE, NOT NULL | Human-readable visit identifier (e.g. `ED-2026-08492`). |
| `status` | `VARCHAR(24)` | NOT NULL | `arrived`, `triaged`, `in_pod`, `admitted`, `discharged`. |
| `ctas_level` | `INT` | CHECK (1 <= ctas_level <= 5) | Assigned Canadian Triage Acuity score. |
| `assigned_bed_id` | `UUID` | NULLABLE | Allocated stretcher / room location. |
| `arrival_time` | `TIMESTAMP` | NOT NULL | Timestamp of initial presentation at reception/triage. |
| `triage_time` | `TIMESTAMP` | NULLABLE | Timestamp of triage completion. |
| `discharge_time` | `TIMESTAMP` | NULLABLE | Timestamp of final disposition discharge or transfer. |

### 1.3 `vitals`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY | Unique measurement record identifier. |
| `encounter_id` | `UUID` | FK -> encounters.id | Associated encounter reference. |
| `heart_rate` | `INT` | NULLABLE | Heart rate in beats per minute. |
| `systolic_bp` | `INT` | NULLABLE | Systolic blood pressure (mmHg). |
| `diastolic_bp` | `INT` | NULLABLE | Diastolic blood pressure (mmHg). |
| `respiratory_rate` | `INT` | NULLABLE | Breaths per minute. |
| `oxygen_sat` | `NUMERIC(4,1)` | NULLABLE | SpO2 percentage. |
| `temp_celsius` | `NUMERIC(4,2)` | NULLABLE | Body temperature in Celsius. |
| `is_sepsis_risk` | `BOOLEAN` | DEFAULT FALSE | Automated SIRS / qSOFA flag. |
| `recorded_at` | `TIMESTAMP` | NOT NULL | Timestamp of vital measurement. |

---


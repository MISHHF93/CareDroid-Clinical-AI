# CareDroid Solution Packs

CareDroid sells **configured hospital solutions** through asset packs, not flat tool lists. Each pack is a manifest of platform assets (tools, calculators, dashboards, simulations, AI agents) assigned to organizations by type, role, and subscription tier.

## Pack catalog (seeded)

| Pack ID | Name | Target buyer | Tier |
|---------|------|--------------|------|
| `core-platform` | Core Platform | All segments | Core |
| `emergency-department-pack` | Emergency Department Pack | ED director / hospital operations | Enterprise |
| `emergency-medicine` | Emergency Medicine Pack | Hospital, EMS | Enterprise |
| `icu-pack` | ICU Pack | Critical care leadership | Enterprise |
| `cardiology-pack` | Cardiology Pack | Cardiology service line | Standard |
| `laboratory-intelligence` | Laboratory Pack | Lab medical director | Standard |
| `hospital-operations` | Hospital Operations Pack | COO / facilities | Enterprise |
| `medical-iot-pack` | Medical IoT Pack | Biomedical engineering | Enterprise |
| `fleet-logistics` | Fleet & EMS Pack | EMS / transport | Standard |
| `simulation-training-pack` | Simulation Pack | GME / nursing education | Standard |
| `governance-compliance-pack` | Governance Pack | Compliance officer | Add-on |
| `digital-twin-pack` | Digital Twin Pack | Operations command center | Enterprise |
| `ai-workflow-pack` | AI Workflow Pack | CMIO / clinical informatics | Enterprise |
| `research-education` | Research Pack | University / research institute | Standard |

## Example: Emergency Department Pack

**Target buyer:** ED director, hospital operations  
**Target users:** Emergency physician, nurse, triage team  

**Outcomes:**
- Faster risk stratification (qSOFA, NEWS2, SOFA, HEART)
- Standardized triage and protocol access
- Simulation training for deterioration and trauma
- AI-assisted decision support (single assistant gateway)

**Included assets (representative):**
- Emergency calculators and scores
- ACLS/ATLS protocols
- Simulation suite and scenario player
- Hospital map (operational context)

**Required integrations (roadmap):** FHIR Patient, Observation, DiagnosticReport (see interoperability pack)

**Implementation complexity:** Medium — primarily configuration; no code fork per hospital.

## Configuration model

```text
Organization (tenant)
  → enabledAssetPacks (OrganizationEntitlement)
  → Workspaces (enabledAssets / legacy enabledToolIds)
  → Users (roleProfileId, pinned/hidden assets)
  → Subscription tier (pricingTier on packs)
```

Enable packs via:
- API: `POST /api/platform/organizations/:orgId/packs/:packId/install`
- UI: `/asset-packs` or `/settings/organization/packs`

## API references

- `GET /api/platform/packs` — catalog
- `GET /api/platform/context` — entitlements for current user
- `GET /api/platform/users/me/assets` — access states per asset
- `GET /api/platform/users/me/recommendations` — role/workspace recommendations

## Product catalog (sellable suites)

| Product slug | Asset packs |
|--------------|-------------|
| `emergency-department-suite` | `emergency-department-pack`, `emergency-medicine` |
| `icu-suite` | `icu-pack` |
| `cardiology-suite` | `cardiology-pack` |
| `laboratory-suite` | `laboratory-intelligence` |
| `medical-iot-suite` | `medical-iot-pack` |
| `fleet-ems-suite` | `fleet-logistics` |
| `digital-twin-suite` | `digital-twin-pack` |
| `simulation-training-suite` | `simulation-training-pack` |
| `governance-compliance-suite` | `governance-compliance-pack` |
| `research-suite` | `research-education` |

Browse products at `/products`. See [commercial-plans.md](./commercial-plans.md).

See [caredroid-platform-transformation-roadmap.md](./caredroid-platform-transformation-roadmap.md) for migration phases.

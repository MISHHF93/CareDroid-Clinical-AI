# Buyer and Stakeholder Mapping

## Summary

Buyer and stakeholder metadata is now first-class catalog data for every CareDroid product and asset pack. The mapping helps commercial, implementation, and admin workflows explain who buys each offering, who approves it, which stakeholders are involved, and what outcomes the offering is expected to drive.

## Metadata Contract

Products and asset packs now expose:

- `buyerPersona`: the commercial buyer personas for the product or pack.
- `decisionMaker`: the executive or operational decision makers required to approve adoption.
- `stakeholders`: teams affected by implementation, rollout, and ongoing use.
- `expectedOutcomes`: the measurable commercial or operational outcomes the buyer expects.

Existing `targetBuyers`, product `outcomes`, and pack `salesMetadata` remain compatible and are preserved.

## Product Mapping

Every seeded product receives buyer metadata. Existing product `targetBuyers` and `outcomes` are normalized into the new fields so all product builder and detail responses include buyer context.

Examples:

- Emergency Department Solution: ED Director, Chief Medical Officer, ED clinicians, triage teams, faster risk stratification, standardized triage.
- Hospital Operations Solution: COO, Operations Director, facilities, bed management, incident command, capacity visibility.
- Medical IoT Solution: Biomedical Engineering Lead, clinical engineering, device managers, IT operations, device uptime.
- Governance & Compliance Solution: CIO, Compliance Officer, privacy, security, safety reviewers, audit readiness, AI governance.

## Asset Pack Mapping

Every seeded asset pack now has explicit buyer metadata in `SEED_ASSET_PACKS`.

Required examples are covered:

- Emergency Department Pack: ED Director, Chief Medical Officer.
- Laboratory Intelligence Pack: Laboratory Director.
- Medical IoT Pack: Biomedical Engineering Lead.
- Fleet & EMS Pack: EMS Director.
- Governance Pack: CIO, Compliance Officer.

Additional packs, including Core Platform, ICU Pack, Cardiology Pack, Digital Twin Pack, Simulation & Training Pack, Research Pack, and AI Workflow Pack, are also mapped.

## API and UI

Catalog serializers now return buyer metadata for:

- Product builder responses.
- Product detail responses.
- Asset pack builder responses.
- Product detail pack sections.

The commercial product and asset pack pages render buyer persona, decision maker, stakeholders, and expected outcomes alongside existing target buyer, role, workspace, backend, and route information.

## Verification

Completed checks:

- `cd backend && npm test -- src/modules/product-catalog/product-catalog.service.spec.ts`
- `npm run test:run -- src/pages/commercial/CommercialPages.test.jsx`
- `cd backend && npm run build`

The backend tests verify seed coverage and serializer output. The frontend tests verify buyer metadata renders on product and asset pack commercial surfaces.

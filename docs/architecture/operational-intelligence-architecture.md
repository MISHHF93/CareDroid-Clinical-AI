# Operational Intelligence Architecture

## Layer name

`CareDroidOperationalIntelligence`

## Purpose

Always-on advisory operational intelligence for Emergency OS. Watches department inputs, scores operational pressure, detects anomalies, and routes recommendations to humans. No autonomous clinical actions.

## Components

1. **Input collectors** — emergency store, central node, workflow logs, API health, websocket sync
2. **OperationalIntelligenceService (backend)** — rule-based pipeline over central node snapshot
3. **careDroidOperationalIntelligence.ts (frontend)** — local builder for offline/demo parity
4. **useOperationalIntelligence** — polling + store-backed snapshot for UI modules

## Modes

- `rule_based` (default) — production-safe baseline
- `ml_assisted` — reserved for future approved operational models
- `hybrid` — reserved

## Safety

- `humanReviewRequired: true` on all predictions and recommendations
- Blocked autonomous actions enumerated in snapshot
- Disclaimers for operational, clinical, and external data contexts

## API

- `GET /api/emergency/operational-intelligence/snapshot`
- `GET /api/emergency/operational-intelligence/model-health`
- `GET /api/emergency/operational-intelligence/alerts`
- `POST /api/emergency/operational-intelligence/evaluate`

# Operational Intelligence Data Flow

```mermaid
flowchart LR
  subgraph inputs [Inputs]
    Store[emergencyStore]
    Engines[capacity/reassessment/alert engines]
    WS[emergencyRealtimeService]
    API[Emergency OS APIs]
  end

  subgraph pipeline [CareDroidOperationalIntelligence]
    CN[CareDroidCentralNode snapshot]
    OI[Operational intelligence builder]
  end

  subgraph outputs [Advisory Outputs]
    Header[AppShell Header badge]
    NC[Notification Center]
    WB[Whiteboard badges]
    Analytics[Analytics card]
    Copilot[ED Copilot context]
    Settings[Operational Intelligence settings]
  end

  Store --> CN
  Engines --> Store
  WS --> Store
  API --> CN
  CN --> OI
  OI --> Header
  OI --> NC
  OI --> WB
  OI --> Analytics
  OI --> Copilot
  OI --> Settings
```

## Processing stages

1. Validation — settings gate (`operationalIntelligenceEnabled`)
2. Normalization — central node feature vector
3. Rule evaluation — capacity, EMS, boarding, queues, reassessment
4. Anomaly detection — stale data, queue breach, capacity red band
5. Recommendation generation — advisory staff actions only
6. Alert generation — optional via `autoAlertingEnabled`
7. Audit logging — workflow logs surfaced in snapshot

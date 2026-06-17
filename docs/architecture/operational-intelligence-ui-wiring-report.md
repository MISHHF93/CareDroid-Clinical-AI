# Operational Intelligence UI Wiring Report

## Wired surfaces

| Surface | Hook / source | What is shown |
|---------|---------------|---------------|
| AppShell Header | `useOperationalIntelligence` | OI mode pill, data freshness, intelligence alerts in Notification Center |
| Notification Center | Header merge | Operational intelligence advisory alerts |
| Whiteboard | `useOperationalIntelligence` | Intelligence badges in command layer header |
| Analytics | `useOperationalIntelligence` | Operational Intelligence / model health card |
| ED Copilot | `useOperationalIntelligence` | Snapshot context in department prompt |
| Settings | `operational-intelligence` section | Enable/mode/monitoring/polling controls |

## Not changed (by design)

- No new isolated dashboards
- Existing central node command strip preserved
- Page layouts unchanged; badges/cards added within existing sections

## Polling

`useOperationalIntelligence({ realtime: true })` polls backend snapshot on `operationalIntelligencePollingInterval` (default 30s) when enabled.

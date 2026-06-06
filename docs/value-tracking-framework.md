# Value Tracking Framework

The Value Tracking Framework gives hospital leaders a single view of clinical, operational, and executive value signals. The user-facing dashboard is available at `/value-tracking`; the backend source is `GET /organizations/:organizationId/value-tracking`.

## Metric Categories

### Clinical

- Protocol adherence tracks protocol activity that includes adherence, compliance, or completion signals.
- Simulation completion tracks completed simulation runs from usage metering and audit events.
- Calculator usage tracks calculator launches from metered usage and calculator audit activity.
- AI usage tracks AI calls, assistant sessions, and AI-tagged audit events.

### Operational

- Fleet uptime tracks fleet, EMS, dispatch, and vehicle availability from uptime samples or downtime signals.
- Device uptime tracks device, IoT, telemetry, and biomedical availability from uptime samples or downtime signals.
- Workflow completion tracks workflow events that reach completion.
- Response times track average response latency from audit and usage metadata.

### Executive

- Adoption tracks enabled asset packs against the current platform pack target.
- Engagement tracks unique active users across audit and usage events.
- Outcomes tracks outcome, improvement, adherence, completion, and resolution signals.

## Data Sources

The framework uses existing tenant-scoped records:

- `audit_logs` for protocol, workflow, AI, response time, uptime, and outcome signals.
- `usage_events` for billable and engagement usage, including AI calls, calculator launches, simulations, and active users.
- `organization_entitlements` for enabled pack adoption.

Each response includes source counts so admins can distinguish low performance from missing telemetry.

## API Shape

`GET /organizations/:organizationId/value-tracking?period=month` returns:

- `period`: the selected day, week, or month window.
- `categories.clinical`: protocol adherence, simulation completion, calculator usage, and AI usage.
- `categories.operational`: fleet uptime, device uptime, workflow completion, and response times.
- `categories.executive`: adoption, engagement, and outcomes.
- `executiveSummary`: enabled packs, active users, total engagement events, events per user, and outcome signals.
- `sources`: audit events, usage events, and enabled entitlements counted in the period.

## Interpretation

Metric status is intentionally simple:

- `on-track`: the metric has healthy signal or meets the threshold.
- `watch`: the metric has signal but is below the current target.
- `needs-data`: no reliable source events were available in the selected period.

Availability and adherence percentages should be treated as operational proxies until direct device, fleet, and protocol compliance telemetry is integrated. The framework is designed so new telemetry can feed the same metric IDs without changing the `/value-tracking` page.

# Dashboard Visualization Upgrade

## 1. Dashboard Graph Inventory

- Main Command Dashboard: KPI cards for total tools, calculators, AI tools, backend-backed tools, and planned/unsupported tools; bar chart for tool categories; donut charts for launch types, tiers, and readiness; recent activity trend.
- Clinical tools view inside the main dashboard: category and tier distributions come from the unified tool inventory and cover calculators, diagnostics, reference, fleet, IoT, and assistant-guided tools.
- Medical IoT Dashboard: device KPI cards, freshness metric, device status bar chart, SpO2 trend, glucose trend, heart-rate trend, device connectivity timeline, and mini sparklines.
- Fleet Dashboard: operational KPI cards, vehicle status distribution, route time trend, maintenance risk bar chart, dispatch load trend.
- System Health panel: API/config status cards and readiness distribution from the canonical inventory.

## 2. Data Sources

- `getUserFacingToolRegistryProjection()` and `commandDashboardModel.js` drive tool counts, category distribution, launch type distribution, tier distribution, and readiness status.
- `SystemConfigContext` supplies backend/degraded state and API tool count.
- `ToolPreferencesContext` and `ConversationContext` supply session-local recent activity signals.
- `fleetTelemetryService.js` supplies mock fleet telemetry and derived visualization rows.
- `medicalIotService.js` supplies clearly labeled demo Medical IoT telemetry until dedicated backend modules exist.

## 3. Mock vs Live Data

- Medical IoT visuals are labeled “Demo data” / “Mock telemetry” and explicitly state they are not live patient data or for clinical decisions.
- Fleet visuals are labeled “Mock telemetry” and remind users to verify against dispatch/telematics systems.
- Command Dashboard inventory charts are real app-derived metadata, not demo data.
- Recent activity trend is session-derived and not presented as a persisted audit log.

## 4. Chart Components Added

Reusable components live in `src/components/dashboard/DashboardVisualizations.jsx`:

- `MetricCard`
- `StatusCard`
- `TrendChart`
- `CategoryBarChart`
- `DistributionDonutChart`
- `MiniSparkline`
- `EmptyChartState`
- `ChartErrorState`
- `ChartLoadingState`
- `VisualizationPanel`

The project already includes Recharts, so the implementation uses the existing chart stack.

## 5. Responsive Behavior

- Charts use `ResponsiveContainer` and live inside min-width-safe CSS grids.
- Visualization grids collapse to one column below tablet widths.
- Chart containers hide overflow locally rather than creating body-level horizontal scroll.
- Legends wrap on mobile.
- KPI cards use auto-fit grids and wrap cleanly at Android phone widths.

## 6. Accessibility Considerations

- Chart containers expose `role="img"` with descriptive labels.
- KPI cards use accessible labels such as “Total tools: 72”.
- Loading, empty, and error chart states use `role="status"` or `role="alert"`.
- Demo/mock data labels are visible text, not only styling.

## 7. Testing Performed

Added or updated tests for:

- Reusable chart state rendering.
- Empty chart data handling.
- Responsive chart containers.
- Command Dashboard charts and KPI cards.
- Inventory-derived visualization counts without duplicate tool counts.
- Medical IoT demo/mock labels and telemetry chart sections.
- Fleet visual analytics and mock telemetry labels.
- Responsive CSS chart grid behavior.

## 8. Future Live Data Integrations

- Replace Medical IoT demo telemetry with guarded `GET /api/medical-iot/snapshot`, device registry, telemetry stream, alert, and freshness endpoints.
- Replace fleet mock telemetry with dispatch/telematics API data.
- Persist recent activity trend through a backend activity/audit API rather than deriving it from current session context.
- Add backend request success/failure time series once observability endpoints are exposed.

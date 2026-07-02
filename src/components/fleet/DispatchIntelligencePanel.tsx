import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../dashboard/DashboardVisualizations';
import { fleetChatAssistedLaunchAriaLabel } from '../../data/chatAssistedHubGroups';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import { useConversation } from '../../contexts/ConversationContext';
import {
  buildDispatchLoadChart,
  buildDispatchPriorityQueue,
} from '../../utils/dispatchIntelligenceModel';
import './DispatchIntelligencePanel.css';

type DispatchIntelligencePanelProps = {
  vehicles?: readonly {
    id: string;
    label: string;
    status: string;
    utilizationPercent?: number;
    energyPercent?: number;
    maintenanceStatus?: string;
    etaMinutes?: number | null;
    freshness?: string;
  }[];
  alerts?: readonly { vehicleId: string; severity: string; title: string }[];
};

export default function DispatchIntelligencePanel({
  vehicles = [],
  alerts = [],
}: DispatchIntelligencePanelProps) {
  const navigate = useNavigate();
  const { addMessage } = useConversation();

  const queue = useMemo(
    () => buildDispatchPriorityQueue(vehicles, alerts),
    [alerts, vehicles],
  );
  const loadChart = useMemo(() => buildDispatchLoadChart(queue), [queue]);
  const dispatchLaunch = resolveCatalogLaunch('dispatch-ai');

  function startDispatchChat() {
    if (dispatchLaunch.chatSeed) {
      addMessage(dispatchLaunch.chatSeed, 'user');
    }
    navigate('/assistant');
  }

  return (
    <section className="dispatch-intelligence" aria-label="Dispatch intelligence review">
      <div className="dispatch-intelligence__header">
        <GraphicIconBadge iconKey="ed-copilot" accent="brand" size="sm" />
        <div>
          <h2>Dispatch intelligence</h2>
          <p>Priority queue and guided chat for human-reviewed vehicle assignment options.</p>
        </div>
      </div>

      <div className="dispatch-intelligence__metrics">
        <MetricCard
          label="Queued units"
          value={String(vehicles.length)}
          hint="Vehicles in current telemetry snapshot"
        />
        <MetricCard
          label="High priority"
          value={String(queue.filter((row) => row.priorityScore >= 50).length)}
          hint="Score 50+ requires dispatcher review"
          tone={queue.some((row) => row.priorityScore >= 75) ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Active alerts"
          value={String(alerts.length)}
          hint="Fleet alert signals in snapshot"
          tone={alerts.length > 0 ? 'warning' : 'good'}
        />
      </div>

      <div className="dispatch-intelligence__grid">
        <VisualizationPanel
          title="Dispatch priority signals"
          description="Relative review pressure by unit from utilization, energy, and alerts."
          badge="Queue"
        >
          <CategoryBarChart
            data={loadChart}
            title="Dispatch priority signals"
            color="var(--app-chart-4)"
            emptyMessage="Priority signals appear when fleet vehicles report telemetry."
          />
        </VisualizationPanel>

        <div className="dispatch-intelligence__queue" aria-label="Dispatch priority queue">
          <h3>Priority queue</h3>
          {queue.length ? (
            queue.map((row) => (
              <article key={row.id} className="dispatch-intelligence__queue-item">
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.reason}</span>
                </div>
                <strong>{row.priorityScore}</strong>
              </article>
            ))
          ) : (
            <p className="dispatch-intelligence__empty">No dispatch queue rows in the current snapshot.</p>
          )}
        </div>
      </div>

      <p className="dispatch-intelligence__safety">
        Dispatch Intelligence does not auto-assign vehicles or change live routes. Human dispatchers must approve
        every assignment.
      </p>

      <div className="dispatch-intelligence__actions">
        <button
          type="button"
          onClick={startDispatchChat}
          aria-label={fleetChatAssistedLaunchAriaLabel('Dispatch Intelligence')}
        >
          Start guided dispatch chat
        </button>
        <Link to={dispatchLaunch.path}>Open calculators hub</Link>
      </div>
    </section>
  );
}
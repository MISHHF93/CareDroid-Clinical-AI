import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, MiniSparkline, VisualizationPanel } from '../dashboard/DashboardVisualizations';
import { CategoryBarChart, DistributionDonutChart } from '../dashboard/DashboardCharts';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import { resolveProfileAiCapabilities } from '../../config/profileAiCapabilities.config';
import type { ProfileCopyStack } from '../../config/userProfileCopyModel';
import {
  buildActivityMixChart,
  buildActivityTrendPoints,
  buildActivityTypeChart,
  buildCompetencyBreakdownChart,
  buildToolUsageChart,
  type ProfileActivityLog,
} from '../../utils/profileInsightsModel';
import './ProfileInsightsPanel.css';

type ProfileInsightsPanelProps = {
  profileCopy: ProfileCopyStack;
  activityLogs?: readonly ProfileActivityLog[];
  activityLoading?: boolean;
  activityTotal?: number;
  recentTools?: readonly { label?: string; id?: string }[];
  competencySummary?: {
    simulationCompletion?: number;
    skillCompletion?: number;
    overallReadiness?: number;
    activeCredentials?: number;
  };
  showCompetency?: boolean;
};

const AI_ICON_KEYS: Record<string, string> = {
  copilot: 'ed-copilot',
  triageSupport: 'alert',
  deteriorationPrediction: 'alert',
  analyticsExplanation: 'chart-bar',
  clinicalWorkflowLauncher: 'clinical-tools',
  calculatorExplanation: 'stethoscope',
  smartIntakeVerification: 'intake',
  smartHandover: 'ems',
  federatedEmsTriage: 'ems',
  edgeAmbulance: 'ems',
  protocolTrigger: 'shield-check',
  ambientDocumentation: 'notes',
  referralSummarization: 'report',
  textMining: 'report',
};

export default function ProfileInsightsPanel({
  profileCopy,
  activityLogs = [],
  activityLoading = false,
  activityTotal = 0,
  recentTools = [],
  competencySummary,
  showCompetency = true,
}: ProfileInsightsPanelProps) {
  const activityMix = useMemo(() => buildActivityMixChart(activityLogs), [activityLogs]);
  const activityTypes = useMemo(() => buildActivityTypeChart(activityLogs), [activityLogs]);
  const activityTrend = useMemo(() => buildActivityTrendPoints(activityLogs), [activityLogs]);
  const toolChart = useMemo(() => buildToolUsageChart(recentTools), [recentTools]);
  const competencyChart = useMemo(
    () => buildCompetencyBreakdownChart(competencySummary || {}),
    [competencySummary],
  );
  const aiCapabilities = useMemo(
    () => resolveProfileAiCapabilities(profileCopy, 6),
    [profileCopy],
  );

  return (
    <section className="profile-insights-panel" aria-label="Profile insights and AI capabilities">
      <div className="profile-insights-panel__intro">
        <GraphicIconBadge iconKey="chart-bar" accent="brand" size="lg" />
        <div>
          <h2>Operational insights</h2>
          <p>
            Visual summary of your activity, tools, and governed AI modules assigned to{' '}
            {profileCopy.personaTitle}.
          </p>
        </div>
      </div>

      <div className="profile-insights-panel__metrics">
        <MetricCard label="Audit events" value={String(activityTotal)} hint="Personal audit trail" tone="neutral" />
        <MetricCard
          label="AI modules"
          value={String(aiCapabilities.length)}
          hint="Unified node services for your role"
          tone="good"
        />
        {showCompetency ? (
          <MetricCard
            label="Readiness"
            value={`${competencySummary?.overallReadiness ?? 0}%`}
            hint="Simulation and credential posture"
            tone={(competencySummary?.overallReadiness || 0) >= 75 ? 'good' : 'warning'}
          />
        ) : null}
        <article className="profile-insights-sparkline-card" aria-label="Activity trend">
          <span>Activity trend</span>
          <MiniSparkline points={activityTrend} label="Recent activity trend" />
        </article>
      </div>

      <div className="dashboard-visual-grid profile-insights-panel__charts">
        <VisualizationPanel
          title="Activity mix"
          description="How your recent audit events group by access type."
          badge="Chart"
        >
          <DistributionDonutChart
            data={activityMix}
            title="Activity mix"
            loading={activityLoading}
            emptyMessage="No activity data yet — charts appear after your first audit events."
          />
        </VisualizationPanel>

        <VisualizationPanel
          title="Activity breakdown"
          description="Top event types from your protected audit log."
          badge="Chart"
        >
          <CategoryBarChart
            data={activityTypes}
            title="Activity breakdown"
            xKey="name"
            loading={activityLoading}
            emptyMessage="No typed activity yet."
          />
        </VisualizationPanel>

        <VisualizationPanel
          title="Recent tools"
          description="Engagement weight for your latest clinical tools."
          badge="Chart"
        >
          <CategoryBarChart
            data={toolChart}
            title="Recent tools"
            xKey="name"
            color="var(--app-chart-2)"
            emptyMessage="Open a tool to populate this chart."
          />
        </VisualizationPanel>

        {showCompetency ? (
          <VisualizationPanel
            title="Competency posture"
            description="Simulation, skills, readiness, and credential signals."
            badge="Chart"
          >
            <CategoryBarChart
              data={competencyChart}
              title="Competency posture"
              xKey="name"
              color="var(--app-chart-3)"
            />
          </VisualizationPanel>
        ) : null}
      </div>

      <section className="profile-ai-capabilities" aria-label="Assigned AI modules">
        <div className="profile-ai-capabilities__header">
          <GraphicIconBadge iconKey="ed-copilot" accent="brand" size="md" />
          <div>
            <h3>AI modules for your profile</h3>
            <p>
              Governed services routed through CareDroid Unified AI Node — human review required for
              clinical actions.
            </p>
          </div>
        </div>
        <div className="profile-ai-capabilities__grid">
          {aiCapabilities.map((capability) => (
            <Link
              key={capability.serviceId}
              to={capability.route}
              className="profile-ai-capability-card"
            >
              <GraphicIconBadge
                iconKey={AI_ICON_KEYS[capability.serviceId] || 'ed-copilot'}
                accent="action"
                size="sm"
              />
              <div className="profile-ai-capability-card__body">
                <strong>{capability.name}</strong>
                <span>{capability.purpose}</span>
                <div className="profile-ai-capability-card__meta">
                  <span>{capability.channel}</span>
                  <span>{capability.riskLevel} risk</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
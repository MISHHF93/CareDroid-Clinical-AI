import React, { useEffect } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEmergencyStore } from '../../store/emergencyStore';
import './EmergencyAnalytics.css';

const COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#a78bfa'];

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="emergency-analytics__card">
      <header>
        <span>{title}</span>
        {subtitle ? <small>{subtitle}</small> : null}
      </header>
      {children}
    </section>
  );
}

function ChartEmpty({ children }) {
  return (
    <div className="emergency-analytics__empty">
      {children}
    </div>
  );
}

function analyticsSourceLabel(source) {
  if (source === 'backend') return 'Live aggregate feed';
  if (source === 'client-fallback') return 'Walkthrough dataset';
  return 'Operational data';
}

function analyticsStatusMessage(message = '') {
  if (!message) return '';
  if (/fixture|demo|backend|fallback/i.test(message)) {
    return 'Operational analytics are using the current walkthrough dataset.';
  }
  return message;
}

export default function EmergencyAnalytics() {
  const emergencyAnalytics = useEmergencyStore((state) => state.emergencyAnalytics);
  const loadEmergencyAnalytics = useEmergencyStore((state) => state.loadEmergencyAnalytics);
  const data = emergencyAnalytics.data?.operationalCommand || {};
  const shift = emergencyAnalytics.data?.shift || {};
  const dailyVolume = data.dailyVolume || [];
  const hourlyArrivals = data.hourlyArrivals || [];
  const waitTrend = data.waitTrend || [];
  const topComplaints = data.topComplaints || [];
  const totalDailyVolume = (data.dailyVolume || []).reduce((sum, point) => sum + Number(point.count || 0), 0);
  const topComplaint = data.topComplaints?.[0];
  const hasOperationalData =
    dailyVolume.length || hourlyArrivals.length || waitTrend.length || topComplaints.length;
  const statusMessage = analyticsStatusMessage(emergencyAnalytics.message);

  useEffect(() => {
    void loadEmergencyAnalytics({ force: true });
  }, [loadEmergencyAnalytics]);

  return (
    <section className="emergency-analytics" aria-label="Emergency operational analytics">
      <header className="emergency-analytics__header">
        <div>
          <span>Operational Command</span>
          <h1>Emergency Analytics</h1>
          <p>
            Current shift, arrival, wait-time, and complaint-mix signals for ED leadership review.
          </p>
        </div>
        <strong>
          {emergencyAnalytics.status === 'loading'
            ? 'Loading'
            : analyticsSourceLabel(emergencyAnalytics.source)}
        </strong>
      </header>

      {emergencyAnalytics.status === 'loading' ? (
        <p className="emergency-analytics__state" role="status">
          Loading Emergency OS analytics...
        </p>
      ) : null}
      {statusMessage ? (
        <p className="emergency-analytics__state">
          {statusMessage}
        </p>
      ) : null}
      {emergencyAnalytics.status !== 'loading' && !hasOperationalData ? (
        <p className="emergency-analytics__state emergency-analytics__state--empty">
          Operational analytics will populate when Emergency OS has active patient flow data for this department.
        </p>
      ) : null}

      <div className="emergency-analytics__grid" aria-label="Emergency analytics KPIs">
        <ChartCard title="Patients Seen" subtitle="Current shift">
          <strong>{shift.patientsSeen ?? 0}</strong>
        </ChartCard>
        <ChartCard title="Discharges" subtitle="Current shift">
          <strong>{shift.dischargeCount ?? 0}</strong>
        </ChartCard>
        <ChartCard title="Daily Volume Total" subtitle="Last 7 days">
          <strong>{totalDailyVolume}</strong>
        </ChartCard>
        <ChartCard title="Top Complaint" subtitle="Current board">
          <strong>{topComplaint ? `${topComplaint.name}: ${topComplaint.count}` : 'No volume'}</strong>
        </ChartCard>
        <ChartCard title="Average Wait" subtitle="Backend current">
          <strong>{shift.averageWaitMinutes ?? 0}m</strong>
        </ChartCard>
        <ChartCard title="Boarding" subtitle="Active boarders">
          <strong>{shift.boardingCount ?? 0}</strong>
        </ChartCard>
        <ChartCard title="High Risk" subtitle="Active patients">
          <strong>{shift.highRiskCount ?? 0}</strong>
        </ChartCard>
        <ChartCard title="Reassessment Due" subtitle="Safety queue">
          <strong>{shift.reassessmentDueCount ?? 0}</strong>
        </ChartCard>
      </div>

      <div className="emergency-analytics__grid">
        <ChartCard title="Daily Patient Volume" subtitle="Last 7 days">
          {dailyVolume.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--status-info)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty>No daily patient volume returned.</ChartEmpty>
          )}
        </ChartCard>

        <ChartCard title="Hourly Arrival Heatmap" subtitle="Today">
          {hourlyArrivals.length ? (
            <div className="emergency-analytics__heatmap">
              {hourlyArrivals.map((hour) => (
                <span
                  key={hour.hour}
                  style={{ '--heat': Math.min(1, (hour.count || 0) / 6) }}
                  title={`${hour.hour}: ${hour.count} arrivals`}
                >
                  {hour.hour.slice(0, 2)}
                </span>
              ))}
            </div>
          ) : (
            <ChartEmpty>No hourly arrival data returned.</ChartEmpty>
          )}
        </ChartCard>

        <ChartCard title="Average Wait Time Trend" subtitle="7-day">
          {waitTrend.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={waitTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgWaitMinutes"
                  name="Avg wait"
                  stroke="var(--status-warning)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty>No wait time trend returned.</ChartEmpty>
          )}
        </ChartCard>

        <ChartCard title="Top Chief Complaints" subtitle="Top 10">
          {topComplaints.length ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={topComplaints}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {topComplaints.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="emergency-analytics__legend">
                {topComplaints.slice(0, 6).map((item, index) => (
                  <span key={item.name}>
                    <i style={{ background: COLORS[index % COLORS.length] }} />
                    {item.name}: {item.count}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <ChartEmpty>No complaint mix returned.</ChartEmpty>
          )}
        </ChartCard>
      </div>
    </section>
  );
}

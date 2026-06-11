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
import { useEmergencyStore } from '../../../store/emergencyStore';
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

export default function EmergencyAnalytics() {
  const emergencyAnalytics = useEmergencyStore((state) => state.emergencyAnalytics);
  const loadEmergencyAnalytics = useEmergencyStore((state) => state.loadEmergencyAnalytics);
  const data = emergencyAnalytics.data?.operationalCommand || {};

  useEffect(() => {
    void loadEmergencyAnalytics({ force: true });
  }, [loadEmergencyAnalytics]);

  return (
    <main className="emergency-analytics" aria-label="Emergency operational analytics">
      <header className="emergency-analytics__header">
        <div>
          <span>Operational Command</span>
          <h1>Emergency Analytics</h1>
          <p>
            {emergencyAnalytics.source === 'backend'
              ? 'Backend aggregate data'
              : 'Backend ED aggregate endpoints are not available yet; showing local operational fallback.'}
          </p>
        </div>
        <strong>{emergencyAnalytics.status === 'loading' ? 'Loading' : emergencyAnalytics.source}</strong>
      </header>

      <div className="emergency-analytics__grid">
        <ChartCard title="Daily Patient Volume" subtitle="Last 7 days">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dailyVolume || []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--status-info)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hourly Arrival Heatmap" subtitle="Today">
          <div className="emergency-analytics__heatmap">
            {(data.hourlyArrivals || []).map((hour) => (
              <span
                key={hour.hour}
                style={{ '--heat': Math.min(1, (hour.count || 0) / 6) }}
                title={`${hour.hour}: ${hour.count} arrivals`}
              >
                {hour.hour.slice(0, 2)}
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Average Wait Time Trend" subtitle="7-day">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.waitTrend || []}>
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
        </ChartCard>

        <ChartCard title="Top Chief Complaints" subtitle="Top 10">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.topComplaints || []}
                dataKey="count"
                nameKey="name"
                innerRadius={46}
                outerRadius={82}
                paddingAngle={2}
              >
                {(data.topComplaints || []).map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="emergency-analytics__legend">
            {(data.topComplaints || []).slice(0, 6).map((item, index) => (
              <span key={item.name}>
                <i style={{ background: COLORS[index % COLORS.length] }} />
                {item.name}: {item.count}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>
    </main>
  );
}

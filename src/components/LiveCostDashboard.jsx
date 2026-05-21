import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { getRealTimeCostService } from '../services/realtime/RealTimeCostService';
import { getNotificationService } from '../services/notifications/NotificationService';
import { resolveApiRoot } from '../config/apiEnv';
import './LiveCostDashboard.css';

/**
 * Live Cost Dashboard Component
 * Real-time cost tracking with WebSocket updates
 */
const getApiBaseUrl = () => resolveApiRoot();

function LiveCostDashboard({ embedded = false }) {
  const { authToken, user } = useUser();
  const [costData, setCostData] = useState({
    totalCost: 0,
    costByTool: {},
    recentUpdates: [],
    alerts: [],
    trendingTools: [],
  });

  const [stats, setStats] = useState({
    activeUpdates: 0,
    alertsCount: 0,
    lastUpdate: null,
  });

  const [filters, setFilters] = useState({
    timeRange: '24h',
    minCost: 0,
    showAlerts: true,
  });

  const [exportLoading, setExportLoading] = useState(false);
  const rtcService = useRef(null);
  const notifService = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (authToken) {
      initializeServices(authToken, user?.id);
    }

    return () => {
      isMounted.current = false;
      if (rtcService.current) {
        rtcService.current.disconnect();
      }
    };
  }, [authToken, user?.id]);

  const initializeServices = async (token, userId) => {
    try {
      rtcService.current = getRealTimeCostService();
      await rtcService.current.initialize(token);

      notifService.current = getNotificationService(getApiBaseUrl());
      if (userId) {
        await notifService.current.initialize(userId, token);
      }

      // Subscribe to cost updates
      rtcService.current.onCostUpdate((update) => {
        if (isMounted.current) {
          handleCostUpdate(update);
        }
      });

      // Subscribe to alerts
      rtcService.current.onCostAlert((alert) => {
        if (isMounted.current) {
          handleAlert(alert);
        }
      });

      // Request trending analysis
      rtcService.current.requestTrendingAnalysis('24h', 5);

      // Update stats every second
      const interval = setInterval(() => {
        if (isMounted.current && rtcService.current) {
          const serviceStats = rtcService.current.getStats();
          setStats((prev) => ({
            ...prev,
            activeUpdates: serviceStats.pendingUpdates,
            lastUpdate: new Date(),
          }));
        }
      }, 1000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
    }
  };

  const handleCostUpdate = (update) => {
    setCostData((prev) => {
      const newData = { ...prev };

      // Update total cost
      newData.totalCost += update.cost;

      // Update cost by tool
      newData.costByTool[update.toolId] =
        (newData.costByTool[update.toolId] || 0) + update.cost;

      // Add to recent updates (keep last 20)
      newData.recentUpdates.unshift({
        toolId: update.toolId,
        cost: update.cost,
        timestamp: update.timestamp,
        roi: update.roiMetrics?.roi || 0,
      });
      if (newData.recentUpdates.length > 20) {
        newData.recentUpdates.pop();
      }

      return newData;
    });

    // Update trending if data available
    const trending = rtcService.current.getTrendingTools('24h');
    if (trending.length > 0) {
      setCostData((prev) => ({
        ...prev,
        trendingTools: trending,
      }));
    }
  };

  const handleAlert = (alert) => {
    setCostData((prev) => ({
      ...prev,
      alerts: [alert, ...prev.alerts].slice(0, 10),
    }));

    setStats((prev) => ({
      ...prev,
      alertsCount: prev.alertsCount + 1,
    }));
  };

  const getAlertIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getAlertColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return '#ff4444';
      case 'warning':
        return '#ff9900';
      default:
        return '#2196F3';
    }
  };

  const handleExport = async (format) => {
    setExportLoading(true);
    try {
      const { getExportService } = await import(
        '../services/export/ExportService'
      );
      const exportService = getExportService(getApiBaseUrl());

      const exportData = Object.entries(costData.costByTool).map(
        ([toolId, cost]) => ({
          tool: toolId,
          cost: cost.toFixed(2),
          percentage: ((cost / costData.totalCost) * 100).toFixed(1) + '%',
        })
      );

      if (format === 'csv') {
        await exportService.exportToCSV(exportData, 'live-costs.csv');
      } else if (format === 'pdf') {
        await exportService.exportToPDF(exportData, 'live-costs.pdf', {
          title: 'Live Cost Report',
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const topTools = Object.entries(costData.costByTool)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className={`live-cost-dashboard${embedded ? ' embedded' : ''}`}>
      <div className="dashboard-header">
        <h2>💹 Live Cost Dashboard</h2>
        <div className="header-stats">
          <span className="stat">
            Total: <strong>${costData.totalCost.toFixed(2)}</strong>
          </span>
          <span className="stat">
            Updates: <strong>{stats.activeUpdates}</strong>
          </span>
          <span className="stat">
            Alerts: <strong className="alert-badge">{stats.alertsCount}</strong>
          </span>
          {stats.lastUpdate && (
            <span className="stat last-update">
              Updated: {stats.lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="dashboard-controls">
        <div className="filter-group">
          <label>Time Range:</label>
          <select
            value={filters.timeRange}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, timeRange: e.target.value }))
            }
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <div className="export-group">
          <button
            className="export-btn"
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
          >
            📥 Export CSV
          </button>
          <button
            className="export-btn"
            onClick={() => handleExport('pdf')}
            disabled={exportLoading}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Top 5 Tools */}
        <div className="dashboard-section top-tools">
          <h3>Top Cost Tools</h3>
          <div className="tools-list">
            {topTools.length === 0 ? (
              <p className="empty">No cost data yet</p>
            ) : (
              topTools.map(([toolId, cost]) => {
                const percentage = ((cost / costData.totalCost) * 100).toFixed(
                  1
                );
                return (
                  <div key={toolId} className="tool-item">
                    <div className="tool-info">
                      <span className="tool-name">{toolId}</span>
                      <span className="tool-cost">
                        ${cost.toFixed(2)} ({percentage}%)
                      </span>
                    </div>
                    <div className="tool-bar">
                      <div
                        className="tool-progress"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="dashboard-section alerts-section">
          <h3>🔔 Recent Alerts ({costData.alerts.length})</h3>
          <div className="alerts-list">
            {costData.alerts.length === 0 ? (
              <p className="empty">No alerts</p>
            ) : (
              costData.alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="alert-item"
                  style={{
                    borderLeftColor: getAlertColor(alert.riskLevel),
                  }}
                >
                  <div className="alert-icon">
                    {getAlertIcon(alert.riskLevel)}
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">{alert.message}</div>
                    <div className="alert-meta">
                      {alert.currentCost && alert.limitCost && (
                        <span>
                          ${alert.currentCost.toFixed(2)} / $
                          {alert.limitCost.toFixed(2)}
                        </span>
                      )}
                      <span className="alert-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Updates Stream */}
      <div className="dashboard-section recent-updates">
        <h3>📊 Recent Updates</h3>
        <div className="updates-stream">
          {costData.recentUpdates.length === 0 ? (
            <p className="empty">No updates yet</p>
          ) : (
            <div className="updates-list">
              {costData.recentUpdates.slice(0, 10).map((update, idx) => (
                <div key={idx} className="update-item">
                  <span className="update-tool">{update.toolId}</span>
                  <span className="update-cost">
                    +${update.cost.toFixed(2)}
                  </span>
                  <span className="update-roi">
                    ROI: {(update.roi * 100).toFixed(0)}%
                  </span>
                  <span className="update-time">
                    {update.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trending Tools */}
      {costData.trendingTools.length > 0 && (
        <div className="dashboard-section trending">
          <h3>📈 Trending Tools</h3>
          <div className="trending-list">
            {costData.trendingTools.map((tool, idx) => (
              <div key={idx} className="trending-item">
                <span className="trending-rank">#{idx + 1}</span>
                <span className="trending-name">{tool.name}</span>
                <span className="trending-growth">{tool.growth}% growth</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveCostDashboard;

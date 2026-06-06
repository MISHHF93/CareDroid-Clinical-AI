import React, { useEffect, useState } from 'react';
import StateSourceNotice from '../components/StateSourceNotice';
import { useCostTracking } from '../contexts/CostTrackingContext';
import analyticsService from '../services/analyticsService';
import { toolRegistryById } from '../data/toolRegistry';
import { NavIcon } from '../navigation/NavIcon';
import { getToolIcon, CHROME_ICONS } from '../navigation/iconRegistry';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './CostAnalyticsDashboard.css';

const CostAnalyticsDashboard = () => {
  const {
    costData,
    costLimit,
    isLoading,
    getTopSpendingTools,
    getCostTrends,
    updateCostLimit,
    resetCostData,
    getROIMetrics,
    isCostLimitApproaching,
    isCostLimitExceeded
  } = useCostTracking();

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState('');

  useEffect(() => {
    analyticsService.trackPageView('cost_analytics_dashboard');
  }, []);

  const roiMetrics = getROIMetrics();
  const topTools = getTopSpendingTools(5);
  const costTrends = getCostTrends();

  const handleSetLimit = () => {
    const limit = parseFloat(newLimit);
    if (!isNaN(limit) && limit > 0) {
      updateCostLimit(limit);
      setShowLimitModal(false);
      setNewLimit('');
      analyticsService.trackEvent({
        eventName: 'cost_limit_set',
        parameters: { limit }
      });
    }
  };

  const handleResetCosts = () => {
    if (confirm('Are you sure you want to reset all cost data? This cannot be undone.')) {
      resetCostData();
      analyticsService.trackEvent({
        eventName: 'cost_data_reset',
        parameters: {}
      });
    }
  };

  if (isLoading) {
    return (
      <div className="cost-analytics-dashboard">
        <div className="loading">Loading cost analytics...</div>
      </div>
    );
  }

  return (
    <div className="cost-analytics-dashboard">
      <header className="cost-header">
        <div>
          <h1 className="cost-header-title">
            <NavIcon icon={CHROME_ICONS.circleDollar} size={32} aria-hidden />
            Cost Analytics
          </h1>
          <p>Track tool usage costs and ROI for CareDroid platform.</p>
        </div>
        <div className="cost-header-actions">
          <button className="btn-secondary" onClick={() => setShowLimitModal(true)}>
            {costLimit ? 'Update Limit' : 'Set Budget'}
          </button>
          <button className="btn-danger" onClick={handleResetCosts}>
            Reset Data
          </button>
        </div>
      </header>

      <StateSourceNotice
        title="Cost analytics source states"
        states={[
          DEMO_LIVE_STATES.LOCAL_ONLY,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
          DEMO_LIVE_STATES.UNSUPPORTED,
        ]}
        details="Cost totals, ROI, limits, and resets come from the local cost tracking context. A live billing backend is unavailable here; resetting data only changes local app state and external billing reconciliation is unsupported."
      />

      {/* Cost Limit Warning */}
      {isCostLimitExceeded && (
        <div className="cost-alert cost-alert-danger">
          <strong className="cost-alert-title">
            <NavIcon icon={CHROME_ICONS.alert} size={18} aria-hidden />
            Budget Exceeded
          </strong>
          <p>Monthly cost (${costData.monthlyCost.toFixed(2)}) has exceeded your limit of ${costLimit.toFixed(2)}.</p>
        </div>
      )}
      {isCostLimitApproaching && !isCostLimitExceeded && (
        <div className="cost-alert cost-alert-warning">
          <strong className="cost-alert-title">
            <NavIcon icon={CHROME_ICONS.bolt} size={18} aria-hidden />
            Approaching Budget
          </strong>
          <p>You've used {((costData.monthlyCost / costLimit) * 100).toFixed(0)}% of your ${costLimit.toFixed(2)} monthly budget.</p>
        </div>
      )}

      {/* Cost Summary Cards */}
      <section className="cost-summary">
        <div className="cost-card">
          <h3>Total Cost</h3>
          <p className="cost-value">${costData.totalCost.toFixed(2)}</p>
          <span className="cost-label">All time</span>
        </div>
        <div className="cost-card">
          <h3>Monthly Cost</h3>
          <p className="cost-value">${costData.monthlyCost.toFixed(2)}</p>
          <span className="cost-label">Last 30 days</span>
          {costLimit && (
            <div className="cost-progress">
              <div 
                className="cost-progress-bar" 
                style={{ 
                  width: `${Math.min((costData.monthlyCost / costLimit) * 100, 100)}%`,
                  backgroundColor: isCostLimitExceeded ? '#EF4444' : isCostLimitApproaching ? '#F59E0B' : '#10B981'
                }}
              />
            </div>
          )}
        </div>
        <div className="cost-card">
          <h3>Avg Cost/Tool</h3>
          <p className="cost-value">
            ${costData.executions.length > 0 
              ? (costData.totalCost / costData.executions.length).toFixed(3)
              : '0.00'}
          </p>
          <span className="cost-label">Per execution</span>
        </div>
        <div className="cost-card">
          <h3>Total Executions</h3>
          <p className="cost-value">{costData.executions.length}</p>
          <span className="cost-label">Tool uses</span>
        </div>
      </section>

      {/* ROI Metrics */}
      <section className="cost-panel">
        <h2>Return on Investment (ROI)</h2>
        <div className="roi-grid">
          <div className="roi-metric">
            <span className="roi-label">Time Saved</span>
            <strong className="roi-value">{roiMetrics.timeSavedHours} hrs</strong>
          </div>
          <div className="roi-metric">
            <span className="roi-label">Value Created</span>
            <strong className="roi-value">${roiMetrics.valueSaved}</strong>
          </div>
          <div className="roi-metric">
            <span className="roi-label">Total Cost</span>
            <strong className="roi-value">${roiMetrics.totalCost}</strong>
          </div>
          <div className="roi-metric">
            <span className="roi-label">Net Value</span>
            <strong className="roi-value" style={{ color: parseFloat(roiMetrics.netValue) > 0 ? '#10B981' : '#EF4444' }}>
              ${roiMetrics.netValue}
            </strong>
          </div>
          <div className="roi-metric roi-metric-highlight">
            <span className="roi-label">ROI</span>
            <strong className="roi-value roi-value-large">{roiMetrics.roi}%</strong>
          </div>
        </div>
        <p className="roi-note">
          * Calculation assumes 5 minutes saved per tool use and $75/hr clinician rate
        </p>
      </section>

      {/* Cost by Tool */}
      <section className="cost-panel">
        <h2>Top Spending Tools</h2>
        {topTools.length === 0 ? (
          <p className="cost-empty">No tool usage recorded yet.</p>
        ) : (
          topTools.map((item, index) => {
            const tool = toolRegistryById[item.toolId] || { name: item.toolId, color: '#64748B' };
            const percentage = (item.cost / costData.totalCost) * 100;
            
            return (
              <div key={item.toolId} className="cost-row">
                <div className="cost-row-label">
                  <span className="cost-rank">#{index + 1}</span>
                  <span className="tool-icon" aria-hidden>
                    <NavIcon icon={getToolIcon(item.toolId)} size={20} />
                  </span>
                  <span>{tool.name}</span>
                </div>
                <div className="cost-row-bar">
                  <div
                    className="cost-row-fill"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: tool.color,
                    }}
                  />
                </div>
                <span className="cost-row-amount">${item.cost.toFixed(2)}</span>
              </div>
            );
          })
        )}
      </section>

      {/* Cost by Category */}
      <section className="cost-panel">
        <h2>Cost by Category</h2>
        {Object.keys(costData.categoryCosts).length === 0 ? (
          <p className="cost-empty">No category data available yet.</p>
        ) : (
          Object.entries(costData.categoryCosts)
            .sort(([, a], [, b]) => b - a)
            .map(([category, cost]) => {
              const percentage = (cost / costData.totalCost) * 100;
              const categoryName = category.replace(/_/g, ' ');
              
              return (
                <div key={category} className="cost-row">
                  <div className="cost-row-label">
                    <span>{categoryName}</span>
                  </div>
                  <div className="cost-row-bar">
                    <div
                      className="cost-row-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: '#4F46E5',
                      }}
                    />
                  </div>
                  <span className="cost-row-amount">${cost.toFixed(2)}</span>
                </div>
              );
            })
        )}
      </section>

      {/* Cost Trends Chart */}
      <section className="cost-panel">
        <h2>30-Day Cost Trend</h2>
        <div className="cost-chart">
          {costTrends.map((day, index) => {
            const maxCost = Math.max(...costTrends.map(d => d.cost), 1);
            const barHeight = (day.cost / maxCost) * 100;
            
            return (
              <div key={day.date} className="cost-chart-bar-container">
                <div 
                  className="cost-chart-bar" 
                  style={{ height: `${barHeight}%` }}
                  title={`${day.date}: $${day.cost.toFixed(2)}`}
                />
                {index % 5 === 0 && (
                  <span className="cost-chart-label">
                    {new Date(day.date).getDate()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Cost Limit Modal */}
      {showLimitModal && (
        <div className="modal-overlay" onClick={() => setShowLimitModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Set Monthly Budget</h2>
            <p>Set a monthly spending limit to track and control costs.</p>
            <input
              type="number"
              placeholder="Enter amount (USD)"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              step="0.01"
              min="0"
              className="input-field"
            />
            {costLimit && (
              <p className="modal-hint">Current limit: ${costLimit.toFixed(2)}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLimitModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSetLimit}>
                Set Limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostAnalyticsDashboard;

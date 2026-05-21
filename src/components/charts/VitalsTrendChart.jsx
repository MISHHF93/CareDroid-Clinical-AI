import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import './Charts.css';

/**
 * Vitals Trend Chart - Time-series visualization for patient vitals
 * Shows trends over time with normal range reference lines
 */
const VitalsTrendChart = ({ data = [], title = 'Vitals Trend', vitalType = 'hr' }) => {
  const vitalConfig = {
    hr: {
      label: 'Heart Rate',
      unit: 'bpm',
      color: '#ff6b6b',
      normalRange: { min: 60, max: 100 },
      yDomain: [40, 160]
    },
    sbp: {
      label: 'Systolic BP',
      unit: 'mmHg',
      color: '#4ecdc4',
      normalRange: { min: 90, max: 140 },
      yDomain: [60, 200]
    },
    dbp: {
      label: 'Diastolic BP',
      unit: 'mmHg',
      color: '#95e1d3',
      normalRange: { min: 60, max: 90 },
      yDomain: [40, 120]
    },
    spo2: {
      label: 'SpO2',
      unit: '%',
      color: '#51cf66',
      normalRange: { min: 95, max: 100 },
      yDomain: [80, 100]
    },
    temp: {
      label: 'Temperature',
      unit: '°F',
      color: '#ff922b',
      normalRange: { min: 97.5, max: 99.5 },
      yDomain: [95, 105]
    },
    rr: {
      label: 'Respiratory Rate',
      unit: '/min',
      color: '#748ffc',
      normalRange: { min: 12, max: 20 },
      yDomain: [0, 40]
    }
  };

  const config = vitalConfig[vitalType] || vitalConfig.hr;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isAbnormal = value < config.normalRange.min || value > config.normalRange.max;
      
      return (
        <div className="chart-tooltip">
          <div className="tooltip-label">{payload[0].payload.time}</div>
          <div className="tooltip-value" style={{ color: isAbnormal ? '#ff6b6b' : config.color }}>
            {config.label}: <strong>{value} {config.unit}</strong>
          </div>
          {isAbnormal && (
            <div className="tooltip-warning">⚠️ Outside normal range</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <div className="chart-legend">
          <span className="legend-item">
            Normal range: {config.normalRange.min}-{config.normalRange.max} {config.unit}
          </span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
          <XAxis 
            dataKey="time" 
            stroke="var(--muted-text)"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            domain={config.yDomain}
            stroke="var(--muted-text)"
            style={{ fontSize: '12px' }}
            label={{ 
              value: config.unit, 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: 'var(--muted-text)' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Normal range reference lines */}
          <ReferenceLine 
            y={config.normalRange.min} 
            stroke="#51cf66" 
            strokeDasharray="5 5"
            label={{ value: 'Min', position: 'right', fill: '#51cf66' }}
          />
          <ReferenceLine 
            y={config.normalRange.max} 
            stroke="#51cf66" 
            strokeDasharray="5 5"
            label={{ value: 'Max', position: 'right', fill: '#51cf66' }}
          />
          
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={config.color}
            strokeWidth={2}
            dot={{ fill: config.color, r: 4 }}
            activeDot={{ r: 6 }}
            name={config.label}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Stats summary */}
      <div className="chart-stats">
        <div className="stat-item">
          <span className="stat-label">Min</span>
          <span className="stat-value">{Math.min(...data.map(d => d.value)).toFixed(1)} {config.unit}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max</span>
          <span className="stat-value">{Math.max(...data.map(d => d.value)).toFixed(1)} {config.unit}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg</span>
          <span className="stat-value">
            {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)} {config.unit}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VitalsTrendChart;

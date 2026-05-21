import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import './Charts.css';

/**
 * Lab Anomaly Scatter Plot
 * Visualizes lab outliers and trends across time
 */
const LabAnomalyScatter = ({ data = [], xLabel = 'Time', yLabel = 'Value', normalRange = {} }) => {
  const { min: normalMin, max: normalMax } = normalRange;

  // Classify points as normal, high, or low
  const classifyPoint = (value) => {
    if (normalMin !== undefined && value < normalMin) return 'low';
    if (normalMax !== undefined && value > normalMax) return 'high';
    return 'normal';
  };

  const getPointColor = (classification) => {
    switch (classification) {
      case 'high':
        return '#ff6b6b';
      case 'low':
        return '#4ecdc4';
      case 'normal':
      default:
        return '#51cf66';
    }
  };

  // Augment data with classifications
  const enrichedData = data.map((point, idx) => ({
    ...point,
    classification: classifyPoint(point.y),
    index: idx
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      
      return (
        <div className="chart-tooltip">
          <div className="tooltip-label">{point.label || point.x}</div>
          <div className="tooltip-value" style={{ color: getPointColor(point.classification) }}>
            <strong>{point.y}</strong> {point.unit || ''}
          </div>
          {point.classification !== 'normal' && (
            <div className="tooltip-warning">
              {point.classification === 'high' ? '⬆️ Above normal' : '⬇️ Below normal'}
            </div>
          )}
          {point.notes && (
            <div className="tooltip-notes">{point.notes}</div>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const values = data.map(d => d.y);
  const stats = {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    abnormal: enrichedData.filter(d => d.classification !== 'normal').length
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Lab Results Scatter</h3>
        <div className="chart-legend">
          <span className="legend-item">
            <span style={{background: '#51cf66'}} className="legend-box"></span> Normal
          </span>
          <span className="legend-item">
            <span style={{background: '#ff6b6b'}} className="legend-box"></span> High
          </span>
          <span className="legend-item">
            <span style={{background: '#4ecdc4'}} className="legend-box"></span> Low
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" />
          <XAxis 
            type="number"
            dataKey="x"
            name={xLabel}
            stroke="var(--muted-text)"
            style={{ fontSize: '12px' }}
            label={{ value: xLabel, position: 'insideBottom', offset: -5, fill: 'var(--muted-text)' }}
          />
          <YAxis 
            type="number"
            dataKey="y"
            name={yLabel}
            stroke="var(--muted-text)"
            style={{ fontSize: '12px' }}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--muted-text)' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Normal range reference lines */}
          {normalMin !== undefined && (
            <ReferenceLine 
              y={normalMin} 
              stroke="#51cf66" 
              strokeDasharray="5 5"
              label={{ value: `Normal min: ${normalMin}`, position: 'right', fill: '#51cf66', fontSize: 11 }}
            />
          )}
          {normalMax !== undefined && (
            <ReferenceLine 
              y={normalMax} 
              stroke="#51cf66" 
              strokeDasharray="5 5"
              label={{ value: `Normal max: ${normalMax}`, position: 'right', fill: '#51cf66', fontSize: 11 }}
            />
          )}
          
          <Scatter data={enrichedData} fill="#8884d8">
            {enrichedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getPointColor(entry.classification)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Stats summary */}
      <div className="chart-stats">
        <div className="stat-item">
          <span className="stat-label">Min</span>
          <span className="stat-value">{stats.min.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max</span>
          <span className="stat-value">{stats.max.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg</span>
          <span className="stat-value">{stats.avg.toFixed(2)}</span>
        </div>
        <div className="stat-item" style={{ color: stats.abnormal > 0 ? '#ff922b' : '#51cf66' }}>
          <span className="stat-label">Abnormal</span>
          <span className="stat-value">{stats.abnormal} / {data.length}</span>
        </div>
      </div>
    </div>
  );
};

export default LabAnomalyScatter;

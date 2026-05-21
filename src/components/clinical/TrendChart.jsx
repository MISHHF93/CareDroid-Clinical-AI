import './TrendChart.css';

const TrendChart = ({ data = [], title = 'Risk Trend', timeRange = '7days' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="trend-chart">
        <div className="trend-header">
          <h3>{title}</h3>
        </div>
        <div className="trend-empty">No data available</div>
      </div>
    );
  }

  // Normalize data for visualization
  const maxValue = Math.max(...data.map(d => d.value || 0), 0.5);
  const minValue = Math.min(...data.map(d => d.value || 0), 0);

  // Generate sparkline data
  const generateSparkline = () => {
    const width = 300;
    const height = 60;
    const padding = 5;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    const range = maxValue - minValue || 1;
    const points = data.map((d, idx) => {
      const x = (idx / (data.length - 1 || 1)) * graphWidth + padding;
      const normalizedValue = (d.value - minValue) / range;
      const y = height - (normalizedValue * graphHeight) - padding;
      return { x, y, value: d.value };
    });

    // Create path
    const pathData = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    // Create background fill
    const fillPath = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    return {
      pathData,
      fillPath,
      points,
      width,
      height
    };
  };

  const sparkline = generateSparkline();
  const lastValue = data[data.length - 1];
  const firstValue = data[0];
  const trend = lastValue.value >= firstValue.value ? 'up' : 'down';
  const change = Math.abs(((lastValue.value - firstValue.value) / firstValue.value) * 100).toFixed(1);

  const getLastPointColor = (value) => {
    if (value >= 0.85) return '#ff4d4f'; // critical
    if (value >= 0.65) return '#ff7a45'; // high
    if (value >= 0.45) return '#faad14'; // moderate
    return '#52c41a'; // low
  };

  return (
    <div className="trend-chart">
      <div className="trend-header">
        <div className="trend-title-section">
          <h3>{title}</h3>
          <span className={`trend-badge ${trend}`}>
            {trend === 'up' ? '📈' : '📉'} {change}%
          </span>
        </div>
        <div className="trend-value">
          <span
            className="value-display"
            style={{ color: getLastPointColor(lastValue.value) }}
          >
            {(lastValue.value * 100).toFixed(0)}%
          </span>
          <span className="value-label">Current</span>
        </div>
      </div>

      <div className="trend-visualization">
        <svg
          width={sparkline.width}
          height={sparkline.height}
          viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}
          className="sparkline-svg"
        >
          {/* Background area */}
          <path
            d={sparkline.fillPath}
            fill="rgba(79, 70, 229, 0.1)"
            className="sparkline-fill"
          />

          {/* Line */}
          <path
            d={sparkline.pathData}
            stroke={getLastPointColor(lastValue.value)}
            strokeWidth="2"
            fill="none"
            className="sparkline-line"
          />

          {/* Data points */}
          {sparkline.points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={idx === sparkline.points.length - 1 ? '3' : '1.5'}
              fill={getLastPointColor(p.value)}
              opacity={idx === sparkline.points.length - 1 ? '1' : '0.6'}
            />
          ))}
        </svg>
      </div>

      <div className="trend-stats">
        <div className="stat-item">
          <span className="stat-label">High</span>
          <span className="stat-value">{(maxValue * 100).toFixed(0)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Low</span>
          <span className="stat-value">{(minValue * 100).toFixed(0)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg</span>
          <span className="stat-value">
            {(
              (data.reduce((acc, d) => acc + d.value, 0) / data.length) *
              100
            ).toFixed(0)}
            %
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Points</span>
          <span className="stat-value">{data.length}</span>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;

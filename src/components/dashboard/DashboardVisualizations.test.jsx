import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  CategoryBarChart,
  ChartErrorState,
  ChartLoadingState,
  DistributionDonutChart,
  EmptyChartState,
  MetricCard,
  MiniSparkline,
  TrendChart,
} from './DashboardVisualizations';

describe('dashboard visualization components', () => {
  it('renders metric cards with accessible values', () => {
    render(<MetricCard label="Backend-backed" value={12} hint="Executor-backed tools" tone="good" />);

    expect(screen.getByLabelText(/backend-backed: 12/i)).toBeInTheDocument();
    expect(screen.getByText(/executor-backed tools/i)).toBeInTheDocument();
  });

  it('renders loading, empty, and error chart states', () => {
    render(
      <>
        <ChartLoadingState label="Loading analytics" />
        <EmptyChartState message="No analytics yet" />
        <ChartErrorState message="Analytics unavailable" />
      </>
    );

    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/no analytics yet/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/analytics unavailable/i);
  });

  it('renders empty state when chart data is missing', () => {
    render(<TrendChart data={[]} title="Recent usage" emptyMessage="No recent usage" />);

    expect(screen.getByText(/no recent usage/i)).toBeInTheDocument();
  });

  it('renders responsive chart containers for bar, donut, trend, and sparkline charts', () => {
    render(
      <>
        <CategoryBarChart data={[{ name: 'Calculator', value: 5 }]} title="Tool category chart" />
        <DistributionDonutChart data={[{ name: 'Backend', value: 3 }]} title="Launch distribution chart" />
        <TrendChart data={[{ label: 'Now', value: 7 }]} title="Usage trend chart" />
        <MiniSparkline points={[1, 2, 3]} label="Mini analytics sparkline" />
      </>
    );

    expect(screen.getByRole('img', { name: /tool category chart/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /launch distribution chart/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /usage trend chart/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /mini analytics sparkline/i })).toBeInTheDocument();
  });
});

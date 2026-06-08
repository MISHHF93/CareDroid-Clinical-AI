import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DepartmentIntelligencePage } from './PlatformOSPages';

vi.mock('./PlatformOSPages.css', () => ({}));

describe('DepartmentIntelligencePage', () => {
  it('renders department health scores and measurable platform outcomes', () => {
    render(<DepartmentIntelligencePage />);

    expect(screen.getByRole('heading', { level: 1, name: /department intelligence/i })).toBeInTheDocument();
    expect(screen.getAllByText(/department health score/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Emergency').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Laboratory').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operations').length).toBeGreaterThan(0);
    expect(screen.getByText('Workflow adoption')).toBeInTheDocument();
    expect(screen.getByText('Calculator utilization')).toBeInTheDocument();
    expect(screen.getByText('Simulation readiness')).toBeInTheDocument();
    expect(screen.getByText('Turnaround metrics')).toBeInTheDocument();
    expect(screen.getByText('Interpretation utilization')).toBeInTheDocument();
    expect(screen.getByText('Asset uptime')).toBeInTheDocument();
    expect(screen.getByText('Maintenance workload')).toBeInTheDocument();
  });
});

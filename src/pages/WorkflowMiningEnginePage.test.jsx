import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkflowMiningEnginePage } from './PlatformOSPages';

describe('WorkflowMiningEnginePage', () => {
  it('renders common journeys, friction, dead ends, and unnecessary clicks', () => {
    render(<WorkflowMiningEnginePage />);

    expect(screen.getByRole('heading', { level: 1, name: /workflow mining/i })).toBeInTheDocument();
    expect(screen.getByText('Most Common User Journeys')).toBeInTheDocument();
    expect(screen.getAllByText('ED triage calculator to dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Protocol search to workflow completion').length).toBeGreaterThan(0);
    expect(screen.getByText('Page transitions')).toBeInTheDocument();
    expect(screen.getByText('AI launches')).toBeInTheDocument();
    expect(screen.getByText('Workflow launches')).toBeInTheDocument();
    expect(screen.getByText('Tool usage')).toBeInTheDocument();
    expect(screen.getByText('Search behavior')).toBeInTheDocument();
    expect(screen.getByText('Friction and dead ends')).toBeInTheDocument();
    expect(screen.getAllByText('Unnecessary clicks').length).toBeGreaterThan(0);
    expect(screen.getByText('Embed protocol search inside workflow builder')).toBeInTheDocument();
  });
});

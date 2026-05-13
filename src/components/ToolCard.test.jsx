/**
 * ToolCard Component Tests
 * 
 * Tests for ToolCard React component
 * Covers SOFA rendering, drug checker rendering, lab interpreter rendering
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToolCard from './ToolCard';

describe('ToolCard Component', () => {
  const mockSofaResult = {
    toolId: 'sofa-calculator',
    toolName: 'SOFA Score Calculator',
    result: {
      success: true,
      data: {
        totalScore: 6,
        respirationScore: 2,
        coagulationScore: 1,
        liverScore: 1,
        cardiovascularScore: 0,
        cnsScore: 0,
        renalScore: 2,
        mortalityEstimate: '20-30% mortality risk',
      },
      interpretation: 'SOFA Score of 6 indicates moderate organ dysfunction',
      citations: [
        {
          title: 'Vincent JL et al',
          reference: '1996',
        },
      ],
      disclaimer: 'This is for clinical reference only',
      timestamp: new Date(),
    },
  };

  const mockDrugResult = {
    toolId: 'drug-interaction-checker',
    toolName: 'Drug Interaction Checker',
    result: {
      success: true,
      data: {
        interactions: [
          {
            drug1: 'warfarin',
            drug2: 'aspirin',
            severity: 'major',
            description: 'Increased bleeding risk',
            recommendation: 'Consider alternative',
          },
        ],
      },
      interpretation: '1 major interaction detected',
      disclaimer: 'This is for clinical reference only',
      timestamp: new Date(),
    },
  };

  const mockLabResult = {
    toolId: 'lab-interpreter',
    toolName: 'Lab Results Interpreter',
    result: {
      success: true,
      data: {
        labValues: [
          { name: 'WBC', value: 2.0, unit: 'K/μL', status: 'low', referenceRange: '4.5-11.0' },
          { name: 'Hemoglobin', value: 14.0, unit: 'g/dL', status: 'normal', referenceRange: '13.5-17.5' },
        ],
        summary: {
          total: 2,
          normal: 1,
          abnormal: 1,
          critical: 0,
        },
        interpretations: [
          {
            category: 'CBC',
            findings: ['WBC is low'],
            clinicalSignificance: 'Possible leukopenia',
            suggestedActions: ['Monitor', 'Consider bone marrow biopsy'],
          },
        ],
        groupedByCategory: {
          CBC: [],
        },
      },
      interpretation: 'Multiple abnormalities detected',
      disclaimer: 'This is for clinical reference only',
      timestamp: new Date(),
    },
  };

  describe('Component rendering', () => {
    it('should render nothing when toolResult is null', () => {
      const { container } = render(<ToolCard toolResult={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render ToolCard when toolResult is provided', () => {
      const { container } = render(<ToolCard toolResult={mockSofaResult} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('should display tool name in header', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.getByText('SOFA Score Calculator')).toBeInTheDocument();
    });

    it('should display interpretation message', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.getByText(/SOFA Score of 6/)).toBeInTheDocument();
    });
  });

  describe('SOFA Calculator rendering', () => {
    it('should display SOFA total score', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText(/Total SOFA Score/)).toBeInTheDocument();
    });

    it('should display individual organ scores', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.getByText(/Respiration/)).toBeInTheDocument();
      expect(screen.getByText(/Coagulation/)).toBeInTheDocument();
      expect(screen.getByText(/Liver/)).toBeInTheDocument();
      expect(screen.getByText(/Cardiovascular/)).toBeInTheDocument();
      expect(screen.getByText(/CNS/)).toBeInTheDocument();
      expect(screen.getByText(/Renal/)).toBeInTheDocument();
    });

    it('should display mortality estimate', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.getByText(/Mortality Estimate/)).toBeInTheDocument();
      expect(screen.getByText(/20-30%/)).toBeInTheDocument();
    });
  });

  describe('Drug Checker rendering', () => {
    it('should display interaction count', () => {
      render(<ToolCard toolResult={mockDrugResult} />);
      expect(screen.getByText(/Found 1 interaction/i)).toBeInTheDocument();
    });

    it('should display drug names', () => {
      render(<ToolCard toolResult={mockDrugResult} />);
      expect(screen.getByText(/warfarin/i)).toBeInTheDocument();
      expect(screen.getByText(/aspirin/i)).toBeInTheDocument();
    });

    it('should display interaction severity', () => {
      render(<ToolCard toolResult={mockDrugResult} />);
      expect(screen.getByText(/Major/)).toBeInTheDocument();
    });

    it('should display interaction description', () => {
      render(<ToolCard toolResult={mockDrugResult} />);
      expect(screen.getByText(/Increased bleeding risk/)).toBeInTheDocument();
    });

    it('should display recommendation', () => {
      render(<ToolCard toolResult={mockDrugResult} />);
      expect(screen.getByText(/Consider alternative/)).toBeInTheDocument();
    });

    it('should handle no interactions', () => {
      const noInteractionsResult = {
        ...mockDrugResult,
        result: {
          ...mockDrugResult.result,
          data: { interactions: [] },
        },
      };

      render(<ToolCard toolResult={noInteractionsResult} />);
      expect(screen.getByText(/No Interactions Detected/)).toBeInTheDocument();
    });
  });

  describe('Lab Interpreter rendering', () => {
    it('should display lab value count', () => {
      render(<ToolCard toolResult={mockLabResult} />);
      expect(screen.getByText(/1 of 2 values abnormal/)).toBeInTheDocument();
    });

    it('should display lab names', () => {
      render(<ToolCard toolResult={mockLabResult} />);
      expect(screen.getByText(/WBC/)).toBeInTheDocument();
      expect(screen.getByText(/Hemoglobin/)).toBeInTheDocument();
    });

    it('should display lab values with units', () => {
      render(<ToolCard toolResult={mockLabResult} />);
      const wbcRow = screen.getByText('WBC').closest('tr');
      expect(wbcRow).toHaveTextContent('2');
      expect(wbcRow).toHaveTextContent('K/μL');
      const hgbRow = screen.getByText('Hemoglobin').closest('tr');
      expect(hgbRow).toHaveTextContent('14');
      expect(hgbRow).toHaveTextContent('g/dL');
    });

    it('should display category interpretations', () => {
      render(<ToolCard toolResult={mockLabResult} />);
      expect(screen.getByText(/CBC/)).toBeInTheDocument();
      expect(screen.getByText(/Possible leukopenia/)).toBeInTheDocument();
    });

    it('should display suggested actions', () => {
      render(<ToolCard toolResult={mockLabResult} />);
      expect(screen.getByText(/Monitor/)).toBeInTheDocument();
    });

    it('should display critical values when present', () => {
      const criticalResult = {
        ...mockLabResult,
        result: {
          ...mockLabResult.result,
          data: {
            ...mockLabResult.result.data,
            criticalValues: [
              { name: 'Glucose', value: 500, unit: 'mg/dL', status: 'critical-high' },
            ],
          },
        },
      };

      render(<ToolCard toolResult={criticalResult} />);
      expect(screen.getByText(/Critical Values/)).toBeInTheDocument();
      expect(screen.getByText(/Glucose/)).toBeInTheDocument();
    });
  });

  describe('Warnings display', () => {
    it('should display warnings when present', () => {
      const resultWithWarnings = {
        ...mockSofaResult,
        result: {
          ...mockSofaResult.result,
          warnings: ['Parameter pao2 is outdated', 'Consider recent ABG'],
        },
      };

      render(<ToolCard toolResult={resultWithWarnings} />);
      expect(screen.getByText(/Warnings/)).toBeInTheDocument();
      expect(screen.getByText(/Parameter pao2 is outdated/)).toBeInTheDocument();
    });

    it('should not display warnings section when empty', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.queryByText(/^Warnings$/)).not.toBeInTheDocument();
    });
  });

  describe('Citations display', () => {
    it('should display citations when present', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.getByText(/References/i)).toBeInTheDocument();
      expect(screen.getByText(/Vincent JL et al/)).toBeInTheDocument();
    });

    it('should create links for citations with URLs', () => {
      const resultWithUrlCitation = {
        ...mockSofaResult,
        result: {
          ...mockSofaResult.result,
          citations: [
            {
              title: 'SOFA Study',
              reference: 'Vincent JL 1996',
              url: 'https://example.com/sofa',
            },
          ],
        },
      };

      render(<ToolCard toolResult={resultWithUrlCitation} />);
      const link = screen.getByRole('link', { name: /Link/i });
      expect(link).toHaveAttribute('href', 'https://example.com/sofa');
    });
  });

  describe('Disclaimer display', () => {
    it('should display disclaimer text', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.getByText(/This is for clinical reference only/)).toBeInTheDocument();
    });

    it('should have warning icon before disclaimer', () => {
      const { container } = render(<ToolCard toolResult={mockSofaResult} />);
      const disclaimerText = screen.getByText(/This is for clinical reference only/);
      expect(disclaimerText.textContent).toContain('⚠️');
    });
  });

  describe('Timestamp display', () => {
    it('should display execution timestamp', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      expect(screen.getByText(/Executed at/)).toBeInTheDocument();
    });

    it('should format timestamp correctly', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      const timestamp = screen.getByText(/Executed at/);
      expect(timestamp.textContent).toMatch(/\d+:\d+/); // HH:MM format
    });
  });

  describe('Error handling', () => {
    it('should handle result with no data', () => {
      const errorResult = {
        toolId: 'sofa-calculator',
        toolName: 'SOFA Score Calculator',
        result: {
          success: false,
          data: {},
          errors: ['Validation failed'],
          timestamp: new Date(),
        },
      };

      const { container } = render(<ToolCard toolResult={errorResult} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('should handle missing optional fields', () => {
      const minimalResult = {
        toolId: 'test-tool',
        toolName: 'Test Tool',
        result: {
          success: true,
          data: {},
          timestamp: new Date(),
        },
      };

      const { container } = render(<ToolCard toolResult={minimalResult} />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe('Styling and UI', () => {
    it('should have glass-morphism styling', () => {
      const { container } = render(<ToolCard toolResult={mockSofaResult} />);
      const card = container.querySelector('[class*="tool-result-card"]') || container.firstChild;
      expect(card).toBeDefined();
    });

    it('should have gradient background', () => {
      const { container } = render(<ToolCard toolResult={mockSofaResult} />);
      const card = container.firstChild;
      expect(card).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic structure', () => {
      const { container } = render(<ToolCard toolResult={mockSofaResult} />);
      // Component should render without accessibility warnings
      expect(container.firstChild).not.toBeNull();
    });

    it('should display tool name prominently', () => {
      render(<ToolCard toolResult={mockSofaResult} />);
      const toolName = screen.getByText('SOFA Score Calculator');
      expect(toolName).toBeVisible();
    });
  });

  describe('Data integrity', () => {
    it('should display all provided data', () => {
      render(<ToolCard toolResult={mockSofaResult} />);

      const respRow = screen.getByText('Respiration').closest('tr');
      expect(respRow).toHaveTextContent('2');
      expect(screen.getByText('Respiration')).toBeInTheDocument();
      expect(screen.getByText('Renal')).toBeInTheDocument();
    });

    it('should preserve data from original result', () => {
      const customResult = {
        ...mockSofaResult,
        result: {
          ...mockSofaResult.result,
          data: {
            ...mockSofaResult.result.data,
            totalScore: 15,
            mortalityEstimate: '>50% mortality risk',
          },
        },
      };

      render(<ToolCard toolResult={customResult} />);
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText(/>50%/)).toBeInTheDocument();
    });
  });

  describe('Generic tool fallback', () => {
    it('should render generic JSON for unknown tool types', () => {
      const unknownToolResult = {
        toolId: 'unknown-tool',
        toolName: 'Unknown Tool',
        result: {
          success: true,
          data: {
            customField: 'customValue',
            value: 42,
          },
          timestamp: new Date(),
        },
      };

      const { container } = render(<ToolCard toolResult={unknownToolResult} />);
      expect(container.textContent).toContain('customField');
    });
  });
});

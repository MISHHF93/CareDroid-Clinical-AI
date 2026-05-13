import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import UserContext from '../contexts/UserContext';
import { CostTrackingProvider, useCostTracking } from '../contexts/CostTrackingContext';

const testUserContextValue = {
  user: { id: 'default', role: 'physician' },
  authToken: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  hasPermission: () => true,
  hasAnyPermission: () => true,
  hasAllPermissions: () => true,
  setUser: vi.fn(),
  setAuthToken: vi.fn(),
  signOut: vi.fn(),
};

describe('CostTrackingContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }) => (
    <UserContext.Provider value={testUserContextValue}>
      <CostTrackingProvider>{children}</CostTrackingProvider>
    </UserContext.Provider>
  );

  describe('trackToolCost', () => {
    it('should track tool execution and update costs', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.trackToolCost('drug-checker', {
          executionTimeMs: 150,
          userId: 'default',
        });
      });

      expect(result.current.costData.totalCost).toBeGreaterThan(0);
      expect(result.current.costData.executions).toHaveLength(1);
      expect(result.current.costData.executions[0].toolId).toBe('drug-checker');
    });

    it('should accumulate costs for multiple executions', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.trackToolCost('drug-checker');
        result.current.trackToolCost('lab-interpreter');
        result.current.trackToolCost('calculator');
      });

      expect(result.current.costData.executions).toHaveLength(3);
      expect(result.current.costData.totalCost).toBeGreaterThan(0);
    });

    it('should categorize costs correctly', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.trackToolCost('drug-checker');
      });

      const { categoryCosts } = result.current.costData;
      expect(categoryCosts.MEDICATION_MANAGEMENT).toBeGreaterThan(0);
    });
  });

  describe('getROIMetrics', () => {
    it('should calculate ROI metrics correctly', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.trackToolCost('drug-checker');
        result.current.trackToolCost('lab-interpreter');
      });

      const roi = result.current.getROIMetrics();

      expect(parseFloat(roi.totalCost)).toBeGreaterThan(0);
      expect(roi.timeSavedMinutes).toBeGreaterThan(0);
      expect(parseFloat(roi.valueSaved)).toBeGreaterThan(0);
      expect(roi.netValue).toBeDefined();
      expect(roi.roi).toBeDefined();
    });

    it('should calculate positive ROI when value exceeds cost', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.trackToolCost('drug-checker');
        }
      });

      const roi = result.current.getROIMetrics();
      expect(parseFloat(roi.roi)).toBeGreaterThan(0);
      expect(parseFloat(roi.netValue)).toBeGreaterThan(0);
    });
  });

  describe('getCostTrends', () => {
    it('should return daily cost aggregates', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.trackToolCost('drug-checker');
        result.current.trackToolCost('lab-interpreter');
      });

      const trends = result.current.getCostTrends();
      expect(trends).toBeInstanceOf(Array);
      expect(trends.length).toBeGreaterThan(0);

      const todayTrend = trends[trends.length - 1];
      expect(todayTrend).toHaveProperty('date');
      expect(todayTrend).toHaveProperty('cost');
      expect(todayTrend.cost).toBeGreaterThan(0);
    });

    it('should return 30 days of trend data', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const trends = result.current.getCostTrends();
      expect(trends).toHaveLength(30);
    });
  });

  describe('getTopSpendingTools', () => {
    it('should return top spending tools sorted by cost', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        for (let i = 0; i < 5; i++) result.current.trackToolCost('drug-checker');
        for (let i = 0; i < 2; i++) result.current.trackToolCost('lab-interpreter');
        result.current.trackToolCost('calculator');
      });

      const topTools = result.current.getTopSpendingTools(3);

      expect(topTools).toHaveLength(3);
      expect(topTools[0].toolId).toBe('drug-check');

      for (let i = 0; i < topTools.length - 1; i++) {
        expect(topTools[i].cost).toBeGreaterThanOrEqual(topTools[i + 1].cost);
      }
    });

    it('should limit results based on limit parameter', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.trackToolCost('drug-checker');
        result.current.trackToolCost('lab-interpreter');
        result.current.trackToolCost('calculator');
        result.current.trackToolCost('diagnosis-assistant');
      });

      const top2 = result.current.getTopSpendingTools(2);
      expect(top2).toHaveLength(2);
    });
  });

  describe('Budget Limits', () => {
    it('should detect when approaching cost limit (80%)', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCostLimit(1.0);
      });

      act(() => {
        for (let i = 0; i < 17; i++) {
          result.current.trackToolCost('drug-checker');
        }
      });

      expect(result.current.isCostLimitApproaching).toBe(true);
      expect(result.current.isCostLimitExceeded).toBe(false);
    });

    it('should detect when cost limit is exceeded (100%)', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCostLimit(0.5);
      });

      act(() => {
        for (let i = 0; i < 12; i++) {
          result.current.trackToolCost('drug-checker');
        }
      });

      expect(result.current.isCostLimitExceeded).toBe(true);
      expect(result.current.isCostLimitApproaching).toBe(true);
    });

    it('should allow updating cost limit', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCostLimit(10.0);
      });

      expect(result.current.costLimit).toBe(10.0);

      act(() => {
        result.current.updateCostLimit(20.0);
      });

      expect(result.current.costLimit).toBe(20.0);
    });
  });

  describe('resetCostData', () => {
    it('should clear all cost tracking data', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.trackToolCost('drug-checker');
        result.current.trackToolCost('lab-interpreter');
      });

      expect(result.current.costData.totalCost).toBeGreaterThan(0);
      expect(result.current.costData.executions).toHaveLength(2);

      act(() => {
        result.current.resetCostData();
      });

      expect(result.current.costData.totalCost).toBe(0);
      expect(result.current.costData.executions).toHaveLength(0);
      expect(result.current.costData.monthlyCost).toBe(0);
    });

    it('should preserve cost limit after reset', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateCostLimit(15.0);
        result.current.trackToolCost('drug-checker');
      });

      const limitBefore = result.current.costLimit;

      act(() => {
        result.current.resetCostData();
      });

      expect(result.current.costLimit).toBe(limitBefore);
    });
  });

  describe('persistence', () => {
    it('should persist cost data to localStorage', async () => {
      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.trackToolCost('drug-checker');
      });

      await waitFor(() => {
        const saved = localStorage.getItem('careDroid.costs.default');
        expect(saved).toBeTruthy();
      });

      const saved = localStorage.getItem('careDroid.costs.default');
      const parsed = JSON.parse(saved);
      expect(parsed.executions).toHaveLength(1);
      expect(parsed.totalCost).toBeGreaterThan(0);
    });

    it('should load persisted data on mount', async () => {
      const initialData = {
        totalCost: 1.5,
        monthlyCost: 1.5,
        executions: [
          {
            toolId: 'drug-checker',
            cost: 0.05,
            timestamp: new Date().toISOString(),
            userId: 'default',
          },
        ],
        toolCosts: { 'drug-checker': 0.05 },
        categoryCosts: { MEDICATION_MANAGEMENT: 0.05 },
      };

      localStorage.setItem('careDroid.costs.default', JSON.stringify(initialData));

      const { result } = renderHook(() => useCostTracking(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.costData.totalCost).toBe(1.5);
      });

      expect(result.current.costData.executions).toHaveLength(1);
    });
  });
});

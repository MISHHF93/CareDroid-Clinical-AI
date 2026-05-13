import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useUser } from './UserContext';

const CostTrackingContext = createContext(null);

/** Map legacy / API ids to canonical ids from `toolRegistry` */
const TOOL_ID_ALIASES = {
  'drug-checker': 'drug-check',
  'lab-interpreter': 'lab-interp',
  calculator: 'calculators',
  'protocol-lookup': 'protocols',
  'diagnosis-assistant': 'diagnosis',
  'procedure-guide': 'procedures',
};

function canonicalToolId(toolId) {
  if (!toolId) return toolId;
  return TOOL_ID_ALIASES[toolId] || toolId;
}

// Tool cost configuration (per execution in USD) — keys match `src/data/toolRegistry` ids where applicable
const TOOL_COSTS = {
  'drug-check': 0.05,
  'lab-interp': 0.08,
  calculators: 0.02,
  protocols: 0.03,
  diagnosis: 0.10,
  procedures: 0.04,
  'vitals-monitor': 0.06,
  sofa: 0.07,
  'antibiotic-scripts': 0.09,
  'trauma-score': 0.05,
  'abc-assessment': 0.04,
  'bleeding-risk': 0.06,
  'cancer-calculator': 0.08,
  'tumor-staging': 0.07,
  'chemo-calculator': 0.09,
  default: 0.05,
};

// Cost categories for analytics (canonical tool ids)
const COST_CATEGORIES = {
  CLINICAL_DECISION_SUPPORT: ['diagnosis', 'protocols', 'sofa'],
  MEDICATION_MANAGEMENT: ['drug-check', 'antibiotic-scripts', 'chemo-calculator'],
  RISK_ASSESSMENT: ['trauma-score', 'bleeding-risk', 'cancer-calculator'],
  DIAGNOSTIC_TOOLS: ['lab-interp', 'vitals-monitor'],
  CALCULATIONS: ['calculators', 'tumor-staging'],
};

export const CostTrackingProvider = ({ children }) => {
  const { user } = useUser();
  const [costData, setCostData] = useState({
    totalCost: 0,
    monthlyCost: 0,
    toolCosts: {},
    categoryCosts: {},
    executions: []
  });
  const [costLimit, setCostLimit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load cost data from offline storage
  useEffect(() => {
    const loadCostData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const storedCosts = localStorage.getItem(`careDroid.costs.${user.id}`);
        if (storedCosts) {
          const parsed = JSON.parse(storedCosts);
          setCostData(parsed);
        }

        const storedLimit = localStorage.getItem(`careDroid.costLimit.${user.id}`);
        if (storedLimit) {
          setCostLimit(parseFloat(storedLimit));
        }
      } catch (error) {
        console.error('Failed to load cost data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCostData();
  }, [user]);

  // Persist cost data to localStorage
  useEffect(() => {
    if (user?.id && !isLoading) {
      try {
        localStorage.setItem(`careDroid.costs.${user.id}`, JSON.stringify(costData));
      } catch (error) {
        console.error('Failed to save cost data:', error);
      }
    }
  }, [costData, user, isLoading]);

  // Track tool execution cost
  const trackToolCost = (toolId, metadata = {}) => {
    const canonicalId = canonicalToolId(toolId);
    const cost = TOOL_COSTS[canonicalId] || TOOL_COSTS.default;
    const execution = {
      ...metadata,
      toolId,
      canonicalToolId: canonicalId,
      cost,
      timestamp: new Date().toISOString(),
      userId: user?.id,
    };

    setCostData(prev => {
      const newToolCosts = { ...prev.toolCosts };
      newToolCosts[canonicalId] = (newToolCosts[canonicalId] || 0) + cost;

      // Calculate category costs
      const newCategoryCosts = { ...prev.categoryCosts };
      Object.entries(COST_CATEGORIES).forEach(([category, tools]) => {
        if (tools.includes(canonicalId)) {
          newCategoryCosts[category] = (newCategoryCosts[category] || 0) + cost;
        }
      });

      return {
        totalCost: prev.totalCost + cost,
        monthlyCost: calculateMonthlyCost([...prev.executions, execution]),
        toolCosts: newToolCosts,
        categoryCosts: newCategoryCosts,
        executions: [...prev.executions, execution]
      };
    });

    return cost;
  };

  // Calculate monthly cost from executions
  const calculateMonthlyCost = (executions) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return executions
      .filter(exec => new Date(exec.timestamp) >= thirtyDaysAgo)
      .reduce((sum, exec) => sum + exec.cost, 0);
  };

  // Get cost for specific tool
  const getToolCost = (toolId) => {
    const canonicalId = canonicalToolId(toolId);
    return TOOL_COSTS[canonicalId] || TOOL_COSTS.default;
  };

  // Get top spending tools
  const getTopSpendingTools = (limit = 5) => {
    return Object.entries(costData.toolCosts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([toolId, cost]) => ({ toolId, cost }));
  };

  // Get cost trends (daily aggregates for last 30 days)
  const getCostTrends = () => {
    const trends = {};
    const now = new Date();
    
    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      trends[dateKey] = 0;
    }

    // Aggregate costs by day
    costData.executions.forEach(exec => {
      const dateKey = exec.timestamp.split('T')[0];
      if (Object.prototype.hasOwnProperty.call(trends, dateKey)) {
        trends[dateKey] += exec.cost;
      }
    });

    return Object.entries(trends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost }));
  };

  // Check if approaching cost limit
  const isCostLimitApproaching = useMemo(() => {
    if (!costLimit) return false;
    return costData.monthlyCost >= costLimit * 0.8;
  }, [costLimit, costData.monthlyCost]);

  // Check if cost limit exceeded
  const isCostLimitExceeded = useMemo(() => {
    if (!costLimit) return false;
    return costData.monthlyCost >= costLimit;
  }, [costLimit, costData.monthlyCost]);

  // Set monthly cost limit
  const updateCostLimit = (newLimit) => {
    setCostLimit(newLimit);
    if (user?.id) {
      localStorage.setItem(`careDroid.costLimit.${user.id}`, newLimit.toString());
    }
  };

  // Reset cost data (for new billing cycle)
  const resetCostData = () => {
    const newData = {
      totalCost: 0,
      monthlyCost: 0,
      toolCosts: {},
      categoryCosts: {},
      executions: []
    };
    setCostData(newData);
  };

  // Calculate ROI metrics
  const getROIMetrics = () => {
    const avgTimePerTool = 5; // minutes saved per tool usage
    const clinicianHourlyRate = 75; // USD per hour (configurable)
    
    const totalExecutions = costData.executions.length;
    const timeSavedMinutes = totalExecutions * avgTimePerTool;
    const timeSavedHours = timeSavedMinutes / 60;
    const valueSaved = timeSavedHours * clinicianHourlyRate;
    const roi = costData.totalCost > 0 ? ((valueSaved - costData.totalCost) / costData.totalCost) * 100 : 0;

    return {
      totalExecutions,
      timeSavedMinutes,
      timeSavedHours: timeSavedHours.toFixed(1),
      valueSaved: valueSaved.toFixed(2),
      totalCost: costData.totalCost.toFixed(2),
      netValue: (valueSaved - costData.totalCost).toFixed(2),
      roi: roi.toFixed(0)
    };
  };

  const value = {
    costData,
    costLimit,
    isLoading,
    trackToolCost,
    getToolCost,
    getTopSpendingTools,
    getCostTrends,
    updateCostLimit,
    resetCostData,
    getROIMetrics,
    isCostLimitApproaching,
    isCostLimitExceeded,
    TOOL_COSTS,
    COST_CATEGORIES
  };

  return (
    <CostTrackingContext.Provider value={value}>
      {children}
    </CostTrackingContext.Provider>
  );
};

export const useCostTracking = () => {
  const context = useContext(CostTrackingContext);
  if (!context) {
    throw new Error('useCostTracking must be used within CostTrackingProvider');
  }
  return context;
};

export default CostTrackingContext;

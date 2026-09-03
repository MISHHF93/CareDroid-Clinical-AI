const normalizeSeverity = (value) => {
  if (!value) return 'info';
  const severity = String(value).toLowerCase();
  if (['critical', 'danger', 'high'].includes(severity)) return 'critical';
  if (['warning', 'moderate', 'medium'].includes(severity)) return 'warning';
  if (['success', 'normal', 'low'].includes(severity)) return 'normal';
  return 'info';
};

const pushUnique = (list, message) => {
  if (!message) return;
  if (!list.includes(message)) {
    list.push(message);
  }
};

export const buildClinicalInsights = (tool, results) => {
  if (!results) return null;

  const insights = {
    severity: 'info',
    summary: `Generated insights for ${tool?.name || 'this tool'}.`,
    alerts: [],
    recommendations: [],
  };

  if (typeof results === 'string') {
    insights.summary = 'AI response generated for review.';
    pushUnique(insights.recommendations, 'Validate findings with clinical judgment.');
    return insights;
  }

  const criticalCount = results.summary?.critical || results.summary?.criticalCount || 0;
  const abnormalCount = results.summary?.abnormal || 0;
  const criticalValues = results.criticalValues || [];

  if (criticalCount > 0 || criticalValues.length > 0) {
    insights.severity = 'critical';
    pushUnique(insights.alerts, 'Critical values detected. Review immediately.');
  } else if (abnormalCount > 0) {
    insights.severity = 'warning';
    pushUnique(insights.alerts, 'Abnormal values detected. Review and correlate clinically.');
  }

  if (results.severity) {
    insights.severity = normalizeSeverity(results.severity);
  }

  const scoreValue = typeof results.totalScore === 'number' ? results.totalScore : results.score;

  if (typeof scoreValue === 'number') {
    if (scoreValue >= 13) {
      insights.severity = 'critical';
      pushUnique(insights.alerts, 'High severity score. Consider escalation.');
    } else if (scoreValue >= 7) {
      insights.severity = 'warning';
      pushUnique(insights.alerts, 'Moderate risk score. Monitor closely.');
    }
  }

  if (results.interpretation) {
    pushUnique(insights.recommendations, results.interpretation);
  }

  if (results.recommendation) {
    pushUnique(insights.recommendations, results.recommendation);
  }

  if (results.risk) {
    pushUnique(insights.recommendations, `Risk assessment: ${results.risk}`);
  }

  if (tool?.id === 'lab-interpreter' || tool?.id === 'lab-interp') {
    insights.summary = 'Lab interpretation insights generated.';
    if (criticalValues.length > 0) {
      pushUnique(
        insights.recommendations,
        'Confirm critical values and evaluate urgent interventions.',
      );
    }
    if (results.interpretations?.length) {
      results.interpretations.forEach((interpretation) => {
        interpretation?.suggestedActions?.forEach((action) => {
          pushUnique(insights.recommendations, action);
        });
      });
    }
  }

  if (tool?.id === 'calculators' && results.calculator === 'sofa') {
    insights.summary = 'SOFA score insights generated.';
    if (scoreValue >= 13) {
      pushUnique(insights.recommendations, 'Consider ICU escalation and multidisciplinary review.');
    } else if (scoreValue >= 7) {
      pushUnique(insights.recommendations, 'Increase monitoring and reassess organ support needs.');
    }
  }

  if (insights.alerts.length === 0 && insights.recommendations.length === 0) {
    pushUnique(insights.recommendations, 'No urgent issues detected. Continue routine monitoring.');
  }

  return insights;
};

/**
 * Clinical Intelligence Risk Scoring Utility
 * Integrates with tool results to provide risk assessment
 */

export const computeRiskScore = (tool, results) => {
  if (!results) return null;

  const effectiveTool = normalizeToolId(tool, results);
  let riskScore = 0;
  let riskFactors = [] as any[];
  let severity = 'low';
  let anomalies = [] as any[];
  let scored = false;

  // SOFA Score Risk Assessment
  if (effectiveTool === 'sofa' || results.sofaScore !== undefined || results.totalScore !== undefined) {
    const sofaScore = finiteNumber(results.sofaScore ?? results.totalScore);
    if (sofaScore === null || sofaScore < 0) return null;
    scored = true;

    if (sofaScore >= 13) {
      riskScore = Math.min(0.95, 0.7 + (sofaScore - 13) * 0.02);
      severity = 'critical';
      riskFactors.push('SOFA ≥ 13 (High mortality risk)');
      riskFactors.push('Multi-organ dysfunction detected');
    } else if (sofaScore >= 10) {
      riskScore = 0.6;
      severity = 'high';
      riskFactors.push('SOFA ≥ 10 (Elevated mortality risk)');
    } else if (sofaScore >= 6) {
      riskScore = 0.4;
      severity = 'moderate';
      riskFactors.push('SOFA ≥ 6 (Moderate organ dysfunction)');
    } else {
      riskScore = 0.15;
      severity = 'low';
    }
  }

  // Critical result risk assessment for ED decision support
  if (
    (effectiveTool === 'lab-interpreter' || effectiveTool === 'lab-interp') &&
    getLabCounts(results).isScored
  ) {
    const { criticalCount, abnormalCount } = getLabCounts(results);
    scored = true;

    if (criticalCount > 0) {
      const criticalRisk = Math.min(0.9, 0.5 + criticalCount * 0.2);
      riskScore = Math.max(riskScore, criticalRisk);
      severity = 'critical';
      riskFactors.push(`${criticalCount} critical lab value${criticalCount > 1 ? 's' : ''}`);
    } else if (abnormalCount >= 3) {
      const abnormalRisk = 0.5 + abnormalCount * 0.05;
      riskScore = Math.max(riskScore, abnormalRisk);
      if (severity !== 'critical') severity = 'high';
      riskFactors.push(`${abnormalCount} abnormal lab values`);
    }

    if (typeof results.interpretation === 'string') {
      const lowerInterp = results.interpretation.toLowerCase();
      if (lowerInterp.includes('hyperkalemia') || lowerInterp.includes('acidosis')) {
        riskFactors.push('Electrolyte abnormality detected');
      }
    }
  }

  // GFR Risk Assessment (Kidney function)
  if (effectiveTool === 'gfr' && results.gfr !== undefined) {
    const gfr = finiteNumber(results.gfr);
    if (gfr === null || gfr < 0) return null;
    scored = true;

    if (gfr < 15) {
      riskScore = Math.max(riskScore, 0.85);
      severity = 'critical';
      riskFactors.push('Severe kidney dysfunction (GFR < 15)');
    } else if (gfr < 30) {
      riskScore = Math.max(riskScore, 0.65);
      if (severity !== 'critical') severity = 'high';
      riskFactors.push('Moderate kidney dysfunction (GFR < 30)');
    } else if (gfr < 60) {
      riskScore = Math.max(riskScore, 0.35);
      if (severity === 'low') severity = 'moderate';
      riskFactors.push('Mild kidney dysfunction (GFR < 60)');
    }
  }

  // BMI Risk Assessment
  if (effectiveTool === 'bmi' && results.bmi !== undefined) {
    const bmi = finiteNumber(results.bmi);
    if (bmi === null || bmi <= 0) return null;
    scored = true;

    if (bmi > 40 || bmi < 18.5) {
      riskScore = Math.max(riskScore, 0.45);
      if (severity === 'low') severity = 'moderate';
      riskFactors.push(`BMI ${bmi < 18.5 ? 'underweight' : 'obese'} (increased comorbidity risk)`);
    }
  }

  // CHA2DS2-VASc Risk Assessment (Stroke risk)
  if (effectiveTool === 'cha2ds2-vasc' && results.score !== undefined) {
    const score = finiteNumber(results.score);
    if (score === null || score < 0) return null;
    scored = true;

    if (score >= 4) {
      riskScore = Math.max(riskScore, 0.75);
      severity = 'high';
      riskFactors.push(`CHA2DS2-VASc ≥ 4 (High stroke risk)`);
      riskFactors.push(
        'Review anticoagulation indications and contraindications per local protocol',
      );
    } else if (score >= 2) {
      riskScore = Math.max(riskScore, 0.5);
      if (severity === 'low') severity = 'moderate';
      riskFactors.push(`CHA2DS2-VASc ≥ 2 (Moderate stroke risk)`);
    }
  }

  // Detect anomalies (statistical outliers)
  if (results.outliers && Array.isArray(results.outliers)) {
    anomalies = results.outliers;
    if (anomalies.length > 0) {
      riskScore = Math.min(0.95, riskScore + 0.15);
      scored = true;
    }
  }

  if (!scored) return null;

  return {
    riskScore: Math.min(0.99, riskScore),
    severity,
    riskFactors,
    anomalies,
  };
};

export const generateClinicalAlerts = (tool, results, riskData) => {
  const alerts = [] as any[];
  const effectiveTool = normalizeToolId(tool, results);
  const { criticalCount } = getLabCounts(results || {});
  const sofaScore = finiteNumber(results?.sofaScore ?? results?.totalScore);

  if (!results || !riskData) return alerts;

  // Critical alerts
  if (riskData.severity === 'critical') {
    if (effectiveTool === 'sofa' && (sofaScore as any) >= 13) {
      alerts.push({
        id: 'alert-sofa-critical',
        severity: 'critical',
        title: 'Critical SOFA Score',
        description: 'Patient shows signs of multiple organ dysfunction',
        findings: [`SOFA Score: ${sofaScore}/24`, 'Mortality risk: High'],
        recommendations: [
          'Review ICU or critical-care escalation criteria with the responsible clinician',
          'Evaluate organ-support needs per institutional pathway',
          'Request critical-care review if clinically indicated',
        ],
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    if ((effectiveTool === 'lab-interpreter' || effectiveTool === 'lab-interp') && criticalCount > 0) {
      alerts.push({
        id: 'alert-lab-critical',
        severity: 'critical',
        title: 'Critical Laboratory Values',
        description: `${criticalCount} critical lab value${criticalCount > 1 ? 's' : ''} detected`,
        findings: results.criticalValues || ['One or more lab values require immediate attention'],
        recommendations: [
          'Confirm critical values promptly through local critical-result workflow',
          'Assess patient clinical status',
          'Review intervention options with the responsible clinician if clinically indicated',
        ],
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  }

  // High-risk alerts
  if (riskData.severity === 'high') {
    if (effectiveTool === 'cha2ds2-vasc' && results.score >= 4) {
      alerts.push({
        id: 'alert-stroke-high',
        severity: 'high',
        title: 'High Stroke Risk',
        description: `CHA2DS2-VASc score of ${results.score} indicates significant stroke risk`,
        findings: [`Score: ${results.score}`, 'Patient has multiple stroke risk factors'],
        recommendations: [
          'Review anticoagulation indications and contraindications per local protocol',
          'Review bleeding risk, contraindications, and patient-specific factors',
          'Discuss risk/benefit with patient',
        ],
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    if (effectiveTool === 'gfr' && results.gfr < 30) {
      alerts.push({
        id: 'alert-kidney-high',
        severity: 'high',
        title: 'Reduced Kidney Function Signal',
        description: `GFR ${results.gfr} is in a reduced kidney-function range; confirm chronicity and clinical context before labeling CKD.`,
        findings: [
          `GFR: ${results.gfr} mL/min/1.73m²`,
          'CKD Stage: ' + getKidneyStage(results.gfr),
        ],
        recommendations: [
          'Review medication dosing for renal function',
          'Monitor electrolytes regularly',
          'Consider nephrology referral',
          'Review nutrition considerations when clinically relevant',
        ],
        timestamp: new Date(),
        acknowledged: false,
      });
    }
  }

  // Anomaly alerts
  if (riskData.anomalies && riskData.anomalies.length > 0) {
    alerts.push({
      id: 'alert-anomaly-values',
      severity: 'warning',
      title: 'Anomalous Values Detected',
      description: `${riskData.anomalies.length} statistical outlier${riskData.anomalies.length > 1 ? 's' : ''} found in results`,
      findings: riskData.anomalies.slice(0, 3),
      recommendations: [
        'Verify lab specimen quality',
        'Consider repeat testing if appropriate',
        'Review patient context for explanation',
      ],
      timestamp: new Date(),
      acknowledged: false,
    });
  }

  return alerts;
};

const TOOL_ALIASES = Object.freeze({
  calculators: null,
  chads2vasc: 'cha2ds2-vasc',
  'cha2ds2vasc': 'cha2ds2-vasc',
  'cha2ds2-vasc': 'cha2ds2-vasc',
  lab: 'lab-interp',
  'lab-interpreter': 'lab-interpreter',
  'lab-interp': 'lab-interp',
});

function normalizeToolId(tool, results: any = {}) {
  const resultTool = results.calculator || results.toolId || results.id;
  const raw = String(resultTool || tool || '').toLowerCase();
  return TOOL_ALIASES[raw] || raw;
}

function finiteNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getLabCounts(results) {
  const criticalFromValues = Array.isArray(results.criticalValues)
    ? results.criticalValues.length
    : undefined;
  const criticalCount = finiteNumber(
    results.criticalCount ?? results.summary?.critical ?? criticalFromValues,
  );
  const abnormalCount = finiteNumber(results.abnormalCount ?? results.summary?.abnormal);

  return {
    criticalCount: criticalCount ?? 0,
    abnormalCount: abnormalCount ?? 0,
    isScored: criticalCount !== null || abnormalCount !== null,
  };
}

const getKidneyStage = (gfr) => {
  if (gfr >= 90) return '1 (Normal)';
  if (gfr >= 60) return '2 (Mild)';
  if (gfr >= 45) return '3a (Mild-moderate)';
  if (gfr >= 30) return '3b (Moderate-severe)';
  if (gfr >= 15) return '4 (Severe)';
  return '5 (End-stage)';
};

export const categorizeRiskSeverity = (riskScore) => {
  if (riskScore >= 0.85) return { severity: 'critical', label: 'Critical Risk' };
  if (riskScore >= 0.65) return { severity: 'high', label: 'High Risk' };
  if (riskScore >= 0.45) return { severity: 'moderate', label: 'Moderate Risk' };
  if (riskScore >= 0.25) return { severity: 'warning', label: 'Low-Moderate Risk' };
  return { severity: 'low', label: 'Low Risk' };
};

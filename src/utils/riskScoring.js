/**
 * Clinical Intelligence Risk Scoring Utility
 * Integrates with tool results to provide risk assessment
 */

export const computeRiskScore = (tool, results) => {
  if (!results) return null;

  let riskScore = 0;
  let riskFactors = [];
  let severity = 'low';
  let anomalies = [];

  // SOFA Score Risk Assessment
  if (tool === 'sofa' || results.sofaScore !== undefined) {
    const sofaScore = results.sofaScore || 0;

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
    (tool === 'lab-interpreter' || tool === 'lab-interp') &&
    results.criticalCount !== undefined
  ) {
    const criticalCount = results.criticalCount || 0;
    const abnormalCount = results.abnormalCount || 0;

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

    if (results.interpretation) {
      const lowerInterp = results.interpretation.toLowerCase();
      if (lowerInterp.includes('hyperkalemia') || lowerInterp.includes('acidosis')) {
        riskFactors.push('Electrolyte abnormality detected');
      }
    }
  }

  // GFR Risk Assessment (Kidney function)
  if (tool === 'gfr' && results.gfr !== undefined) {
    const gfr = results.gfr || 0;

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
  if (tool === 'bmi' && results.bmi !== undefined) {
    const bmi = results.bmi || 0;

    if (bmi > 40 || bmi < 18.5) {
      riskScore = Math.max(riskScore, 0.45);
      if (severity === 'low') severity = 'moderate';
      riskFactors.push(`BMI ${bmi < 18.5 ? 'underweight' : 'obese'} (increased comorbidity risk)`);
    }
  }

  // CHA2DS2-VASc Risk Assessment (Stroke risk)
  if (tool === 'cha2ds2-vasc' && results.score !== undefined) {
    const score = results.score || 0;

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
    }
  }

  return {
    riskScore: Math.min(0.99, riskScore),
    severity,
    riskFactors,
    anomalies,
  };
};

export const generateClinicalAlerts = (tool, results, riskData) => {
  const alerts = [];

  if (!results || !riskData) return alerts;

  // Critical alerts
  if (riskData.severity === 'critical') {
    if (tool === 'sofa' && results.sofaScore >= 13) {
      alerts.push({
        id: `alert-sofa-${Date.now()}`,
        severity: 'critical',
        title: 'Critical SOFA Score',
        description: 'Patient shows signs of multiple organ dysfunction',
        findings: [`SOFA Score: ${results.sofaScore}/24`, 'Mortality risk: High'],
        recommendations: [
          'Review ICU or critical-care escalation criteria with the responsible clinician',
          'Evaluate organ-support needs per institutional pathway',
          'Request critical-care review if clinically indicated',
        ],
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    if ((tool === 'lab-interpreter' || tool === 'lab-interp') && results.criticalCount > 0) {
      alerts.push({
        id: `alert-lab-${Date.now()}`,
        severity: 'critical',
        title: 'Critical Laboratory Values',
        description: `${results.criticalCount} critical lab value${results.criticalCount > 1 ? 's' : ''} detected`,
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
    if (tool === 'cha2ds2-vasc' && results.score >= 4) {
      alerts.push({
        id: `alert-stroke-${Date.now()}`,
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

    if (tool === 'gfr' && results.gfr < 30) {
      alerts.push({
        id: `alert-kidney-${Date.now()}`,
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
      id: `alert-anomaly-${Date.now()}`,
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

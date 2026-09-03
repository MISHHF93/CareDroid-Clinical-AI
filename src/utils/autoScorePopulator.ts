const RISK_FACTOR_KEYWORDS = [
  { id: 'diabetes', pattern: /\b(diabetes|diabetic|dm2|t2dm)\b/i, label: 'diabetes' },
  { id: 'hypertension', pattern: /\b(hypertension|hypertensive|htn)\b/i, label: 'hypertension' },
  {
    id: 'hypercholesterolaemia',
    pattern: /\b(hypercholesterola?emia|hyperlipid|high cholesterol|dyslipid)\b/i,
    label: 'hypercholesterolaemia',
  },
  { id: 'smoker', pattern: /\b(smoker|smoking|tobacco)\b/i, label: 'smoker' },
  { id: 'obesity', pattern: /\b(obesity|obese|bmi\s*[3-9]\d)\b/i, label: 'obesity' },
  {
    id: 'family-history',
    pattern: /\b(family history|fhx|father|mother|sibling).{0,32}\b(cad|mi|acs|heart)\b/i,
    label: 'family history',
  },
];

const NIHSS_NOTE_PATTERNS = [
  {
    fieldId: 'motorLeft',
    pattern: /\b(left).{0,24}\b(weak|weakness|drift|paresis|paralysis)\b/i,
    label: 'left limb weakness documented',
  },
  {
    fieldId: 'motorRight',
    pattern: /\b(right).{0,24}\b(weak|weakness|drift|paresis|paralysis)\b/i,
    label: 'right limb weakness documented',
  },
  {
    fieldId: 'facial',
    pattern: /\b(facial droop|face droop|facial palsy)\b/i,
    label: 'facial droop documented',
  },
  {
    fieldId: 'language',
    pattern: /\b(aphasia|word finding|expressive language)\b/i,
    label: 'language deficit documented',
  },
  {
    fieldId: 'dysarthria',
    pattern: /\b(dysarthria|slurred speech)\b/i,
    label: 'dysarthria documented',
  },
  {
    fieldId: 'gaze',
    pattern: /\b(gaze deviation|forced gaze)\b/i,
    label: 'gaze finding documented',
  },
  {
    fieldId: 'visual',
    pattern: /\b(visual field|hemianopia|vision loss)\b/i,
    label: 'visual field finding documented',
  },
];

function textBlob(...parts) {
  return parts
    .flatMap((part) => {
      if (!part) return [];
      if (Array.isArray(part)) return part;
      return [part];
    })
    .map((item) => {
      if (typeof item === 'string') return item;
      return [
        item.body,
        item.note,
        item.summary,
        item.name,
        item.label,
        item.value,
        item.status,
        item.dosage,
      ]
        .filter(Boolean)
        .join(' ');
    })
    .join(' ');
}

function recognizedComplaint(patient) {
  const complaint = [patient?.complaintCategory, patient?.chiefComplaint, patient?.complaint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/\b(chest pain|chest tightness|acs|cardiac)\b/.test(complaint)) return 'heart';
  if (/\b(sepsis|infection|infectious)\b/.test(complaint)) return 'qsofa';
  if (/\b(stroke|neuro|neurologic|weakness|aphasia)\b/.test(complaint)) return 'nihss';
  return null;
}

function ageToHeartPoints(age) {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge)) return null;
  if (numericAge >= 65) return 2;
  if (numericAge >= 45) return 1;
  return 0;
}

function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = String(value || '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseUpperReference(referenceRange) {
  const text = String(referenceRange || '');
  const lessThan = text.match(/<\s*(\d+(?:\.\d+)?)/);
  if (lessThan) return Number(lessThan[1]);
  const range = text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (range) return Number(range[2]);
  const upper = text.match(/upper(?:\s+limit)?\D+(\d+(?:\.\d+)?)/i);
  return upper ? Number(upper[1]) : null;
}

function latestTroponin(labs = [] as any[]) {
  return [...labs]
    .filter((lab) => /troponin/i.test([lab.name, lab.label, lab.code].filter(Boolean).join(' ')))
    .sort(
      (a, b) =>
        (new Date(b.resultedAt || b.recordedAt || b.createdAt || 0) as any) -
        (new Date(a.resultedAt || a.recordedAt || a.createdAt || 0) as any),
    )[0];
}

function troponinToHeartPoints(lab) {
  if (!lab) return null;
  const value = parseNumber(lab.value ?? lab.result);
  const upperReference = parseUpperReference(lab.referenceRange || lab.refRange || lab.normalRange);
  if (value === null || upperReference === null || upperReference <= 0) return null;
  if (value > upperReference * 3) return 2;
  if (value > upperReference) return 1;
  return 0;
}

function createField(value, source, status = 'prefilled', detail = '') {
  return { value, source, status, detail };
}

function buildHeartPrefill(patient, chartData: any = {}) {
  const values: any = {};
  const fields: any = {};
  const requiresAssessment = ['history', 'ecg'];
  const agePoints = ageToHeartPoints(patient?.age);
  if (agePoints !== null) {
    values.age = agePoints;
    fields.age = createField(
      agePoints,
      `Age ${patient.age}`,
      'prefilled',
      'Auto-filled from patient age',
    );
  }

  const riskText = textBlob(
    patient?.medicationHistory,
    patient?.notes,
    chartData.medications,
    chartData.documents,
  );
  const matchedRiskFactors = RISK_FACTOR_KEYWORDS.filter((risk) => risk.pattern.test(riskText));
  if (matchedRiskFactors.length) {
    const riskPoints = Math.min(2, matchedRiskFactors.length);
    values.riskFactors = riskPoints;
    fields.riskFactors = createField(
      riskPoints,
      matchedRiskFactors.map((risk) => risk.label).join(', '),
      'prefilled',
      `${matchedRiskFactors.length} risk factor${matchedRiskFactors.length === 1 ? '' : 's'} found in chart text`,
    );
  }

  const troponin = latestTroponin(chartData.labs);
  const troponinPoints = troponinToHeartPoints(troponin);
  if (troponinPoints !== null) {
    values.troponin = troponinPoints;
    fields.troponin = createField(
      troponinPoints,
      `${troponin.name || 'Troponin'} ${troponin.value ?? troponin.result} ${
        troponin.unit || ''
      }${troponin.referenceRange ? `, ref ${troponin.referenceRange}` : ''}`.trim(),
      'prefilled',
      'Auto-filled from lab result and reference range',
    );
  }

  fields.history = createField('', 'Physician history assessment required', 'requires-assessment');
  fields.ecg = createField('', 'Physician ECG interpretation required', 'requires-assessment');

  return buildResult('heart', 'HEART Score', values, fields, requiresAssessment);
}

function buildQsofaPrefill(patient) {
  const values: any = {};
  const fields: any = {
    alteredMentation: createField(
      '',
      'Physician mentation assessment required',
      'requires-assessment',
    ),
  };
  const requiresAssessment = ['alteredMentation'];
  if (typeof patient?.vitals?.rr === 'number') {
    values.rr22 = patient.vitals.rr >= 22 ? 1 : 0;
    fields.rr22 = createField(values.rr22, `RR ${patient.vitals.rr}`, 'prefilled');
  }
  if (typeof patient?.vitals?.bpSystolic === 'number') {
    values.sbp100 = patient.vitals.bpSystolic <= 100 ? 1 : 0;
    fields.sbp100 = createField(values.sbp100, `SBP ${patient.vitals.bpSystolic}`, 'prefilled');
  }
  return buildResult('qsofa', 'qSOFA', values, fields, requiresAssessment);
}

function buildNihssPrefill(patient, chartData: any = {}) {
  const values: any = {};
  const fields: any = {};
  const noteText = textBlob(patient?.notes, patient?.timeline, chartData.documents);
  NIHSS_NOTE_PATTERNS.forEach((match) => {
    if (!match.pattern.test(noteText)) return;
    values[match.fieldId] = 1;
    fields[match.fieldId] = createField(
      1,
      match.label,
      'needs-confirmation',
      'Confirm documented objective finding',
    );
  });

  return buildResult('nihss', 'NIHSS', values, fields, []);
}

function buildResult(calculatorId, label, values, fields, requiresAssessment) {
  const populatedCount = Object.values(fields).filter(
    (field: any) => field.status === 'prefilled',
  ).length;
  const assessmentCount = Object.values(fields).filter(
    (field: any) => field.status === 'requires-assessment',
  ).length;
  const confirmationCount = Object.values(fields).filter(
    (field: any) => field.status === 'needs-confirmation',
  ).length;
  return {
    calculatorId,
    label,
    values,
    fields,
    requiresAssessment,
    populatedCount,
    assessmentCount,
    confirmationCount,
    bannerTitle: `${label} pre-populated from chart data`,
    bannerSummary: `${populatedCount} field${populatedCount === 1 ? '' : 's'} filled · ${
      assessmentCount + confirmationCount
    } require assessment`,
  };
}

export function getAutoScorePrefill(patient, chartData: any = {}) {
  const calculatorId = recognizedComplaint(patient);
  if (calculatorId === 'heart') return buildHeartPrefill(patient, chartData);
  if (calculatorId === 'qsofa') return buildQsofaPrefill(patient);
  if (calculatorId === 'nihss') return buildNihssPrefill(patient, chartData);
  return null;
}

export const AutoScorePopulator = {
  getAutoScorePrefill,
};

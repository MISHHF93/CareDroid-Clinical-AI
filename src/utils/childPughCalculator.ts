/**
 * Child-Pugh (Child–Turcotte–Pugh) score for cirrhosis severity.
 * Sum of five components (each 1–3 points): total 5–15.
 * Class A: 5–6, B: 7–9, C: 10–15.
 *
 * Reference: Pugh RNH et al. Transection of the oesophagus for bleeding oesophageal varices. Br J Surg. 1973;60(8):646–649.
 * Child CG, Turcotte JG. Surgery and portal hypertension. 1964.
 */

/** Bilirubin in mg/dL */
export function scoreChildPughBilirubinMgDl(mgDl) {
  if (!Number.isFinite(mgDl)) return null;
  if (mgDl < 2) return 1;
  if (mgDl <= 3) return 2;
  return 3;
}

/** Albumin in g/dL */
export function scoreChildPughAlbuminGdl(gDl) {
  if (!Number.isFinite(gDl)) return null;
  if (gDl > 3.5) return 1;
  if (gDl >= 2.8) return 2;
  return 3;
}

export function scoreChildPughInr(inr) {
  if (!Number.isFinite(inr)) return null;
  if (inr < 1.7) return 1;
  if (inr <= 2.2) return 2;
  return 3;
}

/** Prothrombin time prolongation vs control (seconds) */
export function scoreChildPughPtProlongationSec(sec) {
  if (!Number.isFinite(sec)) return null;
  if (sec < 4) return 1;
  if (sec <= 6) return 2;
  return 3;
}

/** @param {'none'|'slight'|'moderate'} level */
export function scoreChildPughAscites(level) {
  if (level === 'none') return 1;
  if (level === 'slight') return 2;
  if (level === 'moderate') return 3;
  return null;
}

/** @param {'none'|'grade12'|'grade34'} level — West Haven grades */
export function scoreChildPughEncephalopathy(level) {
  if (level === 'none') return 1;
  if (level === 'grade12') return 2;
  if (level === 'grade34') return 3;
  return null;
}

/** µmol/L ? mg/dL (bilirubin, conventional factor) */
export function bilirubinUmolLToMgDl(umolL) {
  if (!Number.isFinite(umolL)) return NaN;
  return umolL / 17.104;
}

/** g/L → g/dL */
export function albuminGlToGdl(gL) {
  if (!Number.isFinite(gL)) return NaN;
  return gL / 10;
}

/**
 * @param {{
 *   bilirubin: string|number,
 *   bilirubinUnit: 'mg_dl'|'umol_l',
 *   albumin: string|number,
 *   albuminUnit: 'g_dl'|'g_l',
 *   coagulationMode: 'inr'|'pt',
 *   inr: string|number,
 *   ptProlongationSec: string|number,
 *   ascites: 'none'|'slight'|'moderate',
 *   encephalopathy: 'none'|'grade12'|'grade34',
 * }} raw
 */
export function computeChildPughBreakdown(raw) {
  const biliRaw = toNum(raw.bilirubin);
  const albRaw = toNum(raw.albumin);
  const inrRaw = toNum(raw.inr);
  const ptRaw = toNum(raw.ptProlongationSec);

  const bilirubinMgDl = raw.bilirubinUnit === 'umol_l' ? bilirubinUmolLToMgDl(biliRaw) : biliRaw;
  const albuminGdl = raw.albuminUnit === 'g_l' ? albuminGlToGdl(albRaw) : albRaw;

  const bilirubin = scoreChildPughBilirubinMgDl(bilirubinMgDl);
  const albumin = scoreChildPughAlbuminGdl(albuminGdl);
  const coagulation =
    raw.coagulationMode === 'pt'
      ? scoreChildPughPtProlongationSec(ptRaw)
      : scoreChildPughInr(inrRaw);
  const ascites = scoreChildPughAscites(raw.ascites);
  const encephalopathy = scoreChildPughEncephalopathy(raw.encephalopathy);

  return {
    bilirubin,
    albumin,
    coagulation,
    ascites,
    encephalopathy,
    parsed: {
      bilirubinMgDl,
      albuminGdl,
      coagulationMode: raw.coagulationMode,
    },
  };
}

function toNum(v) {
  if (v === '' || v === undefined || v === null) return NaN;
  const n = typeof v === 'string' ? parseFloat(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function sumChildPughScore(breakdown) {
  const keys = ['bilirubin', 'albumin', 'coagulation', 'ascites', 'encephalopathy'];
  let sum = 0;
  for (const k of keys) {
    const v = breakdown[k];
    if (v === null || v === undefined || Number.isNaN(v)) return null;
    sum += v;
  }
  return sum;
}

/**
 * @param {number} total 5–15
 */
export function interpretChildPughClass(total) {
  if (!Number.isFinite(total) || total < 5 || total > 15) {
    return null;
  }

  const referenceLine =
    'Child CG, Turcotte JG; Pugh RNH et al. Child–Turcotte–Pugh classification (cirrhosis severity).';

  if (total <= 6) {
    return {
      childPughClass: 'A',
      severity: 'normal',
      label: 'Child-Pugh class A',
      interpretation:
        'Total score 5–6 (class A) reflects relatively less hepatic decompensation on this classification than higher classes. A single score does not replace trends, indication-specific criteria, or specialist assessment.',
      referenceLine,
    };
  }

  if (total <= 9) {
    return {
      childPughClass: 'B',
      severity: 'warning',
      label: 'Child-Pugh class B',
      interpretation:
        'Total score 7–9 (class B) reflects moderate functional impairment on this scale. Use alongside specialist assessment and serial parameters; it does not by itself determine treatment eligibility.',
      referenceLine,
    };
  }

  return {
    childPughClass: 'C',
    severity: 'critical',
    label: 'Child-Pugh class C',
    interpretation:
      'Total score 10–15 (class C) reflects the most severe impairment band in this classification and is often associated with higher peri-procedural risk on prognostic indices — clinical decisions still require specialist input and shared decision-making.',
    referenceLine,
  };
}

/**
 * @param {object} raw same shape as computeChildPughBreakdown input
 */
export function validateChildPughInputs(raw) {
  const errors = [] as any[];

  const b = typeof raw.bilirubin === 'string' ? raw.bilirubin.trim() : raw.bilirubin;
  if (b === '' || Number.isNaN(parseFloat(b))) {
    errors.push('Enter total bilirubin.');
  } else {
    const n = parseFloat(b);
    if (raw.bilirubinUnit === 'umol_l') {
      if (n < 1 || n > 1200) errors.push('Bilirubin (µmol/L) should be between 1 and 1200.');
    } else if (n < 0.1 || n > 50) errors.push('Bilirubin (mg/dL) should be between 0.1 and 50.');
  }

  const a = typeof raw.albumin === 'string' ? raw.albumin.trim() : raw.albumin;
  if (a === '' || Number.isNaN(parseFloat(a))) {
    errors.push('Enter albumin.');
  } else {
    const n = parseFloat(a);
    if (raw.albuminUnit === 'g_l') {
      if (n < 5 || n > 70) errors.push('Albumin (g/L) should be between 5 and 70.');
    } else if (n < 1 || n > 6) errors.push('Albumin (g/dL) should be between 1 and 6.');
  }

  if (raw.coagulationMode === 'pt') {
    const pt =
      typeof raw.ptProlongationSec === 'string'
        ? raw.ptProlongationSec.trim()
        : raw.ptProlongationSec;
    if (pt === '' || Number.isNaN(parseFloat(pt)))
      errors.push('Enter PT prolongation (seconds above control).');
    else {
      const n = parseFloat(pt);
      if (n < 0 || n > 80) errors.push('PT prolongation should be between 0 and 80 seconds.');
    }
  } else {
    const inr = typeof raw.inr === 'string' ? raw.inr.trim() : raw.inr;
    if (inr === '' || Number.isNaN(parseFloat(inr))) errors.push('Enter INR.');
    else {
      const n = parseFloat(inr);
      if (n < 0.5 || n > 15) errors.push('INR should be between 0.5 and 15.');
    }
  }

  if (!['none', 'slight', 'moderate'].includes(raw.ascites)) {
    errors.push('Select ascites severity.');
  }
  if (!['none', 'grade12', 'grade34'].includes(raw.encephalopathy)) {
    errors.push('Select hepatic encephalopathy grade category.');
  }

  return { ok: errors.length === 0, errors };
}

export * from './types';
export * from './qsofa';
export * from './heart';
export * from './wellsPe';
export * from './gcs';
export * from './news2';
export * from './nihss';

import type { ClinicalCalculatorId, ClinicalCalculatorMeta } from './types';
import { QSOFA_META } from './qsofa';
import { HEART_META } from './heart';
import { WELLS_PE_META } from './wellsPe';
import { GCS_META } from './gcs';
import { NEWS2_META } from './news2';
import { NIHSS_META } from './nihss';

export const CLINICAL_CALCULATOR_REGISTRY: Record<ClinicalCalculatorId, ClinicalCalculatorMeta> = {
  qsofa: QSOFA_META,
  heart: HEART_META,
  'wells-pe': WELLS_PE_META,
  gcs: GCS_META,
  news2: NEWS2_META,
  nihss: NIHSS_META,
};

export const MVP_CALCULATOR_IDS = Object.freeze([
  'qsofa',
  'heart',
  'wells-pe',
  'gcs',
  'news2',
  'nihss',
] as const);

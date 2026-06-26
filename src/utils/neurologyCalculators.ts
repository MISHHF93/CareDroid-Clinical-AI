/**
 * Neurology calculator helpers.
 *
 * Deterministic documentation support only. These helpers do not diagnose
 * stroke, seizure, subarachnoid hemorrhage, intracranial hemorrhage, coma, or
 * disability and must not delay emergency stroke or neurocritical-care pathways.
 */

export const NEUROLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Do not delay emergency stroke activation, neuroimaging, seizure care, airway support, neurosurgical consultation, or local urgent-care pathways to complete this tool.';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function selectedPoints(value, options) {
  const row = options.find((option) => String(option.value) === String(value));
  return row ? Number(row.points) : NaN;
}

function requireSelections(raw, optionsByKey) {
  const errors = [] as any[];
  for (const [key, options] of Object.entries(optionsByKey)) {
    if (!Number.isFinite(selectedPoints(raw[key], options))) {
      errors.push(`Select ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
    }
  }
  return errors;
}

function result(score, label, interpretation, severity, referenceLine, extra: any = {}) {
  return {
    ok: true,
    score,
    label,
    interpretation,
    severity,
    referenceLine,
    disclaimer: NEUROLOGY_SAFETY_DISCLAIMER,
    ...extra,
  };
}

export const HUNT_HESS_GRADE_OPTIONS = Object.freeze([
  { value: '1', points: 1, label: 'Grade I: asymptomatic or mild headache/nuchal rigidity' },
  { value: '2', points: 2, label: 'Grade II: moderate-severe headache, nuchal rigidity, no deficit except cranial nerve palsy' },
  { value: '3', points: 3, label: 'Grade III: drowsiness, confusion, or mild focal deficit' },
  { value: '4', points: 4, label: 'Grade IV: stupor, moderate-severe hemiparesis, early decerebrate rigidity' },
  { value: '5', points: 5, label: 'Grade V: deep coma, decerebrate rigidity, moribund appearance' },
]);

export function computeHuntHessScale(raw) {
  const grade = selectedPoints(raw.grade, HUNT_HESS_GRADE_OPTIONS);
  if (!Number.isFinite(grade)) return { ok: false, errors: ['Select the Hunt-Hess clinical grade.'] };
  const severity = grade >= 4 ? 'critical' : grade === 3 ? 'warning' : 'normal';
  return result(
    grade,
    `Hunt-Hess grade ${grade}`,
    'Hunt-Hess summarizes clinical severity in aneurysmal subarachnoid hemorrhage. Use with aneurysm status, neurologic exam, airway/hemodynamics, hydrocephalus, and neurosurgical pathway context.',
    severity,
    'Hunt WE, Hess RM. Surgical risk as related to time of intervention in the repair of intracranial aneurysms. J Neurosurg. 1968.'
  );
}

export function computeIchScore(raw) {
  const age = toNumber(raw.age);
  const gcs = toNumber(raw.gcs);
  const volumeMl = toNumber(raw.volumeMl);
  const errors = [] as any[];
  if (!Number.isFinite(age) || age < 0 || age > 120) errors.push('Enter age from 0 to 120 years.');
  if (!Number.isFinite(gcs) || gcs < 3 || gcs > 15) errors.push('Enter GCS from 3 to 15.');
  if (!Number.isFinite(volumeMl) || volumeMl < 0 || volumeMl > 300) errors.push('Enter hematoma volume from 0 to 300 mL.');
  if (!['yes', 'no'].includes(raw.intraventricularHemorrhage)) errors.push('Select intraventricular hemorrhage status.');
  if (!['yes', 'no'].includes(raw.infratentorialOrigin)) errors.push('Select infratentorial origin status.');
  if (errors.length) return { ok: false, errors };

  const gcsPoints = gcs <= 4 ? 2 : gcs <= 12 ? 1 : 0;
  const volumePoints = volumeMl >= 30 ? 1 : 0;
  const ivhPoints = raw.intraventricularHemorrhage === 'yes' ? 1 : 0;
  const infratentorialPoints = raw.infratentorialOrigin === 'yes' ? 1 : 0;
  const agePoints = age >= 80 ? 1 : 0;
  const score = gcsPoints + volumePoints + ivhPoints + infratentorialPoints + agePoints;
  const severity = score >= 4 ? 'critical' : score >= 2 ? 'warning' : 'normal';
  return result(
    score,
    `ICH score ${score}`,
    'ICH Score summarizes severity context for spontaneous intracerebral hemorrhage. It is not a treatment, prognosis guarantee, or transfer decision by itself.',
    severity,
    'Hemphill JC III, et al. The ICH score: a simple, reliable grading scale for intracerebral hemorrhage. Stroke. 2001.',
    {
      components: {
        gcsPoints,
        volumePoints,
        ivhPoints,
        infratentorialPoints,
        agePoints,
      },
    }
  );
}

export const FOUR_SCORE_OPTIONS = Object.freeze({
  eye: [
    { value: '4', points: 4, label: 'E4 eyelids open/tracking/blinking to command' },
    { value: '3', points: 3, label: 'E3 eyelids open but not tracking' },
    { value: '2', points: 2, label: 'E2 eyelids closed but open to loud voice' },
    { value: '1', points: 1, label: 'E1 eyelids closed but open to pain' },
    { value: '0', points: 0, label: 'E0 eyelids remain closed with pain' },
  ],
  motor: [
    { value: '4', points: 4, label: 'M4 thumbs-up/fist/peace sign' },
    { value: '3', points: 3, label: 'M3 localizing to pain' },
    { value: '2', points: 2, label: 'M2 flexion response to pain' },
    { value: '1', points: 1, label: 'M1 extension response to pain' },
    { value: '0', points: 0, label: 'M0 no response or generalized myoclonus' },
  ],
  brainstem: [
    { value: '4', points: 4, label: 'B4 pupil and corneal reflexes present' },
    { value: '3', points: 3, label: 'B3 one pupil wide/fixed' },
    { value: '2', points: 2, label: 'B2 pupil or corneal reflexes absent' },
    { value: '1', points: 1, label: 'B1 pupil and corneal reflexes absent' },
    { value: '0', points: 0, label: 'B0 absent pupil/corneal/cough reflexes' },
  ],
  respiration: [
    { value: '4', points: 4, label: 'R4 not intubated, regular breathing' },
    { value: '3', points: 3, label: 'R3 not intubated, Cheyne-Stokes' },
    { value: '2', points: 2, label: 'R2 not intubated, irregular breathing' },
    { value: '1', points: 1, label: 'R1 breathes above ventilator rate' },
    { value: '0', points: 0, label: 'R0 breathes at ventilator rate or apnea' },
  ],
});

export function computeFourScore(raw) {
  const errors = requireSelections(raw, FOUR_SCORE_OPTIONS);
  if (errors.length) return { ok: false, errors };
  const eye = selectedPoints(raw.eye, FOUR_SCORE_OPTIONS.eye);
  const motor = selectedPoints(raw.motor, FOUR_SCORE_OPTIONS.motor);
  const brainstem = selectedPoints(raw.brainstem, FOUR_SCORE_OPTIONS.brainstem);
  const respiration = selectedPoints(raw.respiration, FOUR_SCORE_OPTIONS.respiration);
  const score = eye + motor + brainstem + respiration;
  const severity = score <= 8 ? 'critical' : score <= 12 ? 'warning' : 'normal';
  return result(
    score,
    `FOUR score ${score}/16`,
    'FOUR Score documents eye, motor, brainstem reflex, and respiratory pattern findings. Lower scores require urgent bedside context, airway review, and neurocritical-care judgment.',
    severity,
    'Wijdicks EFM, et al. Validation of a new coma scale: The FOUR score. Ann Neurol. 2005.',
    { components: { eye, motor, brainstem, respiration } }
  );
}

export const MODIFIED_RANKIN_OPTIONS = Object.freeze([
  { value: '0', points: 0, label: '0 no symptoms' },
  { value: '1', points: 1, label: '1 no significant disability despite symptoms' },
  { value: '2', points: 2, label: '2 slight disability; independent in own affairs' },
  { value: '3', points: 3, label: '3 moderate disability; needs some help, walks unassisted' },
  { value: '4', points: 4, label: '4 moderately severe disability; unable to walk or attend bodily needs without help' },
  { value: '5', points: 5, label: '5 severe disability; bedridden, incontinent, constant care' },
  { value: '6', points: 6, label: '6 death' },
]);

export function computeModifiedRankinScale(raw) {
  const score = selectedPoints(raw.score, MODIFIED_RANKIN_OPTIONS);
  if (!Number.isFinite(score)) return { ok: false, errors: ['Select the modified Rankin Scale level.'] };
  const severity = score >= 4 ? 'critical' : score >= 2 ? 'warning' : 'normal';
  return result(
    score,
    `mRS ${score}`,
    'Modified Rankin Scale summarizes global disability after stroke or neurologic illness. It is an outcome description, not an acute treatment or disposition recommendation.',
    severity,
    'Rankin J. Cerebral vascular accidents in patients over the age of 60. Scott Med J. 1957.'
  );
}

export const NIHSS_SUMMARY_OPTIONS = Object.freeze({
  loc: [
    { value: '0', points: 0, label: '0 alert' },
    { value: '1', points: 1, label: '1 not alert, arousable' },
    { value: '2', points: 2, label: '2 not alert, requires repeated stimulation' },
    { value: '3', points: 3, label: '3 unresponsive/reflex responses' },
  ],
  locQuestions: [
    { value: '0', points: 0, label: '0 answers both correctly' },
    { value: '1', points: 1, label: '1 answers one correctly' },
    { value: '2', points: 2, label: '2 answers neither correctly' },
  ],
  locCommands: [
    { value: '0', points: 0, label: '0 performs both tasks' },
    { value: '1', points: 1, label: '1 performs one task' },
    { value: '2', points: 2, label: '2 performs neither task' },
  ],
  gaze: [
    { value: '0', points: 0, label: '0 normal' },
    { value: '1', points: 1, label: '1 partial gaze palsy' },
    { value: '2', points: 2, label: '2 forced deviation/total gaze paresis' },
  ],
  visual: [
    { value: '0', points: 0, label: '0 no visual loss' },
    { value: '1', points: 1, label: '1 partial hemianopia' },
    { value: '2', points: 2, label: '2 complete hemianopia' },
    { value: '3', points: 3, label: '3 bilateral hemianopia/blindness' },
  ],
  facial: [
    { value: '0', points: 0, label: '0 normal' },
    { value: '1', points: 1, label: '1 minor palsy' },
    { value: '2', points: 2, label: '2 partial palsy' },
    { value: '3', points: 3, label: '3 complete palsy' },
  ],
  motorArmLeft: [
    { value: '0', points: 0, label: '0 no drift' },
    { value: '1', points: 1, label: '1 drift' },
    { value: '2', points: 2, label: '2 some effort against gravity' },
    { value: '3', points: 3, label: '3 no effort against gravity' },
    { value: '4', points: 4, label: '4 no movement' },
  ],
  motorArmRight: [
    { value: '0', points: 0, label: '0 no drift' },
    { value: '1', points: 1, label: '1 drift' },
    { value: '2', points: 2, label: '2 some effort against gravity' },
    { value: '3', points: 3, label: '3 no effort against gravity' },
    { value: '4', points: 4, label: '4 no movement' },
  ],
  motorLegLeft: [
    { value: '0', points: 0, label: '0 no drift' },
    { value: '1', points: 1, label: '1 drift' },
    { value: '2', points: 2, label: '2 some effort against gravity' },
    { value: '3', points: 3, label: '3 no effort against gravity' },
    { value: '4', points: 4, label: '4 no movement' },
  ],
  motorLegRight: [
    { value: '0', points: 0, label: '0 no drift' },
    { value: '1', points: 1, label: '1 drift' },
    { value: '2', points: 2, label: '2 some effort against gravity' },
    { value: '3', points: 3, label: '3 no effort against gravity' },
    { value: '4', points: 4, label: '4 no movement' },
  ],
  limbAtaxia: [
    { value: '0', points: 0, label: '0 absent' },
    { value: '1', points: 1, label: '1 present in one limb' },
    { value: '2', points: 2, label: '2 present in two limbs' },
  ],
  sensory: [
    { value: '0', points: 0, label: '0 normal' },
    { value: '1', points: 1, label: '1 mild-moderate sensory loss' },
    { value: '2', points: 2, label: '2 severe-total sensory loss' },
  ],
  language: [
    { value: '0', points: 0, label: '0 no aphasia' },
    { value: '1', points: 1, label: '1 mild-moderate aphasia' },
    { value: '2', points: 2, label: '2 severe aphasia' },
    { value: '3', points: 3, label: '3 mute/global aphasia' },
  ],
  dysarthria: [
    { value: '0', points: 0, label: '0 normal' },
    { value: '1', points: 1, label: '1 mild-moderate dysarthria' },
    { value: '2', points: 2, label: '2 severe dysarthria/anarthria' },
  ],
  extinction: [
    { value: '0', points: 0, label: '0 no neglect' },
    { value: '1', points: 1, label: '1 inattention/extinction in one modality' },
    { value: '2', points: 2, label: '2 profound hemi-inattention/extinction' },
  ],
});

export function computeNihssSummaryView(raw) {
  const errors = requireSelections(raw, NIHSS_SUMMARY_OPTIONS);
  if (errors.length) return { ok: false, errors };
  const components = Object.fromEntries(
    Object.entries(NIHSS_SUMMARY_OPTIONS).map(([key, options]) => [key, selectedPoints(raw[key], options)])
  );
  const score = Object.values(components).reduce((sum, value) => sum + value, 0);
  const severity = score >= 21 ? 'critical' : score >= 5 ? 'warning' : 'normal';
  return result(
    score,
    `NIHSS summary ${score}/42`,
    'NIHSS summary view documents stroke exam item scores for handoff and serial comparison. It does not diagnose stroke or determine thrombolysis, thrombectomy, imaging, transfer, or disposition.',
    severity,
    'Brott T, et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke. 1989.',
    { components }
  );
}

export const PEDIATRIC_GCS_OPTIONS = Object.freeze({
  eye: [
    { value: '4', points: 4, label: '4 spontaneous' },
    { value: '3', points: 3, label: '3 to voice' },
    { value: '2', points: 2, label: '2 to pain' },
    { value: '1', points: 1, label: '1 none' },
  ],
  verbal: [
    { value: '5', points: 5, label: '5 smiles, oriented, coos/babbles/appropriate words' },
    { value: '4', points: 4, label: '4 cries but consolable or confused' },
    { value: '3', points: 3, label: '3 persistently irritable/inappropriate words' },
    { value: '2', points: 2, label: '2 agitated/incomprehensible sounds' },
    { value: '1', points: 1, label: '1 none' },
  ],
  motor: [
    { value: '6', points: 6, label: '6 obeys commands or normal spontaneous movement' },
    { value: '5', points: 5, label: '5 localizes pain or withdraws to touch' },
    { value: '4', points: 4, label: '4 withdraws from pain' },
    { value: '3', points: 3, label: '3 abnormal flexion' },
    { value: '2', points: 2, label: '2 abnormal extension' },
    { value: '1', points: 1, label: '1 none' },
  ],
});

export function computePediatricGcs(raw) {
  const errors = requireSelections(raw, PEDIATRIC_GCS_OPTIONS);
  if (errors.length) return { ok: false, errors };
  const eye = selectedPoints(raw.eye, PEDIATRIC_GCS_OPTIONS.eye);
  const verbal = selectedPoints(raw.verbal, PEDIATRIC_GCS_OPTIONS.verbal);
  const motor = selectedPoints(raw.motor, PEDIATRIC_GCS_OPTIONS.motor);
  const score = eye + verbal + motor;
  const severity = score <= 8 ? 'critical' : score <= 12 ? 'warning' : 'normal';
  return result(
    score,
    `Pediatric GCS ${score}/15`,
    'Pediatric GCS documents consciousness using age-adjusted response descriptions. Interpret with age, airway, sedation, seizure/postictal state, hypoglycemia, trauma, and local pediatric escalation pathways.',
    severity,
    'Teasdale G, Jennett B. Assessment of coma and impaired consciousness. Lancet. 1974; pediatric adaptations are used clinically.',
    { components: { eye, verbal, motor } }
  );
}


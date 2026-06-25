/**
 * Patient seed helpers with no config imports (safe for fixture modules).
 */

/**
 * Remove duplicate MRNs while preserving first occurrence order.
 * @template {{ mrn?: string, id?: string }} T
 * @param {T[]} patients
 */
export function dedupePatientsByMrn(patients) {
  const seen = new Set();
  return patients.filter((patient) => {
    const key = String(patient.mrn || patient.id || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
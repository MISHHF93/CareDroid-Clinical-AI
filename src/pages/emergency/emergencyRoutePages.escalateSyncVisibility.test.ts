import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

// HEAL: escalatePatient() applies to local state immediately and syncs to
// the backend fire-and-forget (the DOWNTIME-001/SESSION-001 pattern already
// tracked via unsyncedPatientIds and surfaced in PatientDetailPanel) -- the
// breached-wait-queue row's own "✓ Escalated" badge showed the same success
// state regardless of whether that backend sync actually succeeded.
// Confirmed live: escalating a demo patient with no backend record 404'd
// (PATCH /api/emergency/patients/:id/escalate) yet the row still showed a
// plain "✓ Escalated" checkmark with no indication the save had failed.
describe('emergencyRoutePages escalate-badge unsynced visibility', () => {
  const source = readFileSync(join(__dirname, 'emergencyRoutePages.tsx'), 'utf8');

  it('reads unsyncedPatientIds from the store', () => {
    expect(source).toContain(
      "const unsyncedPatientIds = useEmergencyStore((state) => state.unsyncedPatientIds);",
    );
  });

  it('branches the escalated badge on unsyncedPatientIds for this patient', () => {
    const badgeBlock = source.slice(
      source.indexOf('{alreadyEscalated && unsyncedPatientIds.has(patient.id)'),
      source.indexOf('{movementStages.length ?'),
    );
    expect(badgeBlock).toContain('⚠ Escalated (not yet saved)');
    expect(badgeBlock).toContain('{alreadyEscalated && !unsyncedPatientIds.has(patient.id)');
    expect(badgeBlock).toContain('✓ Escalated');
  });
});

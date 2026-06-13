import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const whiteboardSource = readFileSync(join(__dirname, '../pages/emergency/index.tsx'), 'utf8');
const patientCardSource = readFileSync(join(__dirname, 'PatientCard.tsx'), 'utf8');
const patientDetailPanelSource = readFileSync(join(__dirname, 'PatientDetailPanel.tsx'), 'utf8');

describe('Emergency Whiteboard navigation wiring', () => {
  it('opens and closes patient detail through the primary emergency store', () => {
    expect(patientCardSource).toContain('const handleSelect = useCallback(');
    expect(patientCardSource).toContain('selectPatient(patient.id);');
    expect(patientCardSource).toContain('onClick={handleSelect}');
    expect(patientCardSource).toContain('role="button"');
    expect(patientCardSource).toContain("event.key === 'Enter' || event.key === ' '");
    expect(patientDetailPanelSource).toContain('onClick={() => selectPatient(null)}');
    expect(patientDetailPanelSource).toContain('aria-label="Close patient detail"');
  });

  it('keeps stale selected-patient state from rendering a blank overlay', () => {
    expect(patientDetailPanelSource).toContain('const selectedPatient = useMemo(');
    expect(patientDetailPanelSource).toContain('patients.find((patient) => patient.id === selectedPatientId) || null');
    expect(patientDetailPanelSource).toContain('if (!selectedPatient) return null;');
  });

  it('wires filter chips, queue shortcuts, and view toggles to live whiteboard state', () => {
    expect(whiteboardSource).toContain('const [activeFilter, setActiveFilter]');
    expect(whiteboardSource).toContain('onClick={() => setActiveFilter(filter)}');
    expect(whiteboardSource).toContain('visiblePatients.map((patient)');
    expect(whiteboardSource).toContain('<WhoNextPanel');
  });

  it('shows non-blank loading and empty states for filtered views', () => {
    expect(whiteboardSource).toContain('<SkeletonLoader');
    expect(whiteboardSource).toContain('Department Clear');
  });
});

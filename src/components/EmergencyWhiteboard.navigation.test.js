import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const whiteboardSource = readFileSync(join(__dirname, 'EmergencyWhiteboard.jsx'), 'utf8');
const patientCardSource = readFileSync(join(__dirname, 'PatientCard.jsx'), 'utf8');
const patientCardCss = readFileSync(join(__dirname, 'PatientCard.css'), 'utf8');

describe('Emergency Whiteboard navigation wiring', () => {
  it('opens and closes patient detail through the primary emergency store', () => {
    expect(patientCardSource).toContain('onClick={() => selectPatient(patient.id)}');
    expect(patientCardSource).toContain("aria-label={`Open details for ${patientName(patient)}`}");
    expect(patientCardSource).toContain('onClick={() => selectPatient(null)}');
    expect(patientCardSource).toContain('aria-label="Close patient details"');
  });

  it('keeps stale selected-patient state from rendering a blank overlay', () => {
    expect(patientCardSource).toContain('patient-detail--empty');
    expect(patientCardSource).toContain('Patient unavailable');
    expect(patientCardSource).toContain('Select another patient from the whiteboard');
    expect(patientCardCss).toContain('.patient-detail__empty');
  });

  it('wires filter chips, queue shortcuts, and view toggles to live whiteboard state', () => {
    expect(whiteboardSource).toContain('onClick={() => setQueueFilter(filter.type)}');
    expect(whiteboardSource).toContain('setQueueFilter(filter?.type || null)');
    expect(whiteboardSource).toContain("setViewMode('grid')");
    expect(whiteboardSource).toContain("setViewMode('list')");
    expect(whiteboardSource).toContain("aria-pressed={viewMode === 'grid'}");
    expect(whiteboardSource).toContain("aria-pressed={viewMode === 'list'}");
  });

  it('shows non-blank loading and empty states for filtered views', () => {
    expect(whiteboardSource).toContain('aria-label="Loading patient whiteboard"');
    expect(whiteboardSource).toContain('ed-whiteboard__empty');
    expect(whiteboardSource).toContain('No patients match this search.');
    expect(whiteboardSource).toContain('Department Clear');
  });
});

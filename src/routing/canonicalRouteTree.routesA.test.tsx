import './canonicalRouteTree.testShared';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { findRouteHeading, renderRoute } from './canonicalRouteTree.testShared';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — whiteboard, patients, ems', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/whiteboard renders the active CareDroid whiteboard', async () => {
    renderRoute('/emergency/whiteboard');

    expect(await screen.findByRole('link', { name: 'Whiteboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/whiteboard');
  });

  it('/emergency/patients renders the active patient whiteboard surface', async () => {
    renderRoute('/emergency/patients');

    expect(await findRouteHeading('Department Patients')).toBeInTheDocument();
    expect(await screen.findByLabelText('Department Patients')).toBeInTheDocument();
    // The page's search field renders via RouteChromeContext, which registers
    // asynchronously (a useEffect) after the initial paint — wait for it rather
    // than asserting synchronously right after the heading resolves.
    expect(await screen.findByLabelText('Search patients')).toBeInTheDocument();
  });

  it('/emergency/patients consumes patientId context without another lookup', async () => {
    const patient = useEmergencyStore.getState().patients[0];

    renderRoute(`/emergency/patients?patientId=${encodeURIComponent(patient.id)}`);

    expect(await findRouteHeading('Department Patients')).toBeInTheDocument();
    await waitFor(() => {
      expect(useEmergencyStore.getState().selectedPatientId).toBe(patient.id);
    });
  });

  it('/emergency/ems renders the active EMS summary route', async () => {
    renderRoute('/emergency/ems');

    expect(await screen.findByRole('link', { name: 'EMS' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/ems');
  });
});

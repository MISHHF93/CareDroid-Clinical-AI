import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PreArrivalForm from './PreArrivalForm';
import { useEmergencyStore } from '../../store/emergencyStore';

describe('PreArrivalForm', () => {
  it('posts structured MIST pre-arrival data to the whiteboard', () => {
    const store = {
      addEMSArrival: vi.fn((arrival) => {
        useEmergencyStore.getState().addEMSArrival(arrival);
      }),
    };

    render(
      <PreArrivalForm
        store={store}
        actorName="EMS Dispatch"
        onSubmitted={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Medic 12'), {
      target: { value: 'Medic 22' },
    });
    fireEvent.change(screen.getByPlaceholderText('Open tibia fracture'), {
      target: { value: 'Chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post to whiteboard/i }));

    expect(store.addEMSArrival).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/posted medic 22 to whiteboard/i)).toBeInTheDocument();
  });
});
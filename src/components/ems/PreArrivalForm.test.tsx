import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PreArrivalForm from './PreArrivalForm';
import { useEmergencyStore } from '../../store/emergencyStore';

afterEach(() => {
  cleanup();
  window.sessionStorage.removeItem('caredroid:pre-arrival-draft');
});

describe('PreArrivalForm', () => {
  it('posts structured MIST pre-arrival data to the whiteboard', () => {
    const store = {
      addEMSArrival: vi.fn((arrival) => {
        useEmergencyStore.getState().addEMSArrival(arrival);
      }),
    };

    render(<PreArrivalForm store={store} actorName="EMS Dispatch" onSubmitted={vi.fn()} />);

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

  it('HEAL-279: autosaves typed MIST notes so a nurse navigating away and back does not lose them', () => {
    const store = { addEMSArrival: vi.fn() };
    const { unmount } = render(<PreArrivalForm store={store} actorName="EMS Dispatch" />);

    fireEvent.change(screen.getByPlaceholderText('Open tibia fracture'), {
      target: { value: 'fall from ladder' },
    });

    // Simulate navigating away: the permanently-mounted form unmounts.
    unmount();

    render(<PreArrivalForm store={store} actorName="EMS Dispatch" />);

    expect(screen.getByPlaceholderText('Open tibia fracture')).toHaveValue('fall from ladder');
  });

  it('HEAL-279: clears the saved draft after a successful submission', () => {
    const store = {
      addEMSArrival: vi.fn((arrival) => {
        useEmergencyStore.getState().addEMSArrival(arrival);
      }),
    };
    const { unmount } = render(
      <PreArrivalForm store={store} actorName="EMS Dispatch" onSubmitted={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText('Medic 12'), { target: { value: 'Medic 22' } });
    fireEvent.change(screen.getByPlaceholderText('Open tibia fracture'), {
      target: { value: 'Chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /post to whiteboard/i }));

    expect(store.addEMSArrival).toHaveBeenCalledTimes(1);

    unmount();
    render(<PreArrivalForm store={store} actorName="EMS Dispatch" />);

    expect(screen.getByPlaceholderText('Open tibia fracture')).toHaveValue('');
  });
});

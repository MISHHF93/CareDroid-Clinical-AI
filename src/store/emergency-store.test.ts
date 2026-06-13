import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialEmergencyStoreState, useEmergencyStore } from './emergency-store';
import type { EmergencyCopilotMessage } from './emergency-store';

const responseJson = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

const resetStore = () => {
  localStorage.clear();
  useEmergencyStore.persist.clearStorage();
  useEmergencyStore.setState(createInitialEmergencyStoreState());
};

describe('unified Emergency OS store', () => {
  beforeEach(() => {
    resetStore();
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  it('refreshes dashboard datasets in parallel and normalizes core state', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation((input) => {
      const path = String(input);
      if (path.includes('/whiteboard')) {
        return Promise.resolve(
          responseJson({
            data: {
              patients: [{ id: 'pt-1', chiefComplaint: 'Chest pain' }],
            },
          })
        );
      }
      if (path.includes('/capacity')) {
        return Promise.resolve(
          responseJson({
            data: {
              score: 86,
              riskLevel: 'Red',
              triggers: ['boarding pressure'],
              recommendations: [{ id: 'open-surge', title: 'Open surge triage review' }],
            },
          })
        );
      }
      if (path.includes('/boarding')) {
        return Promise.resolve(
          responseJson({
            data: {
              metrics: { boardingTime: 180 },
              boarders: [{ patientId: 'board-1', boardingMinutes: 300 }],
            },
          })
        );
      }
      return Promise.resolve(
        responseJson({
          data: {
            incomingPatients: [{ id: 'ems-1', etaMinutes: 7 }],
          },
        })
      );
    });

    const result = await useEmergencyStore.getState().refreshAllData();
    const state = useEmergencyStore.getState();

    expect(result.errors).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(state.patients).toEqual([expect.objectContaining({ id: 'pt-1' })]);
    expect(state.capacityMetrics).toMatchObject({
      score: 86,
      color: 'red',
      triggers: ['boarding pressure'],
    });
    expect(state.boardingMetrics).toMatchObject({
      medianBoardTimeMinutes: 180,
      exceedingThresholds: [expect.objectContaining({ id: 'board-1' })],
    });
    expect(state.emsIncomingPatients).toEqual([expect.objectContaining({ id: 'ems-1' })]);
    expect(state.ui.loading).toBe(false);
  });

  it('posts Copilot queries and stores response pairs with safety status', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValue(
      responseJson({
        data: {
          id: 'copilot-1',
          response: 'Review capacity triggers with the charge nurse.',
          safety_status: 'safe',
        },
      })
    );

    const message = await useEmergencyStore
      .getState()
      .sendCopilotQuery('What is driving capacity?', { userRole: 'charge-rn' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/emergency/copilot/query',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"user_role":"charge-rn"'),
      })
    );
    expect(message).toMatchObject({
      query: 'What is driving capacity?',
      response: 'Review capacity triggers with the charge nurse.',
      safetyStatus: 'safe',
    });
    expect(useEmergencyStore.getState().copilotMessages).toEqual([message]);
  });

  it('persists only the last 50 Copilot messages', () => {
    for (let index = 0; index < 55; index += 1) {
      useEmergencyStore.getState().appendCopilotMessage({
        id: `copilot-${index}`,
        query: `query-${index}`,
        response: `response-${index}`,
        safetyStatus: 'safe',
        createdAt: `2026-06-13T09:${String(index).padStart(2, '0')}:00.000Z`,
      } satisfies EmergencyCopilotMessage);
    }

    useEmergencyStore.getState().addPatient({ id: 'pt-not-persisted' });

    const persisted = JSON.parse(localStorage.getItem('emergency-os-store') || '{}');

    expect(persisted.state.copilotMessages).toHaveLength(50);
    expect(persisted.state.copilotMessages[0]).toMatchObject({ id: 'copilot-5' });
    expect(persisted.state.patients).toBeUndefined();
    expect(persisted.state.capacityMetrics).toBeUndefined();
  });

  it('dispatches recognized WebSocket events into store state', () => {
    useEmergencyStore.setState({
      patients: [{ id: 'pt-1', status: 'waiting' }],
    });

    useEmergencyStore.getState().dispatchWebSocketEvent({
      type: 'patient_updated',
      payload: { patientId: 'pt-1', status: 'assessment' },
    });
    useEmergencyStore.getState().dispatchWebSocketEvent({
      type: 'capacity_score_changed',
      payload: { score: 72, riskLevel: 'Orange', triggers: ['EMS arrivals'] },
    });
    useEmergencyStore.getState().dispatchWebSocketEvent({
      type: 'ems_arrival_created',
      payload: { arrival: { id: 'ems-1', etaMinutes: 4 } },
    });
    useEmergencyStore.getState().dispatchWebSocketEvent({
      type: 'copilot_response',
      payload: {
        id: 'copilot-event-1',
        query: 'capacity?',
        response: 'Capacity is orange.',
        safetyStatus: 'safe',
      },
    });
    useEmergencyStore.getState().dispatchWebSocketEvent({
      type: 'integration_event_received',
      payload: { id: 'int-1', source: 'bed-board' },
    });

    const state = useEmergencyStore.getState();
    expect(state.patients[0]).toMatchObject({ id: 'pt-1', status: 'assessment' });
    expect(state.capacityMetrics).toMatchObject({ score: 72, color: 'orange' });
    expect(state.emsIncomingPatients).toEqual([expect.objectContaining({ id: 'ems-1' })]);
    expect(state.copilotMessages).toEqual([expect.objectContaining({ id: 'copilot-event-1' })]);
    expect(state.integrationEvents).toEqual([expect.objectContaining({ type: 'integration_event_received' })]);
    expect(state.websocket.lastEventAt).toEqual(expect.any(String));
  });
});

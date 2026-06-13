import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const EMERGENCY_API = Object.freeze({
  whiteboard: '/api/emergency/whiteboard',
  capacity: '/api/emergency/capacity',
  boarding: '/api/emergency/boarding',
  ems: '/api/emergency/ems',
  copilotQuery: '/api/emergency/copilot/query',
  surgeActivate: '/api/emergency/surge/activate',
});

const COPILOT_STORAGE_LIMIT = 50;
const INTEGRATION_EVENT_LIMIT = 100;
const DEFAULT_BOARDING_THRESHOLD_MINUTES = 240;
const DEFAULT_WS_PATH = '/api/emergency/realtime';
const DEFAULT_RECONNECT_MS = 10_000;

export type EmergencyCapacityColor = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';
export type EmergencyWebSocketConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';
export type CopilotSafetyStatus = 'safe' | 'caution' | 'unsafe' | 'blocked' | 'unknown';

export type EmergencyRecord = {
  id: string;
  [key: string]: unknown;
};

export type EmergencyPatient = EmergencyRecord;
export type EmsIncomingPatient = EmergencyRecord;
export type EmergencyBoardingPatient = EmergencyRecord & {
  boardingMinutes?: number;
  boardTimeMinutes?: number;
};

export type EmergencyRecommendation = {
  id?: string;
  title?: string;
  message?: string;
  action?: string;
  priority?: string;
  [key: string]: unknown;
};

export type EmergencyCapacityMetrics = {
  score: number;
  color: EmergencyCapacityColor;
  triggers: string[];
  recommendations: EmergencyRecommendation[];
  updatedAt: string | null;
  raw: unknown;
};

export type EmergencyBoardingMetrics = {
  medianBoardTimeMinutes: number;
  patientsBoarding: EmergencyBoardingPatient[];
  exceedingThresholds: EmergencyBoardingPatient[];
  updatedAt: string | null;
  raw: unknown;
};

export type EmergencySurgeStatus = {
  active: boolean;
  event: EmergencyRecord | null;
  activatedAt: string | null;
  updatedAt: string | null;
};

export type EmergencyCopilotMessage = {
  id: string;
  query: string;
  response: string;
  safetyStatus: CopilotSafetyStatus;
  createdAt: string;
  raw?: unknown;
};

export type EmergencyUiState = {
  loading: boolean;
  error: string | null;
  selectedPatientId: string | null;
};

export type EmergencyWebSocketStatus = {
  connected: boolean;
  status: EmergencyWebSocketConnectionState;
  url: string | null;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastEventAt: string | null;
  error: string | null;
};

export type EmergencyIntegrationEvent = {
  id: string;
  type: string;
  payload: unknown;
  receivedAt: string;
};

export type EmergencyRealtimeEvent = {
  type?: string;
  event?: string;
  name?: string;
  topic?: string;
  payload?: unknown;
  data?: unknown;
  record?: unknown;
  [key: string]: unknown;
};

export type EmergencyDashboardRefreshResult = {
  whiteboard?: unknown;
  capacity?: unknown;
  boarding?: unknown;
  ems?: unknown;
  errors: Record<string, string>;
};

export type ActivateSurgePayload = {
  type?: string;
  estimatedPatientCount?: number;
  reason?: string;
  activatedBy?: string;
  [key: string]: unknown;
};

export type CopilotQueryOptions = {
  userRole?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
};

export type EmergencyStoreState = {
  patients: EmergencyPatient[];
  capacityMetrics: EmergencyCapacityMetrics;
  boardingMetrics: EmergencyBoardingMetrics;
  surgeStatus: EmergencySurgeStatus;
  copilotMessages: EmergencyCopilotMessage[];
  emsIncomingPatients: EmsIncomingPatient[];
  ui: EmergencyUiState;
  websocket: EmergencyWebSocketStatus;
  integrationEvents: EmergencyIntegrationEvent[];

  setPatients: (patients: EmergencyPatient[]) => void;
  addPatient: (patient: EmergencyPatient) => void;
  removePatient: (patientId: string) => void;
  selectPatient: (patientId: string | null) => void;
  clearError: () => void;
  refreshAllData: () => Promise<EmergencyDashboardRefreshResult>;
  activateSurge: (payload?: ActivateSurgePayload) => Promise<EmergencySurgeStatus>;
  sendCopilotQuery: (query: string, options?: CopilotQueryOptions) => Promise<EmergencyCopilotMessage>;
  updatePatient: (patientId: string, patch: Partial<EmergencyPatient>) => void;
  setWebSocketStatus: (status: Partial<EmergencyWebSocketStatus>) => void;
  dispatchWebSocketEvent: (event: EmergencyRealtimeEvent | unknown) => void;
  appendCopilotMessage: (message: EmergencyCopilotMessage) => void;
  upsertEmsIncomingPatient: (patient: EmsIncomingPatient) => void;
};

export type UseEmergencyWebSocketOptions = {
  url?: string;
  protocols?: string | string[];
  enabled?: boolean;
  reconnectMs?: number;
};

const emptyCapacityMetrics = (): EmergencyCapacityMetrics => ({
  score: 0,
  color: 'unknown',
  triggers: [],
  recommendations: [],
  updatedAt: null,
  raw: null,
});

const emptyBoardingMetrics = (): EmergencyBoardingMetrics => ({
  medianBoardTimeMinutes: 0,
  patientsBoarding: [],
  exceedingThresholds: [],
  updatedAt: null,
  raw: null,
});

const emptySurgeStatus = (): EmergencySurgeStatus => ({
  active: false,
  event: null,
  activatedAt: null,
  updatedAt: null,
});

const emptyUiState = (): EmergencyUiState => ({
  loading: false,
  error: null,
  selectedPatientId: null,
});

const emptyWebSocketStatus = (): EmergencyWebSocketStatus => ({
  connected: false,
  status: 'idle',
  url: null,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  lastEventAt: null,
  error: null,
});

export const createInitialEmergencyStoreState = () => ({
  patients: [] as EmergencyPatient[],
  capacityMetrics: emptyCapacityMetrics(),
  boardingMetrics: emptyBoardingMetrics(),
  surgeStatus: emptySurgeStatus(),
  copilotMessages: [] as EmergencyCopilotMessage[],
  emsIncomingPatients: [] as EmsIncomingPatient[],
  ui: emptyUiState(),
  websocket: emptyWebSocketStatus(),
  integrationEvents: [] as EmergencyIntegrationEvent[],
});

const nowIso = () => new Date().toISOString();

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isObject(value) ? value : {});

const unwrapData = (value: unknown): unknown => {
  const record = asRecord(value);
  return record.data ?? record.result ?? record.payload ?? value;
};

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const getNested = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => asRecord(current)[key], source);

const firstValue = (source: unknown, paths: string[]): unknown => {
  for (const path of paths) {
    const value = getNested(source, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const stringFrom = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

const numberFrom = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stableId = (prefix: string, source: unknown, index = 0): string => {
  const record = asRecord(source);
  const candidate =
    record.id ??
    record.patientId ??
    record.patient_id ??
    record.mrn ??
    record.unitId ??
    record.unit_id ??
    record.eventId;
  const value = stringFrom(candidate);
  return value || `${prefix}-${Date.now()}-${index}`;
};

const upsertById = <T extends EmergencyRecord>(items: T[], item: T): T[] => {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [item, ...items];
  return items.map((candidate) => (candidate.id === item.id ? { ...candidate, ...item } : candidate));
};

const capCopilotMessages = (messages: EmergencyCopilotMessage[]): EmergencyCopilotMessage[] =>
  messages.slice(-COPILOT_STORAGE_LIMIT);

const normalizeCapacityColor = (value: unknown, score = 0): EmergencyCapacityColor => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('red') || normalized.includes('critical')) return 'red';
  if (normalized.includes('orange') || normalized.includes('high')) return 'orange';
  if (normalized.includes('yellow') || normalized.includes('moderate')) return 'yellow';
  if (normalized.includes('green') || normalized.includes('normal') || normalized.includes('low')) return 'green';
  if (score >= 85) return 'red';
  if (score >= 70) return 'orange';
  if (score >= 45) return 'yellow';
  if (score > 0) return 'green';
  return 'unknown';
};

const normalizeRecommendation = (value: unknown, index: number): EmergencyRecommendation => {
  if (isObject(value)) {
    return {
      id: stringFrom(value.id) || `recommendation-${index}`,
      ...value,
    };
  }
  return {
    id: `recommendation-${index}`,
    message: stringFrom(value) || 'Review Emergency OS recommendation.',
  };
};

const normalizeStringList = (value: unknown): string[] =>
  asArray(value)
    .map((item) => stringFrom(item) || stringFrom(asRecord(item).label) || stringFrom(asRecord(item).title))
    .filter((item): item is string => Boolean(item));

const normalizePatient = (value: unknown, index = 0): EmergencyPatient => ({
  ...asRecord(value),
  id: stableId('patient', value, index),
});

const normalizeEmsPatient = (value: unknown, index = 0): EmsIncomingPatient => ({
  ...asRecord(value),
  id: stableId('ems', value, index),
});

const normalizeBoardingPatient = (value: unknown, index = 0): EmergencyBoardingPatient => ({
  ...asRecord(value),
  id: stableId('boarding-patient', value, index),
  boardingMinutes: numberFrom(
    firstValue(value, ['boardingMinutes', 'boardTimeMinutes', 'boardingTime', 'waitMinutes']),
    0
  ),
});

const extractWhiteboardPatients = (raw: unknown): EmergencyPatient[] => {
  const data = unwrapData(raw);
  const candidate =
    (Array.isArray(data) && data) ||
    firstValue(data, ['patients', 'whiteboardPatients', 'cards', 'items', 'summary.patients']);

  if (Array.isArray(candidate)) return candidate.map(normalizePatient);

  const columnCards = asArray<Record<string, unknown>>(firstValue(data, ['columns'])).flatMap((column) =>
    asArray(column.cards)
  );
  return columnCards.map(normalizePatient);
};

const normalizeCapacityMetrics = (raw: unknown): EmergencyCapacityMetrics => {
  const data = unwrapData(raw);
  const source = firstValue(data, ['capacity', 'capacityMetrics', 'capacityEngine']) ?? data;
  const score = numberFrom(firstValue(source, ['score', 'capacityScore', 'capacityPressure']), 0);
  const recommendations = asArray(firstValue(source, ['recommendations', 'nextRecommendedActions'])).map(
    normalizeRecommendation
  );
  const triggerSource =
    firstValue(source, ['triggers', 'thresholdSignals', 'signals', 'deductions']) ??
    firstValue(data, ['triggers', 'signals']);

  return {
    score,
    color: normalizeCapacityColor(firstValue(source, ['color', 'riskLevel', 'band', 'label']), score),
    triggers: normalizeStringList(triggerSource),
    recommendations,
    updatedAt: stringFrom(firstValue(source, ['updatedAt', 'generatedAt'])) || nowIso(),
    raw,
  };
};

const normalizeBoardingMetrics = (raw: unknown): EmergencyBoardingMetrics => {
  const data = unwrapData(raw);
  const source = firstValue(data, ['boarding', 'boardingMetrics', 'metrics']) ?? data;
  const patients = asArray(
    firstValue(data, ['patientsBoarding', 'boardingPatients', 'boardedPatients', 'boarders']) ??
      firstValue(source, ['patientsBoarding', 'boardingPatients', 'boardedPatients', 'boarders'])
  ).map(normalizeBoardingPatient);
  const explicitExceeding = asArray(
    firstValue(data, ['exceedingThresholds', 'thresholdBreaches']) ??
      firstValue(source, ['exceedingThresholds', 'thresholdBreaches'])
  ).map(normalizeBoardingPatient);
  const exceedingThresholds = explicitExceeding.length
    ? explicitExceeding
    : patients.filter(
        (patient) =>
          numberFrom(patient.boardingMinutes ?? patient.boardTimeMinutes, 0) >=
          DEFAULT_BOARDING_THRESHOLD_MINUTES
      );

  return {
    medianBoardTimeMinutes: numberFrom(
      firstValue(source, [
        'medianBoardTimeMinutes',
        'medianBoardTime',
        'medianBoardingMinutes',
        'boardingTime',
        'averageBoardTime',
      ]),
      0
    ),
    patientsBoarding: patients,
    exceedingThresholds,
    updatedAt: stringFrom(firstValue(source, ['updatedAt', 'generatedAt'])) || nowIso(),
    raw,
  };
};

const extractEmsIncomingPatients = (raw: unknown): EmsIncomingPatient[] => {
  const data = unwrapData(raw);
  const candidate =
    (Array.isArray(data) && data) ||
    firstValue(data, ['incomingPatients', 'emsIncomingPatients', 'emsArrivals', 'arrivals', 'patients', 'queue.incomingPatients']);
  return asArray(candidate).map(normalizeEmsPatient);
};

const normalizeSafetyStatus = (value: unknown): CopilotSafetyStatus => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('block')) return 'blocked';
  if (normalized.includes('unsafe') || normalized.includes('danger')) return 'unsafe';
  if (normalized.includes('caution') || normalized.includes('warn') || normalized.includes('review')) return 'caution';
  if (normalized.includes('safe') || normalized.includes('pass')) return 'safe';
  return 'unknown';
};

const normalizeCopilotMessage = (query: string, raw: unknown): EmergencyCopilotMessage => {
  const data = unwrapData(raw);
  const response =
    stringFrom(firstValue(data, ['response', 'answer', 'message', 'content', 'text'])) ||
    'Emergency Copilot returned no response text.';

  return {
    id: stringFrom(firstValue(data, ['id', 'messageId'])) || `copilot-${Date.now()}`,
    query,
    response,
    safetyStatus: normalizeSafetyStatus(firstValue(data, ['safetyStatus', 'safety_status', 'safety.status'])),
    createdAt: stringFrom(firstValue(data, ['createdAt', 'timestamp'])) || nowIso(),
    raw,
  };
};

const normalizeCopilotRealtimeMessage = (raw: unknown): EmergencyCopilotMessage => {
  const payload = asRecord(raw);
  return {
    id: stringFrom(firstValue(payload, ['id', 'messageId'])) || `copilot-${Date.now()}`,
    query: stringFrom(firstValue(payload, ['query', 'prompt'])) || '',
    response: stringFrom(firstValue(payload, ['response', 'answer', 'message', 'content'])) || '',
    safetyStatus: normalizeSafetyStatus(firstValue(payload, ['safetyStatus', 'safety_status', 'safety.status'])),
    createdAt: stringFrom(firstValue(payload, ['createdAt', 'timestamp'])) || nowIso(),
    raw,
  };
};

const normalizeSurgeStatus = (raw: unknown, fallbackPayload: ActivateSurgePayload = {}): EmergencySurgeStatus => {
  const data = unwrapData(raw);
  const event = {
    ...fallbackPayload,
    ...asRecord(firstValue(data, ['event', 'surgeEvent']) ?? data),
  };

  return {
    active: Boolean(firstValue(data, ['active']) ?? true),
    event: {
      ...event,
      id: stableId('surge', event),
    },
    activatedAt: stringFrom(firstValue(event, ['activatedAt', 'activationTime', 'timestamp'])) || nowIso(),
    updatedAt: nowIso(),
  };
};

const requestJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(
      stringFrom(firstValue(data, ['message', 'error', 'detail'])) ||
        `Emergency OS request failed with status ${response.status}.`
    );
  }

  return data as T;
};

const loadDataset = async (path: string): Promise<{ data?: unknown; error?: string }> => {
  try {
    return { data: await requestJson<unknown>(path) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to load Emergency OS data.' };
  }
};

const normalizeRealtimeEventType = (type: unknown): string =>
  String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s.:/-]+/g, '_');

const realtimePayload = (event: EmergencyRealtimeEvent | unknown): unknown => {
  const record = asRecord(event);
  return record.payload ?? record.data ?? record.record ?? event;
};

const realtimeEventType = (event: EmergencyRealtimeEvent | unknown): string => {
  const record = asRecord(event);
  return normalizeRealtimeEventType(record.type ?? record.event ?? record.name ?? record.topic);
};

const patientIdFromPayload = (payload: unknown): string | null =>
  stringFrom(firstValue(payload, ['patientId', 'patient_id', 'id', 'patient.id']));

const resolveWebSocketUrl = (url = DEFAULT_WS_PATH): string => {
  if (/^wss?:\/\//i.test(url)) return url;
  if (typeof window === 'undefined') return url;

  if (/^https?:\/\//i.test(url)) {
    return url.replace(/^http/i, 'ws');
  }

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${normalizedPath}`;
};

const parseSocketMessage = (data: unknown): EmergencyRealtimeEvent | null => {
  if (isObject(data)) return data as EmergencyRealtimeEvent;
  if (typeof data !== 'string') return null;

  try {
    const parsed = JSON.parse(data);
    return isObject(parsed) ? (parsed as EmergencyRealtimeEvent) : null;
  } catch {
    return null;
  }
};

export const useEmergencyStore = create<EmergencyStoreState>()(
  persist(
    (set, get) => ({
      ...createInitialEmergencyStoreState(),

      setPatients: (patients) => set({ patients: patients.map(normalizePatient) }),

      addPatient: (patient) =>
        set((state) => ({
          patients: upsertById(state.patients, normalizePatient(patient)),
        })),

      removePatient: (patientId) =>
        set((state) => ({
          patients: state.patients.filter((patient) => patient.id !== patientId),
          ui: {
            ...state.ui,
            selectedPatientId: state.ui.selectedPatientId === patientId ? null : state.ui.selectedPatientId,
          },
        })),

      selectPatient: (patientId) =>
        set((state) => ({
          ui: {
            ...state.ui,
            selectedPatientId: patientId,
          },
        })),

      clearError: () =>
        set((state) => ({
          ui: {
            ...state.ui,
            error: null,
          },
        })),

      refreshAllData: async () => {
        set((state) => ({
          ui: {
            ...state.ui,
            loading: true,
            error: null,
          },
        }));

        const [whiteboard, capacity, boarding, ems] = await Promise.all([
          loadDataset(EMERGENCY_API.whiteboard),
          loadDataset(EMERGENCY_API.capacity),
          loadDataset(EMERGENCY_API.boarding),
          loadDataset(EMERGENCY_API.ems),
        ]);

        const errors = Object.fromEntries(
          Object.entries({ whiteboard, capacity, boarding, ems })
            .filter(([, result]) => result.error)
            .map(([key, result]) => [key, result.error as string])
        );

        set((state) => ({
          patients: whiteboard.data ? extractWhiteboardPatients(whiteboard.data) : state.patients,
          capacityMetrics: capacity.data ? normalizeCapacityMetrics(capacity.data) : state.capacityMetrics,
          boardingMetrics: boarding.data ? normalizeBoardingMetrics(boarding.data) : state.boardingMetrics,
          emsIncomingPatients: ems.data ? extractEmsIncomingPatients(ems.data) : state.emsIncomingPatients,
          ui: {
            ...state.ui,
            loading: false,
            error: Object.values(errors)[0] ?? null,
          },
        }));

        return {
          whiteboard: whiteboard.data,
          capacity: capacity.data,
          boarding: boarding.data,
          ems: ems.data,
          errors,
        };
      },

      activateSurge: async (payload = {}) => {
        set((state) => ({
          ui: {
            ...state.ui,
            error: null,
          },
        }));

        try {
          const response = await requestJson<unknown>(EMERGENCY_API.surgeActivate, {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          const surgeStatus = normalizeSurgeStatus(response, payload);
          set({ surgeStatus });
          return surgeStatus;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to activate surge mode.';
          set((state) => ({
            ui: {
              ...state.ui,
              error: message,
            },
          }));
          throw error;
        }
      },

      sendCopilotQuery: async (query, options = {}) => {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
          throw new Error('Copilot query is required.');
        }

        set((state) => ({
          ui: {
            ...state.ui,
            error: null,
          },
        }));

        try {
          const response = await requestJson<unknown>(EMERGENCY_API.copilotQuery, {
            method: 'POST',
            body: JSON.stringify({
              query: cleanQuery,
              user_role: options.userRole,
              context: options.context,
              ...options,
            }),
          });
          const message = normalizeCopilotMessage(cleanQuery, response);
          get().appendCopilotMessage(message);
          return message;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to send Copilot query.';
          set((state) => ({
            ui: {
              ...state.ui,
              error: message,
            },
          }));
          throw error;
        }
      },

      updatePatient: (patientId, patch) =>
        set((state) => {
          const existing = state.patients.find((patient) => patient.id === patientId);
          const patient = normalizePatient({
            ...(existing || {}),
            ...patch,
            id: patientId,
            updatedAt: nowIso(),
          });
          return {
            patients: upsertById(state.patients, patient),
          };
        }),

      setWebSocketStatus: (status) =>
        set((state) => ({
          websocket: {
            ...state.websocket,
            ...status,
          },
        })),

      dispatchWebSocketEvent: (event) => {
        const type = realtimeEventType(event);
        const payload = realtimePayload(event);
        const state = get();

        state.setWebSocketStatus({ lastEventAt: nowIso() });

        if (['patient_updated', 'patient_update', 'patient_changed'].includes(type)) {
          const patientId = patientIdFromPayload(payload);
          if (patientId) state.updatePatient(patientId, asRecord(firstValue(payload, ['patch', 'patient']) ?? payload));
          return;
        }

        if (['patient_created', 'patient_added', 'whiteboard_patient_created'].includes(type)) {
          state.addPatient(normalizePatient(firstValue(payload, ['patient']) ?? payload));
          return;
        }

        if (['patient_deleted', 'patient_removed', 'patient_discharged'].includes(type)) {
          const patientId = patientIdFromPayload(payload);
          if (patientId) state.removePatient(patientId);
          return;
        }

        if (['capacity_updated', 'capacity_changed', 'capacity_score_changed'].includes(type)) {
          set({ capacityMetrics: normalizeCapacityMetrics(payload) });
          return;
        }

        if (['boarding_updated', 'boarding_changed', 'boarding_started'].includes(type)) {
          set({ boardingMetrics: normalizeBoardingMetrics(payload) });
          return;
        }

        if (['ems_arrival', 'ems_arrival_created', 'ems_incoming', 'ems_updated'].includes(type)) {
          state.upsertEmsIncomingPatient(normalizeEmsPatient(firstValue(payload, ['patient', 'arrival']) ?? payload));
          return;
        }

        if (['surge_activated', 'surge_updated'].includes(type)) {
          set({ surgeStatus: normalizeSurgeStatus(payload) });
          return;
        }

        if (['surge_deactivated', 'surge_closed'].includes(type)) {
          set({
            surgeStatus: {
              active: false,
              event: isObject(payload) ? { ...payload, id: stableId('surge', payload) } : null,
              activatedAt: state.surgeStatus.activatedAt,
              updatedAt: nowIso(),
            },
          });
          return;
        }

        if (['copilot_message', 'copilot_response', 'copilot_query_completed'].includes(type)) {
          state.appendCopilotMessage(normalizeCopilotRealtimeMessage(payload));
          return;
        }

        if (['integration_event', 'integration_event_received', 'integration_updated'].includes(type)) {
          set((current) => ({
            integrationEvents: [
              {
                id: stableId('integration-event', payload),
                type,
                payload,
                receivedAt: nowIso(),
              },
              ...current.integrationEvents,
            ].slice(0, INTEGRATION_EVENT_LIMIT),
          }));
        }
      },

      appendCopilotMessage: (message) =>
        set((state) => ({
          copilotMessages: capCopilotMessages([...state.copilotMessages, message]),
        })),

      upsertEmsIncomingPatient: (patient) =>
        set((state) => ({
          emsIncomingPatients: upsertById(state.emsIncomingPatients, normalizeEmsPatient(patient)),
        })),
    }),
    {
      name: 'emergency-os-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        copilotMessages: capCopilotMessages(state.copilotMessages),
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        copilotMessages: capCopilotMessages(
          asArray<EmergencyCopilotMessage>(asRecord(persistedState).copilotMessages)
        ),
      }),
    }
  )
);

export const useUnifiedEmergencyStore = useEmergencyStore;

export function useEmergencyWebSocket(options: UseEmergencyWebSocketOptions = {}) {
  const {
    enabled = true,
    protocols,
    reconnectMs = DEFAULT_RECONNECT_MS,
    url = DEFAULT_WS_PATH,
  } = options;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return undefined;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;
    const resolvedUrl = resolveWebSocketUrl(url);

    const clearReconnect = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = (reconnecting = false) => {
      if (stopped) return;
      useEmergencyStore.getState().setWebSocketStatus({
        connected: false,
        status: reconnecting ? 'reconnecting' : 'connecting',
        url: resolvedUrl,
        error: null,
      });

      socket = new WebSocket(resolvedUrl, protocols);

      socket.onopen = () => {
        useEmergencyStore.getState().setWebSocketStatus({
          connected: true,
          status: 'connected',
          url: resolvedUrl,
          lastConnectedAt: nowIso(),
          error: null,
        });
      };

      socket.onmessage = (message) => {
        const event = parseSocketMessage(message.data);
        if (event) useEmergencyStore.getState().dispatchWebSocketEvent(event);
      };

      socket.onerror = () => {
        useEmergencyStore.getState().setWebSocketStatus({
          connected: false,
          status: 'error',
          url: resolvedUrl,
          error: 'Emergency OS WebSocket error.',
        });
      };

      socket.onclose = () => {
        useEmergencyStore.getState().setWebSocketStatus({
          connected: false,
          status: stopped ? 'disconnected' : 'reconnecting',
          url: resolvedUrl,
          lastDisconnectedAt: nowIso(),
        });

        if (!stopped) {
          clearReconnect();
          reconnectTimer = window.setTimeout(() => connect(true), reconnectMs);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      clearReconnect();
      socket?.close();
      useEmergencyStore.getState().setWebSocketStatus({
        connected: false,
        status: 'disconnected',
        url: resolvedUrl,
        lastDisconnectedAt: nowIso(),
      });
    };
  }, [enabled, protocols, reconnectMs, url]);
}

export default useEmergencyStore;

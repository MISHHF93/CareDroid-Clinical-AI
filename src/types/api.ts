export interface ApiUnavailableResponse {
  ok: false;
  unavailable: true;
  mocked: true;
  capability: string;
  endpoint: string;
  message: string;
  data?: unknown;
}

export interface ApiMutationResponse {
  ok: boolean;
  success?: boolean;
  message?: string;
  id?: string;
}

export interface OfflineSyncResponse {
  ok: boolean;
  synced: number;
  total: number;
  queued: number;
  unavailable?: boolean;
  items?: unknown[];
  message?: string;
}

export interface ShareResultsResponse extends ApiMutationResponse {
  shareId?: string;
  url?: string;
  delivery?: 'local-link' | 'email' | 'export';
}

export interface NotificationStreamResponse extends ApiUnavailableResponse {
  data: {
    eventSource: null;
    reconnectAfterMs: number | null;
  };
}

export interface NotificationSendResponse extends ApiMutationResponse {
  messageId?: string;
  channel?: string;
  unavailable?: boolean;
}

export interface TeamUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
}

export interface TeamUsersResponse {
  ok: boolean;
  users: TeamUserResponse[];
  unavailable?: boolean;
  message?: string;
}

export interface BiometricAvailabilityResponse {
  success: boolean;
  serverSupport: boolean;
  enrolledDevices: number;
  supportedTypes: string[];
}

export interface BiometricConfigResponse {
  success: boolean;
  configs: Array<{
    id: string;
    biometricType: string;
    deviceId: string;
    deviceName: string;
    lastUsedAt?: string | null;
    usageCount?: number;
    createdAt?: string;
  }>;
}

export interface BiometricStatsResponse {
  success: boolean;
  stats: Record<string, unknown>;
}

export interface DrugCategoriesResponse {
  ok: boolean;
  categories: string[];
  error?: string;
}

export interface DrugDetailResponse {
  ok: boolean;
  drug: Record<string, unknown> | null;
  error?: string;
}

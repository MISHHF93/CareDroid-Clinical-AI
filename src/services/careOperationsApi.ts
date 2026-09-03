import { apiFetchJson, getApiErrorMessage } from './apiClient';

export type CareTaskStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type CareTaskType = 'reassessment_due' | 'ems_handoff_pending' | 'operational_exception';

export interface CareTask {
  id: string;
  taskType: CareTaskType;
  status: CareTaskStatus;
  priority: 'Info' | 'Warning' | 'Critical';
  ownerRole?: string;
  ownerUserId?: string;
  patientId?: string;
  encounterId?: string;
  reason: string;
  sourceEvent: string;
  deepLink?: string;
  dueAt?: string;
  isOverdue: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  completedAt?: string;
  completedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt: string;
  updatedAt: string;
}

async function guardedJson(path: string, options: any = {}) {
  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message: data?.error || data?.message || getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data, message: data?.message || '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

export async function fetchCareOperationsInbox(): Promise<{
  ok: boolean;
  tasks: CareTask[];
  message: string;
}> {
  const result = await guardedJson('/api/emergency/care-operations/inbox');
  const tasks = (result.data?.tasks ?? []) as CareTask[];
  return { ok: result.ok, tasks, message: result.message };
}

export async function transitionCareTask(
  id: string,
  status: CareTaskStatus,
): Promise<{ ok: boolean; task: CareTask | null; message: string }> {
  const jsonHeaders = { 'content-type': 'application/json' };
  const result = await guardedJson(
    `/api/emergency/care-operations/inbox/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ status }),
    },
  );
  const task = (result.data ?? null) as CareTask | null;
  return { ok: result.ok, task, message: result.message };
}

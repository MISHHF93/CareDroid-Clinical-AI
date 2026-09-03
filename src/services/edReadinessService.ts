/**
 * EDReadinessService — prepares the ED for inbound critical patients.
 *
 * Triggered when EMS issues a pre-arrival notification for a high-acuity patient.
 * Creates an EDReadinessPlan that tracks room assignment, staff notifications,
 * equipment checks, and specialty team callbacks.
 */

import type { EDReadinessPlan, EntityId, ISODateString } from '../types/emergency';

function generateId(): string {
  return `readiness-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): ISODateString {
  return new Date().toISOString();
}

const readinessPlans = new Map<EntityId, EDReadinessPlan>();

export type ReadinessTrigger = {
  callId: EntityId;
  linkedEmsArrivalId?: EntityId;
  preparedBy: EntityId;
  expectedArrivalAt: ISODateString;
  activatedResources?: string[];
  specialtyTeams?: string[];
  assignedRoom?: string;
  assignedBay?: string;
};

export function createReadinessPlan(params: ReadinessTrigger): EDReadinessPlan {
  const plan: EDReadinessPlan = {
    id: generateId(),
    callId: params.callId,
    linkedEmsArrivalId: params.linkedEmsArrivalId,
    createdAt: now(),
    updatedAt: now(),
    preparedBy: params.preparedBy,
    expectedArrivalAt: params.expectedArrivalAt,
    assignedRoom: params.assignedRoom,
    assignedBay: params.assignedBay,
    activatedResources: params.activatedResources ?? [],
    notifiedStaff: [],
    equipmentChecklist: buildDefaultChecklist(params.activatedResources ?? []),
    specialtyTeamCalled: (params.specialtyTeams?.length ?? 0) > 0,
    specialtyTeams: params.specialtyTeams ?? [],
    bloodProductsOrdered: false,
    imagingPreOrdered: false,
    status: 'pending',
  };
  readinessPlans.set(plan.id, plan);
  void import('./emergencyCareJourneyOrchestrator').then(({ onHospitalPreAlert }) =>
    onHospitalPreAlert(params.callId, params.linkedEmsArrivalId, { actorId: params.preparedBy }),
  );
  return plan;
}

function buildDefaultChecklist(
  activatedResources: string[],
): EDReadinessPlan['equipmentChecklist'] {
  const base = [
    { item: 'IV access kit', ready: false },
    { item: 'Monitoring leads', ready: false },
    { item: 'O2 delivery device', ready: false },
    { item: 'Code cart confirmed available', ready: false },
  ];
  if (activatedResources.some((r) => /stemi|cardiac/i.test(r))) {
    base.push({ item: 'ECG machine connected', ready: false });
    base.push({ item: 'Cath lab notified', ready: false });
  }
  if (activatedResources.some((r) => /stroke/i.test(r))) {
    base.push({ item: 'CT imaging expedited', ready: false });
    base.push({ item: 'tPA/lytics available', ready: false });
  }
  if (activatedResources.some((r) => /trauma/i.test(r))) {
    base.push({ item: 'Trauma bay prepped', ready: false });
    base.push({ item: 'Blood products available', ready: false });
    base.push({ item: 'Surgical team notified', ready: false });
  }
  return base;
}

export function notifyStaff(
  planId: EntityId,
  staffMember: { roleId: string; name: string },
): EDReadinessPlan | null {
  const plan = readinessPlans.get(planId);
  if (!plan) return null;

  const already = plan.notifiedStaff.some(
    (s) => s.roleId === staffMember.roleId && s.name === staffMember.name,
  );
  if (already) return plan;

  const updated: EDReadinessPlan = {
    ...plan,
    notifiedStaff: [...plan.notifiedStaff, { ...staffMember, notifiedAt: now() }],
    updatedAt: now(),
  };
  readinessPlans.set(planId, updated);
  return updated;
}

export function checkEquipmentItem(planId: EntityId, item: string): EDReadinessPlan | null {
  const plan = readinessPlans.get(planId);
  if (!plan) return null;

  const updated: EDReadinessPlan = {
    ...plan,
    equipmentChecklist: plan.equipmentChecklist.map((e) =>
      e.item === item ? { ...e, ready: true } : e,
    ),
    updatedAt: now(),
  };
  readinessPlans.set(planId, updated);
  return updated;
}

export function markReady(planId: EntityId): EDReadinessPlan | null {
  const plan = readinessPlans.get(planId);
  if (!plan) return null;
  const updated: EDReadinessPlan = { ...plan, status: 'ready', updatedAt: now() };
  readinessPlans.set(planId, updated);
  return updated;
}

export function markPatientArrived(planId: EntityId): EDReadinessPlan | null {
  const plan = readinessPlans.get(planId);
  if (!plan) return null;
  const updated: EDReadinessPlan = { ...plan, status: 'patient_arrived', updatedAt: now() };
  readinessPlans.set(planId, updated);
  return updated;
}

export function cancelReadinessPlan(planId: EntityId): EDReadinessPlan | null {
  const plan = readinessPlans.get(planId);
  if (!plan) return null;
  const updated: EDReadinessPlan = { ...plan, status: 'cancelled', updatedAt: now() };
  readinessPlans.set(planId, updated);
  return updated;
}

export function getReadinessPlanForCall(callId: EntityId): EDReadinessPlan | null {
  return [...readinessPlans.values()].find((p) => p.callId === callId) ?? null;
}

export function getActivePlans(): EDReadinessPlan[] {
  return [...readinessPlans.values()].filter((p) => p.status === 'pending' || p.status === 'ready');
}

export type ReadinessSummary = {
  activePlans: number;
  readyCount: number;
  pendingCount: number;
  overdueCount: number;
};

export function getReadinessSummary(): ReadinessSummary {
  const active = getActivePlans();
  const nowMs = Date.now();
  return {
    activePlans: active.length,
    readyCount: active.filter((p) => p.status === 'ready').length,
    pendingCount: active.filter((p) => p.status === 'pending').length,
    overdueCount: active.filter(
      (p) => p.status === 'pending' && new Date(p.expectedArrivalAt).getTime() < nowMs,
    ).length,
  };
}

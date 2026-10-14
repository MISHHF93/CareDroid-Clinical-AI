/**
 * DiagnosticsCoordinationService — coordinates diagnostic orders across lab,
 * imaging, ECG, pharmacy review, and specialty consults.
 *
 * Provides order creation, status tracking, result summarization, and
 * priority escalation for ED diagnostic workflows. AI output requires
 * physician or pharmacist review before action.
 */

import type { DiagnosticOrder, EntityId, ISODateString } from '../types/emergency';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): ISODateString {
  return new Date().toISOString();
}

function seedInitialOrders(): Map<EntityId, DiagnosticOrder> {
  const map = new Map<EntityId, DiagnosticOrder>();
  const initial: DiagnosticOrder[] = [
    {
      id: 'dx-order-001',
      patientId: 'demo-pt-001',
      orderedBy: 'physician-george',
      type: 'imaging',
      priority: 'stat',
      status: 'in_progress',
      targetDepartment: 'Radiology / CT',
      orderedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'dx-order-002',
      patientId: 'demo-pt-002',
      orderedBy: 'physician-george',
      type: 'lab',
      priority: 'stat',
      status: 'in_progress',
      targetDepartment: 'Laboratory / Stat Core',
      orderedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    },
    {
      id: 'dx-order-003',
      patientId: 'demo-pt-003',
      orderedBy: 'physician-george',
      type: 'ecg',
      priority: 'stat',
      status: 'resulted',
      resultSummary: 'Sinus tachycardia, rate 104 bpm. No acute ST-T wave changes.',
      targetDepartment: 'Cardiology / ED',
      orderedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    },
    {
      id: 'dx-order-004',
      patientId: 'demo-pt-001',
      orderedBy: 'physician-george',
      type: 'lab',
      priority: 'urgent',
      status: 'ordered',
      targetDepartment: 'Laboratory / Hematology',
      orderedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    },
    {
      id: 'dx-order-005',
      patientId: 'demo-pt-002',
      orderedBy: 'physician-george',
      type: 'imaging',
      priority: 'urgent',
      status: 'resulted',
      resultSummary: 'Portable CXR: Mild cardiomegaly, clear lung bases, no pneumothorax.',
      targetDepartment: 'Radiology',
      orderedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    },
    {
      id: 'dx-order-006',
      patientId: 'demo-pt-003',
      orderedBy: 'physician-george',
      type: 'pharmacy-review',
      priority: 'urgent',
      status: 'in_progress',
      targetDepartment: 'Pharmacy / Critical Care',
      orderedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
    {
      id: 'dx-order-007',
      patientId: 'demo-pt-002',
      orderedBy: 'physician-george',
      type: 'consult',
      priority: 'urgent',
      status: 'ordered',
      targetDepartment: 'Cardiology Consult',
      orderedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    {
      id: 'dx-order-008',
      patientId: 'demo-pt-001',
      orderedBy: 'physician-george',
      type: 'lab',
      priority: 'routine',
      status: 'ordered',
      targetDepartment: 'Laboratory / Chemistry',
      orderedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
  ];
  for (const o of initial) {
    map.set(o.id, o);
  }
  return map;
}

const orders = seedInitialOrders();

export type DiagnosticOrderParams = {
  patientId: EntityId;
  orderedBy: EntityId;
  type: DiagnosticOrder['type'];
  priority: DiagnosticOrder['priority'];
  targetDepartment?: string;
};

export function createDiagnosticOrder(params: DiagnosticOrderParams): DiagnosticOrder {
  const order: DiagnosticOrder = {
    id: generateId('dx-order'),
    patientId: params.patientId,
    orderedAt: now(),
    orderedBy: params.orderedBy,
    type: params.type,
    priority: params.priority,
    status: 'ordered',
    targetDepartment: params.targetDepartment ?? defaultDepartment(params.type),
  };
  orders.set(order.id, order);
  void import('./emergencyCareJourneyOrchestrator').then(({ onDiagnosticsOrdered }) =>
    onDiagnosticsOrdered(params.patientId, {
      actorId: params.orderedBy,
      actorRole: 'emergency_physician',
    }),
  );
  return order;
}

function defaultDepartment(type: DiagnosticOrder['type']): string {
  const map: Record<DiagnosticOrder['type'], string> = {
    lab: 'Laboratory',
    imaging: 'Radiology',
    ecg: 'Cardiology / ED',
    'pharmacy-review': 'Pharmacy',
    consult: 'Specialty',
  };
  return map[type];
}

export function markOrderInProgress(orderId: EntityId): DiagnosticOrder | null {
  const order = orders.get(orderId);
  if (!order) return null;
  const updated: DiagnosticOrder = { ...order, status: 'in_progress' };
  orders.set(orderId, updated);
  return updated;
}

export function recordOrderResult(
  orderId: EntityId,
  resultSummary: string,
): DiagnosticOrder | null {
  const order = orders.get(orderId);
  if (!order) return null;
  const updated: DiagnosticOrder = { ...order, status: 'resulted', resultSummary };
  orders.set(orderId, updated);
  return updated;
}

export function cancelOrder(orderId: EntityId): DiagnosticOrder | null {
  const order = orders.get(orderId);
  if (!order) return null;
  const updated: DiagnosticOrder = { ...order, status: 'cancelled' };
  orders.set(orderId, updated);
  return updated;
}

export function upgradePriority(
  orderId: EntityId,
  priority: DiagnosticOrder['priority'],
): DiagnosticOrder | null {
  const order = orders.get(orderId);
  if (!order) return null;
  const updated: DiagnosticOrder = { ...order, priority };
  orders.set(orderId, updated);
  return updated;
}

export function getOrder(orderId: EntityId): DiagnosticOrder | null {
  return orders.get(orderId) ?? null;
}

export function getOrdersForPatient(patientId: EntityId): DiagnosticOrder[] {
  return [...orders.values()].filter((o) => o.patientId === patientId);
}

export function getPendingOrdersForPatient(patientId: EntityId): DiagnosticOrder[] {
  return getOrdersForPatient(patientId).filter(
    (o) => o.status === 'ordered' || o.status === 'in_progress',
  );
}

export function getStatOrders(): DiagnosticOrder[] {
  return [...orders.values()].filter(
    (o) => o.priority === 'stat' && (o.status === 'ordered' || o.status === 'in_progress'),
  );
}

export function getAllOrdersByDepartment(department: string): DiagnosticOrder[] {
  return [...orders.values()].filter(
    (o) => o.targetDepartment === department && o.status !== 'cancelled',
  );
}

export type DiagnosticsBoardRow = {
  orderId: EntityId;
  patientId: EntityId;
  type: DiagnosticOrder['type'];
  priority: DiagnosticOrder['priority'];
  status: DiagnosticOrder['status'];
  targetDepartment?: string;
  orderedAt: ISODateString;
  resultSummary?: string;
};

export function getDiagnosticsBoard(): DiagnosticsBoardRow[] {
  return [...orders.values()]
    .filter((o) => o.status !== 'cancelled')
    .sort((a, b) => {
      const priorityOrder = { stat: 0, urgent: 1, routine: 2 };
      return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
    })
    .map((o) => ({
      orderId: o.id,
      patientId: o.patientId,
      type: o.type,
      priority: o.priority,
      status: o.status,
      targetDepartment: o.targetDepartment,
      orderedAt: o.orderedAt,
      resultSummary: o.resultSummary,
    }));
}

export type DiagnosticsSummary = {
  totalOrders: number;
  statOrders: number;
  urgentOrders: number;
  pendingLab: number;
  pendingImaging: number;
  pendingEcg: number;
  pendingPharmacy: number;
  pendingConsult: number;
  resulted: number;
};

export function getDiagnosticsSummary(): DiagnosticsSummary {
  const all = [...orders.values()].filter((o) => o.status !== 'cancelled');
  const pending = (type: DiagnosticOrder['type']) =>
    all.filter((o) => o.type === type && (o.status === 'ordered' || o.status === 'in_progress'))
      .length;

  return {
    totalOrders: all.length,
    statOrders: all.filter((o) => o.priority === 'stat').length,
    urgentOrders: all.filter((o) => o.priority === 'urgent').length,
    pendingLab: pending('lab'),
    pendingImaging: pending('imaging'),
    pendingEcg: pending('ecg'),
    pendingPharmacy: pending('pharmacy-review'),
    pendingConsult: pending('consult'),
    resulted: all.filter((o) => o.status === 'resulted').length,
  };
}

export const DIAGNOSTIC_TYPE_LABELS: Record<DiagnosticOrder['type'], string> = {
  lab: 'Laboratory',
  imaging: 'Imaging',
  ecg: 'ECG',
  'pharmacy-review': 'Pharmacy Review',
  consult: 'Consult',
};

export const DIAGNOSTIC_PRIORITY_LABELS: Record<DiagnosticOrder['priority'], string> = {
  stat: 'STAT',
  urgent: 'Urgent',
  routine: 'Routine',
};

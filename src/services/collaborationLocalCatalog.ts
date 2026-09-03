/**
 * Local / desk-demo collaboration catalog.
 * Used when JWT is missing, API 401s, or collaboration hub is offline —
 * so reception and other profiles still have a usable hub on the platform.
 */
import type {
  CollaborationChannel,
  CollaborationChannelType,
  CollaborationMembership,
  CollaborationMessage,
} from '../store/collaborationStore';

export type CollaborationDataSource = 'live' | 'local-demo';

export type LocalCollaborationSeed = {
  entries: Array<{ channel: CollaborationChannel; membership: CollaborationMembership }>;
  messagesByChannelId: Record<string, CollaborationMessage[]>;
  preferredChannelId: string | null;
  source: 'local-demo';
};

const ORG = 'local-org';

function channel(
  id: string,
  name: string,
  type: CollaborationChannelType,
  extras: Partial<CollaborationChannel> = {},
): CollaborationChannel {
  return {
    id,
    organizationId: ORG,
    type,
    name,
    description: extras.description ?? null,
    departmentKey: extras.departmentKey ?? null,
    patientId: extras.patientId ?? null,
    status: 'active',
    isSystemManaged: extras.isSystemManaged ?? true,
    incidentSeverity: extras.incidentSeverity ?? null,
    createdAt: extras.createdAt || new Date().toISOString(),
  };
}

function membership(channelId: string, userId: string): CollaborationMembership {
  return {
    channelId,
    userId,
    role: 'member',
    notificationPreference: 'all',
    lastReadMessageId: null,
    lastReadAt: new Date().toISOString(),
  };
}

function systemMessage(channelId: string, body: string, index: number): CollaborationMessage {
  return {
    id: `local-msg-${channelId}-${index}`,
    channelId,
    threadRootId: null,
    senderId: null,
    senderType: 'system',
    body,
    mentionedUserIds: null,
    pinnedAt: null,
    sourceType: 'local-seed',
    sourceId: null,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date(Date.now() - (10 - index) * 60_000).toISOString(),
  };
}

function normalizeRole(role: string | null | undefined): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

/** Department keys aligned with backend CollaborationDepartmentKey naming. */
export function departmentChannelsForRole(role: string | null | undefined): CollaborationChannel[] {
  const r = normalizeRole(role);
  const ed = channel('local-ch-ed', 'Emergency Department', 'department', {
    departmentKey: 'emergency_department',
    description: 'Hospital-wide ED coordination.',
  });
  const reception = channel('local-ch-reception', 'Reception', 'department', {
    departmentKey: 'reception',
    description: 'Front desk arrival, identity, and handoff chatter.',
  });
  const triage = channel('local-ch-triage', 'Triage', 'department', {
    departmentKey: 'triage',
    description: 'Triage nurse coordination.',
  });
  const charge = channel('local-ch-charge', 'Charge Nurses', 'department', {
    departmentKey: 'charge_nurses',
    description: 'Charge nurse operational channel.',
  });
  const physicians = channel('local-ch-physicians', 'Physicians', 'department', {
    departmentKey: 'physicians',
    description: 'Physician coordination.',
  });
  const ems = channel('local-ch-ems', 'EMS', 'department', {
    departmentKey: 'ems',
    description: 'EMS inbound and offload.',
  });
  const flow = channel('local-ch-flow', 'Patient Flow', 'department', {
    departmentKey: 'patient_flow',
    description: 'Bed and flow coordination.',
  });
  const lab = channel('local-ch-lab', 'Laboratory', 'department', {
    departmentKey: 'laboratory',
    description: 'Lab results and draws coordination.',
  });
  const radiology = channel('local-ch-radiology', 'Radiology', 'department', {
    departmentKey: 'radiology',
    description: 'Imaging and transport coordination.',
  });
  const pharmacy = channel('local-ch-pharmacy', 'Pharmacy', 'department', {
    departmentKey: 'pharmacy',
    description: 'Medication and reconciliation coordination.',
  });
  const ops = channel('local-ch-ops', 'Hospital Operations', 'department', {
    departmentKey: 'hospital_operations',
    description: 'Hospital operations coordination.',
  });
  const admin = channel('local-ch-admin', 'Administration', 'department', {
    departmentKey: 'administration',
    description: 'Administrative coordination.',
  });
  const it = channel('local-ch-it', 'IT Operations', 'department', {
    departmentKey: 'it_operations',
    description: 'Platform and IT operations (non-clinical).',
  });
  const quality = channel('local-ch-quality', 'Quality & Safety', 'department', {
    departmentKey: 'quality_safety',
    description: 'Quality and safety coordination.',
  });
  const incident = channel('local-ch-escalations', 'Incident response', 'incident', {
    description: 'Cross-role escalations and critical desk flags.',
    incidentSeverity: 'high',
    isSystemManaged: true,
  });
  const announce = channel('local-ch-announce', 'ED announcements', 'announcement', {
    description: 'Shift announcements and broadcast notices.',
  });

  // Reception / registration (ED emergency role id: registration_clerk)
  if (r === 'registration_clerk' || r.includes('reception') || r.includes('registrar')) {
    return [reception, ed, incident, announce];
  }
  // Nursing (ED emergency roles: triage_nurse, charge_nurse)
  if (r === 'triage_nurse' || (r.includes('triage') && r.includes('nurse'))) {
    return [triage, ed, reception, incident, announce];
  }
  if (r === 'registered_nurse' || r === 'rn') {
    return [ed, triage, charge, physicians, announce];
  }
  if (r === 'charge_nurse' || r.includes('charge')) {
    return [charge, ed, triage, flow, incident, announce];
  }
  // Physicians (ED emergency role id: physician; hospital: emergency_physician, etc.)
  if (
    r === 'physician' ||
    r.includes('physician') ||
    r.includes('doctor') ||
    r === 'specialist' ||
    r === 'resident_physician' ||
    r === 'attending_physician'
  ) {
    return [physicians, ed, charge, announce];
  }
  // Command (ED emergency role: ed_manager)
  if (r === 'ed_manager' || r === 'ed_director') {
    return [ops, ed, charge, admin, announce];
  }
  // Prehospital (ED emergency roles: ems_user, dispatcher, ems_coordinator)
  if (
    r === 'ems_user' ||
    r.includes('ems') ||
    r.includes('paramedic') ||
    r.includes('dispatcher')
  ) {
    return [ems, ed, reception, announce];
  }
  // Flow / leadership
  if (r.includes('flow') || r.includes('bed_manager')) {
    return [flow, ed, charge, announce];
  }
  if (
    r.includes('director') ||
    r.includes('ed_manager') ||
    r === 'hospital_admin' ||
    r === 'admin'
  ) {
    return [ops, ed, charge, admin, announce];
  }
  // Ancillary
  if (r.includes('lab')) return [lab, ed, announce];
  if (r.includes('radio') || r.includes('imaging')) return [radiology, ed, announce];
  if (r.includes('pharm')) return [pharmacy, ed, announce];
  if (r.includes('social')) return [ed, reception, flow, announce];
  if (r.includes('security')) return [ed, incident, announce];
  if (r === 'it_admin' || r.includes('it_admin')) return [it, ops, announce];
  if (r.includes('quality') || r.includes('safety')) return [quality, ed, announce];
  if (r.includes('demo') || r.includes('observer') || r.includes('read_only')) {
    return [ed, announce];
  }
  // Default: broad ED set so unknown profiles still see a usable hub
  return [ed, reception, triage, announce];
}

/**
 * Pick default channel for the active profile — Reception for registration clerk.
 */
export function pickDefaultCollaborationChannel(
  channels: CollaborationChannel[],
  role: string | null | undefined,
  preferredSlug?: string | null,
): string | null {
  if (!channels.length) return null;
  const active = channels.filter((c) => c.status === 'active');
  if (!active.length) return null;

  const slug = String(preferredSlug || '')
    .trim()
    .toLowerCase();
  if (slug) {
    const bySlug =
      active.find((c) => c.departmentKey === slug) ||
      active.find((c) => c.id === slug) ||
      active.find((c) => c.name.toLowerCase() === slug) ||
      active.find((c) => c.name.toLowerCase().includes(slug));
    if (bySlug) return bySlug.id;
  }

  const r = normalizeRole(role);
  const prefer = (...keys: string[]) => {
    for (const key of keys) {
      const hit =
        active.find((c) => c.departmentKey === key) ||
        active.find((c) => c.name.toLowerCase().includes(key.replace(/_/g, ' ')));
      if (hit) return hit.id;
    }
    return null;
  };

  if (r === 'registration_clerk' || r.includes('reception') || r.includes('registrar')) {
    return prefer('reception', 'emergency_department') || active[0].id;
  }
  if (r === 'triage_nurse' || (r.includes('triage') && !r.includes('charge'))) {
    return prefer('triage', 'emergency_department') || active[0].id;
  }
  if (r === 'charge_nurse' || r.includes('charge')) {
    return prefer('charge_nurses', 'emergency_department') || active[0].id;
  }
  if (r === 'physician' || r.includes('physician') || r === 'specialist') {
    return prefer('physicians', 'emergency_department') || active[0].id;
  }
  if (r === 'ed_manager' || r === 'ed_director') {
    return prefer('hospital_operations', 'emergency_department') || active[0].id;
  }
  if (
    r === 'ems_user' ||
    r.includes('ems') ||
    r.includes('paramedic') ||
    r.includes('dispatcher')
  ) {
    return prefer('ems', 'emergency_department') || active[0].id;
  }
  if (r.includes('lab')) return prefer('laboratory', 'emergency_department') || active[0].id;
  if (r.includes('radio') || r.includes('imaging')) {
    return prefer('radiology', 'emergency_department') || active[0].id;
  }
  if (r.includes('pharm')) return prefer('pharmacy', 'emergency_department') || active[0].id;
  if (r === 'it_admin' || r.includes('it_admin')) {
    return prefer('it_operations', 'hospital_operations') || active[0].id;
  }
  if (r.includes('quality') || r.includes('safety')) {
    return prefer('quality_safety', 'emergency_department') || active[0].id;
  }
  if (r.includes('flow')) return prefer('patient_flow', 'emergency_department') || active[0].id;

  return prefer('emergency_department') || active[0].id;
}

export function buildLocalCollaborationSeed(input: {
  role?: string | null;
  userId?: string | null;
  preferredChannelSlug?: string | null;
}): LocalCollaborationSeed {
  const userId = input.userId || 'local-user';
  const channels = departmentChannelsForRole(input.role);
  const entries = channels.map((ch) => ({
    channel: ch,
    membership: membership(ch.id, userId),
  }));

  const messagesByChannelId: Record<string, CollaborationMessage[]> = {};
  for (const ch of channels) {
    const welcome =
      ch.departmentKey === 'reception'
        ? [
            systemMessage(
              ch.id,
              'Reception desk channel — coordinate arrivals, identity checks, and handoffs to triage.',
              0,
            ),
            systemMessage(
              ch.id,
              'Tip: escalate critical patients to triage/charge, then post a short note here for the team.',
              1,
            ),
          ]
        : ch.type === 'incident'
          ? [
              systemMessage(
                ch.id,
                'Escalation channel — desk flags and critical intake notes surface here for nurse review.',
                0,
              ),
            ]
          : [
              systemMessage(
                ch.id,
                `${ch.name} is ready. Messages stay on this workstation until live collaboration is signed in.`,
                0,
              ),
            ];
    messagesByChannelId[ch.id] = welcome;
  }

  return {
    entries,
    messagesByChannelId,
    preferredChannelId: pickDefaultCollaborationChannel(
      channels,
      input.role,
      input.preferredChannelSlug,
    ),
    source: 'local-demo',
  };
}

/** Normalize listChannels API payloads into store entries. */
export function normalizeChannelListPayload(
  data: unknown,
): Array<{ channel: CollaborationChannel; membership?: CollaborationMembership }> {
  if (!data) return [];
  const raw = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : Array.isArray((data as any)?.channels)
        ? (data as any).channels
        : Array.isArray((data as any)?.items)
          ? (data as any).items
          : [];

  return raw
    .map((entry: any) => {
      if (!entry) return null;
      if (entry.channel && entry.channel.id) {
        return { channel: entry.channel as CollaborationChannel, membership: entry.membership };
      }
      if (entry.id && entry.name) {
        return { channel: entry as CollaborationChannel, membership: entry.membership };
      }
      return null;
    })
    .filter(Boolean) as Array<{
    channel: CollaborationChannel;
    membership?: CollaborationMembership;
  }>;
}

export function normalizeMessageListPayload(data: unknown): CollaborationMessage[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as CollaborationMessage[];
  if (Array.isArray((data as any).data)) return (data as any).data;
  if (Array.isArray((data as any).messages)) return (data as any).messages;
  if (Array.isArray((data as any).items)) return (data as any).items;
  return [];
}

export function createLocalUserMessage(input: {
  channelId: string;
  body: string;
  senderId?: string | null;
  threadRootId?: string | null;
}): CollaborationMessage {
  return {
    id: `local-msg-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    channelId: input.channelId,
    threadRootId: input.threadRootId || null,
    senderId: input.senderId || 'local-user',
    senderType: 'user',
    body: input.body,
    mentionedUserIds: null,
    pinnedAt: null,
    sourceType: 'local-post',
    sourceId: null,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function createLocalPatientThreadChannel(input: {
  patientId: string;
  patientLabel?: string;
  userId?: string | null;
}): {
  channel: CollaborationChannel;
  membership: CollaborationMembership;
  messages: CollaborationMessage[];
} {
  const id = `local-ch-patient-${input.patientId}`;
  const ch = channel(id, input.patientLabel || `Patient ${input.patientId}`, 'patient_thread', {
    patientId: input.patientId,
    description: 'Local patient discussion thread (desk demo).',
    isSystemManaged: false,
  });
  const userId = input.userId || 'local-user';
  return {
    channel: ch,
    membership: membership(id, userId),
    messages: [systemMessage(id, 'Patient thread opened from reception desk.', 0)],
  };
}

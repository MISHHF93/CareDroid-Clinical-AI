import { describe, expect, it } from 'vitest';
import {
  buildLocalCollaborationSeed,
  normalizeChannelListPayload,
  normalizeMessageListPayload,
  pickDefaultCollaborationChannel,
} from './collaborationLocalCatalog';

describe('collaborationLocalCatalog', () => {
  it('seeds Reception + ED for registration clerk', () => {
    const seed = buildLocalCollaborationSeed({ role: 'registration_clerk', userId: 'u1' });
    const names = seed.entries.map((e) => e.channel.name);
    expect(names).toContain('Reception');
    expect(names).toContain('Emergency Department');
    expect(seed.preferredChannelId).toBeTruthy();
    const preferred = seed.entries.find((e) => e.channel.id === seed.preferredChannelId);
    expect(preferred?.channel.departmentKey).toBe('reception');
    expect(seed.messagesByChannelId[seed.preferredChannelId!]?.length).toBeGreaterThan(0);
  });

  it('picks Reception by default for registrar aliases', () => {
    const seed = buildLocalCollaborationSeed({ role: 'registration-clerk' });
    const channels = seed.entries.map((e) => e.channel);
    expect(pickDefaultCollaborationChannel(channels, 'registrar')).toBe(
      pickDefaultCollaborationChannel(channels, 'registration_clerk'),
    );
  });

  it('honors preferred channel slug from query', () => {
    const seed = buildLocalCollaborationSeed({
      role: 'registration_clerk',
      preferredChannelSlug: 'triage',
    });
    // triage not in clerk set — falls back to reception
    const preferred = seed.entries.find((e) => e.channel.id === seed.preferredChannelId);
    expect(preferred?.channel.departmentKey).toBe('reception');

    const withTriage = buildLocalCollaborationSeed({
      role: 'triage_nurse',
      preferredChannelSlug: 'triage',
    });
    const t = withTriage.entries.find((e) => e.channel.id === withTriage.preferredChannelId);
    expect(t?.channel.departmentKey).toBe('triage');
  });

  it('normalizes channel list envelopes', () => {
    const bare = normalizeChannelListPayload([
      {
        id: 'c1',
        name: 'ED',
        type: 'department',
        organizationId: 'o',
        status: 'active',
        isSystemManaged: true,
        createdAt: '',
      },
    ]);
    expect(bare).toHaveLength(1);
    expect(bare[0].channel.id).toBe('c1');

    const wrapped = normalizeChannelListPayload({
      data: [
        {
          channel: {
            id: 'c2',
            name: 'Reception',
            type: 'department',
            organizationId: 'o',
            status: 'active',
            isSystemManaged: true,
            createdAt: '',
          },
        },
      ],
    });
    expect(wrapped[0].channel.id).toBe('c2');
  });

  it('normalizes message list envelopes', () => {
    expect(normalizeMessageListPayload([{ id: 'm1' }])).toHaveLength(1);
    expect(normalizeMessageListPayload({ messages: [{ id: 'm2' }] })).toHaveLength(1);
    expect(normalizeMessageListPayload(null)).toEqual([]);
  });

  it('seeds preferred departments across major hospital profiles', async () => {
    const { departmentChannelsForRole, pickDefaultCollaborationChannel } =
      await import('./collaborationLocalCatalog');
    const cases: Array<{ role: string; preferredKey: string }> = [
      { role: 'registration_clerk', preferredKey: 'reception' },
      { role: 'triage_nurse', preferredKey: 'triage' },
      { role: 'charge_nurse', preferredKey: 'charge_nurses' },
      { role: 'emergency_physician', preferredKey: 'physicians' },
      { role: 'paramedic', preferredKey: 'ems' },
      { role: 'it_admin', preferredKey: 'it_operations' },
      { role: 'pharmacist', preferredKey: 'pharmacy' },
      { role: 'lab_technician', preferredKey: 'laboratory' },
    ];
    for (const { role, preferredKey } of cases) {
      const channels = departmentChannelsForRole(role);
      expect(channels.length, role).toBeGreaterThan(0);
      const id = pickDefaultCollaborationChannel(channels, role);
      const preferred = channels.find((c) => c.id === id);
      expect(preferred?.departmentKey, role).toBe(preferredKey);
    }
  });
});

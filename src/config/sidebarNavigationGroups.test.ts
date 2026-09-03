import { describe, expect, it } from 'vitest';
import { groupSidebarNavItems, resolveSidebarGroupForNavItem } from './sidebarNavigationGroups';

describe('sidebarNavigationGroups', () => {
  it('maps core nav ids to operational groups', () => {
    expect(resolveSidebarGroupForNavItem('whiteboard')).toBe('Command');
    expect(resolveSidebarGroupForNavItem('patients')).toBe('Patients');
    expect(resolveSidebarGroupForNavItem('copilot')).toBe('Intelligence');
    expect(resolveSidebarGroupForNavItem('analytics')).toBe('Analytics');
  });

  it('groups items in stable section order', () => {
    const grouped = groupSidebarNavItems([
      { id: 'analytics' },
      { id: 'whiteboard' },
      { id: 'patients' },
      { id: 'copilot' },
    ]);
    expect(grouped.map((entry) => entry.group)).toEqual([
      'Command',
      'Patients',
      'Intelligence',
      'Analytics',
    ]);
  });
});

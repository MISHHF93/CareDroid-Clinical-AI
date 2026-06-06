import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'src/components/LiveCostDashboard.jsx'), 'utf8');

describe('LiveCostDashboard automation wiring', () => {
  it('does not activate the duplicate queue-style notification service', () => {
    expect(SOURCE).not.toContain("services/notifications/NotificationService");
    expect(SOURCE).not.toContain('getNotificationService');
  });
});

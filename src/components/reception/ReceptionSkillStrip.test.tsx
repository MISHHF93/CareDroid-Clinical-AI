import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceptionSkillStrip, { RECEPTION_SKILL_CTA_LABELS } from './ReceptionSkillStrip';

describe('ReceptionSkillStrip', () => {
  it('exposes a label for every executable primaryCta', () => {
    const ctas = Object.keys(RECEPTION_SKILL_CTA_LABELS);
    expect(ctas).toEqual(
      expect.arrayContaining([
        'lookup',
        'route',
        'crash',
        'resolve_duplicate',
        'ems',
        'resume_draft',
        'clear_shift',
      ]),
    );
    expect(RECEPTION_SKILL_CTA_LABELS.clear_shift).toMatch(/shift clearance/i);
  });

  it('fires onPrimary with the action cta when the button is clicked', async () => {
    const user = userEvent.setup();
    const onPrimary = vi.fn();
    render(
      <ReceptionSkillStrip
        action={{
          skillId: 'rapid_walk_in',
          title: 'Ready to create',
          detail: 'Send to nurse',
          tone: 'info',
          primaryCta: 'route',
        }}
        onPrimary={onPrimary}
      />,
    );
    await user.click(screen.getByTestId('reception-skill-strip-cta'));
    expect(onPrimary).toHaveBeenCalledWith('route');
    expect(screen.getByTestId('reception-skill-strip-cta')).toHaveTextContent('Create & route');
  });

  it('renders no button when there is no primaryCta (non-actionable notice only)', () => {
    render(
      <ReceptionSkillStrip
        action={{
          skillId: 'idle',
          title: 'No create rights',
          detail: 'Escalate to a clerk',
          tone: 'neutral',
        }}
      />,
    );
    expect(screen.queryByTestId('reception-skill-strip-cta')).not.toBeInTheDocument();
  });
});

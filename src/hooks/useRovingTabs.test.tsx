import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import useRovingTabs from './useRovingTabs';

const VIEWS = ['flow', 'capacity', 'staffing'] as const;
type View = (typeof VIEWS)[number];

function Tabs({ horizontal = true }: { horizontal?: boolean }) {
  const [active, setActive] = useState<View>('flow');
  const { tabListRef, onKeyDown, tabIndexFor } = useRovingTabs<View>({
    ids: VIEWS,
    activeId: active,
    onSelect: setActive,
    horizontal,
  });

  return (
    <div role="tablist" aria-label="Views" ref={tabListRef}>
      {VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          role="tab"
          aria-selected={view === active}
          tabIndex={tabIndexFor(view)}
          onKeyDown={onKeyDown}
        >
          {view}
        </button>
      ))}
    </div>
  );
}

const tab = (name: View) => screen.getByRole('tab', { name });

describe('useRovingTabs', () => {
  it('keeps only the selected tab in the tab order', () => {
    render(<Tabs />);
    expect(tab('flow')).toHaveAttribute('tabindex', '0');
    expect(tab('capacity')).toHaveAttribute('tabindex', '-1');
    expect(tab('staffing')).toHaveAttribute('tabindex', '-1');
  });

  it('moves selection and focus with ArrowRight', async () => {
    const user = userEvent.setup();
    render(<Tabs />);
    tab('flow').focus();

    await user.keyboard('{ArrowRight}');

    expect(tab('capacity')).toHaveAttribute('aria-selected', 'true');
    expect(tab('capacity')).toHaveFocus();
    // Focus must travel with selection, or it is stranded on a tab that just
    // stopped being tabbable.
    expect(tab('capacity')).toHaveAttribute('tabindex', '0');
    expect(tab('flow')).toHaveAttribute('tabindex', '-1');
  });

  it('wraps from the last tab back to the first', async () => {
    const user = userEvent.setup();
    render(<Tabs />);
    tab('flow').focus();

    await user.keyboard('{ArrowLeft}');

    expect(tab('staffing')).toHaveAttribute('aria-selected', 'true');
    expect(tab('staffing')).toHaveFocus();
  });

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup();
    render(<Tabs />);
    tab('flow').focus();

    await user.keyboard('{End}');
    expect(tab('staffing')).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(tab('flow')).toHaveAttribute('aria-selected', 'true');
  });

  it('uses Up and Down for a vertical strip', async () => {
    const user = userEvent.setup();
    render(<Tabs horizontal={false} />);
    tab('flow').focus();

    await user.keyboard('{ArrowDown}');
    expect(tab('capacity')).toHaveAttribute('aria-selected', 'true');

    // The cross-axis key must not hijack a vertical list.
    await user.keyboard('{ArrowRight}');
    expect(tab('capacity')).toHaveAttribute('aria-selected', 'true');
  });

  it('leaves unrelated keys alone', async () => {
    const user = userEvent.setup();
    render(<Tabs />);
    tab('flow').focus();

    await user.keyboard('a');

    expect(tab('flow')).toHaveAttribute('aria-selected', 'true');
  });
});

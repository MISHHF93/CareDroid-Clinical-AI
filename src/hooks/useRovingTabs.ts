import {
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react';

/**
 * Keyboard behaviour for a WAI-ARIA tab list.
 *
 * CareDroid has seven hand-rolled tab lists. Every one of them sets role="tablist",
 * role="tab" and an accurate aria-selected, and not one implements the keyboard
 * half of the pattern, which is where the actual usability lives:
 *
 *  - Arrow keys move between tabs. Without them a keyboard user has to Tab through
 *    every tab to reach the last one.
 *  - Only the selected tab is tabbable (roving tabindex). Leaving all of them at
 *    tabindex 0 means Tab walks through the whole strip instead of treating it as
 *    one stop and moving on to the panel.
 *  - Home/End jump to the ends.
 *
 * Deliberately does not own markup or selection state -- callers keep their own
 * `activeId` and `onSelect`, so this drops into an existing tab list without
 * restructuring it.
 */

type UseRovingTabsOptions<Id extends string> = {
  /** Tab ids in rendered order. */
  ids: readonly Id[];
  activeId: Id;
  onSelect: (id: Id) => void;
  /** Set false for a vertical strip, where Up/Down should move instead. */
  horizontal?: boolean;
};

type UseRovingTabsResult<Id extends string> = {
  /** Goes on the tablist element; used to move focus between tabs. */
  tabListRef: RefObject<HTMLDivElement | null>;
  /**
   * Goes on each TAB, not on the tablist. Putting it on the container would make
   * the container itself an interactive element that needs to be focusable, which
   * the tabs pattern does not want -- the tabs hold focus, the list does not.
   */
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  /** Spread onto each tab: only the active one stays reachable by Tab. */
  tabIndexFor: (id: Id) => 0 | -1;
};

export default function useRovingTabs<Id extends string>({
  ids,
  activeId,
  onSelect,
  horizontal = true,
}: UseRovingTabsOptions<Id>): UseRovingTabsResult<Id> {
  const tabListRef = useRef<HTMLDivElement>(null);

  const focusTabAt = useCallback((index: number) => {
    const tabs = tabListRef.current?.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs?.[index]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!ids.length) return;

      const next = horizontal ? 'ArrowRight' : 'ArrowDown';
      const previous = horizontal ? 'ArrowLeft' : 'ArrowUp';

      let index: number | null = null;
      const current = ids.indexOf(activeId);
      const from = current === -1 ? 0 : current;

      if (event.key === next) index = (from + 1) % ids.length;
      else if (event.key === previous) index = (from - 1 + ids.length) % ids.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = ids.length - 1;

      if (index === null) return;

      event.preventDefault();
      onSelect(ids[index]);
      // Move focus with the selection: the roving tabindex means the previously
      // active tab is about to stop being tabbable, and focus left on it would be
      // stranded on an element the user can no longer Tab back to.
      focusTabAt(index);
    },
    [activeId, focusTabAt, horizontal, ids, onSelect],
  );

  const tabIndexFor = useCallback((id: Id): 0 | -1 => (id === activeId ? 0 : -1), [activeId]);

  return { tabListRef, onKeyDown, tabIndexFor };
}

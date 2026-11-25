import { createContext, useContext, type RefObject } from 'react';
import { toIdPart } from '../../utils/toIdPart';
import type { ActivationMode, Orientation } from '../../utils/types';

/** State `Tabs` shares with `TabList`, `Tab` and `TabPanel`. Internal. */
export interface TabsContextValue {
  /** `useId()` prefix for tab and panel ids. */
  baseId: string;
  /** Value of the selected tab ('' until the default selection resolves). */
  selected: string;
  /** Value of the tab that holds `tabindex=0`, or null before the first sync. */
  tabStop: string | null;
  /** Selects a tab by value. */
  select: (value: string) => void;
  /** Manual mode: records the focused tab while focus is in the list (null when it leaves). */
  setFocusedValue: (value: string | null) => void;
  /** Re-reads the enabled tabs from the DOM, optionally ignoring one that is unmounting. */
  sync: (exclude?: HTMLElement | null) => void;
  /**
   * Set when the focused tab is disabled or removed. TabList then focuses the new tab stop
   * once it has rendered.
   */
  focusLostRef: RefObject<boolean>;
  activation: ActivationMode;
  orientation: Orientation;
  /** The tablist element, used to query tabs in DOM order. */
  listRef: RefObject<HTMLDivElement | null>;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

/** Reads the enclosing `Tabs`. Throws when a part is rendered outside it. */
export function useTabsContext(part: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`Greenility: <${part}> must be rendered inside <Tabs>.`);
  }
  return context;
}

export function getTabId(baseId: string, value: string): string {
  return `${baseId}-tab-${toIdPart(value)}`;
}

export function getPanelId(baseId: string, value: string): string {
  return `${baseId}-panel-${toIdPart(value)}`;
}

/** Tabs that belong to this tablist (not to a nested one), in DOM order. */
export function getTabs(list: HTMLElement): HTMLButtonElement[] {
  return Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(
    (tab) => tab.closest('[role="tablist"]') === list,
  );
}

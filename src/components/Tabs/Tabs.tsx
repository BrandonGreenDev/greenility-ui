import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useIsOverflowing } from '../../hooks/useIsOverflowing';
import { composeRefs } from '../../utils/composeRefs';
import { cx } from '../../utils/cx';
import { getDirection } from '../../utils/direction';
import { getNextIndex, keyToAction } from '../../utils/listNavigation';
import type { ActivationMode, Orientation } from '../../utils/types';
import styles from './Tabs.module.css';
import {
  TabsContext,
  getPanelId,
  getTabId,
  getTabs,
  useTabsContext,
  type TabsContextValue,
} from './TabsContext';

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'dir'> {
  /** Controlled selected tab value. */
  value?: string;
  /** Initially selected tab when uncontrolled. Default: the first enabled tab. */
  defaultValue?: string;
  /** Called with the newly selected value. Not called for the default selection. */
  onValueChange?: (value: string) => void;
  /**
   * `'automatic'`: arrow keys move focus and select. `'manual'`: arrow keys only move focus;
   * Enter or Space selects.
   * @default 'automatic'
   */
  activation?: ActivationMode;
  /** Arrow-key axis and layout. Vertical puts the list beside the panels. @default 'horizontal' */
  orientation?: Orientation;
  /** A `TabList` and its `TabPanel`s. */
  children: ReactNode;
}

/**
 * Switches between related panels of content in one view (APG Tabs pattern).
 * Compose with `TabList`, `Tab` and `TabPanel`. The ref and `...rest` go to the root `<div>`.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value,
    defaultValue,
    onValueChange,
    activation = 'automatic',
    orientation = 'horizontal',
    className,
    children,
    ...rest
  },
  ref,
) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const focusLostRef = useRef(false);
  const [state, setState] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? '',
    onChange: onValueChange,
  });
  // Manual mode: the tab focused inside the list, so Tab leaves from it (APG).
  const [focusedValue, setFocusedValue] = useState<string | null>(null);

  // Values of the enabled tabs in DOM order; null until the TabList has mounted. The DOM is
  // the registry: TabList (after every render) and each Tab (on mount, unmount and
  // value/disabled change) call `sync` from layout effects. An equality guard keeps it cheap.
  const [enabled, setEnabled] = useState<readonly string[] | null>(null);
  const sync = useCallback((exclude?: HTMLElement | null) => {
    const list = listRef.current;
    // Mid-commit the list ref can be detached; TabList re-syncs once it is attached.
    if (!list) return;
    const values = getTabs(list)
      .filter((tab) => tab !== exclude && !tab.disabled)
      .map((tab) => tab.dataset.value ?? '');
    setEnabled((previous) =>
      previous?.length === values.length && previous.every((v, i) => v === values[i])
        ? previous
        : values,
    );
  }, []);

  const firstEnabled = enabled?.[0] ?? null;
  // Uncontrolled with no default selects the first enabled tab.
  const selected = value === undefined && state === '' ? (firstEnabled ?? '') : state;
  // Roving tabindex: in manual mode the focused tab while focus is in the list; otherwise the
  // selected tab, or the first enabled one if it is missing or disabled.
  const tabStop =
    enabled === null
      ? null
      : activation === 'manual' && focusedValue !== null && enabled.includes(focusedValue)
        ? focusedValue
        : enabled.includes(selected)
          ? selected
          : firstEnabled;

  const context = useMemo<TabsContextValue>(
    () => ({
      baseId,
      selected,
      tabStop,
      select: setState,
      setFocusedValue,
      sync,
      focusLostRef,
      activation,
      orientation,
      listRef,
    }),
    [baseId, selected, tabStop, setState, sync, activation, orientation],
  );

  return (
    <TabsContext.Provider value={context}>
      <div
        ref={ref}
        className={cx(styles.root, className)}
        data-orientation={orientation}
        {...rest}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
});
Tabs.displayName = 'Tabs';

export interface TabListProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'role' | 'aria-orientation'
> {
  /**
   * `Tab` elements, as direct children. Give the list an `aria-label` or `aria-labelledby`
   * when no nearby heading names it.
   */
  children: ReactNode;
}

/** Scrolls the list (never the page) so the tab is fully visible on the inline axis. */
function revealInList(list: HTMLElement, tab: HTMLElement) {
  const listRect = list.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  if (tabRect.left < listRect.left) list.scrollLeft -= listRect.left - tabRect.left;
  else if (tabRect.right > listRect.right) list.scrollLeft += tabRect.right - listRect.right;
}

/**
 * The `role="tablist"` container. Handles arrow-key, Home and End navigation, and scrolls
 * when the tabs overflow. The ref and `...rest` go to the tablist `<div>`.
 */
export const TabList = forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { className, onKeyDown, onFocus, onBlur, children, ...rest },
  ref,
) {
  const {
    orientation,
    activation,
    selected,
    tabStop,
    select,
    setFocusedValue,
    sync,
    focusLostRef,
    listRef,
  } = useTabsContext('TabList');
  const listRefs = useMemo(() => composeRefs(ref, listRef), [ref, listRef]);
  const overflowing = useIsOverflowing(listRef, 'inline');

  // Every render, after the list's own ref is attached (Tab effects run before it on the
  // first mount). Picks up reordering; `sync` bails out when nothing changed.
  useLayoutEffect(() => {
    sync();
  });

  // The focused tab was disabled or removed: focus the new tab stop once it has rendered.
  useLayoutEffect(() => {
    if (!focusLostRef.current) return;
    const list = listRef.current;
    if (!list) return;
    const tabs = getTabs(list).filter((tab) => !tab.disabled);
    if (tabs.length === 0) {
      focusLostRef.current = false;
      return;
    }
    const target = tabs.find((tab) => tab.dataset.value === tabStop);
    if (target) {
      focusLostRef.current = false;
      target.focus();
    }
  });

  // Keep the selected tab visible in an overflowing list without moving focus.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !overflowing || orientation !== 'horizontal') return;
    const tab = getTabs(list).find((t) => t.dataset.value === selected);
    if (tab) revealInList(list, tab);
  }, [listRef, selected, overflowing, orientation]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const list = event.currentTarget;
    const tabs = getTabs(list);
    const from = tabs.findIndex((tab) => tab === event.target);
    if (from === -1) return;
    const action = keyToAction(event.key, orientation, getDirection(list) === 'rtl');
    if (!action) return;
    event.preventDefault();
    const next =
      tabs[getNextIndex(tabs.length, from, action, (i) => tabs[i]?.disabled ?? true, true)];
    if (!next) return;
    next.focus();
    const nextValue = next.dataset.value;
    if (activation === 'automatic' && nextValue !== undefined && nextValue !== selected) {
      select(nextValue);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    // React types FocusEvent.target as the list itself; it is any focused descendant.
    const target: EventTarget = event.target;
    const tab = getTabs(event.currentTarget).find((t) => t === target);
    if (tab) {
      focusLostRef.current = false;
      setFocusedValue(tab.dataset.value ?? null);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) setFocusedValue(null);
  };

  return (
    // The tablist is a composite widget: focus lives on its tabs (roving tabindex), so the
    // container itself is not focusable, per the APG Tabs pattern.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      {...rest}
      ref={listRefs}
      role="tablist"
      aria-orientation={orientation}
      className={cx(styles.list, className)}
      data-overflowing={overflowing || undefined}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </div>
  );
});
TabList.displayName = 'TabList';

export interface TabProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'value' | 'id' | 'aria-selected' | 'aria-controls' | 'tabIndex'
> {
  /** Value linking the tab to its `TabPanel`. Any string except `''`; ids are escaped. */
  value: string;
  /** Visible label and accessible name. */
  children: ReactNode;
  /** Native disabled: skipped by arrow keys and Tab, and not clickable. @default false */
  disabled?: boolean;
}

/**
 * A `<button role="tab">`. The ref goes to the button. `id`, `aria-selected`,
 * `aria-controls` and `tabIndex` are managed by `Tabs`.
 */
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value, disabled = false, className, onClick, children, ...rest },
  ref,
) {
  const { baseId, selected, tabStop, select, sync, focusLostRef } = useTabsContext('Tab');
  const innerRef = useRef<HTMLButtonElement | null>(null);
  const refs = useMemo(() => composeRefs(ref, innerRef), [ref]);
  const isSelected = selected === value;
  const isTabStop = tabStop === null ? isSelected : tabStop === value;

  // Keep the parent's list of enabled tabs current. Cleanup runs before the node leaves the
  // DOM (and after `disabled` is applied), so it is excluded explicitly, and a tab that
  // loses focus this way hands it to the next tab stop.
  useLayoutEffect(() => {
    sync();
    const node = innerRef.current;
    return () => {
      if (node?.ownerDocument.activeElement === node) focusLostRef.current = true;
      sync(node);
    };
  }, [sync, focusLostRef, value, disabled]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && !isSelected) select(value);
  };

  return (
    <button
      {...rest}
      ref={refs}
      type="button"
      role="tab"
      id={getTabId(baseId, value)}
      aria-selected={isSelected}
      aria-controls={getPanelId(baseId, value)}
      tabIndex={isTabStop ? 0 : -1}
      disabled={disabled}
      data-value={value}
      className={cx(styles.tab, className)}
      onClick={handleClick}
    >
      {children}
    </button>
  );
});
Tab.displayName = 'Tab';

export interface TabPanelProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'role' | 'id' | 'aria-labelledby'
> {
  /** Value of the `Tab` that labels this panel. */
  value: string;
  /** Panel content. Stays mounted (and keeps its state) while the panel is hidden. */
  children: ReactNode;
}

/**
 * A `role="tabpanel"` region named by its tab. Inactive panels stay mounted with `hidden`.
 * It is focusable (`tabIndex=0`) unless you pass `tabIndex={-1}`, for example when the panel
 * starts with a focusable element. The ref and `...rest` go to the panel `<div>`.
 */
export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, className, children, ...rest },
  ref,
) {
  const { baseId, selected } = useTabsContext('TabPanel');
  const isSelected = selected === value;

  return (
    <div
      // APG: a panel gets tabindex=0 so keyboard users can reach content with no focusable
      // element. jsx-a11y strict does not exempt role=tabpanel.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      {...rest}
      ref={ref}
      role="tabpanel"
      id={getPanelId(baseId, value)}
      aria-labelledby={getTabId(baseId, value)}
      hidden={!isSelected}
      className={cx(styles.panel, className)}
    >
      {children}
    </div>
  );
});
TabPanel.displayName = 'TabPanel';

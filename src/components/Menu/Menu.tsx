import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
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
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useDismiss } from '../../hooks/useDismiss';
import { useFloating } from '../../hooks/useFloating';
import { useTypeahead } from '../../hooks/useTypeahead';
import { composeRefs } from '../../utils/composeRefs';
import { cx } from '../../utils/cx';
import { getNextIndex, keyToAction } from '../../utils/listNavigation';
import { cloneTrigger } from '../../utils/mergeProps';
import { hidePopover, showPopover } from '../../utils/popover';
import type { Align, Placement } from '../../utils/types';
import floatingStyles from '../Floating/floating.module.css';
import styles from './Menu.module.css';

interface MenuContextValue {
  /** Closes the menu, returns focus to the trigger, then runs `onSelect`. */
  select: (onSelect: (() => void) | undefined) => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(component: string): MenuContextValue {
  const context = useContext(MenuContext);
  if (!context) throw new Error(`${component} must be rendered inside a Menu.`);
  return context;
}

const ITEM_SELECTOR = '[role="menuitem"]';

function getItems(menu: HTMLElement): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

function getItemLabel(item: HTMLElement): string {
  return item.dataset.textValue ?? item.textContent;
}

/**
 * Focuses an item without scrolling the page, then scrolls only the panel so the item is
 * fully visible (the panel scrolls when it hits its max-block-size).
 */
function focusItem(menu: HTMLElement, item: HTMLElement | undefined): void {
  if (!item) return;
  item.focus({ preventScroll: true });
  if (menu.scrollHeight <= menu.clientHeight) return;
  const panel = menu.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  const top = panel.top + menu.clientTop;
  const bottom = top + menu.clientHeight;
  if (rect.top < top) menu.scrollTop -= top - rect.top;
  else if (rect.bottom > bottom) menu.scrollTop += rect.bottom - bottom;
}

export interface MenuProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'role' | 'popover' | 'hidden'
> {
  /**
   * The menu button, e.g. `<Button endIcon={<ChevronDownIcon />}>Actions</Button>` or an
   * IconButton. It is cloned with `aria-haspopup`, `aria-expanded`, `aria-controls`, an `id`
   * (unless it has one) and click/keydown/blur handlers; its own handlers run first and its
   * ref is kept.
   */
  trigger: ReactElement<{ id?: string }>;
  /** MenuItem, MenuGroup and MenuSeparator elements. */
  children: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Called with the requested open state. */
  onOpenChange?: (open: boolean) => void;
  /** Preferred side; flips when there is no room. `start`/`end` follow the text direction. @default 'bottom' */
  placement?: Placement;
  /** Cross-axis alignment with the trigger. `start` lines up with its inline-start edge. @default 'start' */
  align?: Align;
}

/**
 * A menu button (APG Menu Button pattern): the `trigger` opens a list of actions.
 *
 * The menu is the trigger's next DOM sibling, mounted only while open and shown in the top
 * layer with `popover="manual"`. Focus moves to the first item on open (the last with
 * ArrowUp), Arrow keys wrap, Home/End and typeahead work, and the panel scrolls to keep the
 * focused item visible.
 *
 * Closing: Escape, activating an item, clicking the trigger again or a controlled close
 * return focus to the trigger. Tab, an outside press, or focus moving to another element
 * (from the menu or from the trigger) close it without moving focus.
 *
 * The ref and any other props go to the `role="menu"` `<div>` (null while closed).
 */
export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  {
    trigger,
    children,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    placement = 'bottom',
    align = 'start',
    id: idProp,
    className,
    onKeyDown,
    onBlur,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const autoId = useId();
  const menuId = idProp ?? `${autoId}-menu`;
  const triggerId = trigger.props.id ?? `${autoId}-trigger`;

  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const composedMenuRef = useMemo(() => composeRefs(ref, menuRef), [ref]);

  /** Committed open state, read by handlers that outlive a render (dismiss, select). */
  const openRef = useRef(open);
  /** Which item receives focus when the menu opens. */
  const initialFocus = useRef<'first' | 'last'>('first');
  /** Tab was pressed inside the menu: the next blur closes, even onto the trigger. */
  const tabbing = useRef(false);
  /** The close left focus where the user put it (outside press, Tab): do not refocus. */
  const keepFocus = useRef(false);
  const typeahead = useTypeahead();

  useLayoutEffect(() => {
    openRef.current = open;
  });

  const close = useCallback(
    (restoreFocus: boolean) => {
      if (!openRef.current) return;
      // Focus moves first, so the menu's blur sees the trigger as relatedTarget (inside).
      keepFocus.current = !restoreFocus;
      if (restoreFocus) triggerRef.current?.focus();
      setOpen(false);
    },
    [setOpen],
  );

  // 1. Show in the top layer, 2. position (useFloating), 3. move focus in. Order matters.
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!open || !element) return;
    showPopover(element);
    return () => {
      hidePopover(element);
    };
  }, [open]);

  const { placement: finalPlacement } = useFloating({
    open,
    anchorRef: triggerRef,
    floatingRef: menuRef,
    placement,
    align,
  });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const triggerElement = triggerRef.current;
    if (!open || !menu) return;
    tabbing.current = false;
    keepFocus.current = false;
    const items = getItems(menu);
    const target = initialFocus.current === 'last' ? items.at(-1) : items[0];
    initialFocus.current = 'first';
    if (target) focusItem(menu, target);
    else menu.focus({ preventScroll: true });

    return () => {
      // The menu is gone. If it took focus with it (a controlled close, Safari's trigger
      // click), give focus back to the trigger, unless the user moved it on purpose.
      const skip = keepFocus.current;
      keepFocus.current = false;
      const doc = menu.ownerDocument;
      const active = doc.activeElement;
      const lost = active === null || active === doc.body || menu.contains(active);
      if (!skip && lost) triggerElement?.focus({ preventScroll: true });
    };
  }, [open]);

  useDismiss({
    enabled: open,
    refs: [triggerRef, menuRef],
    onDismiss: (reason) => {
      close(reason === 'escape');
    },
  });

  const context = useMemo<MenuContextValue>(
    () => ({
      select: (onSelect) => {
        // Focus is back on the trigger and the close is requested before `onSelect` runs, so
        // a Dialog opened from it captures the trigger as its return target. Running inside
        // the click keeps the user activation (e.g. for clipboard or window.open).
        close(true);
        onSelect?.();
      },
    }),
    [close],
  );

  const isInside = (node: unknown): boolean =>
    node instanceof Node &&
    (menuRef.current?.contains(node) === true || triggerRef.current?.contains(node) === true);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const menu = event.currentTarget;
    tabbing.current = event.key === 'Tab';
    if (event.key === 'Tab') return; // Focus moves natively; the blur closes the menu.

    const items = getItems(menu);
    const active = menu.ownerDocument.activeElement;
    const current = items.findIndex((item) => item === active);
    const action = keyToAction(event.key, 'vertical', false);
    const notDisabled = () => false; // Disabled items stay focusable (APG menu guidance).
    if (action) {
      event.preventDefault();
      focusItem(menu, items[getNextIndex(items.length, current, action, notDisabled, true)]);
      return;
    }
    const match = typeahead(event, items.map(getItemLabel), current, notDisabled);
    if (match !== -1) focusItem(menu, items[match]);
  };

  const handleMenuBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    if (tabbing.current) {
      close(false);
      return;
    }
    // No relatedTarget: a press on nothing focusable (useDismiss handles outside presses),
    // the window losing focus, or Safari's mousedown on the trigger. Keep the menu.
    if (event.relatedTarget === null) return;
    if (!isInside(event.relatedTarget)) close(false);
  };

  const openMenu = (focus: 'first' | 'last') => {
    initialFocus.current = focus;
    if (!open) {
      setOpen(true);
      return;
    }
    // Already open (controlled, focus on the trigger): just move into the menu.
    const menu = menuRef.current;
    if (!menu) return;
    const items = getItems(menu);
    focusItem(menu, focus === 'last' ? items.at(-1) : items[0]);
  };

  const triggerProps = {
    id: triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (!open) {
        openMenu('first');
        return;
      }
      // Safari does not focus a clicked button, so focus may be on <body> (or still in the
      // menu): bring it back to the trigger.
      const doc = event.currentTarget.ownerDocument;
      const active = doc.activeElement;
      const lost =
        active === null || active === doc.body || menuRef.current?.contains(active) === true;
      close(lost);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(event.key === 'ArrowUp' ? 'last' : 'first');
      }
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      // A controlled open menu with focus on the trigger: Tab away closes it.
      if (open && event.relatedTarget !== null && !isInside(event.relatedTarget)) {
        close(false);
      }
    },
  };
  // The handlers read refs only when events fire, and cloneTrigger only attaches the ref.
  // eslint-disable-next-line react-hooks/refs -- nothing reads `.current` during render
  const triggerElement = cloneTrigger(trigger, triggerProps, triggerRef);

  return (
    <>
      {triggerElement}
      {open && (
        <MenuContext.Provider value={context}>
          <div
            {...rest}
            ref={composedMenuRef}
            id={menuId}
            role="menu"
            aria-labelledby={rest['aria-labelledby'] ?? triggerId}
            tabIndex={-1}
            popover="manual"
            data-placement={finalPlacement}
            className={cx(floatingStyles.floating, floatingStyles.surface, styles.root, className)}
            onKeyDown={handleMenuKeyDown}
            onBlur={handleMenuBlur}
          >
            {children}
          </div>
        </MenuContext.Provider>
      )}
    </>
  );
});

Menu.displayName = 'Menu';

export interface MenuItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'disabled' | 'onSelect'
> {
  /** Item content and accessible name. */
  children: ReactNode;
  /** Decorative icon before the label (wrapped aria-hidden). */
  startIcon?: ReactNode;
  /**
   * Called when the item is activated (click, Enter or Space), after focus returns to the
   * trigger and the close is requested, so it can open a Dialog. Not called for a disabled item.
   */
  onSelect?: () => void;
  /** Focusable but not activatable (`aria-disabled`), per APG. @default false */
  disabled?: boolean;
  /** Text used for typeahead when children are not plain text. Default: the item's textContent. */
  textValue?: string;
}

/**
 * An action in a Menu. Renders `<button type="button" role="menuitem" tabindex="-1">`; the ref
 * and any other props go to it. A consumer `onClick` runs first and can veto the selection
 * with `event.preventDefault()`. Throws outside a Menu.
 */
export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  {
    children,
    startIcon,
    onSelect,
    disabled = false,
    textValue,
    className,
    onClick,
    onFocus,
    onBlur,
    onPointerMove,
    onMouseDown,
    ...rest
  },
  ref,
) {
  const { select } = useMenuContext('MenuItem');
  const [active, setActive] = useState(false);

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={cx(floatingStyles.item, styles.item, className)}
      aria-disabled={disabled || undefined}
      data-active={active ? '' : undefined}
      data-text-value={textValue}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
        if (event.defaultPrevented) return;
        select(onSelect);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setActive(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setActive(false);
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        // Keep focus where hover put it: Safari would otherwise blur the menu on press.
        event.preventDefault();
      }}
      onPointerMove={(event: PointerEvent<HTMLButtonElement>) => {
        onPointerMove?.(event);
        if (event.defaultPrevented || event.pointerType === 'touch') return;
        // Hover moves focus, so the keyboard continues from the hovered item.
        if (event.currentTarget.ownerDocument.activeElement !== event.currentTarget) {
          event.currentTarget.focus({ preventScroll: true });
        }
      }}
    >
      {startIcon != null && (
        <span className={styles.icon} aria-hidden="true">
          {startIcon}
        </span>
      )}
      <span className={styles.label}>{children}</span>
    </button>
  );
});

MenuItem.displayName = 'MenuItem';

export interface MenuGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Visible group heading; names the group. */
  label: ReactNode;
  /** The MenuItem elements in the group. */
  children: ReactNode;
}

/**
 * A labelled group of items: `<div role="group">` named by its visible heading. The ref and
 * any other props go to the group `<div>`. Throws outside a Menu.
 */
export const MenuGroup = forwardRef<HTMLDivElement, MenuGroupProps>(function MenuGroup(
  { label, children, ...rest },
  ref,
) {
  useMenuContext('MenuGroup');
  const labelId = `${useId()}-label`;
  return (
    <div ref={ref} role="group" aria-labelledby={labelId} {...rest}>
      <div role="presentation" id={labelId} className={floatingStyles.groupLabel}>
        {label}
      </div>
      {children}
    </div>
  );
});

MenuGroup.displayName = 'MenuGroup';

export type MenuSeparatorProps = Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'>;

/**
 * A visual and semantic divider between items (`role="separator"`, not focusable). The ref
 * and any other props go to the `<div>`. Throws outside a Menu.
 */
export const MenuSeparator = forwardRef<HTMLDivElement, MenuSeparatorProps>(function MenuSeparator(
  { className, ...rest },
  ref,
) {
  useMenuContext('MenuSeparator');
  return (
    <div ref={ref} role="separator" className={cx(floatingStyles.separator, className)} {...rest} />
  );
});

MenuSeparator.displayName = 'MenuSeparator';

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { composeRefs } from '../../utils/composeRefs';
import { cx } from '../../utils/cx';
import { cloneTrigger } from '../../utils/mergeProps';
import { hidePopover, showPopover } from '../../utils/popover';
import type { Placement } from '../../utils/types';
import floatingStyles from '../Floating/floating.module.css';
import styles from './Tooltip.module.css';

/** Time the pointer may spend between the trigger and the bubble before it hides, in ms. */
const HIDE_GRACE = 100;

export interface TooltipProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'content' | 'children' | 'role' | 'popover' | 'hidden'
> {
  /** Short, plain hint text. No interactive content: use a Dialog or Menu for that. */
  content: ReactNode;
  /**
   * One focusable element (Button, IconButton, link). Receives `aria-describedby` and event
   * handlers; its own handlers run first and its ref is preserved.
   */
  children: ReactElement;
  /** Preferred side; flips when there is no room. `start`/`end` follow the text direction. @default 'top' */
  placement?: Placement;
  /**
   * Hover delay before showing, in ms. Keyboard focus shows immediately. Nothing shows while
   * the trigger has `aria-expanded="true"` (e.g. its Menu is open). @default 500
   */
  delay?: number;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Called with the requested open state (hover, focus, Escape, activation). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Never show the tooltip: the child renders unchanged and no bubble is mounted. Use for
   * disabled triggers, which get no events anyway. @default false
   */
  disabled?: boolean;
  /**
   * The tooltip repeats the trigger's accessible name (e.g. an IconButton label), so it is
   * hidden from assistive technology: `aria-hidden`, no role and no `aria-describedby`.
   * Prevents a double announcement. @default false
   */
  decorative?: boolean;
}

/** `:focus-visible` is the signal for "keyboard focus". Falls back to true if unsupported. */
function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/**
 * A short text hint shown on hover (after `delay`) and on keyboard focus (immediately),
 * following the APG Tooltip pattern and WCAG 1.4.13: Escape hides it without moving focus,
 * the pointer can move onto it, and it never times out. Escape is not consumed: a tooltip is
 * not a dismiss layer, so the same key press also reaches an enclosing Menu, Dialog or toast. Hover and keyboard focus are tracked
 * separately, so it stays while either remains (e.g. focus stays after the pointer leaves).
 *
 * The bubble is the trigger's next DOM sibling. It is always mounted (hidden while closed) so
 * the trigger's `aria-describedby` always resolves, and it is shown in the top layer with
 * `popover="manual"`. The ref and any other props go to the bubble `<div>`.
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  {
    content,
    children,
    placement = 'top',
    delay = 500,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    disabled = false,
    decorative = false,
    id: idProp,
    className,
    onPointerEnter,
    onPointerLeave,
    ...rest
  },
  ref,
) {
  const [openState, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const open = openState && !disabled;

  const autoId = useId();
  const tooltipId = idProp ?? `${autoId}-tooltip`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useMemo(() => composeRefs(ref, floatingRef), [ref]);

  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** The pointer is over the trigger or the bubble (after the delay). */
  const hoverOpen = useRef(false);
  /** The trigger has keyboard (`:focus-visible`) focus. */
  const focusOpen = useRef(false);
  /** Set by Escape; cleared when the pointer leaves or focus leaves (WCAG 1.4.13). */
  const suppressed = useRef(false);
  /** Latest setter, so a timer never calls one from an older render. */
  const latestSetOpen = useRef(setOpen);
  useLayoutEffect(() => {
    latestSetOpen.current = setOpen;
  });
  // Two requests in one task (e.g. showModal() focuses the trigger, then the Dialog moves
  // focus on) are both honoured: useControllableState compares each request with the latest
  // requested value, not the last rendered one.
  const request = useCallback((next: boolean) => {
    latestSetOpen.current(next);
  }, []);

  const clearTimers = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    showTimer.current = undefined;
    hideTimer.current = undefined;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /** A trigger whose popup is open (e.g. a Menu button) shows no hint. */
  const isExpanded = useCallback(
    () => triggerRef.current?.getAttribute('aria-expanded') === 'true',
    [],
  );

  /** Open while hover or focus wants it, unless Escape suppressed it or a popup is open. */
  const sync = useCallback(() => {
    const wanted = hoverOpen.current || focusOpen.current;
    request(wanted && !suppressed.current && !isExpanded());
  }, [isExpanded, request]);

  /** Escape, a press or activation: forget both reasons and hide now. */
  const hideNow = useCallback(() => {
    clearTimers();
    hoverOpen.current = false;
    focusOpen.current = false;
    request(false);
  }, [clearTimers, request]);

  const scheduleHoverEnd = useCallback(() => {
    clearTimeout(showTimer.current);
    showTimer.current = undefined;
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      hideTimer.current = undefined;
      hoverOpen.current = false;
      sync();
    }, HIDE_GRACE);
  }, [sync]);

  const cancelHoverEnd = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = undefined;
  }, []);

  // A trigger that becomes disabled drops any pending or open state, so the hint does not
  // reappear when it is enabled again.
  useEffect(() => {
    if (disabled) hideNow();
  }, [disabled, hideNow]);

  // Show in the top layer before useFloating measures (its layout effect runs after this one).
  useLayoutEffect(() => {
    const element = floatingRef.current;
    if (!open || !element) return;
    showPopover(element);
    return () => {
      hidePopover(element);
    };
  }, [open]);

  const { placement: finalPlacement } = useFloating({
    open,
    anchorRef: triggerRef,
    floatingRef,
    placement,
    align: 'center',
  });

  // Escape always hides the hint (WCAG 1.4.13), but the tooltip is not a dismiss layer: it
  // neither joins the layer stack nor stops the event, so the same Escape also closes the
  // Menu, Dialog or toast around it.
  useEffect(() => {
    if (!open) return;
    const doc = floatingRef.current?.ownerDocument ?? document;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing) return;
      suppressed.current = true;
      hideNow();
    };
    doc.addEventListener('keydown', onKeyDown, true);
    return () => {
      doc.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, hideNow]);

  // Always a fragment, so toggling `disabled` keeps the trigger mounted (and focused).
  const trigger = disabled
    ? children
    : cloneTrigger(
        children,
        {
          'aria-describedby': decorative ? undefined : tooltipId,
          onPointerEnter: (event: PointerEvent<HTMLElement>) => {
            if (event.pointerType === 'touch') return;
            cancelHoverEnd();
            if (hoverOpen.current || showTimer.current !== undefined) return;
            if (suppressed.current || isExpanded()) return;
            showTimer.current = setTimeout(() => {
              showTimer.current = undefined;
              hoverOpen.current = true;
              sync();
            }, delay);
          },
          onPointerLeave: (event: PointerEvent<HTMLElement>) => {
            if (event.pointerType === 'touch') return;
            suppressed.current = false;
            scheduleHoverEnd();
          },
          // A press hides the hint (e.g. as a Menu opens); so does Enter/Space below.
          onPointerDown: hideNow,
          onFocus: (event: FocusEvent<HTMLElement>) => {
            // Mouse, touch and script focus after a pointer interaction are not
            // :focus-visible, so only keyboard focus shows the hint. Focus that has already
            // moved on (a focus/blur pair in one task) is ignored.
            const element = event.currentTarget;
            if (element.ownerDocument.activeElement !== element) return;
            if (!isFocusVisible(element)) return;
            focusOpen.current = true;
            sync();
          },
          onBlur: () => {
            focusOpen.current = false;
            suppressed.current = false;
            sync();
          },
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (event.key === 'Enter' || event.key === ' ') hideNow();
          },
        },
        triggerRef,
      );

  return (
    <>
      {trigger}
      {!disabled && (
        <div
          {...rest}
          ref={bubbleRef}
          id={tooltipId}
          {...(decorative ? { 'aria-hidden': true } : { role: 'tooltip' })}
          popover="manual"
          hidden={!open}
          data-placement={finalPlacement}
          className={cx(floatingStyles.floating, styles.root, className)}
          onPointerEnter={(event) => {
            onPointerEnter?.(event);
            if (event.defaultPrevented) return;
            // Hoverable: moving onto the bubble cancels the grace timer.
            cancelHoverEnd();
          }}
          onPointerLeave={(event) => {
            onPointerLeave?.(event);
            if (event.defaultPrevented || event.pointerType === 'touch') return;
            scheduleHoverEnd();
          }}
        >
          {content}
        </div>
      )}
    </>
  );
});

Tooltip.displayName = 'Tooltip';

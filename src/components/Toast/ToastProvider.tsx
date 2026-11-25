import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { composeRefs } from '../../utils/composeRefs';
import { cx } from '../../utils/cx';
import { OverlayHostContext, type OverlayHost } from '../../utils/overlayHost';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { VisuallyHidden } from '../VisuallyHidden';
import { ToastContext, type ToastApi, type ToastOptions } from './ToastContext';
import styles from './Toast.module.css';

export interface ToastProviderProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** The app. Every `useToast()` call must be inside the provider. */
  children: ReactNode;
  /**
   * Base auto-dismiss delay in ms. Each toast adds reading time for its text (60 ms per
   * character, up to 10 s more). Expose this as a user setting so timing is adjustable
   * (WCAG 2.2.1); `Infinity` disables auto-dismiss.
   * @default 6000
   */
  duration?: number;
  /**
   * Maximum visible toasts; extra toasts queue and appear as others close. Narrow or short
   * viewports (30rem or less) always show one.
   * @default 3
   */
  max?: number;
  /** Accessible name of the notifications region. @default `Notifications (${hotkey})` */
  label?: string;
  /**
   * `KeyboardEvent.key` that moves focus to the newest toast, from anywhere (without
   * Ctrl, Alt, Meta or Shift). Pressed again inside the region, it returns focus.
   * @default 'F8'
   */
  hotkey?: string;
  /** Accessible name of each toast's dismiss button. @default 'Dismiss' */
  dismissLabel?: string;
  /**
   * Appended to the announcement of a toast with an action, so screen reader users know how
   * to reach it. @default `Press ${hotkey} to go to notifications.`
   */
  actionHint?: string;
  /**
   * Text for queued toasts, shown under the visible ones and announced when the queue grows.
   * @default count => `${count} more notification(s)`
   */
  queueLabel?: (count: number) => string;
}

interface ToastRecord extends ToastOptions {
  id: string;
}

/** setTimeout overflows above 2^31 - 1 ms; anything longer is treated as "never". */
const MAX_DELAY = 2_147_483_647;
/** Reading time added per character of message text, and its cap. */
const MS_PER_CHARACTER = 60;
const MAX_READING_TIME = 10_000;
/** A paused toast always gets at least this long after it resumes. */
const MIN_RESUME = 2000;
/**
 * Announcements are written this long after a render, so a status region that just mounted
 * or moved (a Dialog opening or closing in the same update) is registered by AT first.
 */
const ANNOUNCE_DELAY = 150;
/** Announced lines are removed after this, so browse mode does not read them twice. */
const ANNOUNCE_LIFETIME = 1500;
const COMPACT_QUERY = '(max-width: 30rem), (max-height: 30rem)';

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
}
const getHidden = () => document.visibilityState === 'hidden';

function subscribeCompact(onChange: () => void): () => void {
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}
const getCompact = () => window.matchMedia(COMPACT_QUERY).matches;
const getFalse = () => false;

const defaultQueueLabel = (count: number) =>
  `${String(count)} more ${count === 1 ? 'notification' : 'notifications'}`;

function firstButton(item: Element | undefined): HTMLElement | null {
  return item?.querySelector<HTMLElement>('button') ?? null;
}

/** Focuses `element` and reports whether it actually received focus. */
function tryFocus(element: HTMLElement | null | undefined): boolean {
  if (!element?.isConnected) return false;
  element.focus();
  return element.ownerDocument.activeElement === element;
}

/**
 * The plain message text of a rendered toast: the tone prefix, title and description,
 * without buttons or decorative (aria-hidden) parts. Block elements are separated by a space.
 */
function messageText(item: Element): string {
  const clone = item.cloneNode(true) as Element;
  for (const node of Array.from(clone.querySelectorAll('button, [aria-hidden="true"]'))) {
    node.remove();
  }
  for (const block of Array.from(clone.querySelectorAll('div, p, li'))) {
    block.append(' ');
  }
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

interface ToastItemProps {
  toast: ToastRecord;
  /** Provider base duration (before reading time). */
  baseDuration: number;
  paused: boolean;
  dismissLabel: string;
  hotkey: string;
  onDismiss: (id: string) => void;
  readRemaining: (id: string) => number | undefined;
  writeRemaining: (id: string, ms: number) => void;
}

/** One visible toast. Owns its timer; the remaining time survives pauses and remounts. */
function ToastItem({
  toast,
  baseDuration,
  paused,
  dismissLabel,
  hotkey,
  onDismiss,
  readRemaining,
  writeRemaining,
}: ToastItemProps) {
  const { id, title, description, tone = 'neutral', action, toneLabel, duration } = toast;
  const itemRef = useRef<HTMLLIElement>(null);
  // Actions, errors and warnings stay until dismissed unless the toast sets a duration.
  const persistent = action !== undefined || tone === 'danger' || tone === 'warning';

  useEffect(() => {
    const item = itemRef.current;
    if (paused || !item) return;
    let total = duration ?? (persistent ? Number.POSITIVE_INFINITY : baseDuration);
    if (duration === undefined && total <= MAX_DELAY) {
      total += Math.min(messageText(item).length * MS_PER_CHARACTER, MAX_READING_TIME);
    }
    if (!(total <= MAX_DELAY)) return;
    const stored = readRemaining(id);
    const remaining = stored === undefined ? total : Math.max(stored, MIN_RESUME);
    const start = Date.now();
    const timer = window.setTimeout(() => {
      onDismiss(id);
    }, remaining);
    return () => {
      window.clearTimeout(timer);
      writeRemaining(id, remaining - (Date.now() - start));
    };
  }, [id, duration, persistent, baseDuration, paused, onDismiss, readRemaining, writeRemaining]);

  return (
    <li ref={itemRef} className={styles.toast} data-toast-id={id} data-tone={tone}>
      <Alert
        className={styles.alert}
        tone={tone}
        title={title}
        toneLabel={toneLabel}
        live="off"
        dismissLabel={dismissLabel}
        onDismiss={() => {
          onDismiss(id);
        }}
      >
        {description}
        {action && (
          <div className={styles.actions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                action.onAction();
                onDismiss(id);
              }}
            >
              {action.label}
            </Button>
            {/* Visible keyboard hint; screen readers get it in the announcement instead. */}
            <kbd className={styles.hotkey} aria-hidden="true">
              {hotkey}
            </kbd>
          </div>
        )}
      </Alert>
    </li>
  );
}

/**
 * Hosts toasts for its subtree: provides `useToast()` and renders a notifications region (a
 * `<section>`, fixed at the bottom-end corner) plus an always-mounted, visually hidden polite
 * status region that announces each toast's text once. The ref and any other props go to
 * the `<section>`.
 *
 * Toasts never take focus. `hotkey` (F8) moves focus to the newest toast and back; Escape
 * inside the region dismisses the focused toast. Timers pause on hover, on focus and while
 * the tab is hidden. While a Dialog is open the region moves into it, so it stays usable.
 */
export const ToastProvider = forwardRef<HTMLElement, ToastProviderProps>(function ToastProvider(
  {
    children,
    duration = 6000,
    max = 3,
    hotkey = 'F8',
    label = `Notifications (${hotkey})`,
    dismissLabel = 'Dismiss',
    actionHint,
    queueLabel = defaultQueueLabel,
    className,
    onKeyDown,
    onFocus,
    onBlur,
    onPointerEnter,
    onPointerLeave,
    ...rest
  },
  ref,
) {
  const baseId = useId();
  const sequenceRef = useRef(0);
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [outlets, setOutlets] = useState<HTMLElement[]>([]);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  /** Keeps the region a named landmark while the hotkey focused it empty. */
  const [landmarkForced, setLandmarkForced] = useState(false);
  const pageHidden = useSyncExternalStore(subscribeVisibility, getHidden, getFalse);
  const compact = useSyncExternalStore(subscribeCompact, getCompact, getFalse);

  const regionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const announcerRef = useRef<HTMLSpanElement>(null);
  const composedRef = useMemo(() => composeRefs(ref, regionRef), [ref]);
  /** Remaining auto-dismiss time per toast id, kept across pauses and remounts. */
  const remainingRef = useRef(new Map<string, number>());
  /** Element focused before the hotkey; cleared once used or when focus leaves the region. */
  const hotkeyReturnRef = useRef<HTMLElement | null>(null);
  /** Index of a dismissed toast that contained focus, handled after the re-render. */
  const pendingFocusIndexRef = useRef<number | null>(null);
  /** Toast ids already announced, and the queue length last announced. */
  const announcedRef = useRef(new Set<string>());
  const announcedQueueRef = useRef(0);
  /** The latest outlets, for deferred announcement writes. */
  const outletsRef = useRef(outlets);
  const timersRef = useRef(new Set<number>());

  const show = useCallback(
    (options: ToastOptions) => {
      sequenceRef.current += 1;
      const id = `${baseId}-toast-${String(sequenceRef.current)}`;
      setToasts((list) => [...list, { ...options, id }]);
      return id;
    },
    [baseId],
  );

  const dismiss = useCallback((id: string) => {
    const items = Array.from(listRef.current?.children ?? []);
    const index = items.findIndex(
      (item) => item instanceof HTMLElement && item.dataset.toastId === id,
    );
    const item = items[index];
    if (item?.contains(item.ownerDocument.activeElement)) pendingFocusIndexRef.current = index;
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);

  const readRemaining = useCallback((id: string) => remainingRef.current.get(id), []);
  const writeRemaining = useCallback((id: string, ms: number) => {
    remainingRef.current.set(id, ms);
  }, []);

  const host = useMemo<OverlayHost>(
    () => ({
      registerModal: (element) => {
        setOutlets((list) => [...list, element]);
        return () => {
          setOutlets((list) => list.filter((outlet) => outlet !== element));
        };
      },
    }),
    [],
  );

  const outlet = outlets.at(-1);

  useLayoutEffect(() => {
    outletsRef.current = outlets;
  });

  /** A stored return target is usable only if focusable and inside the current top modal. */
  const usableReturnTarget = useCallback((): HTMLElement | null => {
    const element = hotkeyReturnRef.current;
    if (!element?.isConnected || element.matches(':disabled') || element.closest('[inert]')) {
      return null;
    }
    const topDialog = outletsRef.current.at(-1)?.closest('dialog');
    if (topDialog && !topDialog.contains(element)) return null;
    return element;
  }, []);

  const returnFocus = useCallback(() => {
    const target = usableReturnTarget();
    hotkeyReturnRef.current = null;
    return tryFocus(target);
  }, [usableReturnTarget]);

  /** Writes a plain-text line into the current top status region, then removes it. */
  const announce = useCallback((text: string) => {
    const write = window.setTimeout(() => {
      timersRef.current.delete(write);
      const top = outletsRef.current.at(-1);
      const target = top?.querySelector<HTMLElement>('[data-gn-announcer]') ?? announcerRef.current;
      if (!target) return;
      const line = target.ownerDocument.createElement('span');
      line.style.display = 'block';
      line.textContent = text;
      target.append(line);
      const remove = window.setTimeout(() => {
        timersRef.current.delete(remove);
        line.remove();
      }, ANNOUNCE_LIFETIME);
      timersRef.current.add(remove);
    }, ANNOUNCE_DELAY);
    timersRef.current.add(write);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const visibleCount = compact ? Math.min(1, max) : Math.max(0, max);
  const visible = toasts.slice(0, visibleCount);
  const queued = toasts.length - visible.length;
  const hint = actionHint ?? `Press ${hotkey} to go to notifications.`;

  // Announce each toast once, when it becomes visible, from its rendered text.
  useEffect(() => {
    const items = Array.from(listRef.current?.children ?? []);
    for (const toast of visible) {
      if (announcedRef.current.has(toast.id)) continue;
      const item = items.find(
        (element) => element instanceof HTMLElement && element.dataset.toastId === toast.id,
      );
      if (!item) continue;
      announcedRef.current.add(toast.id);
      const text = messageText(item);
      announce(toast.action ? `${text} ${hint}` : text);
    }
    if (queued > announcedQueueRef.current) announce(queueLabel(queued));
    announcedQueueRef.current = queued;
  });

  // After the children's timer cleanups have run: forget timers and announcements of
  // toasts that are gone.
  useEffect(() => {
    const ids = new Set(toasts.map((toast) => toast.id));
    for (const id of remainingRef.current.keys()) {
      if (!ids.has(id)) remainingRef.current.delete(id);
    }
    for (const id of announcedRef.current) {
      if (!ids.has(id)) announcedRef.current.delete(id);
    }
  }, [toasts]);

  // A removed or moved toast never fires pointerleave/blur, so re-read the real state.
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    setHovered(region.matches(':hover'));
    setFocusWithin(region.contains(region.ownerDocument.activeElement));
  }, [toasts, outlet]);

  // After a dismissal that had focus: next toast, previous toast, the element focused
  // before the hotkey, then the region. Each step is verified, so focus never lands on <body>.
  useLayoutEffect(() => {
    const index = pendingFocusIndexRef.current;
    if (index === null) return;
    pendingFocusIndexRef.current = null;
    const items = Array.from(listRef.current?.children ?? []);
    if (tryFocus(firstButton(items[index]))) return;
    if (tryFocus(firstButton(items[index - 1]))) return;
    if (returnFocus()) return;
    tryFocus(regionRef.current);
  }, [toasts, returnFocus]);

  // The hotkey works from anywhere in the document.
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const region = regionRef.current;
      if (event.key !== hotkey || event.defaultPrevented || !region) return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      const doc = region.ownerDocument;
      const active = doc.activeElement;
      if (active instanceof Node && region.contains(active)) {
        // Pressed again inside the region: go back.
        returnFocus();
        return;
      }
      hotkeyReturnRef.current =
        active instanceof HTMLElement && active !== doc.body ? active : null;
      const items = listRef.current?.children;
      const newest = items?.[items.length - 1];
      if (tryFocus(firstButton(newest))) return;
      flushSync(() => {
        setLandmarkForced(true);
      });
      tryFocus(region);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [hotkey, returnFocus]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.key !== 'Escape' || event.defaultPrevented || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target === event.currentTarget) {
      // Escape on the empty, hotkey-focused region goes back.
      event.preventDefault();
      event.stopPropagation();
      returnFocus();
      return;
    }
    const item = target.closest<HTMLElement>('[data-toast-id]');
    const id = item?.dataset.toastId;
    if (id === undefined) return;
    // Handled here, so an enclosing Dialog does not also close.
    event.preventDefault();
    event.stopPropagation();
    dismiss(id);
  };

  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    onFocus?.(event);
    setFocusWithin(true);
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    onBlur?.(event);
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setFocusWithin(false);
    setLandmarkForced(false);
    // Focus left on its own (not by a dismissal we are about to handle).
    if (pendingFocusIndexRef.current === null) hotkeyReturnRef.current = null;
  };

  const handlePointerEnter = (event: PointerEvent<HTMLElement>) => {
    onPointerEnter?.(event);
    setHovered(true);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    onPointerLeave?.(event);
    setHovered(false);
  };

  const paused = hovered || focusWithin || pageHidden;

  // The section is a named landmark only while it has toasts or was focused by the hotkey,
  // so an empty "Notifications" landmark is not listed all the time.
  const section = (
    // Escape dismisses the focused toast; focus and hover pause the timers.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={composedRef}
      aria-label={visible.length > 0 || landmarkForced ? label : undefined}
      tabIndex={-1}
      className={cx(styles.region, className)}
      data-in-modal={outlet ? '' : undefined}
      {...rest}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <ol ref={listRef} className={styles.list}>
        {visible.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            baseDuration={duration}
            paused={paused}
            dismissLabel={dismissLabel}
            hotkey={hotkey}
            onDismiss={dismiss}
            readRemaining={readRemaining}
            writeRemaining={writeRemaining}
          />
        ))}
      </ol>
      {queued > 0 && <p className={styles.more}>{queueLabel(queued)}</p>}
    </section>
  );

  // showModal() makes everything outside the topmost dialog inert, so the visible region
  // moves into that dialog's outlet while one is open. The announcer never moves: lines are
  // written into the top dialog's own always-mounted status region instead (see announce).
  return (
    <OverlayHostContext.Provider value={host}>
      <ToastContext.Provider value={api}>
        {children}
        {outlet ? createPortal(section, outlet) : section}
        {/* Always mounted; filled with plain text by `announce`, never by React. */}
        <VisuallyHidden
          ref={announcerRef}
          role="status"
          aria-atomic="false"
          aria-relevant="additions"
        >
          {null}
        </VisuallyHidden>
      </ToastContext.Provider>
    </OverlayHostContext.Provider>
  );
});

ToastProvider.displayName = 'ToastProvider';

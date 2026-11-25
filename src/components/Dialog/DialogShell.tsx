import {
  forwardRef,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DialogHTMLAttributes,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useFocusReturn } from '../../hooks/useFocusReturn';
import { useIsOverflowing } from '../../hooks/useIsOverflowing';
import { composeRefs } from '../../utils/composeRefs';
import { cx } from '../../utils/cx';
import { getTabbables } from '../../utils/focusable';
import { isRenderable } from '../../utils/isRenderable';
import { hasLayers } from '../../utils/layerStack';
import { cloneTrigger } from '../../utils/mergeProps';
import { OverlayHostContext } from '../../utils/overlayHost';
import type { Size } from '../../utils/types';
import { CloseIcon } from '../Icon';
import { IconButton } from '../IconButton';
import { VisuallyHidden } from '../VisuallyHidden';
import { DialogContext, type DialogContextValue } from './DialogContext';
import styles from './Dialog.module.css';

export interface DialogProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  'open' | 'title' | 'role' | 'children'
> {
  /** Heading (rendered as an `<h2>`) and the dialog's accessible name via aria-labelledby. */
  title: ReactNode;
  /** Supporting text under the title, linked with aria-describedby. */
  description?: ReactNode;
  /** Dialog body. Unmounted while the dialog is closed, so its state resets on every open. */
  children?: ReactNode;
  /** Actions row at the bottom, e.g. a `DialogClose` and a primary Button. */
  footer?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /**
   * Called with the requested state: `true` from the trigger, `false` from the close button,
   * `DialogClose`, Escape or a backdrop click.
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Element that opens the dialog (e.g. `<Button>`). It is cloned with a composed `onClick`
   * (yours runs first; call `preventDefault()` to stop the dialog opening). Focus returns
   * to it on close.
   */
  trigger?: ReactElement;
  /** Panel max width: `--gn-size-dialog-{size}`. @default 'md' */
  size?: Size;
  /** Accessible name of the close button. @default 'Close' */
  closeLabel?: string;
  /**
   * Element to focus on open. Default: the first tabbable in the body, then the footer,
   * then the close button, then the panel itself. When the body scrolls and its first
   * tabbable is not in view, the body itself is focused so reading starts at the top.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Element to focus on close when the trigger no longer exists (e.g. the deleted row's
   * neighbour). Default: the element focused before opening.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/** Internal props shared by Dialog and AlertDialog. */
export interface DialogShellProps extends DialogProps {
  /** AlertDialog mode: role="alertdialog", no close button, no backdrop close. */
  alert?: boolean;
}

function joinIds(...ids: (string | undefined)[]): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}

function overflows(element: HTMLElement): boolean {
  return element.scrollHeight > element.clientHeight;
}

/** True when `element` is fully inside the visible box of its scroll container. */
function isInView(element: HTMLElement, container: HTMLElement): boolean {
  const box = element.getBoundingClientRect();
  const view = container.getBoundingClientRect();
  return box.top >= view.top && box.bottom <= view.bottom;
}

/** Focuses `element` and reports whether it actually received focus. */
function tryFocus(element: HTMLElement | null | undefined, preventScroll = false): boolean {
  if (!element?.isConnected) return false;
  element.focus({ preventScroll });
  return element.ownerDocument.activeElement === element;
}

/** Makes the scrolling body a named, focusable group (also rendered by DialogBody). */
function makeBodyFocusable(body: HTMLElement, titleId: string) {
  body.tabIndex = 0;
  body.setAttribute('role', 'group');
  body.setAttribute('aria-labelledby', titleId);
}

/** Makes the panel a programmatic-only focus target until it loses focus. */
function focusPanel(panel: HTMLElement | null): boolean {
  if (!panel) return false;
  panel.tabIndex = -1;
  panel.addEventListener(
    'blur',
    () => {
      panel.removeAttribute('tabindex');
    },
    { once: true },
  );
  return tryFocus(panel, true);
}

interface DialogBodyProps {
  bodyRef: RefObject<HTMLDivElement | null>;
  titleId: string;
  children: ReactNode;
}

/**
 * The scrollable body. A separate component so `useIsOverflowing` starts measuring when the
 * body mounts (on open), not when the always-mounted `<dialog>` does.
 */
function DialogBody({ bodyRef, titleId, children }: DialogBodyProps) {
  const overflowing = useIsOverflowing(bodyRef, 'block');
  return (
    <div
      ref={bodyRef}
      className={styles.body}
      // A scrolling body must be reachable by keyboard (WCAG 2.1.1). While it is a tab stop
      // it is a group named by the title, so screen readers announce what it is.
      {...(overflowing && { tabIndex: 0, role: 'group', 'aria-labelledby': titleId })}
    >
      {children}
    </div>
  );
}

/**
 * Shared implementation of Dialog and AlertDialog on a native `<dialog>` opened with
 * `showModal()`. Internal; the ref goes to the `<dialog>`.
 */
export const DialogShell = forwardRef<HTMLDialogElement, DialogShellProps>(function DialogShell(
  {
    title,
    description,
    children,
    footer,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    trigger,
    size = 'md',
    closeLabel = 'Close',
    initialFocusRef,
    returnFocusRef,
    alert = false,
    className,
    onKeyDown,
    onCancel,
    onClose,
    onClick,
    onPointerDown,
    onFocus,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const outletRef = useRef<HTMLDivElement>(null);
  const composedRef = useMemo(() => composeRefs(ref, dialogRef), [ref]);

  const focusReturn = useFocusReturn();
  /** True between our showModal() and the matching close, including a re-show after a native close. */
  const shownRef = useRef(false);
  /** The latest `open`, for native event handlers that fire after a render. */
  const openRef = useRef(open);
  /** The latest focus props, read when the dialog opens or closes. */
  const focusPropsRef = useRef({ initialFocusRef, returnFocusRef });
  /** The last element focused inside the dialog, restored after a controlled re-show. */
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  /** Whether the current pointer press started on the backdrop (the <dialog> box itself). */
  const pressStartedOnBackdropRef = useRef(false);
  /** Whether a floating layer (Menu, Select, Tooltip) was open when the press started. */
  const layerOpenAtPressRef = useRef(false);
  /** Bumped by a native `close` while React still thinks the dialog is open. */
  const [syncTick, setSyncTick] = useState(0);

  const overlayHost = useContext(OverlayHostContext);

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  // An empty or whitespace-only string names nothing, so it counts as no title.
  const hasTitle = isRenderable(title) && !(typeof title === 'string' && title.trim() === '');
  const hasDescription = isRenderable(description);
  const hasBody = isRenderable(children);
  const hasFooter = isRenderable(footer);

  useLayoutEffect(() => {
    openRef.current = open;
    focusPropsRef.current = { initialFocusRef, returnFocusRef };
  });

  useEffect(() => {
    if (!hasTitle && !ariaLabel && !ariaLabelledBy) {
      console.warn(
        'Greenility Dialog: `title` is empty and no aria-label or aria-labelledby is set, so the dialog has no accessible name.',
      );
    }
  }, [hasTitle, ariaLabel, ariaLabelledBy]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (dialog.open) return;
      const reshow = shownRef.current;
      if (!reshow) {
        focusReturn.capture();
        lastFocusedRef.current = null;
      }
      dialog.showModal();
      shownRef.current = true;

      // After a native close that the controlled parent overrode, continue where the user was.
      const last = lastFocusedRef.current;
      if (reshow && last && dialog.contains(last) && tryFocus(last)) return;

      const initial = focusPropsRef.current.initialFocusRef?.current;
      if (tryFocus(initial)) return;

      const body = bodyRef.current;
      const panel = panelRef.current;
      const target =
        (body && getTabbables(body)[0]) ??
        (footerRef.current && getTabbables(footerRef.current)[0]) ??
        closeButtonRef.current;

      // Long content (APG): start at the top of the body instead of jumping past it to a
      // control further down or in the footer.
      if (body && overflows(body) && !(target && body.contains(target) && isInView(target, body))) {
        makeBodyFocusable(body, titleId);
        if (tryFocus(body, true)) return;
      }
      // Short viewports scroll the whole panel; do not scroll its top out of view.
      if (panel && overflows(panel) && target && !isInView(target, panel)) {
        if (focusPanel(panel)) return;
      }
      if (tryFocus(target)) return;
      focusPanel(panel);
      return;
    }

    if (!shownRef.current) return;
    shownRef.current = false;
    if (dialog.open) dialog.close();
    focusReturn.restore(focusPropsRef.current.returnFocusRef?.current);
  }, [open, syncTick, focusReturn, titleId]);

  // Unmounting while open (e.g. a route change) still closes the native dialog and returns
  // focus. Under StrictMode the remount runs the sync effect again, which re-opens it.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (!shownRef.current) return;
      shownRef.current = false;
      if (dialog?.open) dialog.close();
      focusReturn.restore(focusPropsRef.current.returnFocusRef?.current);
    };
  }, [focusReturn]);

  // Keep toasts usable while this modal is open (showModal() makes everything else inert).
  useLayoutEffect(() => {
    const outlet = outletRef.current;
    if (!open || !overlayHost || !outlet) return;
    return overlayHost.registerModal(outlet);
  }, [open, overlayHost]);

  // Record whether a floating layer is open when a press starts. A window capture listener
  // runs before the layers' own document listeners, which may close the layer.
  useEffect(() => {
    if (!open) return;
    const record = () => {
      layerOpenAtPressRef.current = hasLayers();
    };
    window.addEventListener('pointerdown', record, true);
    return () => {
      window.removeEventListener('pointerdown', record, true);
    };
  }, [open]);

  const context = useMemo<DialogContextValue>(
    () => ({
      close: () => {
        setOpen(false);
      },
    }),
    [setOpen],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    onKeyDown?.(event);
    // An inner layer (nested dialog, menu, toast) that handled Escape prevents the default.
    // Escape during IME composition cancels the composition, not the dialog.
    if (event.key !== 'Escape' || event.defaultPrevented || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  };

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    onCancel?.(event);
    // `cancel` also bubbles from file inputs; only the dialog's own close request counts.
    if (event.target !== event.currentTarget) return;
    // Never let the browser close it behind React's back; the state decides.
    event.preventDefault();
    if (!hasLayers()) setOpen(false);
  };

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    onClose?.(event);
    if (event.target !== event.currentTarget) return;
    // A close we did not ask for (e.g. a close watcher after repeated Escape, or a
    // `<form method="dialog">`). Report it; a controlled parent that keeps `open` gets
    // showModal() again through the sync effect.
    if (openRef.current && shownRef.current && !event.currentTarget.open) {
      setOpen(false);
      setSyncTick((tick) => tick + 1);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLDialogElement>) => {
    onFocus?.(event);
    if (event.target instanceof HTMLElement) lastFocusedRef.current = event.target;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDialogElement>) => {
    onPointerDown?.(event);
    pressStartedOnBackdropRef.current = event.target === event.currentTarget;
  };

  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    onClick?.(event);
    const startedOnBackdrop = pressStartedOnBackdropRef.current;
    const layerWasOpen = layerOpenAtPressRef.current;
    pressStartedOnBackdropRef.current = false;
    layerOpenAtPressRef.current = false;
    if (alert || event.defaultPrevented || layerWasOpen) return;
    // The <dialog> is a transparent full-viewport box: a click on it, not on the panel, is
    // a backdrop click. A drag that started inside the panel does not count, and a press
    // that dismissed an inner floating layer does not also close the dialog.
    if (event.target === event.currentTarget && startedOnBackdrop) setOpen(false);
  };

  return (
    <>
      {trigger &&
        cloneTrigger(trigger, {
          onClick: (event: MouseEvent<HTMLElement>) => {
            // Safari does not focus buttons on click. Focus the trigger so focus can return
            // to it on close, as in other browsers.
            const element = event.currentTarget;
            if (element.ownerDocument.activeElement !== element) {
              element.focus({ preventScroll: true });
            }
            setOpen(true);
          },
        })}
      {/* Keyboard and pointer handlers implement Escape and backdrop dismissal of the native
          dialog; the dialog itself is not a control. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={composedRef}
        className={cx(styles.root, className)}
        data-size={size}
        role={alert ? 'alertdialog' : undefined}
        aria-label={ariaLabel}
        aria-labelledby={joinIds(ariaLabelledBy, hasTitle ? titleId : undefined)}
        aria-describedby={joinIds(ariaDescribedBy, hasDescription ? descriptionId : undefined)}
        {...rest}
        onKeyDown={handleKeyDown}
        onCancel={handleCancel}
        onClose={handleClose}
        onFocus={handleFocus}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
      >
        {open && (
          <DialogContext.Provider value={context}>
            <div ref={panelRef} className={styles.panel}>
              <div className={styles.header}>
                <h2 id={titleId} className={styles.title}>
                  {title}
                </h2>
                {!alert && (
                  <IconButton
                    ref={closeButtonRef}
                    className={styles.close}
                    variant="ghost"
                    size="sm"
                    label={closeLabel}
                    icon={<CloseIcon />}
                    onClick={context.close}
                  />
                )}
              </div>
              {hasDescription && (
                <p id={descriptionId} className={styles.description}>
                  {description}
                </p>
              )}
              {hasBody && (
                <DialogBody bodyRef={bodyRef} titleId={titleId}>
                  {children}
                </DialogBody>
              )}
              {hasFooter && (
                <div ref={footerRef} className={styles.footer}>
                  {footer}
                </div>
              )}
            </div>
          </DialogContext.Provider>
        )}
        {/* Toasts render here while this is the topmost open modal (see ToastProvider). The
            status region is always mounted, so announcements written into it are read even
            right after the dialog opens. ToastProvider writes plain text into it. */}
        <div ref={outletRef} className={styles.overlayOutlet}>
          {overlayHost && (
            <VisuallyHidden
              role="status"
              aria-atomic="false"
              aria-relevant="additions"
              data-gn-announcer=""
            >
              {null}
            </VisuallyHidden>
          )}
        </div>
      </dialog>
    </>
  );
});

DialogShell.displayName = 'DialogShell';

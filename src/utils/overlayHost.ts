import { createContext } from 'react';

/**
 * Renders non-modal overlays (toasts) and moves them into an open modal dialog, because
 * `showModal()` makes everything outside the dialog inert.
 */
export interface OverlayHost {
  /**
   * Called by a modal Dialog when it opens, with an outlet element inside the `<dialog>`.
   * Returns a function that unregisters the outlet; the Dialog calls it on close.
   */
  registerModal: (element: HTMLElement) => () => void;
}

/** Provided by ToastProvider and consumed by Dialog. `null` when no host is mounted. */
export const OverlayHostContext = createContext<OverlayHost | null>(null);

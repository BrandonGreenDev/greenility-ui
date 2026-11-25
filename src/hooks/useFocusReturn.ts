import { useMemo, useRef } from 'react';

export interface FocusReturn {
  /** Store `document.activeElement` (ignored when it is `<body>`). */
  capture: () => void;
  /**
   * Focus `fallback` if given and connected, else the captured element if it is still
   * connected and not disabled. Clears the captured element.
   */
  restore: (fallback?: HTMLElement | null) => void;
}

/** Remembers the focused element and restores it on demand. The returned object is stable. */
export function useFocusReturn(): FocusReturn {
  const captured = useRef<HTMLElement | null>(null);

  return useMemo<FocusReturn>(
    () => ({
      capture: () => {
        const active = document.activeElement;
        captured.current =
          active instanceof HTMLElement && active !== active.ownerDocument.body ? active : null;
      },
      restore: (fallback) => {
        const element = captured.current;
        captured.current = null;
        if (fallback?.isConnected) {
          fallback.focus();
          return;
        }
        if (element?.isConnected && !element.matches(':disabled')) element.focus();
      },
    }),
    [],
  );
}

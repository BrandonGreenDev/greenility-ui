import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * True when the element's content overflows it on the axis (`inline`: scrollWidth >
 * clientWidth; `block`: scrollHeight > clientHeight).
 *
 * Re-checks when the element or one of its direct children resizes (ResizeObserver) and
 * when children are added or removed (MutationObserver). Always false where
 * ResizeObserver is unavailable (jsdom), so tests stub it to cover the true branch.
 */
export function useIsOverflowing(
  ref: RefObject<HTMLElement | null>,
  axis: 'inline' | 'block',
): boolean {
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const check = () => {
      setOverflowing(
        axis === 'inline'
          ? element.scrollWidth > element.clientWidth
          : element.scrollHeight > element.clientHeight,
      );
    };

    const resizeObserver = new ResizeObserver(check);
    const observeAll = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(element);
      for (const child of Array.from(element.children)) resizeObserver.observe(child);
    };
    observeAll();
    const mutationObserver = new MutationObserver(() => {
      observeAll();
      check();
    });
    mutationObserver.observe(element, { childList: true });
    check();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref, axis]);

  return overflowing;
}

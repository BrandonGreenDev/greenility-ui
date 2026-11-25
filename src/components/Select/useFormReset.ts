import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Calls `onReset` when the owner form of `elementRef` fires `reset`. The owner is the form
 * with the id `formId` (looked up in the element's document), else the closest ancestor
 * `<form>`. `onReset` is read at event time, so it need not be stable.
 */
export function useFormReset(
  elementRef: RefObject<HTMLElement | null>,
  formId: string | undefined,
  onReset: () => void,
): void {
  const latest = useRef(onReset);
  useLayoutEffect(() => {
    latest.current = onReset;
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const byId = formId === undefined ? null : element.ownerDocument.getElementById(formId);
    const owner =
      formId === undefined
        ? element.closest('form')
        : byId instanceof HTMLFormElement
          ? byId
          : null;
    if (!owner) return;
    const handle = () => {
      latest.current();
    };
    owner.addEventListener('reset', handle);
    return () => {
      owner.removeEventListener('reset', handle);
    };
  }, [elementRef, formId]);
}

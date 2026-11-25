import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface UseControllableStateOptions<T> {
  /** The controlled value. When defined, the component is controlled. */
  value?: T | undefined;
  /** The initial value when uncontrolled. */
  defaultValue: T;
  /** Called whenever the value should change, controlled or not. */
  onChange?: ((value: T) => void) | undefined;
}

/**
 * Supports both controlled (`value` + `onChange`) and uncontrolled
 * (`defaultValue`) usage behind a single `[value, setValue]` API.
 * Every stateful component uses this, so they all behave the same way.
 *
 * Several requests can arrive before React re-renders (for example a focus and
 * then a blur in the same task while `showModal()` moves focus). Each request is
 * compared with the latest *requested* value, not the last rendered one, so the
 * second request is never dropped as "no change". After every commit the latest
 * value resyncs to what actually rendered, so a controlled parent that vetoes a
 * change is respected.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  // `rendered` is what last committed; `latest` is the last value requested in the
  // current tick. A request only "sticks" until the end of the tick: if a
  // controlled parent ignores it and does not re-render, the next request is
  // compared with what is actually rendered again.
  const rendered = useRef(current);
  const latest = useRef(current);
  useLayoutEffect(() => {
    rendered.current = current;
    latest.current = current;
  });

  const setValue = useCallback(
    (next: T) => {
      if (Object.is(next, latest.current)) return;
      latest.current = next;
      queueMicrotask(() => {
        latest.current = rendered.current;
      });
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [current, setValue];
}

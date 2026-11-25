import { useCallback, useState } from 'react';

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
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const setValue = useCallback(
    (next: T) => {
      if (Object.is(next, current)) return;
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [current, isControlled, onChange],
  );

  return [current, setValue];
}

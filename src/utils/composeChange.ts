import type { ChangeEvent, ChangeEventHandler } from 'react';

/** Native form controls whose `change` event carries a string `value`. */
export type ValueElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Builds a `change` handler that calls the consumer's own `onChange` first, then
 * `onValueChange(value, event)` with the control's new value.
 */
export function composeValueChange<T extends ValueElement>(
  onChange: ChangeEventHandler<T> | undefined,
  onValueChange: ((value: string, event: ChangeEvent<T>) => void) | undefined,
): ChangeEventHandler<T> {
  return (event) => {
    onChange?.(event);
    onValueChange?.(event.target.value, event);
  };
}

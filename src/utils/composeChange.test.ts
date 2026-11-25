import type { ChangeEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeValueChange } from './composeChange';

function changeEvent<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  target: T,
): ChangeEvent<T> {
  return { target, currentTarget: target, type: 'change' } as unknown as ChangeEvent<T>;
}

function input(value: string) {
  const element = document.createElement('input');
  element.value = value;
  return element;
}

describe('composeValueChange', () => {
  it('calls onChange first, then onValueChange with the value and the same event', () => {
    const order: string[] = [];
    const onChange = vi.fn((_event: ChangeEvent<HTMLInputElement>) => {
      order.push('onChange');
    });
    const onValueChange = vi.fn((_value: string, _event: ChangeEvent<HTMLInputElement>) => {
      order.push('onValueChange');
    });
    const event = changeEvent(input('hello'));
    composeValueChange(onChange, onValueChange)(event);
    expect(order).toEqual(['onChange', 'onValueChange']);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(event);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('hello', event);
  });

  it('works with only onChange', () => {
    const onChange = vi.fn();
    const event = changeEvent(input('a'));
    expect(() => {
      composeValueChange(onChange, undefined)(event);
    }).not.toThrow();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('works with only onValueChange', () => {
    const onValueChange = vi.fn();
    const event = changeEvent(input('b'));
    composeValueChange(undefined, onValueChange)(event);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('b', event);
  });

  it('is a no-op when both are undefined', () => {
    expect(() => {
      composeValueChange(undefined, undefined)(changeEvent(input('c')));
    }).not.toThrow();
  });

  it('reads the value from textarea and select targets', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'line\nnext';
    const select = document.createElement('select');
    select.append(new Option('Alpha', 'a'), new Option('Bravo', 'b', true, true));
    const onTextValue = vi.fn();
    const onSelectValue = vi.fn();
    composeValueChange<HTMLTextAreaElement>(undefined, onTextValue)(changeEvent(textarea));
    composeValueChange<HTMLSelectElement>(undefined, onSelectValue)(changeEvent(select));
    expect(onTextValue).toHaveBeenCalledWith('line\nnext', expect.anything());
    expect(onSelectValue).toHaveBeenCalledWith('b', expect.anything());
  });

  it('reads the value at call time, not when the handler is built', () => {
    const element = input('old');
    const onValueChange = vi.fn();
    const handler = composeValueChange(undefined, onValueChange);
    element.value = 'new';
    handler(changeEvent(element));
    expect(onValueChange).toHaveBeenCalledWith('new', expect.anything());
  });
});

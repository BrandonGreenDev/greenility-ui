import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useFocusReturn } from './useFocusReturn';

function button(label: string) {
  const element = document.createElement('button');
  element.textContent = label;
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useFocusReturn', () => {
  it('restores focus to the captured element', () => {
    const trigger = button('Trigger');
    const other = button('Other');
    const { result } = renderHook(() => useFocusReturn());
    trigger.focus();
    result.current.capture();
    other.focus();
    result.current.restore();
    expect(trigger).toHaveFocus();
  });

  it('skips a captured element that was removed or disabled', () => {
    const trigger = button('Trigger');
    const other = button('Other');
    const { result } = renderHook(() => useFocusReturn());
    trigger.focus();
    result.current.capture();
    other.focus();
    trigger.remove();
    result.current.restore();
    expect(other).toHaveFocus();

    const again = button('Again');
    again.focus();
    result.current.capture();
    other.focus();
    again.disabled = true;
    result.current.restore();
    expect(other).toHaveFocus();
  });

  it('uses a connected fallback first', () => {
    const trigger = button('Trigger');
    const fallback = button('Fallback');
    const { result } = renderHook(() => useFocusReturn());
    trigger.focus();
    result.current.capture();
    result.current.restore(fallback);
    expect(fallback).toHaveFocus();
  });

  it('ignores a disconnected fallback and returns to the captured element', () => {
    const trigger = button('Trigger');
    const other = button('Other');
    const detached = document.createElement('button');
    const { result } = renderHook(() => useFocusReturn());
    trigger.focus();
    result.current.capture();
    other.focus();
    result.current.restore(detached);
    expect(trigger).toHaveFocus();
  });

  it('does nothing when <body> was focused, and returns a stable object', () => {
    const other = button('Other');
    const { result, rerender } = renderHook(() => useFocusReturn());
    const first = result.current;
    result.current.capture();
    other.focus();
    result.current.restore();
    expect(other).toHaveFocus();
    rerender();
    expect(result.current).toBe(first);
  });
});

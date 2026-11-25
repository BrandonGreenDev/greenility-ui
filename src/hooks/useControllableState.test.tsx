import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useControllableState } from './useControllableState';

describe('useControllableState', () => {
  it('manages its own state when uncontrolled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 1, onChange }));
    expect(result.current[0]).toBe(1);
    act(() => {
      result.current[1](2);
    });
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('defers to the value prop when controlled', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, defaultValue: 0, onChange }),
      { initialProps: { value: 5 } },
    );
    act(() => {
      result.current[1](6);
    });
    expect(result.current[0]).toBe(5);
    expect(onChange).toHaveBeenCalledWith(6);
    rerender({ value: 6 });
    expect(result.current[0]).toBe(6);
  });

  it('does not call onChange when the value is unchanged', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 'a', onChange }));
    act(() => {
      result.current[1]('a');
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('useControllableState: several requests before a re-render', () => {
  it('applies a second request made in the same tick (open then close)', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: false, onChange }));
    act(() => {
      result.current[1](true);
      result.current[1](false);
    });
    expect(result.current[0]).toBe(false);
    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });

  it('resyncs to a controlled parent that vetoes the change', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: false, defaultValue: false, onChange }),
    );
    await act(async () => {
      result.current[1](true);
      await Promise.resolve();
    });
    expect(result.current[0]).toBe(false);
    // A later event (a new task) asks again, even though the parent never re-rendered.
    await act(async () => {
      result.current[1](true);
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

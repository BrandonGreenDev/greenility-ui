import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TYPEAHEAD_TIMEOUT, useTypeahead, type TypeaheadKeyEvent } from './useTypeahead';

const labels = ['Copy', 'Cut', 'Delete', 'Duplicate', 'Édit', 'New file', 'New folder'];
const none = () => false;

function key(value: string, modifiers: Partial<TypeaheadKeyEvent> = {}) {
  return {
    key: value,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...modifiers,
  };
}

function setup() {
  const { result } = renderHook(() => useTypeahead());
  return result.current;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTypeahead', () => {
  it('matches a typed prefix from the current item, case-insensitively', () => {
    const typeahead = setup();
    expect(typeahead(key('D'), labels, 0, none)).toBe(2);
    expect(typeahead(key('u'), labels, 2, none)).toBe(3);
  });

  it('matches regardless of accents (base sensitivity)', () => {
    const typeahead = setup();
    expect(typeahead(key('e'), labels, 0, none)).toBe(4);
  });

  it('cycles through items starting with a repeated character', () => {
    const typeahead = setup();
    expect(typeahead(key('c'), labels, -1, none)).toBe(0);
    expect(typeahead(key('c'), labels, 0, none)).toBe(1);
    expect(typeahead(key('c'), labels, 1, none)).toBe(0);
  });

  it('starts after the current item for a single character', () => {
    const typeahead = setup();
    expect(typeahead(key('d'), labels, 2, none)).toBe(3);
  });

  it('resets the buffer after 500ms', () => {
    const typeahead = setup();
    expect(typeahead(key('n'), labels, 0, none)).toBe(5);
    vi.advanceTimersByTime(TYPEAHEAD_TIMEOUT - 1);
    // "ne" still matches New file.
    expect(typeahead(key('e'), labels, 5, none)).toBe(5);
    vi.advanceTimersByTime(TYPEAHEAD_TIMEOUT);
    // A fresh "e" goes to Édit.
    expect(typeahead(key('e'), labels, 5, none)).toBe(4);
  });

  it('ignores keys with Ctrl, Meta or Alt and non-character keys', () => {
    const typeahead = setup();
    for (const event of [
      key('c', { ctrlKey: true }),
      key('c', { metaKey: true }),
      key('c', { altKey: true }),
      key('ArrowDown'),
      key('Enter'),
    ]) {
      expect(typeahead(event, labels, 0, none)).toBe(-1);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    // The ignored "c" keys did not enter the buffer: "d" is a fresh search.
    expect(typeahead(key('d'), labels, 0, none)).toBe(2);
  });

  it('handles Space only while the buffer is non-empty', () => {
    const typeahead = setup();
    const idle = key(' ');
    expect(typeahead(idle, labels, 0, none)).toBe(-1);
    expect(idle.preventDefault).not.toHaveBeenCalled();

    typeahead(key('n'), labels, 0, none);
    typeahead(key('e'), labels, 5, none);
    typeahead(key('w'), labels, 5, none);
    const space = key(' ');
    expect(typeahead(space, labels, 5, none)).toBe(5);
    expect(space.preventDefault).toHaveBeenCalledOnce();
    expect(typeahead(key('f'), labels, 5, none)).toBe(5);
    expect(typeahead(key('o'), labels, 5, none)).toBe(6);
  });

  it('consumes the key even without a match', () => {
    const typeahead = setup();
    const event = key('z');
    expect(typeahead(event, labels, 0, none)).toBe(-1);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it('skips disabled items', () => {
    const typeahead = setup();
    expect(typeahead(key('d'), labels, 0, (index) => index === 2)).toBe(3);
  });
});

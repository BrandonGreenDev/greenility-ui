import { describe, expect, it } from 'vitest';
import { getNextIndex, keyToAction } from './listNavigation';

const none = () => false;
const disabledSet = (...indexes: number[]) => {
  const set = new Set(indexes);
  return (index: number) => set.has(index);
};

describe('getNextIndex', () => {
  it('moves next and previous', () => {
    expect(getNextIndex(5, 1, 'next', none, true)).toBe(2);
    expect(getNextIndex(5, 1, 'prev', none, true)).toBe(0);
  });

  it('wraps when loop is true', () => {
    expect(getNextIndex(5, 4, 'next', none, true)).toBe(0);
    expect(getNextIndex(5, 0, 'prev', none, true)).toBe(4);
  });

  it('stays at the ends when loop is false', () => {
    expect(getNextIndex(5, 4, 'next', none, false)).toBe(4);
    expect(getNextIndex(5, 0, 'prev', none, false)).toBe(0);
  });

  it('starts from the first or last item when nothing is active', () => {
    expect(getNextIndex(5, -1, 'next', none, false)).toBe(0);
    expect(getNextIndex(5, -1, 'prev', none, false)).toBe(4);
  });

  it('skips disabled items', () => {
    const isDisabled = disabledSet(0, 2, 4);
    expect(getNextIndex(5, 1, 'next', isDisabled, true)).toBe(3);
    expect(getNextIndex(5, 3, 'next', isDisabled, true)).toBe(1);
    expect(getNextIndex(5, 3, 'next', isDisabled, false)).toBe(3);
    expect(getNextIndex(5, 1, 'prev', isDisabled, false)).toBe(1);
    expect(getNextIndex(5, 0, 'first', isDisabled, false)).toBe(1);
    expect(getNextIndex(5, 0, 'last', isDisabled, false)).toBe(3);
  });

  it('returns -1 when every item is disabled or there are none', () => {
    const all = () => true;
    for (const action of ['next', 'prev', 'first', 'last', { by: 10 }] as const) {
      expect(getNextIndex(3, 0, action, all, true)).toBe(-1);
    }
    expect(getNextIndex(0, -1, 'next', none, true)).toBe(-1);
  });

  it('moves by n enabled items, clamping and never wrapping', () => {
    expect(getNextIndex(30, 0, { by: 10 }, none, true)).toBe(10);
    expect(getNextIndex(30, 25, { by: 10 }, none, true)).toBe(29);
    expect(getNextIndex(30, 5, { by: -10 }, none, true)).toBe(0);
    // Disabled items do not count as steps.
    expect(getNextIndex(30, 0, { by: 3 }, disabledSet(1, 2), true)).toBe(5);
    // The clamp lands on the last enabled item.
    expect(getNextIndex(30, 25, { by: 10 }, disabledSet(29), true)).toBe(28);
    expect(getNextIndex(30, -1, { by: 10 }, none, true)).toBe(9);
  });
});

describe('keyToAction', () => {
  it('maps vertical arrows', () => {
    expect(keyToAction('ArrowDown', 'vertical', false)).toBe('next');
    expect(keyToAction('ArrowUp', 'vertical', false)).toBe('prev');
    expect(keyToAction('ArrowRight', 'vertical', false)).toBeNull();
    expect(keyToAction('ArrowLeft', 'vertical', true)).toBeNull();
  });

  it('maps horizontal arrows', () => {
    expect(keyToAction('ArrowRight', 'horizontal', false)).toBe('next');
    expect(keyToAction('ArrowLeft', 'horizontal', false)).toBe('prev');
    expect(keyToAction('ArrowDown', 'horizontal', false)).toBeNull();
  });

  it('swaps only Left and Right in RTL', () => {
    expect(keyToAction('ArrowRight', 'horizontal', true)).toBe('prev');
    expect(keyToAction('ArrowLeft', 'horizontal', true)).toBe('next');
    expect(keyToAction('ArrowDown', 'vertical', true)).toBe('next');
    expect(keyToAction('ArrowUp', 'vertical', true)).toBe('prev');
    expect(keyToAction('Home', 'horizontal', true)).toBe('first');
    expect(keyToAction('End', 'horizontal', true)).toBe('last');
  });

  it('maps Home and End and ignores other keys', () => {
    expect(keyToAction('Home', 'vertical', false)).toBe('first');
    expect(keyToAction('End', 'vertical', false)).toBe('last');
    expect(keyToAction('a', 'vertical', false)).toBeNull();
    expect(keyToAction('PageDown', 'vertical', false)).toBeNull();
  });
});

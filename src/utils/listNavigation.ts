import type { Orientation } from './types';

/** A step through a list. `{ by: n }` moves across `n` enabled items (PageUp/PageDown). */
export type ListAction = 'next' | 'prev' | 'first' | 'last' | { by: number };

function firstEnabled(count: number, isDisabled: (index: number) => boolean): number {
  for (let i = 0; i < count; i += 1) if (!isDisabled(i)) return i;
  return -1;
}

function lastEnabled(count: number, isDisabled: (index: number) => boolean): number {
  for (let i = count - 1; i >= 0; i -= 1) if (!isDisabled(i)) return i;
  return -1;
}

/**
 * Index of the item to move to from `from` (pass -1 when nothing is active).
 *
 * - Disabled items are skipped; -1 is returned when every item is disabled (or `count` is 0).
 * - `next`/`prev` wrap when `loop` is true. Without `loop` they stay on `from` at the ends.
 *   From -1, `next` goes to the first enabled item and `prev` to the last.
 * - `{ by: n }` moves across `n` enabled items (negative goes back). It clamps at the ends
 *   and never wraps.
 */
export function getNextIndex(
  count: number,
  from: number,
  action: ListAction,
  isDisabled: (index: number) => boolean,
  loop: boolean,
): number {
  const first = firstEnabled(count, isDisabled);
  if (first === -1) return -1;
  const last = lastEnabled(count, isDisabled);
  if (action === 'first') return first;
  if (action === 'last') return last;

  const valid = from >= 0 && from < count && !isDisabled(from);

  if (typeof action === 'object') {
    if (action.by === 0) return valid ? from : first;
    const step = action.by > 0 ? 1 : -1;
    let remaining = Math.abs(action.by);
    let result = valid ? from : -1;
    const start = from >= 0 && from < count ? from : step > 0 ? -1 : count;
    for (let index = start + step; index >= 0 && index < count && remaining > 0; index += step) {
      if (!isDisabled(index)) {
        result = index;
        remaining -= 1;
      }
    }
    if (result !== -1) return result;
    return step > 0 ? last : first;
  }

  const step = action === 'next' ? 1 : -1;
  const start = from >= 0 && from < count ? from : step > 0 ? -1 : count;
  for (let offset = 1; offset <= count; offset += 1) {
    const raw = start + step * offset;
    if (!loop && (raw < 0 || raw >= count)) break;
    const index = ((raw % count) + count) % count;
    if (!isDisabled(index)) return index;
  }
  if (valid) return from;
  return step > 0 ? last : first;
}

/**
 * Maps a key to a list action. Vertical lists use ArrowDown/ArrowUp, horizontal lists use
 * ArrowRight/ArrowLeft (swapped in RTL). Home/End work in both. Returns null for other keys.
 */
export function keyToAction(
  key: string,
  orientation: Orientation,
  rtl: boolean,
): 'next' | 'prev' | 'first' | 'last' | null {
  switch (key) {
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case 'ArrowDown':
      return orientation === 'vertical' ? 'next' : null;
    case 'ArrowUp':
      return orientation === 'vertical' ? 'prev' : null;
    case 'ArrowRight':
      if (orientation !== 'horizontal') return null;
      return rtl ? 'prev' : 'next';
    case 'ArrowLeft':
      if (orientation !== 'horizontal') return null;
      return rtl ? 'next' : 'prev';
    default:
      return null;
  }
}

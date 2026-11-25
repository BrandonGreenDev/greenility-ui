import { useCallback, useEffect, useRef } from 'react';

/** How long the typed buffer lives after the last key, in ms. */
export const TYPEAHEAD_TIMEOUT = 500;

/** The parts of a React or DOM keyboard event that typeahead reads. */
export interface TypeaheadKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
}

export type Typeahead = (
  event: TypeaheadKeyEvent,
  labels: readonly string[],
  current: number,
  isDisabled: (index: number) => boolean,
) => number;

function startsWith(label: string, prefix: string): boolean {
  const head = label.trimStart().slice(0, prefix.length);
  return head.localeCompare(prefix, undefined, { sensitivity: 'base' }) === 0;
}

/**
 * Typeahead over item labels. Call the returned function from `onKeyDown`; it returns the
 * index to move to, or -1 when there is no match or the key is not a typeahead key.
 *
 * - Handles single-character keys without Ctrl, Meta or Alt. Space only counts while the
 *   buffer is non-empty, so an idle Space still activates.
 * - Calls `event.preventDefault()` for every key it consumes, matched or not, so a Space
 *   inside a search ("new y") never activates the item.
 * - The buffer is lower-cased and resets 500ms after the last key.
 * - A buffer of one repeated character cycles through items starting with it, after
 *   `current`. Otherwise the first item starting with the buffer wins, searching from
 *   `current` inclusive and wrapping. Comparison is base-sensitivity (`localeCompare`).
 * - Disabled items never match.
 */
export function useTypeahead(): Typeahead {
  const buffer = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  return useCallback<Typeahead>((event, labels, current, isDisabled) => {
    const { key } = event;
    if (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return -1;
    if (key === ' ' && buffer.current === '') return -1;

    event.preventDefault();
    buffer.current += key.toLowerCase();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      buffer.current = '';
    }, TYPEAHEAD_TIMEOUT);

    const query = buffer.current;
    const count = labels.length;
    if (count === 0) return -1;
    // Keys are single UTF-16 units (key.length === 1), so charAt/repeat are exact here.
    const firstChar = query.charAt(0);
    const repeated = query === firstChar.repeat(query.length);
    const search = repeated ? firstChar : query;
    const startOffset = repeated ? 1 : 0;
    const from = current >= 0 && current < count ? current : repeated ? -1 : 0;

    for (let offset = 0; offset < count; offset += 1) {
      const index = (((from + startOffset + offset) % count) + count) % count;
      if (!isDisabled(index) && startsWith(labels[index] ?? '', search)) return index;
    }
    return -1;
  }, []);
}

import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeRefs } from './composeRefs';
import { cx } from './cx';

describe('cx', () => {
  it('joins truthy class names and skips falsy ones', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });
});

describe('composeRefs', () => {
  it('assigns the node to object and callback refs', () => {
    const objectRef = createRef<HTMLDivElement>();
    const callbackRef = vi.fn();
    const node = document.createElement('div');
    composeRefs(objectRef, callbackRef, undefined)(node);
    expect(objectRef.current).toBe(node);
    expect(callbackRef).toHaveBeenCalledWith(node);
  });
});

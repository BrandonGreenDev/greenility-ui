import { createElement, createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { composeRefs } from './composeRefs';
import { cx } from './cx';
import { isRenderable } from './isRenderable';

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

describe('isRenderable', () => {
  it.each([null, undefined, false])('is false for %s', (node) => {
    expect(isRenderable(node)).toBe(false);
  });

  it.each([0, '', 'text', true, ['a']])('is true for %j', (node) => {
    expect(isRenderable(node)).toBe(true);
  });

  it('is true for an element', () => {
    expect(isRenderable(createElement('span'))).toBe(true);
  });
});

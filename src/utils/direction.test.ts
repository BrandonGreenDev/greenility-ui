import { describe, expect, it } from 'vitest';
import { getDirection } from './direction';

describe('getDirection', () => {
  it('reads the nearest [dir] ancestor', () => {
    const outer = document.createElement('div');
    outer.dir = 'rtl';
    const inner = document.createElement('div');
    inner.dir = 'ltr';
    const a = document.createElement('span');
    const b = document.createElement('span');
    outer.append(a, inner);
    inner.append(b);
    expect(getDirection(a)).toBe('rtl');
    expect(getDirection(b)).toBe('ltr');
    expect(getDirection(outer)).toBe('rtl');
  });

  it('defaults to ltr without a dir attribute, for dir="auto" and for null', () => {
    const element = document.createElement('div');
    expect(getDirection(element)).toBe('ltr');
    element.setAttribute('dir', 'auto');
    expect(getDirection(element)).toBe('ltr');
    expect(getDirection(null)).toBe('ltr');
  });
});

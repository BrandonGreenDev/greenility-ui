import { describe, expect, it } from 'vitest';
import { toIdPart } from './toIdPart';

describe('toIdPart', () => {
  it('keeps letters, digits and hyphens', () => {
    expect(toIdPart('Abc-123')).toBe('Abc-123');
  });

  it('escapes other characters as _<base36 code point>_', () => {
    expect(toIdPart('a b')).toBe('a_w_b');
    expect(toIdPart('a.b')).toBe('a_1a_b');
  });

  it('is injective on values that look like escapes', () => {
    const values = ['a b', 'a_20_b', 'a-b', 'a_w_b', 'a_b', 'a__b', ''];
    const ids = values.map(toIdPart);
    expect(new Set(ids).size).toBe(values.length);
  });

  it('handles characters outside the BMP as one code point', () => {
    expect(toIdPart('😀')).toBe(`_${(0x1f600).toString(36)}_`);
  });

  it('only produces characters valid in an id and a CSS identifier', () => {
    expect(toIdPart('ünïcode / "quotes" #hash')).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

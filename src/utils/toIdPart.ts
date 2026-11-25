const SAFE = /^[A-Za-z0-9-]$/;

/**
 * Turns any string into a fragment that is safe inside an HTML id and a CSS selector.
 *
 * `[A-Za-z0-9-]` are kept. Every other code point, including `_`, becomes
 * `_<code point in base 36>_`. Escaping `_` too keeps the mapping injective
 * (`'a b'` → `'a_w_b'`, while `'a_w_b'` → `'a_2n_w_2n_b'`), so two values never share an id.
 */
export function toIdPart(value: string): string {
  let out = '';
  for (const char of value) {
    out += SAFE.test(char) ? char : `_${(char.codePointAt(0) ?? 0).toString(36)}_`;
  }
  return out;
}

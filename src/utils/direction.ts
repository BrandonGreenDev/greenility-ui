/**
 * Text direction from the nearest `[dir]` ancestor (or the element itself). CSS-only
 * `direction` is not detected, so set the `dir` attribute. `dir="auto"` counts as ltr.
 */
export function getDirection(element: Element | null | undefined): 'ltr' | 'rtl' {
  return element?.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
}

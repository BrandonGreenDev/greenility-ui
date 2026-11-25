const CANDIDATES =
  'a[href], button, input, select, textarea, [tabindex], [contenteditable=""], [contenteditable="true"]';

function isTabbable(element: HTMLElement): boolean {
  if (element.matches(':disabled')) return false;
  if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
  const tabindex = element.getAttribute('tabindex');
  if (tabindex !== null && Number.parseInt(tabindex, 10) < 0) return false;
  if (element.closest('[hidden], [inert]')) return false;
  return true;
}

/**
 * Tabbable descendants of `root`, in DOM order. Excludes disabled controls, negative
 * tabindex, hidden inputs and anything inside `[hidden]` or `[inert]`. It does no layout
 * checks (`display: none`, `visibility`), so it behaves the same in jsdom and browsers.
 */
export function getTabbables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(CANDIDATES)).filter(isTabbable);
}

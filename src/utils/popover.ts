/**
 * Popover helpers for floating layers (Tooltip, Menu, Select listbox) rendered with
 * `popover="manual"`. Feature-guarded: without the Popover API they do nothing and the
 * element stays a `position: fixed` layer (the `.floating` fallback).
 */

/** Shows the element in the top layer. Safe if already showing or disconnected. */
export function showPopover(element: HTMLElement): void {
  if (!('showPopover' in element)) return;
  try {
    element.showPopover();
  } catch {
    // Already showing or not connected; the fixed-position fallback still applies.
  }
}

/** Removes the element from the top layer. Safe if already hidden or disconnected. */
export function hidePopover(element: HTMLElement): void {
  if (!('hidePopover' in element)) return;
  try {
    element.hidePopover();
  } catch {
    // Already hidden or not connected.
  }
}

import { useLayoutEffect, useState, type RefObject } from 'react';
import { getDirection } from '../utils/direction';
import { computePosition } from '../utils/position';
import type { Align, Placement } from '../utils/types';

export interface UseFloatingOptions {
  /** Position only while open. */
  open: boolean;
  /** The element the floating element is placed next to (usually the trigger). */
  anchorRef: RefObject<HTMLElement | null>;
  /** The floating element (composes `.floating`, so its margin is the gap). */
  floatingRef: RefObject<HTMLElement | null>;
  /** Preferred side; flips when there is no room. */
  placement: Placement;
  /** Cross-axis alignment. @default 'center' */
  align?: Align;
  /** Sets min-inline-size to the anchor width (Select listbox). @default false */
  matchAnchorWidth?: boolean;
}

function px(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Positions the floating element while open. Writes `style.left`/`style.top`,
 * `data-placement`, `--gn-floating-available-block-size` and (with `matchAnchorWidth`)
 * `min-inline-size`. Returns the final placement after flipping.
 *
 * Runs in a layout effect, so the element must already be displayed (call `showPopover()`
 * in a layout effect declared before this hook). It re-runs on resize, on scroll (capture)
 * and, where available, from a ResizeObserver on both elements.
 */
export function useFloating({
  open,
  anchorRef,
  floatingRef,
  placement,
  align = 'center',
  matchAnchorWidth = false,
}: UseFloatingOptions): { placement: Placement } {
  const [finalPlacement, setFinalPlacement] = useState<Placement>(placement);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const floating = floatingRef.current;
    if (!anchor || !floating) return;
    const doc = floating.ownerDocument;
    const win = doc.defaultView ?? window;

    const update = () => {
      const anchorRect = anchor.getBoundingClientRect();
      if (matchAnchorWidth) floating.style.minInlineSize = `${anchorRect.width}px`;
      const style = win.getComputedStyle(floating);
      const margin = {
        top: px(style.marginTop),
        right: px(style.marginRight),
        bottom: px(style.marginBottom),
        left: px(style.marginLeft),
      };
      const rect = floating.getBoundingClientRect();
      const vertical = placement === 'top' || placement === 'bottom';
      // The margin is the gap on the main axis. On the cross axis the anchor is widened by the
      // margin, so `align` lines up the visible border box with the anchor edge.
      const box = vertical
        ? {
            x: anchorRect.x - margin.left,
            y: anchorRect.y,
            width: anchorRect.width + margin.left + margin.right,
            height: anchorRect.height,
          }
        : {
            x: anchorRect.x,
            y: anchorRect.y - margin.top,
            width: anchorRect.width,
            height: anchorRect.height + margin.top + margin.bottom,
          };
      const result = computePosition({
        anchor: box,
        floating: {
          width: rect.width + margin.left + margin.right,
          height: rect.height + margin.top + margin.bottom,
        },
        viewport: {
          width: doc.documentElement.clientWidth || win.innerWidth,
          height: doc.documentElement.clientHeight || win.innerHeight,
        },
        placement,
        align,
        rtl: getDirection(anchor) === 'rtl',
      });
      floating.style.left = `${result.x}px`;
      floating.style.top = `${result.y}px`;
      floating.style.setProperty(
        '--gn-floating-available-block-size',
        `${Math.max(0, result.availableBlockSize - margin.top - margin.bottom)}px`,
      );
      floating.setAttribute('data-placement', result.placement);
      setFinalPlacement(result.placement);
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = win.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    // One more pass after paint covers content that settles late (fonts, images).
    schedule();
    win.addEventListener('resize', schedule);
    doc.addEventListener('scroll', schedule, { capture: true, passive: true });
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule);
      observer.observe(anchor);
      observer.observe(floating);
    }

    return () => {
      if (frame) win.cancelAnimationFrame(frame);
      win.removeEventListener('resize', schedule);
      doc.removeEventListener('scroll', schedule, { capture: true });
      observer?.disconnect();
    };
  }, [open, anchorRef, floatingRef, placement, align, matchAnchorWidth]);

  return { placement: finalPlacement };
}

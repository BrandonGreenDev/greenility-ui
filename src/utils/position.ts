import type { Align, Placement } from './types';

/** A rectangle in viewport coordinates. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComputePositionInput {
  /** Anchor border box in viewport coordinates (getBoundingClientRect). */
  anchor: Box;
  /** Floating element MARGIN box size. Its computed margin is the gap and the viewport padding. */
  floating: { width: number; height: number };
  /** Viewport size (layout viewport, without scrollbars). */
  viewport: { width: number; height: number };
  /** Preferred side. `start`/`end` are inline sides and follow `rtl`. */
  placement: Placement;
  /** Cross-axis alignment. `start` lines up with the anchor's inline-start (or top) edge. */
  align: Align;
  /** Right-to-left text direction. */
  rtl: boolean;
}

export interface ComputePositionResult {
  /** Left of the margin box, written to style.left. */
  x: number;
  /** Top of the margin box, written to style.top. */
  y: number;
  /** Placement after flipping. */
  placement: Placement;
  /** Space on the chosen side for top/bottom placements (the viewport height otherwise), for max-block-size. */
  availableBlockSize: number;
}

type Side = 'top' | 'bottom' | 'left' | 'right';

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function toSide(placement: Placement, rtl: boolean): Side {
  if (placement === 'start') return rtl ? 'right' : 'left';
  if (placement === 'end') return rtl ? 'left' : 'right';
  return placement;
}

function toPlacement(side: Side, rtl: boolean): Placement {
  if (side === 'left') return rtl ? 'end' : 'start';
  if (side === 'right') return rtl ? 'start' : 'end';
  return side;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Positions a floating element next to its anchor. Pure, so it is unit-tested without layout.
 *
 * 1. Logical placement/align become physical sides (swapped in RTL).
 * 2. Flips to the opposite side when the preferred side is too small and the opposite side
 *    has more space.
 * 3. Shifts along the cross axis to stay inside the viewport.
 * 4. Reports the space on the chosen side (top/bottom) for a max-block-size.
 */
export function computePosition(input: ComputePositionInput): ComputePositionResult {
  const { anchor, floating, viewport, align, rtl } = input;
  const space: Record<Side, number> = {
    top: anchor.y,
    bottom: viewport.height - (anchor.y + anchor.height),
    left: anchor.x,
    right: viewport.width - (anchor.x + anchor.width),
  };

  let side = toSide(input.placement, rtl);
  const vertical = side === 'top' || side === 'bottom';
  const needed = vertical ? floating.height : floating.width;
  if (needed > space[side] && space[OPPOSITE[side]] > space[side]) side = OPPOSITE[side];

  let x: number;
  let y: number;

  if (vertical) {
    y = side === 'bottom' ? anchor.y + anchor.height : anchor.y - floating.height;
    const inlineStartAligned = rtl ? anchor.x + anchor.width - floating.width : anchor.x;
    const inlineEndAligned = rtl ? anchor.x : anchor.x + anchor.width - floating.width;
    if (align === 'start') x = inlineStartAligned;
    else if (align === 'end') x = inlineEndAligned;
    else x = anchor.x + (anchor.width - floating.width) / 2;
    x = clamp(x, 0, Math.max(0, viewport.width - floating.width));
  } else {
    x = side === 'right' ? anchor.x + anchor.width : anchor.x - floating.width;
    if (align === 'start') y = anchor.y;
    else if (align === 'end') y = anchor.y + anchor.height - floating.height;
    else y = anchor.y + (anchor.height - floating.height) / 2;
    y = clamp(y, 0, Math.max(0, viewport.height - floating.height));
  }

  return {
    x,
    y,
    placement: toPlacement(side, rtl),
    availableBlockSize: vertical ? Math.max(0, space[side]) : viewport.height,
  };
}

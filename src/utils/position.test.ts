import { describe, expect, it } from 'vitest';
import { computePosition, type ComputePositionInput } from './position';

const viewport = { width: 1000, height: 800 };
const floating = { width: 200, height: 100 };
const middle = { x: 400, y: 400, width: 100, height: 40 };

function run(overrides: Partial<ComputePositionInput>) {
  return computePosition({
    anchor: middle,
    floating,
    viewport,
    placement: 'bottom',
    align: 'center',
    rtl: false,
    ...overrides,
  });
}

describe('computePosition', () => {
  describe('placement', () => {
    it.each([
      ['bottom', false, { x: 350, y: 440, placement: 'bottom' }],
      ['top', false, { x: 350, y: 300, placement: 'top' }],
      ['start', false, { x: 200, y: 370, placement: 'start' }],
      ['end', false, { x: 500, y: 370, placement: 'end' }],
      ['start', true, { x: 500, y: 370, placement: 'start' }],
      ['end', true, { x: 200, y: 370, placement: 'end' }],
    ] as const)('%s (rtl: %s)', (placement, rtl, expected) => {
      expect(run({ placement, rtl })).toMatchObject(expected);
    });
  });

  describe('flip', () => {
    it('flips bottom to top when there is no room below', () => {
      const result = run({ anchor: { x: 400, y: 720, width: 100, height: 40 } });
      expect(result).toMatchObject({ placement: 'top', y: 620 });
    });

    it('flips top to bottom when there is no room above', () => {
      const result = run({ placement: 'top', anchor: { x: 400, y: 20, width: 100, height: 40 } });
      expect(result).toMatchObject({ placement: 'bottom', y: 60 });
    });

    it('flips start to end when there is no room on the inline start', () => {
      const result = run({ placement: 'start', anchor: { x: 50, y: 400, width: 100, height: 40 } });
      expect(result).toMatchObject({ placement: 'end', x: 150 });
    });

    it('flips start in RTL using the physical right side', () => {
      const result = run({
        placement: 'start',
        rtl: true,
        anchor: { x: 850, y: 400, width: 100, height: 40 },
      });
      expect(result).toMatchObject({ placement: 'end', x: 650 });
    });

    it('does not flip when the opposite side is smaller', () => {
      const tall = { width: 200, height: 500 };
      const anchor = { x: 400, y: 350, width: 100, height: 40 };
      expect(run({ floating: tall, anchor })).toMatchObject({ placement: 'bottom', y: 390 });
    });

    it('does not flip when the preferred side fits', () => {
      const anchor = { x: 400, y: 600, width: 100, height: 40 };
      expect(run({ anchor })).toMatchObject({ placement: 'bottom', y: 640 });
    });
  });

  describe('shift', () => {
    it('clamps at the start edge', () => {
      expect(run({ anchor: { x: 0, y: 100, width: 40, height: 40 } }).x).toBe(0);
    });

    it('clamps at the end edge', () => {
      expect(run({ anchor: { x: 960, y: 100, width: 40, height: 40 } }).x).toBe(800);
    });

    it('clamps vertically for side placements', () => {
      const result = run({ placement: 'end', anchor: { x: 400, y: 0, width: 100, height: 20 } });
      expect(result.y).toBe(0);
      const low = run({ placement: 'end', anchor: { x: 400, y: 790, width: 100, height: 10 } });
      expect(low.y).toBe(700);
    });

    it('pins to 0 when the element is wider than the viewport', () => {
      expect(run({ floating: { width: 1200, height: 100 } }).x).toBe(0);
    });
  });

  describe('align', () => {
    it.each([
      ['start', false, 400],
      ['center', false, 350],
      ['end', false, 300],
      ['start', true, 300],
      ['center', true, 350],
      ['end', true, 400],
    ] as const)('%s (rtl: %s) for top/bottom', (align, rtl, x) => {
      expect(run({ align, rtl }).x).toBe(x);
    });

    it.each([
      ['start', 400],
      ['center', 370],
      ['end', 340],
    ] as const)('%s for start/end placements (block axis)', (align, y) => {
      expect(run({ placement: 'end', align }).y).toBe(y);
      expect(run({ placement: 'end', align, rtl: true }).y).toBe(y);
    });
  });

  describe('availableBlockSize', () => {
    it('is the space below for bottom', () => {
      expect(run({}).availableBlockSize).toBe(360);
    });

    it('is the space above for top, including after a flip', () => {
      expect(run({ placement: 'top' }).availableBlockSize).toBe(400);
      const flipped = run({ anchor: { x: 400, y: 720, width: 100, height: 40 } });
      expect(flipped.availableBlockSize).toBe(720);
    });

    it('is the viewport height for side placements', () => {
      expect(run({ placement: 'start' }).availableBlockSize).toBe(800);
    });

    it('is never negative', () => {
      const offscreen = { x: 400, y: 900, width: 100, height: 40 };
      expect(run({ anchor: offscreen }).availableBlockSize).toBeGreaterThanOrEqual(0);
    });
  });
});

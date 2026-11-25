import { act, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Align, Placement } from '../utils/types';
import { useFloating } from './useFloating';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function domRect({ x, y, width, height }: Rect): DOMRect {
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  };
}

let anchorRect: Rect = { x: 400, y: 400, width: 100, height: 40 };
let floatingRect: Rect = { x: 0, y: 0, width: 200, height: 100 };

const onPlacement = vi.fn<(placement: Placement) => void>();

function Harness({
  open,
  placement = 'bottom',
  align,
  matchAnchorWidth,
  dir,
}: {
  open: boolean;
  placement?: Placement;
  align?: Align;
  matchAnchorWidth?: boolean;
  dir?: 'rtl';
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const result = useFloating({
    open,
    anchorRef,
    floatingRef,
    placement,
    ...(align && { align }),
    ...(matchAnchorWidth !== undefined && { matchAnchorWidth }),
  });
  onPlacement(result.placement);
  return (
    <div dir={dir}>
      <button
        type="button"
        ref={(node) => {
          anchorRef.current = node;
          if (node) node.getBoundingClientRect = () => domRect(anchorRect);
        }}
      >
        Anchor
      </button>
      <div
        data-testid="floating"
        style={{ margin: '4px' }}
        ref={(node) => {
          floatingRef.current = node;
          if (node) node.getBoundingClientRect = () => domRect(floatingRect);
        }}
      />
    </div>
  );
}

function floatingEl(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>('[data-testid="floating"]');
  if (!element) throw new Error('missing floating element');
  return element;
}

afterEach(() => {
  anchorRect = { x: 400, y: 400, width: 100, height: 40 };
  floatingRect = { x: 0, y: 0, width: 200, height: 100 };
});

// jsdom: documentElement.clientWidth/Height are 0, so the hook falls back to 1024x768.
describe('useFloating', () => {
  it('does nothing while closed', () => {
    const { container } = render(<Harness open={false} />);
    expect(floatingEl(container).style.left).toBe('');
    expect(floatingEl(container)).not.toHaveAttribute('data-placement');
  });

  it('positions below and centred, with the margin as the gap', () => {
    const { container } = render(<Harness open />);
    const element = floatingEl(container);
    // Margin box (208 wide) centred on the anchor widened by the margin: border box at 350.
    expect(element.style.left).toBe('346px');
    expect(element.style.top).toBe('440px');
    expect(element).toHaveAttribute('data-placement', 'bottom');
    // 768 - 440 below the anchor, minus the 8px vertical margin.
    expect(element.style.getPropertyValue('--gn-floating-available-block-size')).toBe('320px');
  });

  it('aligns the border box with the anchor edge for align="start", mirrored in RTL', () => {
    const ltr = render(<Harness open align="start" />);
    // Margin box at 396, so the border box starts at the anchor's left edge (400).
    expect(floatingEl(ltr.container).style.left).toBe('396px');
    ltr.unmount();
    const rtl = render(<Harness open align="start" dir="rtl" />);
    // Border box 300..500: its right edge lines up with the anchor's right edge.
    expect(floatingEl(rtl.container).style.left).toBe('296px');
  });

  it('flips and returns the final placement', () => {
    anchorRect = { x: 400, y: 700, width: 100, height: 40 };
    const { container } = render(<Harness open />);
    expect(floatingEl(container)).toHaveAttribute('data-placement', 'top');
    expect(floatingEl(container).style.top).toBe('592px');
    expect(onPlacement).toHaveBeenLastCalledWith('top');
  });

  it('maps start to the right side in RTL', () => {
    const { container } = render(<Harness open placement="start" dir="rtl" />);
    expect(floatingEl(container).style.left).toBe('500px');
    expect(floatingEl(container)).toHaveAttribute('data-placement', 'start');
  });

  it('sets min-inline-size to the anchor width when matchAnchorWidth', () => {
    const { container } = render(<Harness open matchAnchorWidth />);
    expect(floatingEl(container).style.minInlineSize).toBe('100px');
  });

  it('re-runs on window resize and scroll (throttled to a frame)', async () => {
    const { container } = render(<Harness open />);
    anchorRect = { x: 100, y: 100, width: 100, height: 40 };
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(floatingEl(container).style.left).toBe('46px');
    anchorRect = { x: 100, y: 200, width: 100, height: 40 };
    act(() => {
      document.body.dispatchEvent(new Event('scroll'));
    });
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(floatingEl(container).style.top).toBe('240px');
  });

  it('removes its listeners when closed', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { rerender } = render(<Harness open />);
    rerender(<Harness open={false} />);
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('observes both elements when ResizeObserver exists', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
      },
    );
    const { unmount, container } = render(<Harness open />);
    expect(observe).toHaveBeenCalledWith(floatingEl(container));
    expect(observe).toHaveBeenCalledWith(container.querySelector('button'));
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

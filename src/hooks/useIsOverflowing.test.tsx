import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsOverflowing } from './useIsOverflowing';

function Harness({ axis }: { axis: 'inline' | 'block' }) {
  const ref = useRef<HTMLDivElement>(null);
  const overflowing = useIsOverflowing(ref, axis);
  return (
    <div ref={ref} data-testid="box" data-overflowing={overflowing}>
      <p>Content</p>
    </div>
  );
}

let callbacks: (() => void)[] = [];
const observe = vi.fn();

function stubResizeObserver() {
  callbacks = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
}

function setSize(element: HTMLElement, sizes: Record<string, number>) {
  for (const [name, value] of Object.entries(sizes)) {
    Object.defineProperty(element, name, { configurable: true, value });
  }
}

// Sizes have to exist before the first check, so they are set on the prototype for each test.
function setPrototypeSizes(sizes: Record<string, number>) {
  setSize(HTMLElement.prototype, sizes);
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of ['scrollWidth', 'clientWidth', 'scrollHeight', 'clientHeight']) {
    Reflect.deleteProperty(HTMLElement.prototype, name);
  }
});

describe('useIsOverflowing', () => {
  it('is false when ResizeObserver is unavailable', () => {
    setPrototypeSizes({ scrollHeight: 500, clientHeight: 100 });
    render(<Harness axis="block" />);
    expect(screen.getByTestId('box')).toHaveAttribute('data-overflowing', 'false');
  });

  it('checks the block axis and re-checks on resize', () => {
    stubResizeObserver();
    setPrototypeSizes({ scrollHeight: 500, clientHeight: 100 });
    render(<Harness axis="block" />);
    const box = screen.getByTestId('box');
    expect(box).toHaveAttribute('data-overflowing', 'true');
    expect(observe).toHaveBeenCalledWith(box);
    expect(observe).toHaveBeenCalledWith(screen.getByText('Content'));
    setSize(box, { scrollHeight: 100 });
    act(() => {
      for (const callback of callbacks) callback();
    });
    expect(box).toHaveAttribute('data-overflowing', 'false');
  });

  it('checks the inline axis', () => {
    stubResizeObserver();
    setPrototypeSizes({ scrollWidth: 800, clientWidth: 400, scrollHeight: 0, clientHeight: 0 });
    render(<Harness axis="inline" />);
    expect(screen.getByTestId('box')).toHaveAttribute('data-overflowing', 'true');
  });

  it('re-checks when children change', async () => {
    stubResizeObserver();
    setPrototypeSizes({ scrollHeight: 100, clientHeight: 100 });
    render(<Harness axis="block" />);
    const box = screen.getByTestId('box');
    expect(box).toHaveAttribute('data-overflowing', 'false');
    setSize(box, { scrollHeight: 300 });
    await act(async () => {
      box.append(document.createElement('p'));
      await Promise.resolve();
    });
    expect(box).toHaveAttribute('data-overflowing', 'true');
  });
});

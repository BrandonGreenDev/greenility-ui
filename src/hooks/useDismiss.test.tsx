import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { hasLayers } from '../utils/layerStack';
import { useDismiss, type DismissReason } from './useDismiss';

function Layer({
  name,
  enabled = true,
  outsidePointer,
  onDismiss,
}: {
  name: string;
  enabled?: boolean;
  outsidePointer?: boolean;
  onDismiss: (reason: DismissReason) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  useDismiss({
    enabled,
    refs: [triggerRef, floatingRef],
    onDismiss,
    ...(outsidePointer !== undefined && { outsidePointer }),
  });
  return (
    <>
      <button type="button" ref={triggerRef}>
        {name} trigger
      </button>
      <div ref={floatingRef}>
        <button type="button">{name} item</button>
      </div>
    </>
  );
}

describe('useDismiss', () => {
  it('calls onDismiss("escape"), prevents default and stops propagation', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const outerKeyDown = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- test listener only
      <div onKeyDown={outerKeyDown}>
        <Layer name="Menu" onDismiss={onDismiss} />
      </div>,
    );
    screen.getByRole('button', { name: 'Menu item' }).focus();
    const bubbling = vi.fn();
    document.addEventListener('keydown', bubbling);
    await user.keyboard('{Escape}');
    document.removeEventListener('keydown', bubbling);
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('escape');
    expect(outerKeyDown).not.toHaveBeenCalled();
    expect(bubbling).not.toHaveBeenCalled();
  });

  it('sets defaultPrevented on the Escape event', () => {
    render(<Layer name="Menu" onDismiss={vi.fn()} />);
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores other keys', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Layer name="Menu" onDismiss={onDismiss} />);
    await user.keyboard('{Enter}a');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('lets only the topmost of two layers handle Escape', async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    const inner = vi.fn();
    const { rerender } = render(
      <>
        <Layer name="Outer" onDismiss={outer} />
        <Layer name="Inner" enabled={false} onDismiss={inner} />
      </>,
    );
    rerender(
      <>
        <Layer name="Outer" onDismiss={outer} />
        <Layer name="Inner" onDismiss={inner} />
      </>,
    );
    await user.keyboard('{Escape}');
    expect(inner).toHaveBeenCalledExactlyOnceWith('escape');
    expect(outer).not.toHaveBeenCalled();
    rerender(
      <>
        <Layer name="Outer" onDismiss={outer} />
        <Layer name="Inner" enabled={false} onDismiss={inner} />
      </>,
    );
    await user.keyboard('{Escape}');
    expect(outer).toHaveBeenCalledExactlyOnceWith('escape');
  });

  it('dismisses on an outside pointerdown but not on an inside one', () => {
    const onDismiss = vi.fn();
    render(
      <>
        <Layer name="Menu" onDismiss={onDismiss} />
        <p>Outside</p>
      </>,
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Menu trigger' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Menu item' }));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith('outside');
  });

  it('skips outside pointer handling when outsidePointer is false', () => {
    const onDismiss = vi.fn();
    render(
      <>
        <Layer name="Tooltip" outsidePointer={false} onDismiss={onDismiss} />
        <p>Outside</p>
      </>,
    );
    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('adds no listeners and no layer while disabled', () => {
    const add = vi.spyOn(document, 'addEventListener');
    render(<Layer name="Menu" enabled={false} onDismiss={vi.fn()} />);
    expect(add).not.toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(add).not.toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(hasLayers()).toBe(false);
  });

  it('pops its layer and removes listeners when disabled again', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { rerender } = render(<Layer name="Menu" onDismiss={vi.fn()} />);
    expect(hasLayers()).toBe(true);
    rerender(<Layer name="Menu" enabled={false} onDismiss={vi.fn()} />);
    expect(hasLayers()).toBe(false);
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
  });

  it('calls the latest onDismiss without re-subscribing', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Layer name="Menu" onDismiss={first} />);
    rerender(<Layer name="Menu" onDismiss={second} />);
    await user.keyboard('{Escape}');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });
});

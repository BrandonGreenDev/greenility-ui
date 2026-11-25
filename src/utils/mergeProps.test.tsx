import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cloneTrigger, getElementRef, mergeProps } from './mergeProps';

function fakeEvent(defaultPrevented = false) {
  return { defaultPrevented };
}

describe('mergeProps', () => {
  it('runs their handler first, then ours', () => {
    const order: string[] = [];
    const merged = mergeProps(
      { onClick: () => order.push('theirs') },
      { onClick: () => order.push('ours') },
    );
    (merged.onClick as (event: unknown) => void)(fakeEvent());
    expect(order).toEqual(['theirs', 'ours']);
  });

  it('skips our handler when theirs called preventDefault', () => {
    const ours = vi.fn();
    const merged = mergeProps(
      { onClick: (event: { defaultPrevented: boolean }) => event },
      { onClick: ours },
    );
    (merged.onClick as (event: unknown) => void)(fakeEvent(true));
    expect(ours).not.toHaveBeenCalled();
  });

  it('uses whichever handler exists when only one side has it', () => {
    const ours = vi.fn();
    const theirs = vi.fn();
    expect(mergeProps({}, { onClick: ours }).onClick).toBe(ours);
    expect(mergeProps({ onClick: theirs }, {}).onClick).toBe(theirs);
  });

  it('joins and de-duplicates aria-describedby and aria-labelledby', () => {
    const merged = mergeProps(
      { 'aria-describedby': 'a  b', 'aria-labelledby': 'x' },
      { 'aria-describedby': 'b c', 'aria-labelledby': undefined },
    );
    expect(merged['aria-describedby']).toBe('a b c');
    expect(merged['aria-labelledby']).toBe('x');
    expect(mergeProps({}, { 'aria-describedby': undefined })['aria-describedby']).toBeUndefined();
  });

  it('merges className and shallow-merges style with ours winning', () => {
    const merged = mergeProps(
      { className: 'theirs', style: { color: 'red', margin: 0 } },
      { className: 'ours', style: { color: 'blue' } },
    );
    expect(merged.className).toBe('theirs ours');
    expect(merged.style).toEqual({ color: 'blue', margin: 0 });
  });

  it('lets our owned ARIA win, even as undefined', () => {
    const merged = mergeProps(
      { 'aria-expanded': true, 'aria-controls': 'mine', 'aria-haspopup': 'dialog' },
      { 'aria-expanded': false, 'aria-controls': undefined, 'aria-haspopup': 'menu' },
    );
    expect(merged['aria-expanded']).toBe(false);
    expect(merged['aria-controls']).toBeUndefined();
    expect(merged['aria-haspopup']).toBe('menu');
  });

  it('keeps their id and other props, filling ours in only when theirs are missing', () => {
    expect(mergeProps({ id: 'theirs' }, { id: 'ours' }).id).toBe('theirs');
    expect(mergeProps({}, { id: 'ours' }).id).toBe('ours');
    expect(mergeProps({ title: 'a' }, { title: 'b', tabIndex: -1 })).toEqual({
      title: 'a',
      tabIndex: -1,
    });
  });
});

const Trigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function Trigger(props, ref) {
    return <button ref={ref} type="button" {...props} />;
  },
);

describe('getElementRef', () => {
  it('reads the ref of a forwardRef child', () => {
    const ref = createRef<HTMLButtonElement>();
    expect(getElementRef(<Trigger ref={ref}>Open</Trigger>)).toBe(ref);
  });

  it('is undefined when the element has no ref', () => {
    expect(getElementRef(<Trigger>Open</Trigger>)).toBeUndefined();
  });
});

describe('cloneTrigger', () => {
  it('merges props and keeps both refs pointing at the element', async () => {
    const user = userEvent.setup();
    const theirRef = createRef<HTMLButtonElement>();
    const ourRef = createRef<HTMLButtonElement>();
    const order: string[] = [];
    render(
      cloneTrigger(
        <Trigger ref={theirRef} onClick={() => order.push('theirs')} aria-describedby="hint">
          Open
        </Trigger>,
        {
          onClick: (event: MouseEvent) => {
            expect(event.type).toBe('click');
            order.push('ours');
          },
          'aria-expanded': false,
          'aria-describedby': 'tip',
        },
        ourRef,
      ),
    );
    const button = screen.getByRole('button', { name: 'Open' });
    expect(theirRef.current).toBe(button);
    expect(ourRef.current).toBe(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-describedby', 'hint tip');
    await user.click(button);
    expect(order).toEqual(['theirs', 'ours']);
  });
});

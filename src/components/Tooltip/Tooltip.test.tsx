import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { hasLayers } from '../../utils/layerStack';
import type { Placement } from '../../utils/types';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Tooltip, type TooltipProps } from './Tooltip';

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
}

/** Fires pending timers inside act() so the resulting render is committed. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/**
 * jsdom's `:focus-visible` heuristic remembers the last focus-visible element across tests,
 * and after a focused node is removed the next focus gets `<body>` as relatedTarget, so a
 * later Tab no longer counts as keyboard focus. Focusing and blurring a scratch element
 * resets that, keeping keyboard tests order-independent.
 */
function resetFocusVisible() {
  const scratch = document.createElement('button');
  document.body.append(scratch);
  scratch.focus();
  scratch.blur();
  scratch.remove();
}

/** The bubble is always the trigger's next sibling. */
function getBubble(trigger: HTMLElement = screen.getByRole('button')): HTMLElement {
  const bubble = trigger.nextElementSibling;
  if (!(bubble instanceof HTMLElement)) throw new Error('No tooltip bubble');
  return bubble;
}

function renderTooltip(props: Partial<TooltipProps> = {}, children?: ReactNode) {
  return render(
    <>
      <Tooltip content="Hint" {...props}>
        <button type="button">Trigger</button>
      </Tooltip>
      {children}
    </>,
  );
}

describe('Tooltip', () => {
  beforeEach(() => {
    resetFocusVisible();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('rendering and ARIA', () => {
    it('describes the trigger with the always-mounted tooltip', () => {
      render(
        <Tooltip content="Saves a draft">
          <button type="button">Save</button>
        </Tooltip>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAccessibleName('Save');
      expect(button).toHaveAccessibleDescription('Saves a draft');
      const bubble = getBubble(button);
      expect(bubble).toHaveAttribute('role', 'tooltip');
      expect(bubble).toHaveAttribute('popover', 'manual');
      expect(bubble).toHaveAttribute('hidden');
      expect(bubble).not.toBeVisible();
      expect(button).toHaveAttribute('aria-describedby', bubble.id);
    });

    it('uses a consumer id for the bubble and the description', () => {
      renderTooltip({ id: 'hint' });
      expect(getBubble()).toHaveAttribute('id', 'hint');
      expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'hint');
    });

    it('is never focusable and never takes focus', async () => {
      const user = setup();
      renderTooltip({}, <button type="button">After</button>);
      await user.tab();
      expect(screen.getByRole('tooltip')).toBeVisible();
      expect(screen.getByRole('tooltip')).not.toHaveAttribute('tabindex');
      expect(screen.getByRole('button', { name: 'Trigger' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('decorative: aria-hidden, no role and no description', () => {
      render(
        <Tooltip content="Close" decorative defaultOpen>
          <button type="button" aria-label="Close" />
        </Tooltip>,
      );
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).not.toHaveAttribute('aria-describedby');
      expect(button).toHaveAccessibleDescription('');
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      const bubble = getBubble(button);
      expect(bubble).toHaveAttribute('aria-hidden', 'true');
      expect(bubble).not.toHaveAttribute('role');
      expect(bubble).toHaveTextContent('Close');
    });
  });

  describe('props', () => {
    it('merges className and passes native props to the bubble', () => {
      renderTooltip({
        className: 'extra',
        'data-testid': 'bubble',
        title: 'x',
      } as Partial<TooltipProps>);
      const bubble = getBubble();
      expect(bubble).toBe(screen.getByTestId('bubble'));
      expect(bubble).toHaveClass('extra');
      expect(bubble.classList.length).toBeGreaterThan(1);
      expect(bubble).toHaveAttribute('title', 'x');
    });

    it('keeps the child ref and forwards its own ref to the bubble', () => {
      const childRef = createRef<HTMLButtonElement>();
      const bubbleRef = createRef<HTMLDivElement>();
      render(
        <Tooltip ref={bubbleRef} content="Hint">
          <button ref={childRef} type="button">
            Trigger
          </button>
        </Tooltip>,
      );
      expect(childRef.current).toBe(screen.getByRole('button'));
      expect(bubbleRef.current).toBe(getBubble());
    });

    it('defaults data-placement to top', () => {
      renderTooltip({ defaultOpen: true });
      expect(getBubble()).toHaveAttribute('data-placement', 'top');
    });

    it.each<Placement>(['top', 'bottom', 'start', 'end'])(
      'reflects placement="%s" as data-placement',
      (placement) => {
        renderTooltip({ placement });
        expect(getBubble()).toHaveAttribute('data-placement', placement);
      },
    );

    it('works with a library Button trigger', async () => {
      const user = setup();
      render(
        <Tooltip content="Saves a draft">
          <Button>Save</Button>
        </Tooltip>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAccessibleDescription('Saves a draft');
      await user.hover(button);
      advance(500);
      expect(screen.getByRole('tooltip')).toBeVisible();
    });
  });

  describe('showing and hiding', () => {
    it('shows on hover after the delay, not before, and hides after the grace delay', async () => {
      const user = setup();
      renderTooltip({ delay: 300 });
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(299);
      expect(getBubble()).not.toBeVisible();
      advance(1);
      expect(screen.getByRole('tooltip')).toBeVisible();
      expect(getBubble()).toHaveAttribute('data-popover-open');

      await user.unhover(button);
      advance(99);
      expect(getBubble()).toBeVisible();
      advance(1);
      expect(getBubble()).not.toBeVisible();
      expect(getBubble()).not.toHaveAttribute('data-popover-open');
    });

    it('uses a 500ms hover delay by default', async () => {
      const user = setup();
      renderTooltip();
      await user.hover(screen.getByRole('button'));
      advance(499);
      expect(getBubble()).not.toBeVisible();
      advance(1);
      expect(getBubble()).toBeVisible();
    });

    it('does not show when the pointer leaves before the delay', async () => {
      const user = setup();
      renderTooltip({ delay: 300 });
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(200);
      await user.unhover(button);
      advance(1000);
      expect(getBubble()).not.toBeVisible();
    });

    it('is persistent: no timeout while hovered', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      await user.hover(screen.getByRole('button'));
      advance(100);
      advance(60_000);
      expect(getBubble()).toBeVisible();
    });

    it('calls showPopover when it opens and hidePopover when it closes', async () => {
      const showPopover = vi.spyOn(HTMLElement.prototype, 'showPopover');
      const hidePopover = vi.spyOn(HTMLElement.prototype, 'hidePopover');
      const user = setup();
      renderTooltip({ delay: 100 });
      const button = screen.getByRole('button');
      expect(showPopover).not.toHaveBeenCalled();
      await user.hover(button);
      advance(100);
      expect(showPopover).toHaveBeenCalledTimes(1);
      expect(showPopover.mock.contexts[0]).toBe(getBubble());
      await user.unhover(button);
      advance(100);
      expect(hidePopover).toHaveBeenCalled();
      expect(hidePopover.mock.contexts.at(-1)).toBe(getBubble());
    });

    it('ignores touch pointers', () => {
      renderTooltip({ delay: 0 });
      fireEvent.pointerEnter(screen.getByRole('button'), { pointerType: 'touch' });
      advance(100);
      expect(getBubble()).not.toBeVisible();
    });

    it('hides on pointerdown on the trigger', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(100);
      expect(getBubble()).toBeVisible();
      await user.pointer({ keys: '[MouseLeft>]', target: button });
      expect(getBubble()).not.toBeVisible();
      await user.pointer({ keys: '[/MouseLeft]', target: button });
    });

    it('does not show for the focus caused by a pointer press', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      const button = screen.getByRole('button');
      await user.click(button);
      expect(button).toHaveFocus();
      expect(getBubble()).not.toBeVisible();
      advance(1000);
      expect(getBubble()).not.toBeVisible();
    });
  });

  describe('hoverable (WCAG 1.4.13)', () => {
    it('stays open when the pointer moves onto the bubble within the grace delay', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      await user.hover(screen.getByRole('button'));
      advance(100);
      expect(getBubble()).toBeVisible();
      // Leaving the trigger starts the grace timer; entering the bubble cancels it.
      await user.hover(getBubble());
      advance(500);
      expect(getBubble()).toBeVisible();
    });

    it('cancels the grace timer when the bubble is entered after leaving the trigger', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(100);
      fireEvent.pointerLeave(button, { pointerType: 'mouse' });
      advance(50);
      expect(getBubble()).toBeVisible();
      fireEvent.pointerEnter(getBubble(), { pointerType: 'mouse' });
      advance(500);
      expect(getBubble()).toBeVisible();
    });

    it('hides after the grace delay when the pointer leaves the bubble', async () => {
      const user = setup();
      renderTooltip({ delay: 100 }, <p>Elsewhere</p>);
      await user.hover(screen.getByRole('button'));
      advance(100);
      await user.hover(getBubble());
      await user.hover(screen.getByText('Elsewhere'));
      advance(99);
      expect(getBubble()).toBeVisible();
      advance(1);
      expect(getBubble()).not.toBeVisible();
    });

    it('stays open when the pointer moves back from the bubble to the trigger', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(100);
      await user.hover(getBubble());
      await user.hover(button);
      advance(500);
      expect(getBubble()).toBeVisible();
    });
  });

  describe('keyboard', () => {
    it('shows immediately on keyboard focus and hides on Tab away', async () => {
      const user = setup();
      renderTooltip({}, <button type="button">After</button>);
      await user.tab();
      expect(screen.getByRole('tooltip')).toBeVisible();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(getBubble(screen.getByRole('button', { name: 'Trigger' }))).not.toBeVisible();
    });

    it('stays open while keyboard focus remains after the pointer leaves', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      const button = screen.getByRole('button');
      await user.tab();
      await user.hover(button);
      await user.unhover(button);
      advance(500);
      expect(button).toHaveFocus();
      expect(getBubble()).toBeVisible();
    });

    it('hides on blur', async () => {
      const user = setup();
      renderTooltip();
      await user.tab();
      expect(getBubble()).toBeVisible();
      act(() => {
        screen.getByRole('button').blur();
      });
      expect(getBubble()).not.toBeVisible();
    });

    it('Escape hides it without moving focus and it stays hidden until hover or focus leaves', async () => {
      const user = setup();
      renderTooltip({}, <button type="button">After</button>);
      await user.tab();
      const button = screen.getByRole('button', { name: 'Trigger' });
      await user.keyboard('{Escape}');
      expect(getBubble(button)).not.toBeVisible();
      expect(button).toHaveFocus();

      // Still suppressed: hovering does not bring it back.
      await user.hover(button);
      advance(1000);
      expect(getBubble(button)).not.toBeVisible();

      // Focus leaves and returns: it shows again.
      await user.tab();
      await user.tab({ shift: true });
      expect(button).toHaveFocus();
      expect(getBubble(button)).toBeVisible();
    });

    it('re-hovering after an Escape shows it again', async () => {
      const user = setup();
      renderTooltip({ delay: 100 }, <p>Elsewhere</p>);
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(100);
      await user.keyboard('{Escape}');
      expect(getBubble()).not.toBeVisible();
      await user.hover(screen.getByText('Elsewhere'));
      await user.hover(button);
      advance(100);
      expect(getBubble()).toBeVisible();
    });

    it('lets Escape reach the document when closed', async () => {
      const user = setup();
      const onKeyDown = vi.fn((event: KeyboardEvent) => event.defaultPrevented);
      document.addEventListener('keydown', onKeyDown);
      renderTooltip();
      await user.keyboard('{Escape}');
      document.removeEventListener('keydown', onKeyDown);
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onKeyDown.mock.results[0]?.value).toBe(false);
    });

    it.each(['{Enter}', ' '])('hides when the trigger is activated with %j', async (key) => {
      const user = setup();
      const onClick = vi.fn();
      render(
        <Tooltip content="Hint">
          <button type="button" onClick={onClick}>
            Trigger
          </button>
        </Tooltip>,
      );
      await user.tab();
      expect(getBubble()).toBeVisible();
      await user.keyboard(key);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(getBubble()).not.toBeVisible();
      expect(screen.getByRole('button')).toHaveFocus();
    });
  });

  describe('pointer press and keyboard focus', () => {
    it('a pointerdown without focus does not stop a later Tab from showing it', async () => {
      const user = setup();
      renderTooltip();
      const button = screen.getByRole('button');
      fireEvent.pointerDown(button, { pointerType: 'mouse' });
      expect(button).not.toHaveFocus();
      await user.tab();
      expect(button).toHaveFocus();
      expect(getBubble()).toBeVisible();
    });
  });

  describe('expanded trigger', () => {
    function renderExpandable(expanded: boolean) {
      return (
        <>
          <Tooltip content="Hint" delay={100}>
            <button type="button" aria-expanded={expanded}>
              Trigger
            </button>
          </Tooltip>
          <p>Elsewhere</p>
        </>
      );
    }

    it('shows nothing on hover or keyboard focus while aria-expanded is true', async () => {
      const user = setup();
      const { rerender } = render(renderExpandable(true));
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(1000);
      expect(getBubble()).not.toBeVisible();
      await user.hover(screen.getByText('Elsewhere'));
      advance(100);

      await user.tab();
      expect(button).toHaveFocus();
      expect(getBubble()).not.toBeVisible();

      rerender(renderExpandable(false));
      await user.hover(button);
      advance(100);
      expect(getBubble()).toBeVisible();
    });
  });

  describe('persistence with hover and focus', () => {
    it('Tab focus, then hover and leave past the grace delay: it stays', async () => {
      const user = setup();
      renderTooltip({ delay: 100 }, <p>Elsewhere</p>);
      const button = screen.getByRole('button');
      await user.tab();
      expect(getBubble()).toBeVisible();
      await user.hover(button);
      advance(100);
      await user.hover(screen.getByText('Elsewhere'));
      advance(500);
      expect(button).toHaveFocus();
      expect(getBubble()).toBeVisible();
    });

    it('hover, then Tab focus, then blur while hovered: it stays until the pointer leaves', async () => {
      const user = setup();
      renderTooltip({ delay: 100 }, <p>Elsewhere</p>);
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(100);
      expect(getBubble()).toBeVisible();
      await user.tab();
      expect(button).toHaveFocus();
      act(() => {
        button.blur();
      });
      advance(500);
      expect(getBubble()).toBeVisible();

      await user.hover(screen.getByText('Elsewhere'));
      advance(99);
      expect(getBubble()).toBeVisible();
      advance(1);
      expect(getBubble()).not.toBeVisible();
    });

    it('Escape hides it even when both hover and focus apply', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      const button = screen.getByRole('button');
      await user.tab();
      await user.hover(button);
      advance(100);
      expect(getBubble()).toBeVisible();
      await user.keyboard('{Escape}');
      expect(getBubble()).not.toBeVisible();
      advance(1000);
      expect(getBubble()).not.toBeVisible();
      expect(button).toHaveFocus();
    });

    it('pointerdown hides it even when both hover and focus apply', async () => {
      const user = setup();
      renderTooltip({ delay: 100 });
      const button = screen.getByRole('button');
      await user.tab();
      await user.hover(button);
      advance(100);
      expect(getBubble()).toBeVisible();
      fireEvent.pointerDown(button, { pointerType: 'mouse' });
      expect(getBubble()).not.toBeVisible();
      advance(1000);
      expect(getBubble()).not.toBeVisible();
    });
  });

  describe('Escape is not consumed', () => {
    it('the keydown is not defaultPrevented and reaches outer listeners', async () => {
      const user = setup();
      const seen: { defaultPrevented: boolean }[] = [];
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') seen.push({ defaultPrevented: event.defaultPrevented });
      };
      window.addEventListener('keydown', onKeyDown);
      try {
        renderTooltip();
        await user.tab();
        expect(getBubble()).toBeVisible();
        await user.keyboard('{Escape}');
        expect(getBubble()).not.toBeVisible();
        expect(seen).toEqual([{ defaultPrevented: false }]);
      } finally {
        window.removeEventListener('keydown', onKeyDown);
      }
    });

    it('does not join the layer stack while open', async () => {
      const user = setup();
      renderTooltip();
      expect(hasLayers()).toBe(false);
      await user.tab();
      expect(getBubble()).toBeVisible();
      expect(hasLayers()).toBe(false);
    });

    it('inside a Dialog, one Escape hides the tooltip and closes the Dialog', async () => {
      const user = setup();
      render(
        <Dialog title="Settings" defaultOpen>
          <Tooltip content="Hint" delay={100}>
            <button type="button">Trigger</button>
          </Tooltip>
        </Dialog>,
      );
      const dialog = screen.getByRole('dialog', { name: 'Settings', hidden: true });
      const button = screen.getByRole('button', { name: 'Trigger', hidden: true });
      act(() => {
        button.focus();
      });
      await user.hover(button);
      advance(100);
      expect(getBubble(button)).toBeVisible();
      expect(dialog).toHaveAttribute('open');

      await user.keyboard('{Escape}');
      expect(dialog).not.toHaveAttribute('open');
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('disabled', () => {
    it('renders only the child', () => {
      renderTooltip({ disabled: true });
      const button = screen.getByRole('button');
      expect(button.nextElementSibling).toBeNull();
      expect(document.querySelector('[popover]')).toBeNull();
      expect(button).not.toHaveAttribute('aria-describedby');
    });

    it('never shows on hover or focus, even with defaultOpen', async () => {
      const user = setup();
      renderTooltip({ disabled: true, defaultOpen: true, delay: 0 });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      await user.tab();
      await user.hover(screen.getByRole('button'));
      advance(1000);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('hides when the trigger becomes disabled and does not reappear when re-enabled', async () => {
      const user = setup();
      const { rerender } = renderTooltip({ delay: 100 });
      await user.hover(screen.getByRole('button'));
      advance(100);
      expect(getBubble()).toBeVisible();
      rerender(
        <Tooltip content="Hint" delay={100} disabled>
          <button type="button">Trigger</button>
        </Tooltip>,
      );
      expect(screen.getByRole('button').nextElementSibling).toBeNull();
      rerender(
        <Tooltip content="Hint" delay={100}>
          <button type="button">Trigger</button>
        </Tooltip>,
      );
      expect(getBubble()).not.toBeVisible();
    });
  });

  describe('controlled and uncontrolled', () => {
    it('supports defaultOpen', () => {
      renderTooltip({ defaultOpen: true });
      expect(screen.getByRole('tooltip')).toBeVisible();
    });

    it('follows a controlled open prop', () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderTooltip({ open: false, onOpenChange });
      expect(getBubble()).not.toBeVisible();
      rerender(
        <Tooltip content="Hint" open onOpenChange={onOpenChange}>
          <button type="button">Trigger</button>
        </Tooltip>,
      );
      expect(screen.getByRole('tooltip')).toBeVisible();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('requests changes through onOpenChange without changing a controlled state', async () => {
      const user = setup();
      const onOpenChange = vi.fn();
      const { rerender } = renderTooltip({ open: false, onOpenChange, delay: 100 });
      await user.hover(screen.getByRole('button'));
      advance(100);
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(getBubble()).not.toBeVisible();

      rerender(
        <Tooltip content="Hint" open onOpenChange={onOpenChange} delay={100}>
          <button type="button">Trigger</button>
        </Tooltip>,
      );
      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(getBubble()).toBeVisible();
    });

    it('works fully controlled through state', async () => {
      const user = setup();
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <Tooltip content="Hint" open={open} onOpenChange={setOpen} delay={100}>
              <button type="button">Trigger</button>
            </Tooltip>
            <output>{open ? 'open' : 'closed'}</output>
          </>
        );
      }
      render(<Controlled />);
      await user.hover(screen.getByRole('button'));
      advance(100);
      expect(screen.getByRole('status')).toHaveTextContent('open');
      expect(screen.getByRole('tooltip')).toBeVisible();
      await user.keyboard('{Escape}');
      expect(screen.getByRole('status')).toHaveTextContent('closed');
    });

    it('calls onOpenChange with true and false when uncontrolled', async () => {
      const user = setup();
      const onOpenChange = vi.fn();
      renderTooltip({ onOpenChange, delay: 100 });
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(100);
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      await user.unhover(button);
      advance(100);
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });
  });

  describe('handler composition', () => {
    it('runs the child handlers first and keeps the tooltip behaviour', async () => {
      const user = setup();
      const calls: string[] = [];
      render(
        <Tooltip content="Hint" delay={100}>
          <button
            type="button"
            onPointerEnter={() => calls.push('enter')}
            onPointerLeave={() => calls.push('leave')}
            onFocus={() => calls.push('focus')}
            onBlur={() => calls.push('blur')}
            onKeyDown={() => calls.push('keydown')}
            onPointerDown={() => calls.push('pointerdown')}
          >
            Trigger
          </button>
        </Tooltip>,
      );
      const button = screen.getByRole('button');
      await user.hover(button);
      advance(100);
      expect(getBubble()).toBeVisible();
      await user.click(button);
      await user.keyboard('a');
      act(() => {
        button.blur();
      });
      expect(calls).toEqual(
        expect.arrayContaining(['enter', 'pointerdown', 'focus', 'keydown', 'blur']),
      );
      expect(getBubble()).not.toBeVisible();
    });

    it('skips the tooltip handler when the child calls preventDefault', async () => {
      const user = setup();
      render(
        <Tooltip content="Hint" delay={100}>
          <button
            type="button"
            onPointerEnter={(event) => {
              event.preventDefault();
            }}
          >
            Trigger
          </button>
        </Tooltip>,
      );
      await user.hover(screen.getByRole('button'));
      advance(1000);
      expect(getBubble()).not.toBeVisible();
    });

    it('composes consumer pointer handlers on the bubble', async () => {
      const user = setup();
      const onPointerEnter = vi.fn();
      const onPointerLeave = vi.fn();
      renderTooltip({ delay: 100, onPointerEnter, onPointerLeave }, <p>Elsewhere</p>);
      await user.hover(screen.getByRole('button'));
      advance(100);
      await user.hover(getBubble());
      expect(onPointerEnter).toHaveBeenCalledTimes(1);
      await user.hover(screen.getByText('Elsewhere'));
      expect(onPointerLeave).toHaveBeenCalledTimes(1);
      advance(100);
      expect(getBubble()).not.toBeVisible();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations closed', async () => {
      vi.useRealTimers();
      const { container } = render(
        <Tooltip content="Saves a draft">
          <button type="button">Save</button>
        </Tooltip>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations while open', async () => {
      vi.useRealTimers();
      const { container } = render(
        <Tooltip content="Saves a draft" defaultOpen>
          <button type="button">Save</button>
        </Tooltip>,
      );
      expect(screen.getByRole('tooltip')).toBeVisible();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations while open and decorative', async () => {
      vi.useRealTimers();
      const { container } = render(
        <Tooltip content="Close" decorative defaultOpen>
          <button type="button" aria-label="Close" />
        </Tooltip>,
      );
      expect(getBubble()).toBeVisible();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

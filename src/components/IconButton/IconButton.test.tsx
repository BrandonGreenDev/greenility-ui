import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import type { ButtonVariant, Placement, Size } from '../../utils/types';
import { CloseIcon } from '../Icon';
import { IconButton } from './IconButton';

const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const sizes: Size[] = ['sm', 'md', 'lg'];

/**
 * jsdom's `:focus-visible` heuristic remembers the last focus-visible element across tests,
 * and after a focused node is removed the next focus gets `<body>` as relatedTarget. Focusing
 * and blurring a scratch element resets that, keeping keyboard tests order-independent.
 */
function resetFocusVisible() {
  const scratch = document.createElement('button');
  document.body.append(scratch);
  scratch.focus();
  scratch.blur();
  scratch.remove();
}

describe('IconButton', () => {
  describe('rendering', () => {
    it('renders a native button named by label', () => {
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('aria-label', 'Close');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('renders the icon hidden from assistive technology and no visible text', () => {
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      const svg = button.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(button).toHaveTextContent('');
    });

    it('hides even a labelled icon so the name comes only from label', () => {
      render(<IconButton label="Close dialog" icon={<CloseIcon label="X" />} />);
      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('marks itself as icon-only', () => {
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      expect(screen.getByRole('button')).toHaveAttribute('data-icon-only');
    });

    it('requires label and icon at the type level', () => {
      // Type-level only: these elements are created but never rendered.
      const elements = [
        // @ts-expect-error `label` is required.
        <IconButton key="a" icon={<CloseIcon />} />,
        // @ts-expect-error `icon` is required.
        <IconButton key="b" label="Close" />,
        // @ts-expect-error `children` is not accepted.
        <IconButton key="c" label="Close" icon={<CloseIcon />} children="Text" />,
      ];
      expect(elements).toHaveLength(3);
    });

    it.each(['', ' ', '	  '])('warns when label is empty or whitespace (%j)', (label) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<IconButton label={label} icon={<CloseIcon />} />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('IconButton'));
      warn.mockRestore();
    });

    it('does not warn when label is set', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('props', () => {
    it('defaults to primary and md', () => {
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'primary');
      expect(button).toHaveAttribute('data-size', 'md');
    });

    it.each(variants)('reflects variant="%s"', (variant) => {
      render(<IconButton variant={variant} label="Close" icon={<CloseIcon />} />);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
    });

    it.each(sizes)('reflects size="%s"', (size) => {
      render(<IconButton size={size} label="Close" icon={<CloseIcon />} />);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', size);
    });

    it('merges className', () => {
      render(<IconButton className="extra" label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('extra');
      expect(button.classList.length).toBeGreaterThan(1);
    });

    it('forwards the ref to the button element', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<IconButton ref={ref} label="Close" icon={<CloseIcon />} />);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toBe(screen.getByRole('button', { name: 'Close' }));
    });

    it('passes native props through to the button', () => {
      render(
        <IconButton
          id="close"
          type="submit"
          title="Close"
          data-testid="close-button"
          aria-pressed={false}
          label="Close"
          icon={<CloseIcon />}
        />,
      );
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).toBe(screen.getByTestId('close-button'));
      expect(button).toHaveAttribute('id', 'close');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('title', 'Close');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('keyboard and callbacks', () => {
    it('fires onClick on click, Enter and Space', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<IconButton label="Close" icon={<CloseIcon />} onClick={onClick} />);
      await user.click(screen.getByRole('button'));
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('is reachable with Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <IconButton label="Close" icon={<CloseIcon />} />
        </>,
      );
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });
  });

  describe('disabled', () => {
    it('is natively disabled, skipped by Tab and does not fire onClick', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <>
          <button type="button">Before</button>
          <IconButton disabled label="Close" icon={<CloseIcon />} onClick={onClick} />
          <button type="button">After</button>
        </>,
      );
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).toBeDisabled();
      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });
  });

  describe('loading', () => {
    it('keeps its name, sets aria-disabled and stays focusable', async () => {
      const user = userEvent.setup();
      render(<IconButton loading label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('data-loading');
      expect(button).toBeEnabled();
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('swallows click, Enter and Space', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<IconButton loading label="Close" icon={<CloseIcon />} onClick={onClick} />);
      await user.click(screen.getByRole('button'));
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('is described by loadingLabel while loading', () => {
      const { rerender } = render(<IconButton label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).not.toHaveAttribute('aria-describedby');
      rerender(<IconButton loading label="Close" icon={<CloseIcon />} />);
      expect(button).toHaveAccessibleName('Close');
      expect(button).toHaveAccessibleDescription('Loading');
      rerender(<IconButton loading loadingLabel="Closing" label="Close" icon={<CloseIcon />} />);
      expect(button).toHaveAccessibleDescription('Closing');
    });

    it('keeps focus when a focused button switches to loading', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const { rerender } = render(
        <IconButton label="Close" icon={<CloseIcon />} onClick={onClick} />,
      );
      const button = screen.getByRole('button', { name: 'Close' });
      button.focus();
      rerender(<IconButton loading label="Close" icon={<CloseIcon />} onClick={onClick} />);
      expect(screen.getByRole('button', { name: 'Close' })).toBe(button);
      expect(button).toHaveFocus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not expose the spinner as a status', () => {
      render(<IconButton loading label="Close" icon={<CloseIcon />} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      screen
        .getByRole('button')
        .querySelectorAll('svg')
        .forEach((svg) => {
          expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
        });
    });
  });

  describe('tooltip', () => {
    beforeEach(() => {
      resetFocusVisible();
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    function setup() {
      return userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    }

    function advance(ms: number) {
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    }

    it('is on by default and decorative: the name stays label with no description', () => {
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      const bubble = button.nextElementSibling;
      expect(bubble).toHaveTextContent('Close');
      expect(bubble).toHaveAttribute('aria-hidden', 'true');
      expect(bubble).not.toHaveAttribute('role');
      expect(bubble).not.toBeVisible();
      expect(button).toHaveAttribute('aria-label', 'Close');
      expect(button).not.toHaveAttribute('aria-describedby');
      expect(button).toHaveAccessibleDescription('');
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows the label on hover after the default delay', async () => {
      const user = setup();
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      await user.hover(button);
      advance(499);
      expect(button.nextElementSibling).not.toBeVisible();
      advance(1);
      expect(button.nextElementSibling).toBeVisible();
      expect(screen.getByText('Close')).toBeVisible();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      expect(button).toHaveAccessibleName('Close');
      expect(button).toHaveAccessibleDescription('');

      await user.unhover(button);
      advance(100);
      expect(button.nextElementSibling).not.toBeVisible();
    });

    it('shows on keyboard focus and hides on Escape with focus kept', async () => {
      const user = setup();
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      await user.tab();
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).toHaveFocus();
      expect(button.nextElementSibling).toBeVisible();
      await user.keyboard('{Escape}');
      expect(button.nextElementSibling).not.toBeVisible();
      expect(button).toHaveFocus();
    });

    it('hides when the button is activated', async () => {
      const user = setup();
      const onClick = vi.fn();
      render(<IconButton label="Close" icon={<CloseIcon />} onClick={onClick} />);
      await user.tab();
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button.nextElementSibling).toBeVisible();
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(button.nextElementSibling).not.toBeVisible();
    });

    it('ignores touch pointers', () => {
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      fireEvent.pointerEnter(button, { pointerType: 'touch' });
      advance(1000);
      expect(button.nextElementSibling).not.toBeVisible();
    });

    it('defaults tooltipPlacement to top', () => {
      render(<IconButton label="Close" icon={<CloseIcon />} />);
      expect(screen.getByRole('button').nextElementSibling).toHaveAttribute(
        'data-placement',
        'top',
      );
    });

    it.each<Placement>(['top', 'bottom', 'start', 'end'])(
      'passes tooltipPlacement="%s" to the tooltip',
      (placement) => {
        render(<IconButton label="Close" icon={<CloseIcon />} tooltipPlacement={placement} />);
        expect(screen.getByRole('button').nextElementSibling).toHaveAttribute(
          'data-placement',
          placement,
        );
      },
    );

    it('renders no bubble with tooltip={false}', async () => {
      const user = setup();
      render(<IconButton tooltip={false} label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button.nextElementSibling).toBeNull();
      await user.hover(button);
      advance(1000);
      expect(button.nextElementSibling).toBeNull();
      expect(document.querySelector('[popover]')).toBeNull();
    });

    it('renders no bubble while disabled', () => {
      const { rerender } = render(<IconButton label="Close" icon={<CloseIcon />} />);
      expect(screen.getByRole('button').nextElementSibling).not.toBeNull();
      rerender(<IconButton disabled label="Close" icon={<CloseIcon />} />);
      expect(screen.getByRole('button').nextElementSibling).toBeNull();
    });

    it.each(['', '   '])('renders no bubble when label is empty (%j)', (label) => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<IconButton label={label} icon={<CloseIcon />} />);
      expect(screen.getByRole('button').nextElementSibling).toBeNull();
    });

    it('keeps the ref on the button and the bubble as a sibling, not a wrapper', () => {
      const ref = createRef<HTMLButtonElement>();
      const { container } = render(<IconButton ref={ref} label="Close" icon={<CloseIcon />} />);
      const button = screen.getByRole('button', { name: 'Close' });
      expect(ref.current).toBe(button);
      expect(button.parentElement).toBe(container);
      expect(container.children).toHaveLength(2);
    });

    it('has no axe violations with the tooltip open', async () => {
      const user = setup();
      const { container } = render(<IconButton label="Close" icon={<CloseIcon />} />);
      await user.hover(screen.getByRole('button'));
      advance(500);
      expect(screen.getByText('Close')).toBeVisible();
      vi.useRealTimers();
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations by default', async () => {
      const { container } = render(<IconButton label="Close" icon={<CloseIcon />} />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it.each(variants)('has no axe violations for variant="%s"', async (variant) => {
      const { container } = render(
        <IconButton variant={variant} label="Close" icon={<CloseIcon />} />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(<IconButton disabled label="Close" icon={<CloseIcon />} />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when loading', async () => {
      const { container } = render(<IconButton loading label="Close" icon={<CloseIcon />} />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

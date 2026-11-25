import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import type { ButtonVariant, Size } from '../../utils/types';
import { CloseIcon } from '../Icon';
import { IconButton } from './IconButton';

const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const sizes: Size[] = ['sm', 'md', 'lg'];

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

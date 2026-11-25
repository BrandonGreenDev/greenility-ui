import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import type { ButtonVariant, Size } from '../../utils/types';
import { CheckIcon, ChevronDownIcon } from '../Icon';
import { Button } from './Button';

const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const sizes: Size[] = ['sm', 'md', 'lg'];

function renderInForm(ui: ReactNode) {
  const onSubmit = vi.fn();
  const utils = render(
    <form
      aria-label="Profile"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input aria-label="Name" />
      {ui}
    </form>,
  );
  return { ...utils, onSubmit };
}

describe('Button', () => {
  describe('rendering', () => {
    it('renders a native button named by its children', () => {
      render(<Button>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button.tagName).toBe('BUTTON');
    });

    it('takes its accessible name from rich children', () => {
      render(
        <Button>
          Save <strong>draft</strong>
        </Button>,
      );
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
    });

    it('is not disabled or loading by default', () => {
      render(<Button>Save</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).not.toHaveAttribute('data-loading');
    });
  });

  describe('type', () => {
    it('defaults to type="button" and does not submit a form', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInForm(<Button>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAttribute('type', 'button');
      await user.click(button);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits with type="submit" on click', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInForm(<Button type="submit">Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAttribute('type', 'submit');
      await user.click(button);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('submits with type="submit" on Enter in a text input', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInForm(<Button type="submit">Save</Button>);
      await user.type(screen.getByLabelText('Name'), 'Ada{Enter}');
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('resets the form with type="reset"', async () => {
      const user = userEvent.setup();
      renderInForm(<Button type="reset">Reset</Button>);
      const input = screen.getByLabelText<HTMLInputElement>('Name');
      await user.type(input, 'Ada');
      expect(input).toHaveValue('Ada');
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      expect(input).toHaveValue('');
    });
  });

  describe('props', () => {
    it('defaults to primary and md', () => {
      render(<Button>Save</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'primary');
      expect(button).toHaveAttribute('data-size', 'md');
    });

    it.each(variants)('reflects variant="%s" as data-variant', (variant) => {
      render(<Button variant={variant}>Save</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
    });

    it.each(sizes)('reflects size="%s" as data-size', (size) => {
      render(<Button size={size}>Save</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-size', size);
    });

    it('merges className with its own class', () => {
      render(<Button className="extra">Save</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('extra');
      expect(button.classList.length).toBeGreaterThan(1);
    });

    it('forwards the ref to the button element', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Save</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toBe(screen.getByRole('button'));
    });

    it('passes native props and ARIA attributes through to the button', () => {
      render(
        <>
          <p id="hint">Saves your work</p>
          <Button
            id="save"
            name="action"
            value="save"
            form="other-form"
            title="Save now"
            data-testid="save-button"
            aria-describedby="hint"
            aria-expanded={false}
          >
            Save
          </Button>
        </>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toBe(screen.getByTestId('save-button'));
      expect(button).toHaveAttribute('id', 'save');
      expect(button).toHaveAttribute('name', 'action');
      expect(button).toHaveAttribute('value', 'save');
      expect(button).toHaveAttribute('form', 'other-form');
      expect(button).toHaveAttribute('title', 'Save now');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAccessibleDescription('Saves your work');
    });

    it('passes other event handlers through', async () => {
      const user = userEvent.setup();
      const onFocus = vi.fn();
      const onKeyDown = vi.fn();
      render(
        <Button onFocus={onFocus} onKeyDown={onKeyDown}>
          Save
        </Button>,
      );
      await user.tab();
      expect(onFocus).toHaveBeenCalledTimes(1);
      await user.keyboard('a');
      expect(onKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe('icons', () => {
    it('wraps start and end icons in aria-hidden and keeps the name to the label', () => {
      render(
        <Button startIcon={<CheckIcon label="check" />} endIcon={<ChevronDownIcon label="more" />}>
          Save
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      const svgs = button.querySelectorAll('svg');
      expect(svgs).toHaveLength(2);
      svgs.forEach((svg) => {
        expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
      });
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('places the start icon before and the end icon after the label', () => {
      render(
        <Button startIcon={<span>S</span>} endIcon={<span>E</span>}>
          Save
        </Button>,
      );
      expect(screen.getByRole('button')).toHaveTextContent(/^SSaveE$/);
    });

    it('renders no icon wrappers when no icons are given', () => {
      render(<Button>Save</Button>);
      expect(screen.getByRole('button').querySelector('[aria-hidden="true"]')).toBeNull();
    });
  });

  describe('keyboard', () => {
    it('fires onClick on click, Enter and Space with the event', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Save</Button>);
      const button = screen.getByRole('button');
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(button).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(2);
      await user.keyboard(' ');
      expect(onClick).toHaveBeenCalledTimes(3);
      expect(onClick.mock.calls[0]?.[0]).toHaveProperty('type', 'click');
      expect(onClick.mock.calls[0]?.[0]).toHaveProperty('target', button);
    });

    it('moves focus in and out with Tab and Shift+Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <Button>Save</Button>
          <button type="button">After</button>
        </>,
      );
      const save = screen.getByRole('button', { name: 'Save' });
      await user.tab();
      await user.tab();
      expect(save).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(save).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
    });
  });

  describe('disabled', () => {
    it('uses native disabled and does not set aria-disabled', () => {
      render(<Button disabled>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toBeDisabled();
      expect(button).not.toHaveAttribute('aria-disabled');
    });

    it('does not fire onClick on click', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Save
        </Button>,
      );
      await user.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('is skipped by Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <Button disabled>Save</Button>
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Save' })).not.toHaveFocus();
    });

    it('does not submit a form', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInForm(
        <Button type="submit" disabled>
          Save
        </Button>,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('wins over loading', () => {
      render(
        <Button disabled loading>
          Save
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toBeDisabled();
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).not.toHaveAttribute('data-loading');
      expect(button.querySelector('svg')).toBeNull();
    });
  });

  describe('caller aria-disabled', () => {
    it('passes aria-disabled through without data-loading or native disabled', () => {
      render(<Button aria-disabled="true">Next</Button>);
      const button = screen.getByRole('button', { name: 'Next' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).not.toHaveAttribute('data-loading');
      expect(button).toBeEnabled();
    });

    it('stays focusable and leaves click suppression to the caller', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button aria-disabled="true" onClick={onClick}>
          Next
        </Button>,
      );
      await user.tab();
      const button = screen.getByRole('button', { name: 'Next' });
      expect(button).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledOnce();
      expect(button).toHaveFocus();
    });

    it('has no axe violations', async () => {
      const { container } = render(<Button aria-disabled="true">Next</Button>);
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('loading', () => {
    it('sets aria-disabled and data-loading but not native disabled', () => {
      render(<Button loading>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('data-loading');
      expect(button).toBeEnabled();
    });

    it('keeps the accessible name unchanged', () => {
      render(<Button loading>Save</Button>);
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('is described as "Loading" while loading, and not otherwise', () => {
      const { rerender } = render(<Button>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).not.toHaveAttribute('aria-describedby');
      rerender(<Button loading>Save</Button>);
      expect(button).toHaveAccessibleName('Save');
      expect(button).toHaveAccessibleDescription('Loading');
      rerender(<Button>Save</Button>);
      expect(button).not.toHaveAttribute('aria-describedby');
    });

    it('uses a custom loadingLabel as the description', () => {
      render(
        <Button loading loadingLabel="Saving">
          Save
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      expect(button).toHaveAccessibleDescription('Saving');
    });

    it('keeps a consumer aria-describedby alongside the loading description', () => {
      render(
        <>
          <p id="hint">Saves the draft</p>
          <Button loading aria-describedby="hint">
            Save
          </Button>
        </>,
      );
      expect(screen.getByRole('button', { name: 'Save' })).toHaveAccessibleDescription(
        'Saves the draft Loading',
      );
    });

    it('has no loading description when disabled wins', () => {
      render(
        <Button disabled loading>
          Save
        </Button>,
      );
      expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-describedby');
    });

    it('shows an aria-hidden spinner sized like the button', () => {
      render(
        <Button loading size="lg">
          Save
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Save' });
      const spinner = button.querySelector('svg')?.parentElement;
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
      expect(spinner).toHaveAttribute('data-size', 'lg');
    });

    it('stays reachable with Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          <Button loading>Save</Button>
        </>,
      );
      await user.tab();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    });

    it('does not call onClick on click, Enter or Space', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );
      const button = screen.getByRole('button');
      await user.click(button);
      expect(button).toHaveFocus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('does not submit a form on click', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInForm(
        <Button type="submit" loading>
          Save
        </Button>,
      );
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit a form on Enter in a text input', async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderInForm(
        <Button type="submit" loading>
          Save
        </Button>,
      );
      await user.type(screen.getByLabelText('Name'), 'Ada{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('keeps focus after button.focus() and a rerender to loading', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const { rerender } = render(<Button onClick={onClick}>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      button.focus();
      rerender(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );
      expect(button).toHaveFocus();
      expect(button).toHaveAccessibleName('Save');
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('keeps focus when a focused button switches to loading and back', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const { rerender } = render(<Button onClick={onClick}>Save</Button>);
      const button = screen.getByRole('button', { name: 'Save' });
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
      rerender(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      );
      expect(screen.getByRole('button', { name: 'Save' })).toBe(button);
      expect(button).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(1);
      rerender(<Button onClick={onClick}>Save</Button>);
      expect(button).toHaveFocus();
      expect(button).not.toHaveAttribute('aria-disabled');
      expect(button).not.toHaveAttribute('data-loading');
      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('accessibility', () => {
    it('has no axe violations by default', async () => {
      const { container } = render(<Button>Save</Button>);
      expect(await axe(container)).toHaveNoViolations();
    });

    it.each(variants)('has no axe violations for variant="%s"', async (variant) => {
      const { container } = render(<Button variant={variant}>Save</Button>);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with icons', async () => {
      const { container } = render(
        <Button startIcon={<CheckIcon />} endIcon={<ChevronDownIcon />}>
          Save
        </Button>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(<Button disabled>Save</Button>);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when loading', async () => {
      const { container } = render(<Button loading>Save</Button>);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

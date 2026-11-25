import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type ChangeEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import type { CheckedState } from '../../utils/types';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  describe('rendering', () => {
    it('renders a native checkbox named by its label', () => {
      render(<Checkbox label="Subscribe" />);
      const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
      expect(checkbox).toHaveAttribute('type', 'checkbox');
      expect(checkbox).not.toBeChecked();
      expect(checkbox).not.toBePartiallyChecked();
    });

    it('links the label with htmlFor', () => {
      render(<Checkbox label="Subscribe" />);
      const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
      expect(screen.getByText('Subscribe').closest('label')).toHaveAttribute('for', checkbox.id);
    });

    it('uses a consumer id', () => {
      render(<Checkbox label="Subscribe" id="sub" />);
      expect(screen.getByRole('checkbox', { name: 'Subscribe' })).toHaveAttribute('id', 'sub');
    });

    it('hides both glyphs from assistive technology', () => {
      const { container } = render(<Checkbox label="Subscribe" />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(2);
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('does not set aria-checked', () => {
      render(<Checkbox label="All" checked="indeterminate" onChange={() => undefined} />);
      expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-checked');
    });
  });

  describe('props', () => {
    it('merges className and style on the root, not the input', () => {
      const { container } = render(
        <Checkbox label="Subscribe" className="extra" style={{ marginTop: 4 }} />,
      );
      const root = container.firstElementChild;
      const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
      expect(root).toHaveClass('extra');
      expect(root).toHaveStyle({ marginTop: '4px' });
      expect(root).toContainElement(checkbox);
      expect(checkbox).not.toHaveClass('extra');
    });

    it('passes native props through to the input', () => {
      render(
        <Checkbox label="Subscribe" name="news" value="yes" data-testid="cb" aria-label="News" />,
      );
      const checkbox = screen.getByRole('checkbox', { name: 'News' });
      expect(checkbox).toHaveAttribute('name', 'news');
      expect(checkbox).toHaveAttribute('value', 'yes');
      expect(checkbox).toHaveAttribute('data-testid', 'cb');
    });

    it('forwards the ref to the input', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Checkbox ref={ref} label="Subscribe" />);
      expect(ref.current).toBe(screen.getByRole('checkbox', { name: 'Subscribe' }));
    });

    it('supports a callback ref', () => {
      let node: HTMLInputElement | null = null;
      render(
        <Checkbox
          ref={(el) => {
            node = el;
          }}
          label="Subscribe"
        />,
      );
      expect(node).toBe(screen.getByRole('checkbox', { name: 'Subscribe' }));
    });

    it('merges a consumer aria-describedby after its own ids', () => {
      render(
        <>
          <Checkbox label="Terms" description="Read them." aria-describedby="hint" />
          <p id="hint">Extra</p>
        </>,
      );
      expect(screen.getByRole('checkbox', { name: 'Terms' })).toHaveAccessibleDescription(
        'Read them. Extra',
      );
    });
  });

  describe('states', () => {
    it('is unchecked by default and checked with defaultChecked', () => {
      render(
        <>
          <Checkbox label="A" />
          <Checkbox label="B" defaultChecked />
        </>,
      );
      expect(screen.getByRole('checkbox', { name: 'A' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'B' })).toBeChecked();
    });

    it('starts indeterminate when uncontrolled', () => {
      render(<Checkbox label="All" defaultChecked="indeterminate" />);
      const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: 'All' });
      expect(checkbox).toBePartiallyChecked();
      expect(checkbox.indeterminate).toBe(true);
      expect(checkbox.checked).toBe(false);
    });

    it('clears uncontrolled indeterminate on click and becomes checked', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(
        <Checkbox label="All" defaultChecked="indeterminate" onCheckedChange={onCheckedChange} />,
      );
      const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: 'All' });
      await user.click(checkbox);
      expect(checkbox.indeterminate).toBe(false);
      expect(checkbox).toBeChecked();
      expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
    });

    it('shows controlled indeterminate as mixed', () => {
      render(<Checkbox label="All" checked="indeterminate" onChange={() => undefined} />);
      const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: 'All' });
      expect(checkbox).toBePartiallyChecked();
      expect(checkbox.indeterminate).toBe(true);
    });

    it('keeps controlled indeterminate after a click when the prop does not change', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Checkbox label="All" checked="indeterminate" onCheckedChange={onCheckedChange} />);
      const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: 'All' });
      await user.click(checkbox);
      expect(onCheckedChange).toHaveBeenCalledTimes(1);
      expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
      expect(checkbox.indeterminate).toBe(true);
      expect(checkbox).toBePartiallyChecked();
      expect(checkbox).not.toBeChecked();
    });

    it('follows the controlled prop through indeterminate, true and false', () => {
      const { rerender } = render(
        <Checkbox label="All" checked="indeterminate" onChange={() => undefined} />,
      );
      const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: 'All' });
      rerender(<Checkbox label="All" checked onChange={() => undefined} />);
      expect(checkbox.indeterminate).toBe(false);
      expect(checkbox).toBeChecked();
      rerender(<Checkbox label="All" checked={false} onChange={() => undefined} />);
      expect(checkbox).not.toBeChecked();
      rerender(<Checkbox label="All" checked="indeterminate" onChange={() => undefined} />);
      expect(checkbox).toBePartiallyChecked();
    });

    it('sets native required', () => {
      render(<Checkbox label="Terms" required />);
      expect(screen.getByRole('checkbox', { name: /Terms/ })).toBeRequired();
    });

    it('is not required by default', () => {
      render(<Checkbox label="Terms" />);
      expect(screen.getByRole('checkbox', { name: 'Terms' })).not.toBeRequired();
    });

    it('wires invalid and the error message', () => {
      render(<Checkbox label="Terms" invalid errorMessage="You must agree." />);
      const checkbox = screen.getByRole('checkbox', { name: 'Terms' });
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
      expect(checkbox).toBeInvalid();
      expect(checkbox).toHaveAccessibleDescription('You must agree.');
    });

    it('omits aria-invalid and hides the error when valid', () => {
      render(<Checkbox label="Terms" errorMessage="You must agree." />);
      const checkbox = screen.getByRole('checkbox', { name: 'Terms' });
      expect(checkbox).not.toHaveAttribute('aria-invalid');
      expect(screen.queryByText('You must agree.')).not.toBeInTheDocument();
      expect(checkbox).not.toHaveAttribute('aria-describedby');
    });

    it('links the description, then the error', () => {
      render(
        <Checkbox
          label="Terms"
          description="Read them first."
          invalid
          errorMessage="You must agree."
        />,
      );
      expect(screen.getByRole('checkbox', { name: 'Terms' })).toHaveAccessibleDescription(
        'Read them first. You must agree.',
      );
    });

    it('disables the input and marks the root', () => {
      const { container } = render(<Checkbox label="Terms" disabled />);
      expect(screen.getByRole('checkbox', { name: 'Terms' })).toBeDisabled();
      expect(container.firstElementChild).toHaveAttribute('data-disabled', 'true');
    });

    it('does not mark the root when enabled', () => {
      const { container } = render(<Checkbox label="Terms" />);
      expect(container.firstElementChild).not.toHaveAttribute('data-disabled');
    });
  });

  describe('keyboard and focus', () => {
    it('is reachable with Tab and toggles with Space', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Checkbox label="Subscribe" onCheckedChange={onCheckedChange} />);
      const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
      await user.tab();
      expect(checkbox).toHaveFocus();
      await user.keyboard(' ');
      expect(checkbox).toBeChecked();
      expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything());
      await user.keyboard(' ');
      expect(checkbox).not.toBeChecked();
      expect(onCheckedChange).toHaveBeenLastCalledWith(false, expect.anything());
    });

    it('goes from indeterminate to checked with Space', async () => {
      const user = userEvent.setup();
      render(<Checkbox label="All" defaultChecked="indeterminate" />);
      const checkbox = screen.getByRole('checkbox', { name: 'All' });
      await user.tab();
      await user.keyboard(' ');
      expect(checkbox).toBeChecked();
      expect(checkbox).not.toBePartiallyChecked();
    });

    it('moves focus on with Tab and back with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Checkbox label="One" />
          <Checkbox label="Two" />
        </>,
      );
      await user.tab();
      expect(screen.getByRole('checkbox', { name: 'One' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('checkbox', { name: 'Two' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('checkbox', { name: 'One' })).toHaveFocus();
    });

    it('is skipped by Tab when disabled', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Checkbox label="Off" disabled />
          <Checkbox label="On" />
        </>,
      );
      await user.tab();
      expect(screen.getByRole('checkbox', { name: 'On' })).toHaveFocus();
    });

    it('toggles and focuses when the label is clicked', async () => {
      const user = userEvent.setup();
      render(<Checkbox label="Subscribe" />);
      const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
      await user.click(screen.getByText('Subscribe'));
      expect(checkbox).toBeChecked();
      expect(checkbox).toHaveFocus();
      await user.click(screen.getByText('Subscribe'));
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('callbacks', () => {
    it('calls onCheckedChange with the boolean and the change event', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Checkbox label="Subscribe" onCheckedChange={onCheckedChange} />);
      const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
      await user.click(checkbox);
      expect(onCheckedChange).toHaveBeenNthCalledWith(
        1,
        true,
        expect.objectContaining({ type: 'change', target: checkbox }),
      );
      await user.click(checkbox);
      expect(onCheckedChange).toHaveBeenNthCalledWith(2, false, expect.anything());
    });

    it('calls the consumer onChange before onCheckedChange', async () => {
      const user = userEvent.setup();
      const calls: string[] = [];
      const onChange = vi.fn((event: ChangeEvent<HTMLInputElement>) => {
        calls.push(`onChange:${String(event.target.checked)}`);
      });
      const onCheckedChange = vi.fn((checked: boolean) => {
        calls.push(`onCheckedChange:${String(checked)}`);
      });
      render(<Checkbox label="Subscribe" onChange={onChange} onCheckedChange={onCheckedChange} />);
      await user.click(screen.getByRole('checkbox', { name: 'Subscribe' }));
      expect(calls).toEqual(['onChange:true', 'onCheckedChange:true']);
    });

    it('is driven by the controlled checked prop', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Checkbox label="Subscribe" checked={false} onCheckedChange={onCheckedChange} />);
      const checkbox = screen.getByRole('checkbox', { name: 'Subscribe' });
      await user.click(checkbox);
      expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
      expect(checkbox).not.toBeChecked();
    });

    it('works as a controlled tri-state with consumer state', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [checked, setChecked] = useState<CheckedState>('indeterminate');
        return <Checkbox label="All" checked={checked} onCheckedChange={setChecked} />;
      }
      render(<Controlled />);
      const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: 'All' });
      expect(checkbox).toBePartiallyChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(checkbox.indeterminate).toBe(false);
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('does not toggle or call handlers when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onCheckedChange = vi.fn();
      render(
        <Checkbox label="Terms" disabled onChange={onChange} onCheckedChange={onCheckedChange} />,
      );
      const checkbox = screen.getByRole('checkbox', { name: 'Terms' });
      await user.click(checkbox);
      await user.click(screen.getByText('Terms'));
      expect(checkbox).not.toBeChecked();
      expect(onChange).not.toHaveBeenCalled();
      expect(onCheckedChange).not.toHaveBeenCalled();
    });
  });

  describe('forms', () => {
    it('submits name and value only when checked', async () => {
      const user = userEvent.setup();
      render(
        <form aria-label="Prefs">
          <Checkbox label="News" name="news" value="yes" />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Prefs' });
      expect(new FormData(form).get('news')).toBeNull();
      await user.click(screen.getByRole('checkbox', { name: 'News' }));
      expect(new FormData(form).get('news')).toBe('yes');
    });

    it('submits "on" when no value is given', () => {
      render(
        <form aria-label="Prefs">
          <Checkbox label="News" name="news" defaultChecked />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Prefs' });
      expect(new FormData(form).get('news')).toBe('on');
    });

    it('does not submit an indeterminate checkbox', () => {
      render(
        <form aria-label="Prefs">
          <Checkbox label="All" name="all" defaultChecked="indeterminate" />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Prefs' });
      expect(new FormData(form).get('all')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations when unchecked', async () => {
      const { container } = render(<Checkbox label="Unchecked" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when checked', async () => {
      const { container } = render(<Checkbox label="Checked" defaultChecked />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when indeterminate', async () => {
      const { container } = render(<Checkbox label="Mixed" defaultChecked="indeterminate" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when invalid with description and required', async () => {
      const { container } = render(
        <Checkbox
          label="Terms"
          description="Read them first."
          required
          invalid
          errorMessage="You must agree."
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(
        <>
          <Checkbox label="Disabled" disabled />
          <Checkbox label="Disabled checked" disabled defaultChecked />
        </>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

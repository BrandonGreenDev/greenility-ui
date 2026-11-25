import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type ChangeEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { Switch } from './Switch';

describe('Switch', () => {
  describe('rendering', () => {
    it('is a native checkbox with role switch, named by its label', () => {
      render(<Switch label="Dark mode" />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      expect(control.tagName).toBe('INPUT');
      expect(control).toHaveAttribute('type', 'checkbox');
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('links the label with htmlFor and uses a consumer id', () => {
      render(<Switch label="Dark mode" id="dark" />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      expect(control).toHaveAttribute('id', 'dark');
      expect(screen.getByText('Dark mode').closest('label')).toHaveAttribute('for', 'dark');
    });

    it('hides the thumb from assistive technology', () => {
      render(<Switch label="Dark mode" />);
      expect(screen.getByRole('switch').nextElementSibling).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not render invalid wiring', () => {
      render(<Switch label="Dark mode" />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      expect(control).not.toHaveAttribute('aria-invalid');
      expect(control).not.toHaveAttribute('aria-describedby');
      expect(control).not.toBeRequired();
    });
  });

  describe('props', () => {
    it('merges className and style on the root, not the input', () => {
      const { container } = render(
        <Switch label="Dark mode" className="extra" style={{ marginTop: 4 }} />,
      );
      const root = container.firstElementChild;
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      expect(root).toHaveClass('extra');
      expect(root).toHaveStyle({ marginTop: '4px' });
      expect(root).toContainElement(control);
      expect(control).not.toHaveClass('extra');
    });

    it('passes native props through to the input', () => {
      render(<Switch label="Dark mode" name="dark" value="1" data-testid="sw" required />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      expect(control).toHaveAttribute('name', 'dark');
      expect(control).toHaveAttribute('value', '1');
      expect(control).toHaveAttribute('data-testid', 'sw');
      expect(control).toBeRequired();
    });

    it('forwards the ref to the input', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Switch ref={ref} label="Dark mode" />);
      expect(ref.current).toBe(screen.getByRole('switch', { name: 'Dark mode' }));
    });

    it('links the description', () => {
      render(<Switch label="Sync" description="Every hour." />);
      expect(screen.getByRole('switch', { name: 'Sync' })).toHaveAccessibleDescription(
        'Every hour.',
      );
    });

    it('merges a consumer aria-describedby after the description', () => {
      render(
        <>
          <Switch label="Sync" description="Every hour." aria-describedby="hint" />
          <p id="hint">Uses data.</p>
        </>,
      );
      expect(screen.getByRole('switch', { name: 'Sync' })).toHaveAccessibleDescription(
        'Every hour. Uses data.',
      );
    });
  });

  describe('states', () => {
    it('is off by default and on with defaultChecked', () => {
      render(
        <>
          <Switch label="A" />
          <Switch label="B" defaultChecked />
        </>,
      );
      expect(screen.getByRole('switch', { name: 'A' })).not.toBeChecked();
      expect(screen.getByRole('switch', { name: 'B' })).toBeChecked();
    });

    it('reflects the checked state for assistive technology', async () => {
      const user = userEvent.setup();
      render(<Switch label="Dark mode" />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      expect(screen.getByRole('switch', { checked: false })).toBe(control);
      await user.click(control);
      expect(screen.getByRole('switch', { checked: true })).toBe(control);
    });

    it('disables the input and marks the root', () => {
      const { container } = render(<Switch label="Sync" disabled />);
      expect(screen.getByRole('switch', { name: 'Sync' })).toBeDisabled();
      expect(container.firstElementChild).toHaveAttribute('data-disabled', 'true');
    });

    it('does not mark the root when enabled', () => {
      const { container } = render(<Switch label="Sync" />);
      expect(container.firstElementChild).not.toHaveAttribute('data-disabled');
    });
  });

  describe('keyboard and focus', () => {
    it('is reachable with Tab and toggles with Space', async () => {
      const user = userEvent.setup();
      render(<Switch label="Dark mode" />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      await user.tab();
      expect(control).toHaveFocus();
      await user.keyboard(' ');
      expect(control).toBeChecked();
      await user.keyboard(' ');
      expect(control).not.toBeChecked();
    });

    it('does nothing on Enter', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch label="Dark mode" onCheckedChange={onCheckedChange} />);
      await user.tab();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('switch', { name: 'Dark mode' })).not.toBeChecked();
      expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it('moves focus with Tab and Shift+Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Switch label="One" />
          <Switch label="Two" />
        </>,
      );
      await user.tab();
      expect(screen.getByRole('switch', { name: 'One' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('switch', { name: 'Two' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('switch', { name: 'One' })).toHaveFocus();
    });

    it('is skipped by Tab when disabled', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Switch label="Off" disabled />
          <Switch label="On" />
        </>,
      );
      await user.tab();
      expect(screen.getByRole('switch', { name: 'On' })).toHaveFocus();
    });

    it('toggles and focuses when the label is clicked', async () => {
      const user = userEvent.setup();
      render(<Switch label="Dark mode" />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      await user.click(screen.getByText('Dark mode'));
      expect(control).toBeChecked();
      expect(control).toHaveFocus();
      await user.click(screen.getByText('Dark mode'));
      expect(control).not.toBeChecked();
    });
  });

  describe('callbacks', () => {
    it('calls onCheckedChange with the boolean and the change event', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch label="Dark mode" onCheckedChange={onCheckedChange} />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      await user.click(control);
      expect(onCheckedChange).toHaveBeenNthCalledWith(
        1,
        true,
        expect.objectContaining({ type: 'change', target: control }),
      );
      await user.click(control);
      expect(onCheckedChange).toHaveBeenNthCalledWith(2, false, expect.anything());
    });

    it('calls the consumer onChange before onCheckedChange', async () => {
      const user = userEvent.setup();
      const calls: string[] = [];
      render(
        <Switch
          label="Dark mode"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            calls.push(`onChange:${String(event.target.checked)}`);
          }}
          onCheckedChange={(checked) => {
            calls.push(`onCheckedChange:${String(checked)}`);
          }}
        />,
      );
      await user.click(screen.getByRole('switch', { name: 'Dark mode' }));
      expect(calls).toEqual(['onChange:true', 'onCheckedChange:true']);
    });

    it('is driven by the controlled checked prop', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      const { rerender } = render(
        <Switch label="Dark mode" checked={false} onCheckedChange={onCheckedChange} />,
      );
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      await user.click(control);
      expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
      expect(control).not.toBeChecked();
      rerender(<Switch label="Dark mode" checked onCheckedChange={onCheckedChange} />);
      expect(control).toBeChecked();
    });

    it('works controlled with consumer state', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [on, setOn] = useState(true);
        return <Switch label="Dark mode" checked={on} onCheckedChange={setOn} />;
      }
      render(<Controlled />);
      const control = screen.getByRole('switch', { name: 'Dark mode' });
      expect(control).toBeChecked();
      await user.click(control);
      expect(control).not.toBeChecked();
      await user.keyboard(' ');
      expect(control).toBeChecked();
    });

    it('does not toggle or call handlers when disabled', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onCheckedChange = vi.fn();
      render(
        <Switch label="Sync" disabled onChange={onChange} onCheckedChange={onCheckedChange} />,
      );
      const control = screen.getByRole('switch', { name: 'Sync' });
      await user.click(control);
      await user.click(screen.getByText('Sync'));
      expect(control).not.toBeChecked();
      expect(onChange).not.toHaveBeenCalled();
      expect(onCheckedChange).not.toHaveBeenCalled();
    });
  });

  describe('forms', () => {
    it('submits name and value only when on', async () => {
      const user = userEvent.setup();
      render(
        <form aria-label="Settings">
          <Switch label="Dark mode" name="dark" value="yes" />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Settings' });
      expect(new FormData(form).get('dark')).toBeNull();
      await user.click(screen.getByRole('switch', { name: 'Dark mode' }));
      expect(new FormData(form).get('dark')).toBe('yes');
    });

    it('submits "on" when no value is given', () => {
      render(
        <form aria-label="Settings">
          <Switch label="Dark mode" name="dark" defaultChecked />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Settings' });
      expect(new FormData(form).get('dark')).toBe('on');
    });
  });

  describe('accessibility', () => {
    it('has no axe violations when off', async () => {
      const { container } = render(<Switch label="Off" description="Help." />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when on', async () => {
      const { container } = render(<Switch label="On" defaultChecked />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(
        <>
          <Switch label="Disabled" disabled />
          <Switch label="Disabled on" disabled defaultChecked />
        </>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

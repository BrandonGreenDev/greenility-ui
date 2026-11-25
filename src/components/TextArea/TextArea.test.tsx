import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type ChangeEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  describe('rendering and labelling', () => {
    it('renders a textarea named by its label', () => {
      render(<TextArea label="Notes" />);
      const textarea = screen.getByRole('textbox', { name: 'Notes' });
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(screen.getByLabelText('Notes')).toBe(textarea);
      expect(screen.getByText('Notes').closest('label')).toHaveAttribute('for', textarea.id);
    });

    it('uses a consumer id', () => {
      render(<TextArea label="Notes" id="notes" />);
      expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveAttribute('id', 'notes');
      expect(screen.getByText('Notes').closest('label')).toHaveAttribute('for', 'notes');
    });
  });

  describe('description and error wiring', () => {
    it('has no aria-describedby without description or error', () => {
      render(<TextArea label="Notes" />);
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
    });

    it('uses the description as the accessible description', () => {
      render(<TextArea label="Notes" description="Visible to the team." />);
      expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveAccessibleDescription(
        'Visible to the team.',
      );
    });

    it('does not render or reference the error when not invalid', () => {
      render(<TextArea label="Notes" description="Help." errorMessage="Too long." />);
      const textarea = screen.getByRole('textbox', { name: 'Notes' });
      expect(screen.queryByText('Too long.')).not.toBeInTheDocument();
      expect(textarea).toHaveAccessibleDescription('Help.');
      expect(textarea).not.toHaveAttribute('aria-invalid');
    });

    it('orders description, error, then consumer ids when invalid', () => {
      render(
        <>
          <TextArea
            label="Notes"
            description="Help."
            invalid
            errorMessage="Too long."
            aria-describedby="extra"
          />
          <p id="extra">Extra.</p>
        </>,
      );
      const textarea = screen.getByRole('textbox', { name: 'Notes' });
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
      expect(textarea).toHaveAccessibleDescription('Help. Too long. Extra.');
      expect(textarea.getAttribute('aria-describedby')?.split(' ')).toEqual([
        screen.getByText('Help.').id,
        screen.getByText('Too long.').closest('p')?.id,
        'extra',
      ]);
    });

    it('never emits aria-invalid="false"', () => {
      render(<TextArea label="Notes" invalid={false} />);
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    });
  });

  describe('states', () => {
    it('sets native required and hides the asterisk', () => {
      render(<TextArea label="Notes" required />);
      expect(screen.getByRole('textbox', { name: 'Notes' })).toBeRequired();
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });

    it('blocks typing and callbacks when disabled', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { container } = render(
        <TextArea label="Notes" disabled onValueChange={onValueChange} />,
      );
      const textarea = screen.getByRole('textbox', { name: 'Notes' });
      expect(textarea).toBeDisabled();
      expect(container.firstElementChild).toHaveAttribute('data-disabled', 'true');
      await user.type(textarea, 'abc');
      expect(textarea).toHaveValue('');
      expect(onValueChange).not.toHaveBeenCalled();
      await user.tab();
      expect(textarea).not.toHaveFocus();
    });

    it('is focusable but not editable when readOnly', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <TextArea label="Notes" readOnly defaultValue="Fixed" onValueChange={onValueChange} />,
      );
      const textarea = screen.getByRole('textbox', { name: 'Notes' });
      expect(textarea).toHaveAttribute('readonly');
      await user.tab();
      expect(textarea).toHaveFocus();
      await user.keyboard('xyz');
      expect(textarea).toHaveValue('Fixed');
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('rows and autoResize', () => {
    it('defaults rows to 3', () => {
      render(<TextArea label="Notes" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '3');
    });

    it('passes a custom rows value', () => {
      render(<TextArea label="Notes" rows={6} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6');
    });

    it('sets data-auto-resize only when autoResize is on', () => {
      const { rerender } = render(<TextArea label="Notes" />);
      expect(screen.getByRole('textbox')).not.toHaveAttribute('data-auto-resize');
      rerender(<TextArea label="Notes" autoResize />);
      expect(screen.getByRole('textbox')).toHaveAttribute('data-auto-resize');
    });

    it('keeps the rows attribute and exposes rows to CSS when autoResize is on', () => {
      render(<TextArea label="Notes" autoResize rows={5} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '5');
      expect(textarea.style.getPropertyValue('--rows')).toBe('5');
    });
  });

  describe('value and callbacks', () => {
    it('calls onChange then onValueChange(value, event)', async () => {
      const user = userEvent.setup();
      const calls: string[] = [];
      const onChange = vi.fn((_event: ChangeEvent<HTMLTextAreaElement>) => {
        calls.push('onChange');
      });
      const onValueChange = vi.fn((_value: string, _event: ChangeEvent<HTMLTextAreaElement>) => {
        calls.push('onValueChange');
      });
      render(<TextArea label="Notes" onChange={onChange} onValueChange={onValueChange} />);
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'hi');
      expect(calls).toEqual(['onChange', 'onValueChange', 'onChange', 'onValueChange']);
      expect(onValueChange).toHaveBeenLastCalledWith('hi', expect.anything());
      const event = onValueChange.mock.calls[1]?.[1];
      expect(event?.target).toBe(textarea);
      expect(onChange.mock.calls[1]?.[0]).toBe(event);
    });

    it('inserts a newline on Enter', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<TextArea label="Notes" onValueChange={onValueChange} />);
      await user.tab();
      await user.keyboard('a{Enter}b');
      expect(screen.getByRole('textbox')).toHaveValue('a\nb');
      expect(onValueChange).toHaveBeenLastCalledWith('a\nb', expect.anything());
    });

    it('leaves the field on Tab instead of inserting a tab character', async () => {
      const user = userEvent.setup();
      render(
        <>
          <TextArea label="Notes" />
          <button type="button">Next</button>
        </>,
      );
      await user.tab();
      expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveFocus();
      await user.keyboard('x');
      await user.tab();
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
      expect(screen.getByRole('textbox')).toHaveValue('x');
    });

    it('updates an uncontrolled textarea from defaultValue', async () => {
      const user = userEvent.setup();
      render(<TextArea label="Notes" defaultValue="Hel" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Hel');
      await user.type(textarea, 'lo');
      expect(textarea).toHaveValue('Hello');
    });

    it('does not change a controlled value without the parent', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<TextArea label="Notes" value="fixed" onValueChange={onValueChange} />);
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'x');
      expect(onValueChange).toHaveBeenCalledWith('fixedx', expect.anything());
      expect(textarea).toHaveValue('fixed');
    });

    it('follows a controlled value updated by the parent', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState('');
        return <TextArea label="Notes" value={value} onValueChange={setValue} />;
      }
      render(<Controlled />);
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'hey');
      expect(textarea).toHaveValue('hey');
    });
  });

  describe('props', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies size %s to the box', (size) => {
      render(<TextArea label="Notes" size={size} />);
      expect(screen.getByRole('textbox').parentElement).toHaveAttribute('data-size', size);
    });

    it('defaults to size md', () => {
      render(<TextArea label="Notes" />);
      expect(screen.getByRole('textbox').parentElement).toHaveAttribute('data-size', 'md');
    });

    it('sends className and style to the root', () => {
      const { container } = render(
        <TextArea label="Notes" className="custom" style={{ maxWidth: '30rem' }} />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass('custom');
      expect(root.className.split(' ').length).toBeGreaterThan(1);
      expect(root).toHaveStyle({ maxWidth: '30rem' });
      expect(screen.getByRole('textbox')).not.toHaveClass('custom');
    });

    it('passes id and other native props to the textarea', () => {
      render(
        <TextArea
          label="Notes"
          id="n"
          name="notes"
          placeholder="Write here"
          maxLength={200}
          data-testid="notes-input"
        />,
      );
      const textarea = screen.getByRole('textbox', { name: 'Notes' });
      expect(textarea).toHaveAttribute('id', 'n');
      expect(textarea).toHaveAttribute('name', 'notes');
      expect(textarea).toHaveAttribute('placeholder', 'Write here');
      expect(textarea).toHaveAttribute('maxlength', '200');
      expect(textarea).toHaveAttribute('data-testid', 'notes-input');
    });

    it('forwards the ref to the native textarea', () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<TextArea label="Notes" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
      expect(ref.current).toBe(screen.getByRole('textbox'));
    });
  });

  describe('form participation', () => {
    it('submits its value and restores defaultValue on reset', async () => {
      const user = userEvent.setup();
      render(
        <form aria-label="Feedback">
          <TextArea label="Notes" name="notes" defaultValue="Draft" />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Feedback' });
      const textarea = screen.getByRole('textbox', { name: 'Notes' });
      expect(new FormData(form).get('notes')).toBe('Draft');
      await user.clear(textarea);
      await user.type(textarea, 'Final');
      expect(new FormData(form).get('notes')).toBe('Final');
      form.reset();
      expect(textarea).toHaveValue('Draft');
      expect(new FormData(form).get('notes')).toBe('Draft');
    });

    it('is left out of form data when disabled', () => {
      render(
        <form aria-label="Feedback">
          <TextArea label="Notes" name="notes" defaultValue="Draft" disabled />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Feedback' });
      expect(new FormData(form).has('notes')).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('has no axe violations by default', async () => {
      const { container } = render(<TextArea label="Notes" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with a description', async () => {
      const { container } = render(<TextArea label="Notes" description="Visible to the team." />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when invalid and required', async () => {
      const { container } = render(
        <TextArea label="Notes" description="Help." required invalid errorMessage="Too long." />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(<TextArea label="Notes" disabled defaultValue="Draft" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with autoResize', async () => {
      const { container } = render(<TextArea label="Notes" autoResize />);
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

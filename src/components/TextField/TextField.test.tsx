import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useRef, useState, type ChangeEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { CloseIcon } from '../Icon';
import { IconButton } from '../IconButton';
import { TextField } from './TextField';

function SearchWithClear() {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <TextField
      ref={inputRef}
      label="Search"
      type="search"
      value={value}
      onValueChange={setValue}
      endAdornment={
        <IconButton
          label="Clear search"
          icon={<CloseIcon />}
          variant="ghost"
          size="sm"
          onClick={() => {
            setValue('');
            inputRef.current?.focus();
          }}
        />
      }
    />
  );
}

describe('TextField', () => {
  describe('rendering and labelling', () => {
    it('renders a text input named by its label', () => {
      render(<TextField label="Name" />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Name')).toBe(input);
    });

    it('associates the label with the input through for/id', () => {
      render(<TextField label="Name" />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(screen.getByText('Name').closest('label')).toHaveAttribute('for', input.id);
    });

    it('uses a consumer id for the input and keeps the label linked', () => {
      render(<TextField label="Name" id="full-name" />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAttribute('id', 'full-name');
      expect(screen.getByText('Name').closest('label')).toHaveAttribute('for', 'full-name');
    });

    it('gives every instance a unique id', () => {
      render(
        <>
          <TextField label="First" />
          <TextField label="Second" />
        </>,
      );
      const first = screen.getByRole('textbox', { name: 'First' });
      const second = screen.getByRole('textbox', { name: 'Second' });
      expect(first.id).not.toBe('');
      expect(first.id).not.toBe(second.id);
    });

    it('passes the type through', () => {
      render(<TextField label="Email" type="email" />);
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('type', 'email');
    });
  });

  describe('description and error wiring', () => {
    it('has no aria-describedby without description or error', () => {
      render(<TextField label="Name" />);
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
    });

    it('uses the description as the accessible description', () => {
      render(<TextField label="Name" description="Shown on reports." />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(
        'Shown on reports.',
      );
    });

    it('does not render or reference the error when not invalid', () => {
      render(<TextField label="Name" description="Help." errorMessage="Required." />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(screen.queryByText('Required.')).not.toBeInTheDocument();
      expect(input).toHaveAccessibleDescription('Help.');
      expect(input).not.toHaveAttribute('aria-invalid');
    });

    it('shows the error and orders description, error, then consumer ids when invalid', () => {
      render(
        <>
          <TextField
            label="Name"
            description="Help."
            invalid
            errorMessage="Required."
            aria-describedby="extra"
          />
          <p id="extra">Extra.</p>
        </>,
      );
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('Help. Required. Extra.');
      const ids = input.getAttribute('aria-describedby')?.split(' ');
      expect(ids).toEqual([
        screen.getByText('Help.').id,
        screen.getByText('Required.').closest('p')?.id,
        'extra',
      ]);
    });

    it('keeps a consumer aria-describedby when there is no description', () => {
      render(
        <>
          <TextField label="Name" aria-describedby="extra" />
          <p id="extra">Extra.</p>
        </>,
      );
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAttribute('aria-describedby', 'extra');
      expect(input).toHaveAccessibleDescription('Extra.');
    });

    it('sets aria-invalid when invalid without an error message, renders no error and warns', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<TextField label="Name" invalid />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).not.toHaveAttribute('aria-describedby');
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('never emits aria-invalid="false"', () => {
      render(<TextField label="Name" invalid={false} />);
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    });
  });

  describe('states', () => {
    it('sets native required and hides the asterisk from assistive technology', () => {
      render(<TextField label="Name" required />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toBeRequired();
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });

    it('is not required and shows no asterisk by default', () => {
      render(<TextField label="Name" />);
      expect(screen.getByRole('textbox')).not.toBeRequired();
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('blocks typing, focus and change callbacks when disabled', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<TextField label="Name" disabled onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toBeDisabled();
      await user.type(input, 'abc');
      expect(input).toHaveValue('');
      expect(onValueChange).not.toHaveBeenCalled();
      await user.tab();
      expect(input).not.toHaveFocus();
    });

    it('marks the root as disabled', () => {
      const { container } = render(<TextField label="Name" disabled />);
      expect(container.firstElementChild).toHaveAttribute('data-disabled', 'true');
    });

    it('is focusable but not editable when readOnly', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<TextField label="Name" readOnly defaultValue="Ada" onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAttribute('readonly');
      await user.tab();
      expect(input).toHaveFocus();
      await user.keyboard('xyz');
      expect(input).toHaveValue('Ada');
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('value and callbacks', () => {
    it('calls onChange then onValueChange(value, event) on every keystroke', async () => {
      const user = userEvent.setup();
      const calls: string[] = [];
      const onChange = vi.fn((_event: ChangeEvent<HTMLInputElement>) => {
        calls.push('onChange');
      });
      const onValueChange = vi.fn((_value: string, _event: ChangeEvent<HTMLInputElement>) => {
        calls.push('onValueChange');
      });
      render(<TextField label="Name" onChange={onChange} onValueChange={onValueChange} />);
      await user.type(screen.getByRole('textbox'), 'ab');
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onValueChange).toHaveBeenCalledTimes(2);
      expect(calls).toEqual(['onChange', 'onValueChange', 'onChange', 'onValueChange']);
      expect(onValueChange).toHaveBeenNthCalledWith(1, 'a', expect.anything());
      expect(onValueChange).toHaveBeenLastCalledWith('ab', expect.anything());
      const event = onValueChange.mock.calls[1]?.[1];
      expect(event?.target).toBe(screen.getByRole('textbox'));
      expect(event?.type).toBe('change');
      expect(onChange.mock.calls[1]?.[0]).toBe(event);
    });

    it('updates an uncontrolled input from defaultValue', async () => {
      const user = userEvent.setup();
      render(<TextField label="Name" defaultValue="Ad" />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveValue('Ad');
      await user.type(input, 'a');
      expect(input).toHaveValue('Ada');
    });

    it('does not change a controlled value without the parent', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<TextField label="Name" value="fixed" onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      await user.type(input, 'x');
      expect(onValueChange).toHaveBeenCalledWith('fixedx', expect.anything());
      expect(input).toHaveValue('fixed');
    });

    it('follows a controlled value updated by the parent', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState('');
        return (
          <>
            <TextField label="Name" value={value} onValueChange={setValue} />
            <output>{value}</output>
          </>
        );
      }
      render(<Controlled />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      await user.type(input, 'Ada');
      expect(input).toHaveValue('Ada');
      expect(screen.getByRole('status')).toHaveTextContent('Ada');
      await user.clear(input);
      expect(input).toHaveValue('');
    });
  });

  describe('props', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies size %s to the box', (size) => {
      render(<TextField label="Name" size={size} />);
      expect(screen.getByRole('textbox').parentElement).toHaveAttribute('data-size', size);
    });

    it('defaults to size md', () => {
      render(<TextField label="Name" />);
      expect(screen.getByRole('textbox').parentElement).toHaveAttribute('data-size', 'md');
    });

    it('sends className and style to the root and merges className', () => {
      const { container } = render(
        <TextField label="Name" className="custom" style={{ maxWidth: '20rem' }} />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass('custom');
      expect(root.className.split(' ').length).toBeGreaterThan(1);
      expect(root).toHaveStyle({ maxWidth: '20rem' });
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('custom');
      expect(input).not.toHaveAttribute('style');
    });

    it('passes id and other native props to the input', () => {
      render(
        <TextField
          label="Name"
          id="n"
          name="fullName"
          placeholder="Ada Lovelace"
          autoComplete="name"
          maxLength={40}
          data-testid="name-input"
        />,
      );
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAttribute('id', 'n');
      expect(input).toHaveAttribute('name', 'fullName');
      expect(input).toHaveAttribute('placeholder', 'Ada Lovelace');
      expect(input).toHaveAttribute('autocomplete', 'name');
      expect(input).toHaveAttribute('maxlength', '40');
      expect(input).toHaveAttribute('data-testid', 'name-input');
    });

    it('forwards the ref to the native input', () => {
      const ref = createRef<HTMLInputElement>();
      render(<TextField label="Name" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toBe(screen.getByRole('textbox'));
    });
  });

  describe('adornments', () => {
    it('renders start and end adornments around the input', () => {
      render(<TextField label="Price" startAdornment="$" endAdornment="USD" />);
      const input = screen.getByRole('textbox', { name: 'Price' });
      const start = screen.getByText('$');
      const end = screen.getByText('USD');
      expect(input.parentElement).toContainElement(start);
      expect(input.parentElement).toContainElement(end);
      expect(start.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(input.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not let adornments change the accessible name', () => {
      render(<TextField label="Price" startAdornment="$" endAdornment="USD" />);
      expect(screen.getByRole('textbox')).toHaveAccessibleName('Price');
    });

    it('clears and refocuses the input from an IconButton end adornment', async () => {
      const user = userEvent.setup();
      render(<SearchWithClear />);
      const input = screen.getByRole('searchbox', { name: 'Search' });
      const clear = screen.getByRole('button', { name: 'Clear search' });
      await user.type(input, 'kiwi');
      expect(input).toHaveValue('kiwi');
      await user.click(clear);
      expect(input).toHaveFocus();
      expect(input).toHaveValue('');
      await user.tab();
      expect(clear).toHaveFocus();
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(input).toHaveFocus();
    });

    it('clears from the keyboard with Enter on the IconButton adornment', async () => {
      const user = userEvent.setup();
      render(<SearchWithClear />);
      const input = screen.getByRole('searchbox', { name: 'Search' });
      await user.type(input, 'kiwi');
      await user.tab();
      expect(screen.getByRole('button', { name: 'Clear search' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(input).toHaveValue('');
      expect(input).toHaveFocus();
    });

    it('has no axe violations with an IconButton adornment', async () => {
      const { container } = render(<SearchWithClear />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('puts an interactive end adornment in the tab order after the input', async () => {
      const user = userEvent.setup();
      render(
        <TextField
          label="Search"
          type="search"
          endAdornment={<button type="button">Clear</button>}
        />,
      );
      await user.tab();
      expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Clear' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveFocus();
    });
  });

  describe('keyboard and focus', () => {
    it('receives focus with Tab and leaves with Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <TextField label="Name" />
          <button type="button">Next</button>
        </>,
      );
      await user.tab();
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
      await user.keyboard('Ada');
      expect(screen.getByRole('textbox')).toHaveValue('Ada');
      await user.tab();
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    });

    it('focuses the input when the label is clicked', async () => {
      const user = userEvent.setup();
      render(<TextField label="Name" />);
      await user.click(screen.getByText('Name'));
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    });

    it('does not move focus when an error appears', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <>
          <TextField label="Name" errorMessage="Required." />
          <button type="button">Other</button>
        </>,
      );
      await user.click(screen.getByRole('button', { name: 'Other' }));
      rerender(
        <>
          <TextField label="Name" invalid errorMessage="Required." />
          <button type="button">Other</button>
        </>,
      );
      expect(screen.getByRole('button', { name: 'Other' })).toHaveFocus();
    });
  });

  describe('form participation', () => {
    it('submits its value under its name and restores defaultValue on reset', async () => {
      const user = userEvent.setup();
      render(
        <form aria-label="Profile">
          <TextField label="Name" name="fullName" defaultValue="Ada" />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Profile' });
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(new FormData(form).get('fullName')).toBe('Ada');
      await user.clear(input);
      await user.type(input, 'Grace');
      expect(new FormData(form).get('fullName')).toBe('Grace');
      form.reset();
      expect(input).toHaveValue('Ada');
      expect(new FormData(form).get('fullName')).toBe('Ada');
    });

    it('is left out of form data when disabled', () => {
      render(
        <form aria-label="Profile">
          <TextField label="Name" name="fullName" defaultValue="Ada" disabled />
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Profile' });
      expect(new FormData(form).has('fullName')).toBe(false);
    });

    it('fails native validation when required and empty', () => {
      render(<TextField label="Name" required />);
      const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Name' });
      expect(input.checkValidity()).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('has no axe violations by default', async () => {
      const { container } = render(<TextField label="Name" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with a description', async () => {
      const { container } = render(<TextField label="Name" description="Shown on reports." />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when invalid and required', async () => {
      const { container } = render(
        <TextField label="Name" description="Help." required invalid errorMessage="Required." />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(<TextField label="Name" disabled defaultValue="Ada" />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with adornments', async () => {
      const { container } = render(
        <TextField
          label="Search"
          type="search"
          startAdornment="$"
          endAdornment={<button type="button">Clear</button>}
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

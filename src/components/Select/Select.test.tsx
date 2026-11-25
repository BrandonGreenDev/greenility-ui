import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState, type ChangeEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { Select } from './Select';

const options = (
  <>
    <option value="a">Alpha</option>
    <option value="b">Bravo</option>
    <option value="c">Charlie</option>
  </>
);

function getSelect(name = 'Letter') {
  return screen.getByRole<HTMLSelectElement>('combobox', { name });
}

describe('Select', () => {
  describe('rendering and labelling', () => {
    it('renders a native select named by its label', () => {
      render(<Select label="Letter">{options}</Select>);
      const select = getSelect();
      expect(select.tagName).toBe('SELECT');
      expect(screen.getByLabelText('Letter')).toBe(select);
      expect(screen.getByText('Letter').closest('label')).toHaveAttribute('for', select.id);
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('selects the first option by default without a placeholder', () => {
      render(<Select label="Letter">{options}</Select>);
      expect(getSelect()).toHaveValue('a');
    });

    it('uses a consumer id', () => {
      render(
        <Select label="Letter" id="letter">
          {options}
        </Select>,
      );
      expect(getSelect()).toHaveAttribute('id', 'letter');
      expect(screen.getByText('Letter').closest('label')).toHaveAttribute('for', 'letter');
    });

    it('renders optgroups', () => {
      render(
        <Select label="Letter">
          <optgroup label="Early">
            <option value="a">Alpha</option>
          </optgroup>
          <optgroup label="Late">
            <option value="z">Zulu</option>
          </optgroup>
        </Select>,
      );
      expect(screen.getAllByRole('group')).toHaveLength(2);
      expect(screen.getByRole('option', { name: 'Zulu' })).toBeInTheDocument();
    });

    it('hides the chevron from assistive technology', () => {
      render(<Select label="Letter">{options}</Select>);
      const svg = getSelect().parentElement?.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('placeholder', () => {
    it('adds a disabled empty first option that is selected by default', () => {
      render(
        <Select label="Letter" placeholder="Pick one">
          {options}
        </Select>,
      );
      const placeholder = screen.getByRole<HTMLOptionElement>('option', { name: 'Pick one' });
      const select = getSelect();
      expect(select.options[0]).toBe(placeholder);
      expect(placeholder).toBeDisabled();
      expect(placeholder.value).toBe('');
      expect(placeholder.selected).toBe(true);
      expect(select).toHaveValue('');
    });

    it('respects defaultValue over the placeholder', () => {
      render(
        <Select label="Letter" placeholder="Pick one" defaultValue="b">
          {options}
        </Select>,
      );
      expect(getSelect()).toHaveValue('b');
    });

    it('shows the placeholder when controlled with value=""', () => {
      render(
        <Select label="Letter" placeholder="Pick one" value="" onValueChange={() => undefined}>
          {options}
        </Select>,
      );
      expect(screen.getByRole<HTMLOptionElement>('option', { name: 'Pick one' }).selected).toBe(
        true,
      );
    });

    it('cannot be chosen again once a real option is selected', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Letter" placeholder="Pick one" onValueChange={onValueChange}>
          {options}
        </Select>,
      );
      await user.selectOptions(getSelect(), 'b');
      onValueChange.mockClear();
      await user.selectOptions(getSelect(), '').catch(() => undefined);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(getSelect()).toHaveValue('b');
    });
  });

  describe('description and error wiring', () => {
    it('has no aria-describedby without description or error', () => {
      render(<Select label="Letter">{options}</Select>);
      expect(getSelect()).not.toHaveAttribute('aria-describedby');
    });

    it('uses the description as the accessible description', () => {
      render(
        <Select label="Letter" description="Used for sorting.">
          {options}
        </Select>,
      );
      expect(getSelect()).toHaveAccessibleDescription('Used for sorting.');
    });

    it('does not render or reference the error when not invalid', () => {
      render(
        <Select label="Letter" description="Help." errorMessage="Pick a letter.">
          {options}
        </Select>,
      );
      expect(screen.queryByText('Pick a letter.')).not.toBeInTheDocument();
      expect(getSelect()).toHaveAccessibleDescription('Help.');
      expect(getSelect()).not.toHaveAttribute('aria-invalid');
    });

    it('orders description, error, then consumer ids when invalid', () => {
      render(
        <>
          <Select
            label="Letter"
            description="Help."
            invalid
            errorMessage="Pick a letter."
            aria-describedby="extra"
          >
            {options}
          </Select>
          <p id="extra">Extra.</p>
        </>,
      );
      const select = getSelect();
      expect(select).toHaveAttribute('aria-invalid', 'true');
      expect(select).toHaveAccessibleDescription('Help. Pick a letter. Extra.');
      expect(select.getAttribute('aria-describedby')?.split(' ')).toEqual([
        screen.getByText('Help.').id,
        screen.getByText('Pick a letter.').closest('p')?.id,
        'extra',
      ]);
    });

    it('never emits aria-invalid="false"', () => {
      render(
        <Select label="Letter" invalid={false}>
          {options}
        </Select>,
      );
      expect(getSelect()).not.toHaveAttribute('aria-invalid');
    });
  });

  describe('states', () => {
    it('sets native required and hides the asterisk', () => {
      render(
        <Select label="Letter" required placeholder="Pick one">
          {options}
        </Select>,
      );
      const select = getSelect();
      expect(select).toBeRequired();
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
      expect(select.checkValidity()).toBe(false);
    });

    it('blocks selection, focus and callbacks when disabled', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { container } = render(
        <Select label="Letter" disabled onValueChange={onValueChange}>
          {options}
        </Select>,
      );
      const select = getSelect();
      expect(select).toBeDisabled();
      expect(container.firstElementChild).toHaveAttribute('data-disabled', 'true');
      await user.selectOptions(select, 'b').catch(() => undefined);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(select).toHaveValue('a');
      await user.tab();
      expect(select).not.toHaveFocus();
    });

    it('does not select a disabled option', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Letter" onValueChange={onValueChange}>
          <option value="a">Alpha</option>
          <option value="b" disabled>
            Bravo
          </option>
        </Select>,
      );
      await user.selectOptions(getSelect(), 'b').catch(() => undefined);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(getSelect()).toHaveValue('a');
    });
  });

  describe('value and callbacks', () => {
    it('calls onChange then onValueChange(value, event) on selection', async () => {
      const user = userEvent.setup();
      const calls: string[] = [];
      const onChange = vi.fn((_event: ChangeEvent<HTMLSelectElement>) => {
        calls.push('onChange');
      });
      const onValueChange = vi.fn((_value: string, _event: ChangeEvent<HTMLSelectElement>) => {
        calls.push('onValueChange');
      });
      render(
        <Select label="Letter" onChange={onChange} onValueChange={onValueChange}>
          {options}
        </Select>,
      );
      const select = getSelect();
      await user.selectOptions(select, 'b');
      expect(calls).toEqual(['onChange', 'onValueChange']);
      expect(onValueChange).toHaveBeenCalledWith('b', expect.anything());
      const event = onValueChange.mock.calls[0]?.[1];
      expect(event?.target).toBe(select);
      expect(event?.type).toBe('change');
      expect(onChange.mock.calls[0]?.[0]).toBe(event);
    });

    it('selects by visible option text', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Letter" onValueChange={onValueChange}>
          {options}
        </Select>,
      );
      await user.selectOptions(getSelect(), 'Charlie');
      expect(onValueChange).toHaveBeenCalledWith('c', expect.anything());
      expect(getSelect()).toHaveValue('c');
    });

    it('updates an uncontrolled select from defaultValue', async () => {
      const user = userEvent.setup();
      render(
        <Select label="Letter" defaultValue="b">
          {options}
        </Select>,
      );
      expect(getSelect()).toHaveValue('b');
      await user.selectOptions(getSelect(), 'c');
      expect(getSelect()).toHaveValue('c');
      expect(screen.getByRole<HTMLOptionElement>('option', { name: 'Charlie' }).selected).toBe(
        true,
      );
    });

    it('does not change a controlled value without the parent', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Letter" value="a" onValueChange={onValueChange}>
          {options}
        </Select>,
      );
      await user.selectOptions(getSelect(), 'b');
      expect(onValueChange).toHaveBeenCalledWith('b', expect.anything());
      expect(getSelect()).toHaveValue('a');
    });

    it('follows a controlled value updated by the parent', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState('');
        return (
          <Select label="Letter" placeholder="Pick one" value={value} onValueChange={setValue}>
            {options}
          </Select>
        );
      }
      render(<Controlled />);
      expect(getSelect()).toHaveValue('');
      await user.selectOptions(getSelect(), 'c');
      expect(getSelect()).toHaveValue('c');
    });
  });

  describe('keyboard and focus', () => {
    it('receives focus with Tab and leaves with Tab', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Select label="Letter">{options}</Select>
          <button type="button">Next</button>
        </>,
      );
      await user.tab();
      expect(getSelect()).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(getSelect()).toHaveFocus();
    });

    it('focuses the select when the label is clicked', async () => {
      const user = userEvent.setup();
      render(<Select label="Letter">{options}</Select>);
      await user.click(screen.getByText('Letter'));
      expect(getSelect()).toHaveFocus();
    });

    it('selects an option from the keyboard after focusing with Tab', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Letter" onValueChange={onValueChange}>
          {options}
        </Select>,
      );
      await user.tab();
      expect(getSelect()).toHaveFocus();
      await user.selectOptions(getSelect(), 'b');
      expect(onValueChange).toHaveBeenCalledWith('b', expect.anything());
      expect(getSelect()).toHaveFocus();
    });
  });

  describe('props', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies size %s to the box', (size) => {
      render(
        <Select label="Letter" size={size}>
          {options}
        </Select>,
      );
      expect(getSelect().parentElement).toHaveAttribute('data-size', size);
    });

    it('defaults to size md', () => {
      render(<Select label="Letter">{options}</Select>);
      expect(getSelect().parentElement).toHaveAttribute('data-size', 'md');
    });

    it('sends className and style to the root', () => {
      const { container } = render(
        <Select label="Letter" className="custom" style={{ maxWidth: '16rem' }}>
          {options}
        </Select>,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass('custom');
      expect(root.className.split(' ').length).toBeGreaterThan(1);
      expect(root).toHaveStyle({ maxWidth: '16rem' });
      expect(getSelect()).not.toHaveClass('custom');
    });

    it('passes id and other native props to the select', () => {
      render(
        <Select label="Letter" id="l" name="letter" autoComplete="off" data-testid="letter-input">
          {options}
        </Select>,
      );
      const select = getSelect();
      expect(select).toHaveAttribute('id', 'l');
      expect(select).toHaveAttribute('name', 'letter');
      expect(select).toHaveAttribute('autocomplete', 'off');
      expect(select).toHaveAttribute('data-testid', 'letter-input');
    });

    it('forwards the ref to the native select', () => {
      const ref = createRef<HTMLSelectElement>();
      render(
        <Select label="Letter" ref={ref}>
          {options}
        </Select>,
      );
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      expect(ref.current).toBe(getSelect());
    });
  });

  describe('form participation', () => {
    it('submits its value and restores defaultValue on reset', async () => {
      const user = userEvent.setup();
      render(
        <form aria-label="Prefs">
          <Select label="Letter" name="letter" defaultValue="b">
            {options}
          </Select>
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Prefs' });
      expect(new FormData(form).get('letter')).toBe('b');
      await user.selectOptions(getSelect(), 'c');
      expect(new FormData(form).get('letter')).toBe('c');
      form.reset();
      expect(getSelect()).toHaveValue('b');
      expect(new FormData(form).get('letter')).toBe('b');
    });

    // Browsers omit a disabled selected option from form data; jsdom submits it as "".
    // Either way no real value is submitted, which is what this asserts.
    it('restores the placeholder on reset and submits no value while it is selected', async () => {
      const user = userEvent.setup();
      render(
        <form aria-label="Prefs">
          <Select label="Letter" name="letter" placeholder="Pick one">
            {options}
          </Select>
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Prefs' });
      expect(new FormData(form).get('letter') ?? '').toBe('');
      await user.selectOptions(getSelect(), 'a');
      expect(new FormData(form).get('letter')).toBe('a');
      form.reset();
      expect(getSelect()).toHaveValue('');
      expect(new FormData(form).get('letter') ?? '').toBe('');
    });

    it('is left out of form data when disabled', () => {
      render(
        <form aria-label="Prefs">
          <Select label="Letter" name="letter" defaultValue="b" disabled>
            {options}
          </Select>
        </form>,
      );
      const form = screen.getByRole<HTMLFormElement>('form', { name: 'Prefs' });
      expect(new FormData(form).has('letter')).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('has no axe violations by default', async () => {
      const { container } = render(<Select label="Letter">{options}</Select>);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with a description and placeholder', async () => {
      const { container } = render(
        <Select label="Letter" description="Used for sorting." placeholder="Pick one">
          {options}
        </Select>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when invalid and required', async () => {
      const { container } = render(
        <Select label="Letter" description="Help." required invalid errorMessage="Pick a letter.">
          {options}
        </Select>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(
        <Select label="Letter" disabled>
          {options}
        </Select>,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

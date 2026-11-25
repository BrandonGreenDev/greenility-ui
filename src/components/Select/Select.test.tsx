import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createRef,
  useState,
  type SyntheticEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from '../../test/axe';
import { Select, type SelectItem, type SelectOption, type SelectOptionGroup } from './index';

const options: SelectOption[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry', disabled: true },
  { value: 'd', label: 'Date' },
];

/** First and last options are disabled, to check that Home/End/ArrowUp skip them. */
const edgeDisabled: SelectOption[] = [
  { value: 'av', label: 'Avocado', disabled: true },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Date', disabled: true },
];

const groups: SelectOptionGroup[] = [
  { label: 'Sweet', options: [{ value: 'a', label: 'Apple' }] },
  { label: 'Sour', options: [{ value: 'l', label: 'Lemon' }] },
];

const mixed: (SelectOption | SelectOptionGroup)[] = [
  { value: 'x', label: 'Any fruit' },
  {
    label: 'Sweet',
    options: [
      { value: 'a', label: 'Apple' },
      { value: 'b', label: 'Banana' },
    ],
  },
  { label: 'Sour', options: [{ value: 'l', label: 'Lemon' }] },
];

/** Item 01 to Item 25; Item 03 is disabled, so a page of 10 enabled options skips it. */
const many: SelectOption[] = Array.from({ length: 25 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return { value: `item-${n}`, label: `Item ${n}`, disabled: i === 2 };
});

const cities: SelectOption[] = [
  { value: 'nd', label: 'New Delhi' },
  { value: 'ny', label: 'New York' },
  { value: 'os', label: 'Oslo' },
];

function getCombobox(name = 'Fruit') {
  return screen.getByRole('combobox', { name });
}

function getOption(name: string) {
  return screen.getByRole('option', { name });
}

function expectActive(name: string) {
  expect(getCombobox()).toHaveAttribute('aria-activedescendant', getOption(name).id);
}

function expectClosed(combobox = getCombobox()) {
  expect(combobox).toHaveAttribute('aria-expanded', 'false');
  expect(combobox).not.toHaveAttribute('aria-activedescendant');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Select', () => {
  describe('rendering', () => {
    it('renders a combobox button named by its label', () => {
      render(<Select label="Fruit" options={options} placeholder="Pick one" />);
      const combobox = getCombobox();
      expect(combobox.tagName).toBe('BUTTON');
      expect(combobox).toHaveAttribute('type', 'button');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(combobox).toHaveTextContent('Pick one');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('has aria-controls only while open, matching the listbox id', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      const combobox = getCombobox();
      expect(combobox).not.toHaveAttribute('aria-controls');
      expect(combobox).not.toHaveAttribute('aria-activedescendant');
      await user.click(combobox);
      const listbox = screen.getByRole('listbox');
      expect(listbox.id).toBeTruthy();
      expect(combobox).toHaveAttribute('aria-controls', listbox.id);
      await user.keyboard('{Escape}');
      expectClosed();
      expect(combobox).not.toHaveAttribute('aria-controls');
    });

    it('names the listbox by the label and renders every option', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      const listbox = screen.getByRole('listbox', { name: 'Fruit' });
      const items = within(listbox).getAllByRole('option');
      expect(items.map((item) => item.textContent)).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    });

    it('marks the selected option and disabled options', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} defaultValue="b" />);
      await user.click(getCombobox());
      expect(getOption('Banana')).toHaveAttribute('aria-selected', 'true');
      expect(getOption('Apple')).toHaveAttribute('aria-selected', 'false');
      expect(getOption('Cherry')).toHaveAttribute('aria-disabled', 'true');
      expect(getOption('Apple')).not.toHaveAttribute('aria-disabled');
    });

    it('shows the selected label in the combobox', () => {
      render(<Select label="Fruit" options={options} defaultValue="d" placeholder="Pick one" />);
      expect(getCombobox()).toHaveTextContent('Date');
      expect(getCombobox()).not.toHaveTextContent('Pick one');
    });

    it('shows the placeholder when the value is empty, without warning', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<Select label="Fruit" options={options} value="" placeholder="Pick one" />);
      expect(getCombobox()).toHaveTextContent('Pick one');
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('value and option checks', () => {
    it('warns once for a value that matches no option, shows the placeholder and submits nothing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(
        <form data-testid="form">
          <Select label="Fruit" options={options} value="zzz" placeholder="Pick one" name="fruit" />
        </form>,
      );
      expect(getCombobox()).toHaveTextContent('Pick one');
      expect(new FormData(screen.getByTestId<HTMLFormElement>('form')).get('fruit')).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch(/matches no option/);
    });

    it('warns about duplicate option values', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(
        <Select
          label="Fruit"
          options={[
            { value: 'a', label: 'Apple' },
            { value: 'a', label: 'Apricot' },
          ]}
        />,
      );
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch(/"a".*more than one option/);
    });

    it("warns about an option with the value ''", () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(
        <Select
          label="Fruit"
          options={[
            { value: '', label: 'None' },
            { value: 'a', label: 'Apple' },
          ]}
        />,
      );
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch(/"None".*''/);
    });

    it('does not warn for valid options and values', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<Select label="Fruit" options={mixed} defaultValue="l" />);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('changing options', () => {
    it('clears the active option when it becomes disabled, then ArrowDown goes to the first enabled', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      await user.keyboard('{End}');
      expectActive('Date');
      rerender(
        <Select
          label="Fruit"
          options={options.map((o) => (o.value === 'd' ? { ...o, disabled: true } : o))}
        />,
      );
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
      expect(getCombobox()).not.toHaveAttribute('aria-activedescendant');
      await user.keyboard('{ArrowDown}');
      expectActive('Apple');
    });

    it('clears the active option when it is removed, then ArrowDown goes to the first enabled', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      await user.keyboard('{End}');
      expectActive('Date');
      rerender(<Select label="Fruit" options={edgeDisabled.slice(0, 3)} />);
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
      expect(getCombobox()).not.toHaveAttribute('aria-activedescendant');
      await user.keyboard('{ArrowDown}');
      expectActive('Banana');
    });

    it('does not select anything on Enter with no active option', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(
        <Select label="Fruit" options={options} onValueChange={onValueChange} />,
      );
      await user.click(getCombobox());
      await user.keyboard('{End}');
      rerender(
        <Select label="Fruit" options={options.slice(0, 2)} onValueChange={onValueChange} />,
      );
      await user.keyboard('{Enter}');
      expectClosed();
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('focus on the listbox', () => {
    it('sends focus that lands on the listbox back to the combobox and stays open', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      const listbox = screen.getByRole('listbox');
      act(() => {
        listbox.focus();
      });
      expect(getCombobox()).toHaveFocus();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
    });

    /** Focuses the listbox with its onFocus return disabled, as a stand-in for focus "stuck" there. */
    function forceFocusOnListbox(listbox: HTMLElement) {
      const stop = (event: FocusEvent) => {
        event.stopImmediatePropagation();
      };
      // React listens at the root; a capture listener on the listbox runs first and stops it.
      listbox.addEventListener('focusin', stop, true);
      act(() => {
        listbox.focus();
      });
      listbox.removeEventListener('focusin', stop, true);
      expect(listbox).toHaveFocus();
    }

    it('returns focus to the combobox when an option is committed from a focused listbox', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Select label="Fruit" options={options} onValueChange={onValueChange} />);
      await user.click(getCombobox());
      forceFocusOnListbox(screen.getByRole('listbox'));
      await user.click(getOption('Date'));
      expect(onValueChange).toHaveBeenCalledWith('d');
      expectClosed();
      expect(getCombobox()).toHaveFocus();
    });

    it('returns focus to the combobox on Escape from a focused listbox', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      forceFocusOnListbox(screen.getByRole('listbox'));
      await user.keyboard('{Escape}');
      expectClosed();
      expect(getCombobox()).toHaveFocus();
    });
  });

  describe('types', () => {
    it('rejects props that make no sense on the combobox button', () => {
      const element = (
        <>
          {/* @ts-expect-error onChange is not a Select prop; use onValueChange. */}
          <Select label="Fruit" options={options} onChange={() => undefined} />
          {/* @ts-expect-error formAction is a submit-button prop. */}
          <Select label="Fruit" options={options} formAction="/x" />
          {/* @ts-expect-error popoverTarget is not supported on the combobox. */}
          <Select label="Fruit" options={options} popoverTarget="p" />
        </>
      );
      expect(element).toBeTruthy();
    });

    it('accepts SelectItem[] for options', () => {
      const items: SelectItem[] = [...options, ...groups];
      render(<Select label="Fruit" options={items} />);
      expect(getCombobox()).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it.each(['sm', 'md', 'lg'] as const)('applies size %s to the box and listbox', async (size) => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} size={size} />);
      expect(getCombobox().parentElement).toHaveAttribute('data-size', size);
      await user.click(getCombobox());
      expect(screen.getByRole('listbox')).toHaveAttribute('data-size', size);
    });

    it('defaults to size md', () => {
      render(<Select label="Fruit" options={options} />);
      expect(getCombobox().parentElement).toHaveAttribute('data-size', 'md');
    });

    it('puts className and style on the root and the ref on the button', () => {
      const ref = createRef<HTMLButtonElement>();
      const { container } = render(
        <Select
          label="Fruit"
          options={options}
          className="extra"
          style={{ marginTop: '3px' }}
          ref={ref}
        />,
      );
      const root = container.firstElementChild;
      expect(root).toHaveClass('extra');
      expect(root).toHaveStyle({ marginTop: '3px' });
      expect(root?.className.split(' ').length).toBeGreaterThan(1);
      expect(getCombobox()).not.toHaveClass('extra');
      expect(ref.current).toBe(getCombobox());
    });

    it('passes id and native props through to the button', async () => {
      const user = userEvent.setup();
      const onFocus = vi.fn();
      render(
        <Select
          label="Fruit"
          options={options}
          id="fruit"
          title="Choose a fruit"
          data-extra="yes"
          onFocus={onFocus}
        />,
      );
      const combobox = getCombobox();
      expect(combobox).toHaveAttribute('id', 'fruit');
      expect(combobox).toHaveAttribute('title', 'Choose a fruit');
      expect(combobox).toHaveAttribute('data-extra', 'yes');
      expect(screen.getByText('Fruit').closest('label')).toHaveAttribute('for', 'fruit');
      await user.tab();
      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it('merges a consumer aria-describedby after the description', () => {
      render(
        <>
          <Select label="Fruit" options={options} description="Pick any" aria-describedby="hint" />
          <p id="hint">Seasonal only</p>
        </>,
      );
      expect(getCombobox()).toHaveAccessibleDescription('Pick any Seasonal only');
    });

    it('passes dir through for right-to-left layouts and still works by keyboard', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} dir="rtl" />);
      const combobox = getCombobox();
      expect(combobox).toHaveAttribute('dir', 'rtl');
      combobox.focus();
      await user.keyboard('{ArrowDown}{ArrowDown}');
      expectActive('Banana');
      await user.keyboard('{Enter}');
      expect(combobox).toHaveTextContent('Banana');
    });

    it('works inside an rtl container', async () => {
      const user = userEvent.setup();
      render(
        <div dir="rtl">
          <Select label="Fruit" options={options} />
        </div>,
      );
      await user.click(getCombobox());
      expect(screen.getByRole('listbox', { name: 'Fruit' })).toBeInTheDocument();
      await user.keyboard('{End}');
      expectActive('Date');
    });

    it('lets a consumer onKeyDown that calls preventDefault skip the built-in handling', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn((event: ReactKeyboardEvent) => {
        event.preventDefault();
      });
      render(<Select label="Fruit" options={options} onKeyDown={onKeyDown} />);
      getCombobox().focus();
      await user.keyboard('{ArrowDown}');
      expect(onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'ArrowDown' }));
      expectClosed();
    });

    it('runs a consumer onKeyDown and still handles the key', async () => {
      const user = userEvent.setup();
      const onKeyDown = vi.fn();
      render(<Select label="Fruit" options={options} onKeyDown={onKeyDown} />);
      getCombobox().focus();
      await user.keyboard('{ArrowDown}');
      expect(onKeyDown).toHaveBeenCalled();
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('field wiring', () => {
    it('maps required to aria-required and an aria-hidden asterisk', () => {
      render(<Select label="Fruit" options={options} required />);
      const combobox = getCombobox();
      expect(combobox).toHaveAttribute('aria-required', 'true');
      expect(combobox).not.toHaveAttribute('required');
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });

    it('omits aria-required and the asterisk by default', () => {
      render(<Select label="Fruit" options={options} />);
      expect(getCombobox()).not.toHaveAttribute('aria-required');
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('wires the description', () => {
      render(<Select label="Fruit" options={options} description="Your favourite" />);
      expect(getCombobox()).toHaveAccessibleDescription('Your favourite');
      expect(getCombobox()).not.toHaveAttribute('aria-invalid');
    });

    it('wires invalid with the description then the error', () => {
      render(
        <Select
          label="Fruit"
          options={options}
          invalid
          description="Your favourite"
          errorMessage="Pick a fruit"
        />,
      );
      const combobox = getCombobox();
      expect(combobox).toHaveAttribute('aria-invalid', 'true');
      expect(combobox).toHaveAccessibleDescription('Your favourite Pick a fruit');
    });

    it('hides the error message unless invalid', () => {
      render(<Select label="Fruit" options={options} errorMessage="Pick a fruit" />);
      expect(screen.queryByText('Pick a fruit')).not.toBeInTheDocument();
      expect(getCombobox()).not.toHaveAccessibleDescription();
    });

    it('warns when invalid has no error message', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<Select label="Fruit" options={options} invalid />);
      expect(getCombobox()).toHaveAttribute('aria-invalid', 'true');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toMatch(/errorMessage/);
    });

    it('does not warn when invalid has an error message', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      render(<Select label="Fruit" options={options} invalid errorMessage="Pick a fruit" />);
      expect(warn).not.toHaveBeenCalled();
    });

    it('focuses without opening on label click', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      await user.click(screen.getByText('Fruit'));
      expect(getCombobox()).toHaveFocus();
      expectClosed();
    });
  });

  describe('disabled', () => {
    it('is natively disabled, not focusable and does not open', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <Select label="Fruit" options={options} disabled onValueChange={onValueChange} />
          <button type="button">After</button>
        </>,
      );
      const combobox = getCombobox();
      expect(combobox).toBeDisabled();
      await user.click(combobox);
      expectClosed();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      await user.keyboard('{ArrowDown}{Enter}');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('closes when disabled while open and stays closed when enabled again', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      rerender(<Select label="Fruit" options={options} disabled />);
      expectClosed();
      rerender(<Select label="Fruit" options={options} />);
      expectClosed();
    });
  });

  describe('mouse', () => {
    it('opens on click with the selected option active, and selects on click', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Fruit" options={options} defaultValue="b" onValueChange={onValueChange} />,
      );
      const combobox = getCombobox();
      await user.click(combobox);
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      expect(combobox).toHaveFocus();
      expectActive('Banana');

      await user.click(getOption('Date'));
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith('d');
      expectClosed();
      expect(combobox).toHaveTextContent('Date');
      expect(combobox).toHaveFocus();
    });

    it('opens on click with the first enabled option active when nothing is selected', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={edgeDisabled} />);
      await user.click(getCombobox());
      expectActive('Banana');
    });

    it('closes on a second click without changing the value', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Fruit" options={options} defaultValue="a" onValueChange={onValueChange} />,
      );
      await user.click(getCombobox());
      await user.click(getCombobox());
      expectClosed();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('sets the active option on hover, but not for disabled options', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      await user.hover(getOption('Date'));
      expectActive('Date');
      await user.hover(getOption('Cherry'));
      expectActive('Date');
      fireEvent.pointerMove(getOption('Banana'));
      expectActive('Banana');
    });

    it('does nothing when a disabled option is clicked, and stays open', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Select label="Fruit" options={options} onValueChange={onValueChange} />);
      await user.click(getCombobox());
      await user.click(getOption('Cherry'));
      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
    });

    it('prevents the default of option pointerdown and mousedown so focus stays on the combobox', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      const option = getOption('Banana');
      expect(fireEvent.pointerDown(option)).toBe(false);
      expect(fireEvent.mouseDown(option)).toBe(false);
      expect(getCombobox()).toHaveFocus();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes on an outside pointerdown without changing the value', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <Select label="Fruit" options={options} defaultValue="a" onValueChange={onValueChange} />
          <p>Outside</p>
        </>,
      );
      await user.click(getCombobox());
      await user.keyboard('{ArrowDown}');
      await user.click(screen.getByText('Outside'));
      expectClosed();
      expect(onValueChange).not.toHaveBeenCalled();
      expect(getCombobox()).toHaveTextContent('Apple');
    });

    it('closes when the combobox blurs to an element outside', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <Select label="Fruit" options={options} onValueChange={onValueChange} />
          <button type="button">After</button>
        </>,
      );
      await user.click(getCombobox());
      act(() => {
        screen.getByRole('button', { name: 'After' }).focus();
      });
      expectClosed();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('selects an option in a group on click', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Select label="Fruit" options={groups} onValueChange={onValueChange} />);
      await user.click(getCombobox());
      await user.click(getOption('Lemon'));
      expect(onValueChange).toHaveBeenCalledWith('l');
      expect(getCombobox()).toHaveTextContent('Lemon');
    });
  });

  describe('keyboard, closed', () => {
    it.each([
      ['ArrowDown', '{ArrowDown}'],
      ['Alt+ArrowDown', '{Alt>}{ArrowDown}{/Alt}'],
      ['Enter', '{Enter}'],
      ['Space', ' '],
    ])('%s opens with the selected option active', async (_, keys) => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Fruit" options={options} defaultValue="b" onValueChange={onValueChange} />,
      );
      getCombobox().focus();
      await user.keyboard(keys);
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
      expectActive('Banana');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it.each([
      ['ArrowDown', '{ArrowDown}'],
      ['Alt+ArrowDown', '{Alt>}{ArrowDown}{/Alt}'],
      ['Enter', '{Enter}'],
      ['Space', ' '],
    ])(
      '%s opens with the first enabled option active when nothing is selected',
      async (_, keys) => {
        const user = userEvent.setup();
        render(<Select label="Fruit" options={edgeDisabled} />);
        getCombobox().focus();
        await user.keyboard(keys);
        expectActive('Banana');
      },
    );

    it('opens on the first enabled option when the selected option is disabled', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} defaultValue="c" />);
      expect(getCombobox()).toHaveTextContent('Cherry');
      getCombobox().focus();
      await user.keyboard('{ArrowDown}');
      expectActive('Apple');
    });

    it('ArrowUp opens with the first enabled option active, not the selected one', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={edgeDisabled} defaultValue="c" />);
      getCombobox().focus();
      await user.keyboard('{ArrowUp}');
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
      expectActive('Banana');
    });

    it('Home opens with the first enabled option active', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={edgeDisabled} defaultValue="c" />);
      getCombobox().focus();
      await user.keyboard('{Home}');
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
      expectActive('Banana');
    });

    it('End opens with the last enabled option active', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={edgeDisabled} defaultValue="b" />);
      getCombobox().focus();
      await user.keyboard('{End}');
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
      expectActive('Cherry');
    });

    it('opens with typeahead on the matching option', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      getCombobox().focus();
      await user.keyboard('d');
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
      expectActive('Date');
    });

    it('typeahead skips disabled options and falls back to the selected option', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} defaultValue="b" />);
      getCombobox().focus();
      await user.keyboard('c');
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
      expectActive('Banana');
    });

    it('typeahead searches from the selected option', async () => {
      const user = userEvent.setup();
      render(
        <Select
          label="Fruit"
          options={[
            { value: 'a', label: 'Apple' },
            { value: 'av', label: 'Avocado' },
            { value: 'ap', label: 'Apricot' },
          ]}
          defaultValue="a"
        />,
      );
      getCombobox().focus();
      await user.keyboard('a');
      expectActive('Avocado');
    });

    it('does not handle other keys', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      getCombobox().focus();
      await user.keyboard('{ArrowLeft}{ArrowRight}{PageDown}{Escape}');
      expectClosed();
    });

    it('moves focus on with Tab without opening or selecting', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <Select label="Fruit" options={options} onValueChange={onValueChange} />
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      expect(getCombobox()).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
      expectClosed();
    });
  });

  describe('keyboard, open', () => {
    it('ArrowDown and ArrowUp move through enabled options without wrapping', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      getCombobox().focus();
      await user.keyboard('{ArrowDown}');
      expectActive('Apple');
      await user.keyboard('{ArrowUp}');
      expectActive('Apple');
      await user.keyboard('{ArrowDown}');
      expectActive('Banana');
      await user.keyboard('{ArrowDown}');
      expectActive('Date');
      await user.keyboard('{ArrowDown}');
      expectActive('Date');
      await user.keyboard('{ArrowUp}');
      expectActive('Banana');
    });

    it('Home and End move to the first and last enabled options', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={edgeDisabled} />);
      await user.click(getCombobox());
      await user.keyboard('{End}');
      expectActive('Cherry');
      await user.keyboard('{Home}');
      expectActive('Banana');
    });

    it('PageDown and PageUp move by 10 enabled options and clamp at the ends', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={many} />);
      await user.click(getCombobox());
      expectActive('Item 01');
      await user.keyboard('{PageDown}');
      expectActive('Item 12');
      await user.keyboard('{PageDown}');
      expectActive('Item 22');
      await user.keyboard('{PageDown}');
      expectActive('Item 25');
      await user.keyboard('{PageUp}');
      expectActive('Item 15');
      await user.keyboard('{PageUp}');
      expectActive('Item 05');
      await user.keyboard('{PageUp}');
      expectActive('Item 01');
    });

    it.each([
      ['Enter', '{Enter}'],
      ['Space', ' '],
      ['Alt+ArrowUp', '{Alt>}{ArrowUp}{/Alt}'],
    ])('%s selects the active option and closes', async (_, keys) => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Select label="Fruit" options={options} onValueChange={onValueChange} />);
      await user.click(getCombobox());
      await user.keyboard('{ArrowDown}');
      expectActive('Banana');
      await user.keyboard(keys);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith('b');
      expectClosed();
      expect(getCombobox()).toHaveTextContent('Banana');
      expect(getCombobox()).toHaveFocus();
    });

    it('does not call onValueChange when the active option is already selected', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Fruit" options={options} defaultValue="b" onValueChange={onValueChange} />,
      );
      getCombobox().focus();
      await user.keyboard('{Enter}{Enter}');
      expectClosed();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('Space opens and then selects, without the keyup reopening it', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      const combobox = getCombobox();
      combobox.focus();
      await user.keyboard(' ');
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      await user.keyboard(' ');
      expectClosed();
      expect(combobox).toHaveTextContent('Apple');
    });

    it('Tab selects the active option, closes, and moves focus on', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <Select label="Fruit" options={options} onValueChange={onValueChange} />
          <button type="button">After</button>
        </>,
      );
      await user.click(getCombobox());
      await user.keyboard('{End}');
      await user.tab();
      expect(onValueChange).toHaveBeenCalledWith('d');
      expectClosed();
      expect(getCombobox()).toHaveTextContent('Date');
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('Shift+Tab selects the active option and moves focus back', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <>
          <button type="button">Before</button>
          <Select label="Fruit" options={options} onValueChange={onValueChange} />
        </>,
      );
      await user.click(getCombobox());
      await user.keyboard('{ArrowDown}');
      await user.tab({ shift: true });
      expect(onValueChange).toHaveBeenCalledWith('b');
      expectClosed();
      expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
    });

    it('Escape closes without changing the value and keeps focus', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select label="Fruit" options={options} defaultValue="a" onValueChange={onValueChange} />,
      );
      const combobox = getCombobox();
      combobox.focus();
      await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
      expectClosed();
      expect(combobox).toHaveTextContent('Apple');
      expect(combobox).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('Escape is stopped so outer listeners do not see it', async () => {
      const user = userEvent.setup();
      const onWindowKeyDown = vi.fn((event: KeyboardEvent) => event.key);
      window.addEventListener('keydown', onWindowKeyDown);
      try {
        render(<Select label="Fruit" options={options} />);
        await user.click(getCombobox());
        await user.keyboard('{Escape}');
        expectClosed();
        expect(onWindowKeyDown.mock.calls.map(([event]) => event.key)).not.toContain('Escape');
      } finally {
        window.removeEventListener('keydown', onWindowKeyDown);
      }
    });

    it('typeahead moves the active option while open', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={options} />);
      await user.click(getCombobox());
      await user.keyboard('d');
      expectActive('Date');
      expect(getCombobox()).toHaveAttribute('aria-expanded', 'true');
    });

    it('treats Space within the typeahead window as part of the search', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
      const onValueChange = vi.fn();
      render(<Select label="City" options={cities} onValueChange={onValueChange} />);
      const combobox = screen.getByRole('combobox', { name: 'City' });
      combobox.focus();
      await user.keyboard('new y');
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'New York' }).id,
      );
      expect(onValueChange).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(600);
      });
      await user.keyboard(' ');
      expect(onValueChange).toHaveBeenCalledWith('ny');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
    });

    it('navigates across groups', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={mixed} />);
      await user.click(getCombobox());
      expectActive('Any fruit');
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
      expectActive('Lemon');
      await user.keyboard('{Home}');
      expectActive('Any fruit');
    });

    it('scrolls the active option into view', async () => {
      const user = userEvent.setup();
      const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
      render(<Select label="Fruit" options={many} />);
      await user.click(getCombobox());
      expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
      expect(scroll.mock.contexts).toContain(getOption('Item 01'));
      await user.keyboard('{End}');
      expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
      expect(scroll.mock.contexts).toContain(getOption('Item 25'));
      expect(scroll.mock.contexts.at(-1)).toBe(getOption('Item 25'));
    });

    it('does not scroll while closed', () => {
      const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
      render(<Select label="Fruit" options={many} defaultValue="item-20" />);
      expect(scroll).not.toHaveBeenCalled();
    });
  });

  describe('groups', () => {
    it('renders named groups containing their options', async () => {
      const user = userEvent.setup();
      render(<Select label="Fruit" options={mixed} />);
      await user.click(getCombobox());
      const listbox = screen.getByRole('listbox', { name: 'Fruit' });
      const sweet = within(listbox).getByRole('group', { name: 'Sweet' });
      const sour = within(listbox).getByRole('group', { name: 'Sour' });
      expect(
        within(sweet)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['Apple', 'Banana']);
      expect(within(sour).getByRole('option', { name: 'Lemon' })).toBeInTheDocument();
      expect(within(sweet).queryByRole('option', { name: 'Any fruit' })).not.toBeInTheDocument();
    });
  });

  describe('controlled and uncontrolled', () => {
    it('controlled: calls onValueChange with only the value and shows the value prop', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Select label="Fruit" options={options} value="a" onValueChange={onValueChange} />);
      await user.click(getCombobox());
      await user.click(getOption('Banana'));
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0]).toEqual(['b']);
      expect(getCombobox()).toHaveTextContent('Apple');
    });

    it('controlled: follows the value prop', async () => {
      const user = userEvent.setup();
      function Controlled() {
        const [value, setValue] = useState('');
        return (
          <>
            <Select
              label="Fruit"
              options={options}
              value={value}
              onValueChange={setValue}
              placeholder="Pick one"
            />
            <output>{value || 'none'}</output>
          </>
        );
      }
      render(<Controlled />);
      expect(getCombobox()).toHaveTextContent('Pick one');
      getCombobox().focus();
      await user.keyboard('{End}{Enter}');
      expect(getCombobox()).toHaveTextContent('Date');
      expect(screen.getByRole('status')).toHaveTextContent('d');
      await user.click(getCombobox());
      expectActive('Date');
      expect(getOption('Date')).toHaveAttribute('aria-selected', 'true');
    });

    it('uncontrolled: keeps its own value and calls onValueChange', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Select label="Fruit" options={options} onValueChange={onValueChange} />);
      await user.click(getCombobox());
      await user.click(getOption('Banana'));
      expect(getCombobox()).toHaveTextContent('Banana');
      await user.click(getCombobox());
      await user.click(getOption('Apple'));
      expect(onValueChange.mock.calls).toEqual([['b'], ['a']]);
      expect(getCombobox()).toHaveTextContent('Apple');
    });
  });

  describe('forms', () => {
    it('submits the value through a hidden input in FormData', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        return new FormData(event.currentTarget).get('fruit');
      });
      render(
        <form onSubmit={onSubmit}>
          <Select label="Fruit" options={options} name="fruit" />
          <button type="submit">Send</button>
        </form>,
      );
      await user.click(screen.getByRole('button', { name: 'Send' }));
      expect(onSubmit.mock.results[0]?.value).toBeNull();
      await user.click(getCombobox());
      await user.click(getOption('Banana'));
      await user.click(screen.getByRole('button', { name: 'Send' }));
      expect(onSubmit.mock.results[1]?.value).toBe('b');
    });

    it('submits nothing when disabled, through a disabled hidden input', () => {
      const { container } = render(
        <form data-testid="form">
          <Select label="Fruit" options={options} name="fruit" defaultValue="a" disabled />
        </form>,
      );
      expect(new FormData(screen.getByTestId<HTMLFormElement>('form')).get('fruit')).toBeNull();
      expect(container.querySelector('input[type="hidden"][name="fruit"]')).toBeDisabled();
    });

    it('submits to the form named by the form prop and resets with it, even without name', async () => {
      const user = userEvent.setup();
      render(
        <>
          <form id="f" data-testid="form" />
          <Select label="Fruit" options={options} form="f" defaultValue="a" />
          <Select label="Veg" options={options} form="f" name="veg" defaultValue="b" />
        </>,
      );
      const form = screen.getByTestId<HTMLFormElement>('form');
      expect(new FormData(form).get('veg')).toBe('b');
      await user.click(getCombobox());
      await user.click(getOption('Date'));
      await user.click(getCombobox('Veg'));
      await user.click(getOption('Apple'));
      expect(getCombobox()).toHaveTextContent('Date');
      expect(new FormData(form).get('veg')).toBe('a');
      act(() => {
        form.reset();
      });
      expect(await screen.findByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Apple');
      expect(getCombobox('Veg')).toHaveTextContent('Banana');
      expect(new FormData(form).get('veg')).toBe('b');
    });

    it('ignores the reset of an enclosing form when form points elsewhere', async () => {
      const user = userEvent.setup();
      render(
        <>
          <form id="other" />
          <form data-testid="outer">
            <Select label="Fruit" options={options} form="other" defaultValue="a" />
          </form>
        </>,
      );
      await user.click(getCombobox());
      await user.click(getOption('Date'));
      act(() => {
        screen.getByTestId<HTMLFormElement>('outer').reset();
      });
      expect(await screen.findByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Date');
    });

    it('does not submit the combobox button itself', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
      });
      render(
        <form onSubmit={onSubmit}>
          <Select label="Fruit" options={options} name="fruit" />
        </form>,
      );
      await user.click(getCombobox());
      await user.keyboard('{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('renders no hidden input without a name', () => {
      const { container } = render(
        <form>
          <Select label="Fruit" options={options} defaultValue="a" />
        </form>,
      );
      const form = container.querySelector('form');
      expect(form && [...new FormData(form).keys()]).toEqual([]);
    });

    it('resets an uncontrolled Select to defaultValue and calls onValueChange', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <form data-testid="form">
          <Select
            label="Fruit"
            options={options}
            name="fruit"
            defaultValue="a"
            onValueChange={onValueChange}
          />
        </form>,
      );
      const form = screen.getByTestId<HTMLFormElement>('form');
      await user.click(getCombobox());
      await user.click(getOption('Banana'));
      expect(new FormData(form).get('fruit')).toBe('b');
      onValueChange.mockClear();
      act(() => {
        form.reset();
      });
      expect(await screen.findByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Apple');
      expect(new FormData(form).get('fruit')).toBe('a');
      expect(onValueChange).toHaveBeenCalledWith('a');
    });

    it('resets without a name through the closest form', async () => {
      const user = userEvent.setup();
      render(
        <form data-testid="form">
          <Select label="Fruit" options={options} placeholder="Pick one" />
        </form>,
      );
      await user.click(getCombobox());
      await user.click(getOption('Date'));
      act(() => {
        screen.getByTestId<HTMLFormElement>('form').reset();
      });
      expect(await screen.findByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Pick one');
    });

    it('closes the listbox on form reset', async () => {
      const user = userEvent.setup();
      render(
        <form data-testid="form">
          <Select label="Fruit" options={options} name="fruit" />
        </form>,
      );
      await user.click(getCombobox());
      act(() => {
        screen.getByTestId<HTMLFormElement>('form').reset();
      });
      expect(await screen.findByRole('combobox', { name: 'Fruit' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('keeps a controlled value on form reset', async () => {
      const onValueChange = vi.fn();
      render(
        <form data-testid="form">
          <Select
            label="Fruit"
            options={options}
            name="fruit"
            value="b"
            defaultValue="a"
            onValueChange={onValueChange}
          />
        </form>,
      );
      const form = screen.getByTestId<HTMLFormElement>('form');
      act(() => {
        form.reset();
      });
      expect(await screen.findByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Banana');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('associates with a form by id through the form prop', async () => {
      const user = userEvent.setup();
      render(
        <>
          <form id="order" data-testid="form" />
          <Select label="Fruit" options={options} name="fruit" form="order" defaultValue="a" />
        </>,
      );
      const form = screen.getByTestId<HTMLFormElement>('form');
      expect(new FormData(form).get('fruit')).toBe('a');
      await user.click(getCombobox());
      await user.click(getOption('Date'));
      expect(new FormData(form).get('fruit')).toBe('d');
      act(() => {
        form.reset();
      });
      expect(await screen.findByRole('combobox', { name: 'Fruit' })).toHaveTextContent('Apple');
      expect(new FormData(form).get('fruit')).toBe('a');
    });
  });

  describe('accessibility', () => {
    it('has no axe violations when closed', async () => {
      const { container } = render(
        <Select
          label="Fruit"
          options={options}
          placeholder="Pick one"
          description="Any"
          required
        />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when open', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Select label="Fruit" options={options} defaultValue="b" description="Any" />,
      );
      await user.click(getCombobox());
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toBeVisible();
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when invalid', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Select label="Fruit" options={options} invalid errorMessage="Pick a fruit" />,
      );
      expect(await axe(container)).toHaveNoViolations();
      await user.click(getCombobox());
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(
        <Select label="Fruit" options={options} disabled defaultValue="a" />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it('has no axe violations with groups, open', async () => {
      const user = userEvent.setup();
      const { container } = render(<Select label="Fruit" options={mixed} name="fruit" />);
      expect(await axe(container)).toHaveNoViolations();
      await user.click(getCombobox());
      expect(screen.getByRole('group', { name: 'Sweet' })).toBeVisible();
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

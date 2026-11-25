import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useDismiss } from '../../hooks/useDismiss';
import { useField, type FieldBaseProps } from '../../hooks/useField';
import { useFloating } from '../../hooks/useFloating';
import { useTypeahead } from '../../hooks/useTypeahead';
import { composeRefs } from '../../utils/composeRefs';
import { cx } from '../../utils/cx';
import { getNextIndex, type ListAction } from '../../utils/listNavigation';
import { mergeProps } from '../../utils/mergeProps';
import type { Size } from '../../utils/types';
import { Field, FieldDescription, FieldError, FieldLabel } from '../Field';
import controlStyles from '../Field/control.module.css';
import floatingStyles from '../Floating/floating.module.css';
import { CheckIcon, ChevronDownIcon } from '../Icon';
import { flattenOptions, type FlatOption, type SelectItem } from './options';
import styles from './Select.module.css';
import { useFormReset } from './useFormReset';

export interface SelectProps
  extends
    FieldBaseProps,
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | 'type'
      | 'role'
      | 'value'
      | 'defaultValue'
      | 'children'
      | 'disabled'
      | 'required'
      | 'name'
      | 'form'
      | 'onChange'
      | 'onInput'
      | 'formAction'
      | 'formEncType'
      | 'formMethod'
      | 'formNoValidate'
      | 'formTarget'
      | 'popoverTarget'
      | 'popoverTargetAction'
    > {
  /** Options and option groups, in display order. Groups cannot be nested. */
  options: readonly SelectItem[];
  /**
   * Controlled value. `''` means nothing is selected. A value that matches no option shows
   * the placeholder, is not submitted and logs a console warning.
   */
  value?: string;
  /** Initial value when uncontrolled. `''` means nothing is selected. @default '' */
  defaultValue?: string;
  /**
   * Called with the newly selected value, also when a form reset restores `defaultValue` of an
   * uncontrolled Select. It receives only the value: unlike NativeSelect's `(value, event)`,
   * there is no native change event to pass.
   */
  onValueChange?: (value: string) => void;
  /**
   * Text shown in the box while nothing is selected. Without a placeholder and with the
   * value `''`, the box is empty.
   */
  placeholder?: string;
  /**
   * Marks the field required: sets `aria-required="true"` (announced as "required") and shows
   * an aria-hidden asterisk. There is no native constraint validation, because `required` is
   * not valid on a button; validate yourself, or use NativeSelect for native validation.
   * @default false
   */
  required?: boolean;
  /** Height, font size and padding of the box; the same metrics as NativeSelect. @default 'md' */
  size?: Size;
  /**
   * Form field name. When set, a hidden input submits the selected value. Nothing is
   * submitted while nothing is selected or the Select is disabled (like a NativeSelect
   * showing its disabled placeholder).
   */
  name?: string;
  /**
   * Id of the owner `<form>` when the Select is outside it: the hidden input submits to it
   * and its reset restores `defaultValue`.
   */
  form?: string;
}

/** PageUp/PageDown step, in enabled options. */
const PAGE_STEP = 10;

/**
 * A styled single-choice picker: the WAI-ARIA APG select-only combobox. A
 * `<button role="combobox">` opens a popup `listbox` in the top layer; DOM focus stays
 * on the button and the active option is exposed with `aria-activedescendant`.
 *
 * It looks like NativeSelect when closed and takes the same field props. `required`
 * is announced (`aria-required`) but not validated natively; use NativeSelect for
 * native constraint validation. With `name`, the value is submitted through a hidden
 * input and an uncontrolled Select returns to `defaultValue` on form reset.
 *
 * `className` and `style` go to the outer wrapper. The ref, `id` and every other prop
 * go to the combobox `<button>`.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    label,
    description,
    errorMessage,
    invalid = false,
    required = false,
    disabled = false,
    size = 'md',
    options,
    value: valueProp,
    defaultValue = '',
    onValueChange,
    placeholder,
    name,
    form,
    className,
    style,
    id,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  // `required` is not valid on a button, so it is mapped to aria-required below.
  const { controlProps, ...field } = useField({
    id,
    description,
    errorMessage,
    invalid,
    disabled,
    'aria-describedby': ariaDescribedBy,
  });
  const base = useId();
  const listboxId = `${base}-listbox`;
  const optionId = (index: number) => `${base}-option-${String(index)}`;
  const groupLabelId = (groupIndex: number) => `${base}-group-${String(groupIndex)}`;

  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [openState, setOpen] = useState(false);
  const [activeState, setActiveIndex] = useState(-1);
  // A Select disabled while open closes, and stays closed when it is enabled again.
  if (disabled && openState) setOpen(false);
  const open = openState && !disabled;

  const buttonRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const { flat, sections, problems } = useMemo(() => flattenOptions(options), [options]);
  const labels = useMemo(() => flat.map((item) => item.option.label), [flat]);
  const isDisabled = useCallback((index: number) => flat[index]?.option.disabled === true, [flat]);
  const selectedIndex = value === '' ? -1 : flat.findIndex((item) => item.option.value === value);
  const selected = flat[selectedIndex]?.option;
  // The options can change while open: an active index that is out of range or now disabled
  // counts as "no active option" everywhere (activedescendant, data-active, keys, commit).
  const active =
    activeState >= 0 && activeState < flat.length && !isDisabled(activeState) ? activeState : -1;
  const typeahead = useTypeahead();

  useEffect(() => {
    for (const problem of problems) console.warn(`Greenility Select: ${problem}`);
  }, [problems]);

  const unknownValue = value !== '' && selectedIndex === -1;
  useEffect(() => {
    if (unknownValue) {
      console.warn(
        `Greenility Select: the value "${value}" matches no option, so the placeholder is shown and nothing is submitted. Use '' for "nothing selected".`,
      );
    }
  }, [unknownValue, value]);

  // The popover must be showing before useFloating measures it, so this effect comes first.
  useLayoutEffect(() => {
    if (!open) return;
    const listbox = listboxRef.current;
    if (!listbox || !('showPopover' in listbox)) return;
    listbox.showPopover();
    return () => {
      if (listbox.isConnected) listbox.hidePopover();
    };
  }, [open]);

  useFloating({
    open,
    anchorRef: boxRef,
    floatingRef: listboxRef,
    placement: 'bottom',
    align: 'start',
    matchAnchorWidth: true,
  });

  // Keep the active option visible. A layout effect after useFloating: the list is positioned
  // and sized before it scrolls, so it does not jump on open. Querying inside the listbox
  // also works in shadow roots.
  useLayoutEffect(() => {
    if (!open || active < 0) return;
    listboxRef.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  // Closes the list. If focus somehow reached the listbox (tabIndex=-1), it goes back to the
  // combobox first, so it is not lost to <body> when the listbox unmounts.
  const close = useCallback(() => {
    const listbox = listboxRef.current;
    const root = listbox?.getRootNode() as Document | ShadowRoot | undefined;
    if (listbox && root?.activeElement && listbox.contains(root.activeElement)) {
      buttonRef.current?.focus();
    }
    setOpen(false);
  }, []);

  useDismiss({ enabled: open, refs: [boxRef, listboxRef], onDismiss: close });

  // Uncontrolled: return to defaultValue when the owner form resets.
  const controlled = valueProp !== undefined;
  useFormReset(buttonRef, form, () => {
    close();
    if (!controlled) setValue(defaultValue);
  });

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const selectedOrFirst = () =>
    selectedIndex >= 0 && !isDisabled(selectedIndex)
      ? selectedIndex
      : getNextIndex(flat.length, -1, 'first', isDisabled, false);

  const move = (action: ListAction) => {
    setActiveIndex(getNextIndex(flat.length, active, action, isDisabled, false));
  };

  const commit = (index: number) => {
    const item = flat[index];
    if (item && !item.option.disabled) setValue(item.option.value);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.nativeEvent.isComposing) return;
    const { key, altKey } = event;

    // Typeahead first: Space continues a search ("new y") but activates when the buffer is empty.
    const match = typeahead(event, labels, open ? active : selectedIndex, isDisabled);
    if (event.isDefaultPrevented()) {
      if (open) {
        if (match >= 0) setActiveIndex(match);
      } else {
        openAt(match >= 0 ? match : selectedOrFirst());
      }
      return;
    }

    if (!open) {
      switch (key) {
        case 'ArrowDown':
        case 'Enter':
        case ' ':
          openAt(selectedOrFirst());
          break;
        case 'ArrowUp':
        case 'Home':
          openAt(getNextIndex(flat.length, -1, 'first', isDisabled, false));
          break;
        case 'End':
          openAt(getNextIndex(flat.length, -1, 'last', isDisabled, false));
          break;
        default:
          return;
      }
      event.preventDefault();
      return;
    }

    switch (key) {
      case 'ArrowDown':
        move('next');
        break;
      case 'ArrowUp':
        if (altKey) commit(active);
        else move('prev');
        break;
      case 'Home':
        move('first');
        break;
      case 'End':
        move('last');
        break;
      case 'PageDown':
        move({ by: PAGE_STEP });
        break;
      case 'PageUp':
        move({ by: -PAGE_STEP });
        break;
      case 'Enter':
      case ' ':
        commit(active);
        break;
      case 'Tab':
        // Let focus move on to the next field.
        commit(active);
        return;
      default:
        return;
    }
    event.preventDefault();
  };

  // Space activates a button on keyup. Keydown already handled it, so cancel the click.
  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ') event.preventDefault();
  };

  const onClick = () => {
    if (open) {
      close();
      return;
    }
    // Safari does not focus buttons on click; the keyboard should work after a click.
    buttonRef.current?.focus();
    openAt(selectedOrFirst());
  };

  const onBlur = (event: FocusEvent<HTMLButtonElement>) => {
    const next = event.relatedTarget;
    if (open && !(next instanceof Node && listboxRef.current?.contains(next))) close();
  };

  // Keep DOM focus on the combobox when the list (or its scrollbar) is pressed.
  const keepFocus = (event: { preventDefault: () => void }) => {
    event.preventDefault();
  };

  // The listbox is never meant to hold focus; send any focus that lands there back.
  const onListboxFocus = () => {
    buttonRef.current?.focus();
  };

  const onLabelClick = (event: MouseEvent<HTMLElement>) => {
    // Like a native <select>: a label click focuses the control but does not open it.
    event.preventDefault();
    buttonRef.current?.focus();
  };

  const buttonProps = mergeProps(rest, {
    ...controlProps,
    'aria-labelledby': field.labelId,
    'aria-activedescendant': open && active >= 0 ? optionId(active) : undefined,
    'aria-required': required || undefined,
    onKeyDown,
    onKeyUp,
    onClick,
    onBlur,
  });

  const renderOption = ({ option, index }: FlatOption) => {
    const isSelected = index === selectedIndex;
    return (
      // Options are never focused: DOM focus stays on the combobox (aria-activedescendant),
      // whose onKeyDown handles the keyboard. The click is the pointer equivalent of Enter.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
      <div
        key={optionId(index)}
        id={optionId(index)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled ? true : undefined}
        data-active={index === active || undefined}
        className={cx(floatingStyles.item, styles.option)}
        onPointerMove={
          option.disabled
            ? undefined
            : () => {
                setActiveIndex(index);
              }
        }
        onClick={
          option.disabled
            ? undefined
            : () => {
                commit(index);
              }
        }
      >
        <CheckIcon size="sm" className={styles.check} />
        <span className={styles.optionLabel}>{option.label}</span>
      </div>
    );
  };

  return (
    <Field disabled={disabled} className={className} style={style}>
      <FieldLabel
        {...field.labelProps}
        required={required}
        disabled={disabled}
        onClick={onLabelClick}
      >
        {label}
      </FieldLabel>
      {field.descriptionId && (
        <FieldDescription {...field.descriptionProps}>{description}</FieldDescription>
      )}
      <div ref={boxRef} className={cx(controlStyles.box, styles.box)} data-size={size}>
        <button
          {...buttonProps}
          ref={composeRefs(ref, buttonRef)}
          type="button"
          role="combobox"
          aria-controls={open ? listboxId : undefined}
          aria-expanded={open}
          className={cx(controlStyles.input, styles.trigger)}
        >
          {selected ? (
            <span className={styles.value}>{selected.label}</span>
          ) : (
            <span className={cx(styles.value, styles.placeholder)}>{placeholder}</span>
          )}
        </button>
        <ChevronDownIcon size={size} className={styles.chevron} />
      </div>
      {open && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={field.labelId}
          tabIndex={-1}
          popover="manual"
          data-size={size}
          className={cx(floatingStyles.floating, floatingStyles.surface, styles.listbox)}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
          onFocus={onListboxFocus}
        >
          {sections.map((section) => {
            if (section.kind === 'option') return renderOption(section.entry);
            const gid = groupLabelId(section.groupIndex);
            return (
              <div key={gid} role="group" aria-labelledby={gid}>
                <div role="presentation" id={gid} className={floatingStyles.groupLabel}>
                  {section.label}
                </div>
                {section.entries.map(renderOption)}
              </div>
            );
          })}
        </div>
      )}
      {name !== undefined && (
        <input
          type="hidden"
          name={name}
          form={form}
          value={selected?.value ?? ''}
          disabled={disabled || selected === undefined}
        />
      )}
      {field.showError && <FieldError {...field.errorProps}>{errorMessage}</FieldError>}
    </Field>
  );
});

Select.displayName = 'Select';

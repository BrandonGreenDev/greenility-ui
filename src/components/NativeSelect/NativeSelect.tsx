import { forwardRef, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from 'react';
import { useField, type FieldBaseProps } from '../../hooks/useField';
import { composeValueChange } from '../../utils/composeChange';
import { cx } from '../../utils/cx';
import type { Size } from '../../utils/types';
import { Field, FieldDescription, FieldError, FieldLabel } from '../Field';
import controlStyles from '../Field/control.module.css';
import { ChevronDownIcon } from '../Icon';
import styles from './NativeSelect.module.css';

export interface NativeSelectProps
  extends
    FieldBaseProps,
    Omit<
      SelectHTMLAttributes<HTMLSelectElement>,
      'size' | 'multiple' | 'value' | 'defaultValue' | 'required' | 'disabled' | 'children'
    > {
  /** Height, font size and padding of the box. @default 'md' */
  size?: Size;
  /** Controlled value (pass with `onValueChange` or `onChange`). */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called with the new value on every native change, after `onChange`. */
  onValueChange?: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
  /** Adds a first `<option value="" disabled>` prompt. When uncontrolled with no `defaultValue`, it is selected initially. When controlled, pass `value=""` to show it. */
  placeholder?: string;
  /** Native `<option>` / `<optgroup>` elements. */
  children: ReactNode;
}

/**
 * A styled native `<select>` for picking one option, with a label, optional help text
 * and error text.
 *
 * `className` and `style` go to the outer wrapper. The ref, `id` and every other prop
 * go to the native `<select>`.
 */
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
  {
    label,
    description,
    errorMessage,
    invalid = false,
    required = false,
    disabled = false,
    size = 'md',
    placeholder,
    value,
    defaultValue,
    onChange,
    onValueChange,
    className,
    style,
    id,
    'aria-describedby': ariaDescribedBy,
    children,
    ...rest
  },
  ref,
) {
  const field = useField({
    id,
    description,
    errorMessage,
    invalid,
    required,
    disabled,
    'aria-describedby': ariaDescribedBy,
  });

  const hasPlaceholder = placeholder !== undefined;
  // Without this, an uncontrolled select would show the first real option instead of the prompt.
  const initialValue =
    value === undefined && defaultValue === undefined && hasPlaceholder ? '' : defaultValue;

  return (
    <Field disabled={disabled} className={className} style={style}>
      <FieldLabel {...field.labelProps} required={required} disabled={disabled}>
        {label}
      </FieldLabel>
      {field.descriptionId && (
        <FieldDescription {...field.descriptionProps}>{description}</FieldDescription>
      )}
      <div className={cx(controlStyles.box, styles.box)} data-size={size}>
        <select
          ref={ref}
          className={cx(controlStyles.input, styles.select)}
          value={value}
          defaultValue={initialValue}
          onChange={composeValueChange(onChange, onValueChange)}
          {...rest}
          {...field.controlProps}
        >
          {hasPlaceholder && (
            <option value="" disabled data-placeholder="">
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDownIcon size={size} className={styles.chevron} />
      </div>
      {field.showError && <FieldError {...field.errorProps}>{errorMessage}</FieldError>}
    </Field>
  );
});

NativeSelect.displayName = 'NativeSelect';

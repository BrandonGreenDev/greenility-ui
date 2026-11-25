import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useField, type FieldBaseProps } from '../../hooks/useField';
import { composeValueChange } from '../../utils/composeChange';
import { cx } from '../../utils/cx';
import { isRenderable } from '../../utils/isRenderable';
import type { Size } from '../../utils/types';
import { Field, FieldDescription, FieldError, FieldLabel } from '../Field';
import controlStyles from '../Field/control.module.css';
import styles from './TextField.module.css';

export interface TextFieldProps
  extends
    FieldBaseProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'size' | 'type' | 'value' | 'defaultValue' | 'children' | 'required' | 'disabled'
    > {
  /** Native input type (text-like types only). @default 'text' */
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
  /** Height, font size and padding of the input box. @default 'md' */
  size?: Size;
  /** Controlled value (pass with `onValueChange` or `onChange`). */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called with the new value on every native change, after `onChange`. */
  onValueChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  /**
   * Content inside the box before the input, e.g. an icon or "$". Not part of the input's
   * name or description; put units in `label` or `description`; decorative icons need no label.
   */
  startAdornment?: ReactNode;
  /**
   * Content inside the box after the input, e.g. unit text or a clear IconButton (which stays
   * in the tab order after the input). Not part of the input's name or description; put units
   * in `label` or `description`; decorative icons need no label.
   */
  endAdornment?: ReactNode;
}

/**
 * A single-line text input with a label, optional help text and error text.
 *
 * `className` and `style` go to the outer wrapper. The ref, `id` and every other prop
 * go to the native `<input>`.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    description,
    errorMessage,
    invalid = false,
    required = false,
    disabled = false,
    size = 'md',
    type = 'text',
    startAdornment,
    endAdornment,
    onChange,
    onValueChange,
    className,
    style,
    id,
    'aria-describedby': ariaDescribedBy,
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

  return (
    <Field disabled={disabled} className={className} style={style}>
      <FieldLabel {...field.labelProps} required={required} disabled={disabled}>
        {label}
      </FieldLabel>
      {field.descriptionId && (
        <FieldDescription {...field.descriptionProps}>{description}</FieldDescription>
      )}
      <div className={cx(controlStyles.box, styles.box)} data-size={size}>
        {isRenderable(startAdornment) && (
          <span className={styles.adornment} data-placement="start">
            {startAdornment}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={cx(controlStyles.input, styles.input)}
          onChange={composeValueChange(onChange, onValueChange)}
          {...rest}
          {...field.controlProps}
        />
        {isRenderable(endAdornment) && (
          <span className={styles.adornment} data-placement="end">
            {endAdornment}
          </span>
        )}
      </div>
      {field.showError && <FieldError {...field.errorProps}>{errorMessage}</FieldError>}
    </Field>
  );
});

TextField.displayName = 'TextField';

import {
  forwardRef,
  type ChangeEvent,
  type CSSProperties,
  type TextareaHTMLAttributes,
} from 'react';
import { useField, type FieldBaseProps } from '../../hooks/useField';
import { composeValueChange } from '../../utils/composeChange';
import { cx } from '../../utils/cx';
import type { Size } from '../../utils/types';
import { Field, FieldDescription, FieldError, FieldLabel } from '../Field';
import controlStyles from '../Field/control.module.css';
import styles from './TextArea.module.css';

export interface TextAreaProps
  extends
    FieldBaseProps,
    Omit<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      'value' | 'defaultValue' | 'children' | 'required' | 'disabled'
    > {
  /** Font size and padding of the box. Height comes from `rows`. @default 'md' */
  size?: Size;
  /** Controlled value (pass with `onValueChange` or `onChange`). */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called with the new value on every native change, after `onChange`. */
  onValueChange?: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
  /** Visible number of text lines (the minimum height when `autoResize` is on). @default 3 */
  rows?: number;
  /** Grow with content using CSS `field-sizing: content`. Browsers without support keep a fixed, user-resizable height. @default false */
  autoResize?: boolean;
}

/**
 * A multi-line text input with a label, optional help text and error text.
 *
 * `className` and `style` go to the outer wrapper. The ref, `id` and every other prop
 * go to the native `<textarea>`.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    label,
    description,
    errorMessage,
    invalid = false,
    required = false,
    disabled = false,
    size = 'md',
    rows = 3,
    autoResize = false,
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

  // `field-sizing: content` ignores `rows`, so CSS derives the minimum height from it.
  const rowsStyle: (CSSProperties & { '--rows'?: number }) | undefined = autoResize
    ? { '--rows': rows }
    : undefined;

  return (
    <Field disabled={disabled} className={className} style={style}>
      <FieldLabel {...field.labelProps} required={required} disabled={disabled}>
        {label}
      </FieldLabel>
      {field.descriptionId && (
        <FieldDescription {...field.descriptionProps}>{description}</FieldDescription>
      )}
      <div className={cx(controlStyles.box, styles.box)} data-size={size}>
        <textarea
          ref={ref}
          rows={rows}
          className={cx(controlStyles.input, styles.input)}
          data-auto-resize={autoResize || undefined}
          style={rowsStyle}
          onChange={composeValueChange(onChange, onValueChange)}
          {...rest}
          {...field.controlProps}
        />
      </div>
      {field.showError && <FieldError {...field.errorProps}>{errorMessage}</FieldError>}
    </Field>
  );
});

TextArea.displayName = 'TextArea';

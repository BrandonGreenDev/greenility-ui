import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react';
import { useField, type FieldBaseProps } from '../../hooks/useField';
import { composeRefs } from '../../utils/composeRefs';
import { cx } from '../../utils/cx';
import type { CheckedState } from '../../utils/types';
import { FieldDescription, FieldError, FieldLabel } from '../Field';
import indicatorStyles from '../Field/indicator.module.css';
import { CheckIcon, MinusIcon } from '../Icon';
import styles from './Checkbox.module.css';

export interface CheckboxProps
  extends
    FieldBaseProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'type' | 'size' | 'checked' | 'defaultChecked' | 'children' | 'required' | 'disabled'
    > {
  /** Controlled state. `'indeterminate'` shows a dash and is exposed to assistive technology as "mixed". */
  checked?: CheckedState;
  /** Initial state when uncontrolled. Only read on mount. @default false */
  defaultChecked?: CheckedState;
  /** Called when the user toggles, after `onChange`. Always a boolean: user input clears indeterminate. */
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * A binary or tri-state choice built on a native `<input type="checkbox">`.
 *
 * `className` and `style` go to the root wrapper `<div>`. `ref`, `id` and every other
 * prop go to the native `<input>`. Indeterminate is set through the DOM `indeterminate`
 * property, so the browser exposes "mixed" natively.
 *
 * Pass `errorMessage` whenever `invalid` is set: the danger border alone relies on colour
 * (WCAG 1.4.1), and `useField` warns in the console when the message is missing.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    errorMessage,
    invalid = false,
    required = false,
    disabled = false,
    checked,
    defaultChecked = false,
    onCheckedChange,
    onChange,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const composedRef = useMemo(() => composeRefs(inputRef, ref), [ref]);
  // The uncontrolled default is read once, like the native `defaultChecked`.
  const [initialDefault] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const indeterminate = (isControlled ? checked : initialDefault) === 'indeterminate';

  useLayoutEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    // The browser clears `indeterminate` on click. When controlled, restore the prop value
    // first, so consumer callbacks see the DOM as React will render it (an indeterminate
    // checkbox stays indeterminate until `checked` changes; the next render then syncs it).
    if (isControlled) event.currentTarget.indeterminate = indeterminate;
    onChange?.(event);
    onCheckedChange?.(event.currentTarget.checked, event);
  };

  const stateProps = isControlled
    ? { checked: checked === true }
    : { defaultChecked: initialDefault === true };

  return (
    <div
      className={cx(indicatorStyles.option, className)}
      style={style}
      data-disabled={disabled || undefined}
    >
      <span className={indicatorStyles.control}>
        <input
          ref={composedRef}
          type="checkbox"
          className={cx(indicatorStyles.input, styles.input)}
          onChange={handleChange}
          {...stateProps}
          {...field.controlProps}
          {...rest}
        />
        <CheckIcon className={cx(indicatorStyles.glyph, styles.check)} />
        <MinusIcon className={cx(indicatorStyles.glyph, styles.dash)} />
      </span>
      <div className={indicatorStyles.text}>
        <FieldLabel
          {...field.labelProps}
          required={required}
          disabled={disabled}
          className={indicatorStyles.label}
        >
          {label}
        </FieldLabel>
        {field.descriptionId && (
          <FieldDescription {...field.descriptionProps}>{description}</FieldDescription>
        )}
        {field.showError && <FieldError {...field.errorProps}>{errorMessage}</FieldError>}
      </div>
    </div>
  );
});
Checkbox.displayName = 'Checkbox';

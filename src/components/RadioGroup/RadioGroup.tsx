import {
  forwardRef,
  useId,
  useMemo,
  type ChangeEvent,
  type FieldsetHTMLAttributes,
  type ReactNode,
} from 'react';
import { useField, type FieldBaseProps } from '../../hooks/useField';
import { cx } from '../../utils/cx';
import type { Orientation } from '../../utils/types';
import { FieldDescription, FieldError, FieldLabel } from '../Field';
import styles from './RadioGroup.module.css';
import { RadioGroupContext, type RadioGroupContextValue } from './RadioGroupContext';

export interface RadioGroupProps
  extends
    FieldBaseProps,
    Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange' | 'disabled' | 'children'> {
  /** Shared native `name` for every radio. @default a useId()-based name */
  name?: string;
  /** Controlled selected value. */
  value?: string;
  /** Initial selected value when uncontrolled. */
  defaultValue?: string;
  /**
   * Called with the newly selected value from the native change event. Pass a stable
   * function (for example a state setter or a `useCallback`): it is part of the context
   * value, so a new function each render re-renders every `Radio`.
   */
  onValueChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  /** Layout only; arrow keys work in both axes natively. @default 'vertical' */
  orientation?: Orientation;
  /** `<Radio>` elements. */
  children: ReactNode;
}

/**
 * A single choice from a small set: native radios sharing a `name`, inside a
 * `<fieldset>` named by its `<legend>`. Browsers provide the arrow-key model, the
 * single tab stop and form submission natively.
 *
 * The ref, `className` and every other prop go to the `<fieldset>`. The group's
 * description and error are linked to the fieldset; `aria-invalid` and `required`
 * go on each radio, because they are not supported on `role="group"`.
 *
 * Pass `errorMessage` whenever `invalid` is set: the danger border alone relies on colour
 * (WCAG 1.4.1), and `useField` warns in the console when the message is missing.
 */
export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup(
  {
    label,
    description,
    errorMessage,
    invalid = false,
    required = false,
    disabled = false,
    name,
    value,
    defaultValue,
    onValueChange,
    orientation = 'vertical',
    className,
    children,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const field = useField({
    description,
    errorMessage,
    invalid,
    disabled,
    'aria-describedby': ariaDescribedBy,
  });
  const generatedName = useId();
  const groupName = name ?? generatedName;

  const context = useMemo<RadioGroupContextValue>(
    () => ({
      name: groupName,
      value,
      defaultValue,
      invalid,
      required,
      onChange: (event) => {
        onValueChange?.(event.currentTarget.value, event);
      },
    }),
    [groupName, value, defaultValue, invalid, required, onValueChange],
  );

  return (
    <fieldset
      ref={ref}
      className={cx(styles.root, className)}
      data-orientation={orientation}
      data-disabled={disabled || undefined}
      {...field.groupProps}
      {...rest}
    >
      <FieldLabel
        as="legend"
        id={field.labelId}
        required={required}
        disabled={disabled}
        className={styles.legend}
      >
        {label}
      </FieldLabel>
      {field.descriptionId && (
        <FieldDescription {...field.descriptionProps}>{description}</FieldDescription>
      )}
      <div className={styles.options}>
        <RadioGroupContext.Provider value={context}>{children}</RadioGroupContext.Provider>
      </div>
      {field.showError && <FieldError {...field.errorProps}>{errorMessage}</FieldError>}
    </fieldset>
  );
});
RadioGroup.displayName = 'RadioGroup';

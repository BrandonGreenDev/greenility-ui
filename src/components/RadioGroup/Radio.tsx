import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useField } from '../../hooks/useField';
import { cx } from '../../utils/cx';
import { FieldDescription, FieldLabel } from '../Field';
import indicatorStyles from '../Field/indicator.module.css';
import styles from './RadioGroup.module.css';
import { useRadioGroupContext } from './RadioGroupContext';

export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'name' | 'checked' | 'defaultChecked' | 'size' | 'children' | 'value'
> {
  /** Value submitted with the form and reported by `onValueChange` when selected. */
  value: string;
  /** Visible label. */
  label: ReactNode;
  /** Per-option help text, linked with aria-describedby on this radio. */
  description?: ReactNode;
  /** Disables this option only. The group's `disabled` disables every option. @default false */
  disabled?: boolean;
}

/**
 * One option of a `RadioGroup`, built on a native `<input type="radio">`. Must be
 * rendered inside a `RadioGroup`, which supplies the `name`, the selected value and the
 * invalid/required state; rendering it outside one throws.
 *
 * `className` and `style` go to the option wrapper `<div>`. `ref`, `id` and every other
 * prop go to the native `<input>`.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  {
    value,
    label,
    description,
    disabled = false,
    onChange,
    className,
    style,
    id,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const group = useRadioGroupContext();
  const field = useField({
    id,
    description,
    invalid: group.invalid,
    required: group.required,
    disabled,
    'aria-describedby': ariaDescribedBy,
  });

  const stateProps =
    group.value === undefined
      ? { defaultChecked: group.defaultValue === value }
      : { checked: group.value === value };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    group.onChange(event);
  };

  return (
    <div className={cx(indicatorStyles.option, className)} style={style}>
      <span className={indicatorStyles.control}>
        <input
          ref={ref}
          type="radio"
          className={cx(indicatorStyles.input, styles.input)}
          name={group.name}
          value={value}
          onChange={handleChange}
          {...stateProps}
          {...field.controlProps}
          {...rest}
        />
        <span aria-hidden="true" className={cx(indicatorStyles.glyph, styles.dot)} />
      </span>
      <div className={indicatorStyles.text}>
        <FieldLabel {...field.labelProps} disabled={disabled} className={indicatorStyles.label}>
          {label}
        </FieldLabel>
        {field.descriptionId && (
          <FieldDescription {...field.descriptionProps}>{description}</FieldDescription>
        )}
      </div>
    </div>
  );
});
Radio.displayName = 'Radio';

import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useField } from '../../hooks/useField';
import { cx } from '../../utils/cx';
import { FieldDescription, FieldLabel } from '../Field';
import indicatorStyles from '../Field/indicator.module.css';
import styles from './Switch.module.css';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role' | 'size' | 'checked' | 'defaultChecked' | 'children' | 'disabled'
> {
  /** Visible label naming the setting. */
  label: ReactNode;
  /** Help text linked with aria-describedby. */
  description?: ReactNode;
  /** Controlled on state. */
  checked?: boolean;
  /** Initial on state when uncontrolled. @default false */
  defaultChecked?: boolean;
  /** Called when the user toggles, after `onChange`. */
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  /** Disables the native control. @default false */
  disabled?: boolean;
}

/**
 * An on/off setting that takes effect immediately, built on a native
 * `<input type="checkbox" role="switch">`. It has no invalid or error state.
 *
 * `className` and `style` go to the root wrapper `<div>`. `ref`, `id` and every other
 * prop go to the native `<input>`.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    label,
    description,
    checked,
    defaultChecked = false,
    onCheckedChange,
    onChange,
    disabled = false,
    className,
    style,
    id,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const field = useField({ id, description, disabled, 'aria-describedby': ariaDescribedBy });

  const stateProps = checked === undefined ? { defaultChecked } : { checked };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onCheckedChange?.(event.currentTarget.checked, event);
  };

  return (
    <div
      className={cx(indicatorStyles.option, className)}
      style={style}
      data-disabled={disabled || undefined}
    >
      <span className={indicatorStyles.control}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          className={cx(indicatorStyles.input, styles.track)}
          onChange={handleChange}
          {...stateProps}
          {...field.controlProps}
          {...rest}
        />
        <span aria-hidden="true" className={cx(indicatorStyles.glyph, styles.thumb)} />
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
Switch.displayName = 'Switch';

import {
  forwardRef,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from '../../utils/cx';
import { DangerIcon } from '../Icon';
import styles from './Field.module.css';

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Marks the whole field as disabled for styling (`data-disabled`). @default false */
  disabled?: boolean | undefined;
  /** Label, description, control and error. */
  children: ReactNode;
}

/**
 * Internal layout wrapper for field-like components: a vertical stack of label,
 * description, control and error. The ref and other props go to the root `<div>`.
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { disabled = false, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(styles.root, className)}
      data-disabled={disabled || undefined}
      {...rest}
    >
      {children}
    </div>
  );
});
Field.displayName = 'Field';

export interface FieldLabelProps extends LabelHTMLAttributes<HTMLElement> {
  /** Render a `<label>` (for a single control) or a `<legend>` (inside a `<fieldset>`). @default 'label' */
  as?: 'label' | 'legend';
  /** Shows an aria-hidden asterisk. The control itself carries native `required`. @default false */
  required?: boolean | undefined;
  /** Applies disabled text colour. @default false */
  disabled?: boolean | undefined;
  /** Label content. */
  children: ReactNode;
}

/**
 * Internal visible label of a field, with an optional aria-hidden required asterisk.
 * The ref and other props go to the `<label>` or `<legend>`. `htmlFor` is dropped for a legend.
 */
export const FieldLabel = forwardRef<HTMLElement, FieldLabelProps>(function FieldLabel(
  { as = 'label', required = false, disabled = false, className, children, htmlFor, ...rest },
  ref,
) {
  const content = (
    <>
      {children}
      {required && (
        <span aria-hidden="true" className={styles.required}>
          *
        </span>
      )}
    </>
  );
  const shared = {
    className: cx(styles.label, className),
    'data-disabled': disabled || undefined,
    ...rest,
  };
  if (as === 'legend') {
    return (
      <legend ref={ref as Ref<HTMLLegendElement>} {...shared}>
        {content}
      </legend>
    );
  }
  return (
    <label ref={ref as Ref<HTMLLabelElement>} htmlFor={htmlFor} {...shared}>
      {content}
    </label>
  );
});
FieldLabel.displayName = 'FieldLabel';

export interface FieldDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Help text. Pass `descriptionProps` from `useField` so the id matches aria-describedby. */
  children: ReactNode;
}

/** Internal help text of a field. The ref and other props go to the `<p>`. */
export const FieldDescription = forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  function FieldDescription({ className, children, ...rest }, ref) {
    return (
      <p ref={ref} className={cx(styles.description, className)} {...rest}>
        {children}
      </p>
    );
  },
);
FieldDescription.displayName = 'FieldDescription';

export interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Error text. Render only when `showError` from `useField` is true, and pass `errorProps`. */
  children: ReactNode;
}

/**
 * Internal error text of a field, with a decorative danger icon so the state does not
 * rely on colour alone. Deliberately not a live region. The ref and other props go to the `<p>`.
 */
export const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(function FieldError(
  { className, children, ...rest },
  ref,
) {
  return (
    <p ref={ref} className={cx(styles.error, className)} {...rest}>
      <DangerIcon size="sm" className={styles.errorIcon} /> <span>{children}</span>
    </p>
  );
});
FieldError.displayName = 'FieldError';

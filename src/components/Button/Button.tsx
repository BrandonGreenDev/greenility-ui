import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import type { ButtonVariant, Size } from '../../utils/types';
import { Spinner } from '../Spinner';
import { VisuallyHidden } from '../VisuallyHidden';
import styles from './Button.module.css';

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
> {
  /** Visible label and accessible name. */
  children: ReactNode;
  /** Visual style. `danger` is for destructive actions. @default 'primary' */
  variant?: ButtonVariant;
  /** Height, padding, font and icon size from the control metrics table. @default 'md' */
  size?: Size;
  /**
   * Shows a spinner and ignores activation. The label stays in the DOM (opacity 0), so the
   * accessible name is unchanged. Uses aria-disabled="true", not `disabled`, so the button keeps focus.
   * @default false
   */
  loading?: boolean;
  /**
   * Busy text exposed while `loading` as the button's accessible description (via
   * aria-describedby), so the accessible name stays the label. @default 'Loading'
   */
  loadingLabel?: string;
  /** Decorative icon before the label (wrapped aria-hidden). */
  startIcon?: ReactNode;
  /** Decorative icon after the label (wrapped aria-hidden). */
  endIcon?: ReactNode;
  /** Native type. Defaults to "button" so buttons never submit forms by accident. @default 'button' */
  type?: 'button' | 'submit' | 'reset';
  /** Native disabled: removed from tab order and not focusable. If set with `loading`, `disabled` wins. @default false */
  disabled?: boolean;
}

/**
 * Triggers an action. Renders a native `<button>`; the ref and any other props go to it.
 *
 * While `loading` the button stays focusable, exposes `aria-disabled="true"`, is described
 * by `loadingLabel` and swallows clicks (including implicit form submission). `disabled` uses the native attribute.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel = 'Loading',
    disabled = false,
    type = 'button',
    startIcon,
    endIcon,
    className,
    children,
    onClick,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const isLoading = loading && !disabled;
  const loadingId = `${useId()}-loading`;
  const describedBy =
    [ariaDescribedBy, isLoading ? loadingId : undefined].filter(Boolean).join(' ') || undefined;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      // Blocks the consumer handler and form submission (also implicit Enter-submit).
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.root, className)}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      aria-describedby={describedBy}
      {...rest}
      {...(isLoading && { 'aria-disabled': true, 'data-loading': '' })}
      onClick={handleClick}
    >
      {startIcon != null && (
        <span className={styles.icon} aria-hidden="true">
          {startIcon}
        </span>
      )}
      {children != null && <span className={styles.label}>{children}</span>}
      {endIcon != null && (
        <span className={styles.icon} aria-hidden="true">
          {endIcon}
        </span>
      )}
      {isLoading && (
        <>
          <Spinner decorative size={size} className={styles.spinner} />
          {/* aria-hidden keeps it out of the name; aria-describedby still reads referenced hidden text. */}
          <VisuallyHidden id={loadingId} aria-hidden="true">
            {loadingLabel}
          </VisuallyHidden>
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

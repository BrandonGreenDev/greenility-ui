import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import type { Size } from '../../utils/types';
import { VisuallyHidden } from '../VisuallyHidden';
import styles from './Spinner.module.css';

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'role' | 'children'> {
  /** Diameter, mapped to `--gn-size-icon-{size}`. @default 'md' */
  size?: Size;
  /** Text announced to assistive technology. Ignored when decorative. @default 'Loading' */
  label?: string;
  /** Hide from assistive technology (e.g. inside a loading Button, which conveys state itself). @default false */
  decorative?: boolean;
}

/** Circumference of the r=9 arc; the visible dash is roughly a quarter of it. */
const CIRCUMFERENCE = 2 * Math.PI * 9;
const DASH = `${(CIRCUMFERENCE / 4).toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`;

/**
 * An indeterminate busy indicator. The ref and any other props go to the root `<span>`.
 *
 * Standalone it is a `role="status"` live region whose name comes from visually hidden text.
 * A polite region must already be mounted before its content changes. Render it up front and
 * swap its children; do not mount it together with its message or toggle `live` to start
 * announcing. For Spinner this means announcement on mount is best-effort; for reliable
 * announcements keep a status region mounted and change its text.
 *
 * With `decorative` it is aria-hidden and the parent (e.g. a loading Button) supplies the
 * semantics.
 */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { size = 'md', label = 'Loading', decorative = false, className, ...rest },
  ref,
) {
  const a11yProps = decorative ? { 'aria-hidden': true as const } : { role: 'status' as const };
  return (
    <span
      ref={ref}
      className={cx(styles.root, className)}
      data-size={size}
      {...a11yProps}
      {...rest}
    >
      <svg
        className={styles.svg}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle className={styles.track} cx="12" cy="12" r="9" strokeWidth={2.5} />
        <circle
          className={styles.arc}
          cx="12"
          cy="12"
          r="9"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={DASH}
        />
      </svg>
      {!decorative && <VisuallyHidden>{label}</VisuallyHidden>}
    </span>
  );
});

Spinner.displayName = 'Spinner';

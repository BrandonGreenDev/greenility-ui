import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './VisuallyHidden.module.css';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  /** Text for assistive technology only. */
  children: ReactNode;
}

/**
 * Content that is available to assistive technology but not shown on screen, e.g. extra
 * context for a link or an icon-only control. Renders a `<span>`; the ref and any other
 * props go to the span.
 */
export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  function VisuallyHidden({ className, children, ...rest }, ref) {
    return (
      <span ref={ref} className={cx(styles.root, className)} {...rest}>
        {children}
      </span>
    );
  },
);

VisuallyHidden.displayName = 'VisuallyHidden';

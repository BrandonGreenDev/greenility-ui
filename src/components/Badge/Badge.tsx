import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { BadgeVariant, Size, Tone } from '../../utils/types';
import styles from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Text content. It must carry the full meaning on its own, because colour is only
   * supplementary (WCAG 1.4.1). Add context for assistive technology with
   * `VisuallyHidden`, e.g. `3 <VisuallyHidden>overdue reports</VisuallyHidden>`.
   */
  children: ReactNode;
  /** Meaning of the badge. @default 'neutral' */
  tone?: Tone;
  /** Filled `solid` or tinted `subtle` background. @default 'subtle' */
  variant?: BadgeVariant;
  /** Text size and padding. @default 'md' */
  size?: Size;
}

/**
 * A short, non-interactive status or label. Rendered as plain text in a `<span>`,
 * with no role. The ref and every other prop go to the `<span>`.
 *
 * A badge is not a live region: changing its text is not announced. For a status that
 * updates while the user is on the page, also announce the change in a separate
 * `role="status"` (polite) live region.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', variant = 'subtle', size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cx(styles.root, className)}
      data-tone={tone}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {children}
    </span>
  );
});
Badge.displayName = 'Badge';

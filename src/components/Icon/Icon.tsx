import {
  forwardRef,
  type ForwardRefExoticComponent,
  type ReactNode,
  type RefAttributes,
  type SVGProps,
} from 'react';
import { cx } from '../../utils/cx';
import type { Size } from '../../utils/types';
import styles from './Icon.module.css';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'children'> {
  /** Maps to --gn-size-icon-{size}. @default 'md' */
  size?: Size;
  /** If set, the icon is meaningful: role="img" + aria-label. Otherwise aria-hidden="true". */
  label?: string;
}

/** A component returned by `createIcon`. The ref goes to the `<svg>`. */
export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

/**
 * Builds a 24x24 stroke icon component from its shapes. The ref goes to the `<svg>`.
 * Icons are decorative (aria-hidden) unless a `label` is given.
 */
export function createIcon(displayName: string, shapes: ReactNode): IconComponent {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 'md', label, className, ...rest },
    ref,
  ) {
    const a11yProps =
      label === undefined
        ? { 'aria-hidden': true as const }
        : { role: 'img' as const, 'aria-label': label };
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        data-size={size}
        className={cx(styles.root, className)}
        {...a11yProps}
        {...rest}
      >
        {shapes}
      </svg>
    );
  });
  Icon.displayName = displayName;
  return Icon;
}

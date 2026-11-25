import { forwardRef, useEffect, type ReactNode } from 'react';
import type { Placement } from '../../utils/types';
import { Button, type ButtonProps } from '../Button';
import { Tooltip } from '../Tooltip';

export interface IconButtonProps extends Omit<
  ButtonProps,
  'children' | 'startIcon' | 'endIcon' | 'aria-label' | 'aria-labelledby'
> {
  /**
   * Accessible name, applied as aria-label. Required and must be non-empty (a warning is
   * logged otherwise): there is no visible text.
   */
  label: string;
  /** The icon to render (decorative; wrapped aria-hidden). */
  icon: ReactNode;
  /**
   * Shows `label` as a visible tooltip on hover and keyboard focus. The tooltip is decorative
   * (aria-hidden): the name already comes from aria-label, so it is not announced twice.
   * Never shown while `disabled`. @default true
   */
  tooltip?: boolean;
  /** Preferred side of the tooltip; flips when there is no room. @default 'top' */
  tooltipPlacement?: Placement;
}

/**
 * A square Button whose only content is an icon. Same variants, sizes and loading
 * behaviour as Button, including `loadingLabel`. `label` must be a non-empty string and is
 * also shown as a decorative tooltip unless `tooltip={false}`.
 *
 * Renders a native `<button>`; the ref and any other props go to it. The tooltip bubble is
 * rendered as the button's next sibling (not a wrapper), so parent `>` selectors still match.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, tooltip = true, tooltipPlacement = 'top', disabled = false, ...rest },
  ref,
) {
  useEffect(() => {
    if (label.trim() === '') {
      console.warn(
        'IconButton: `label` is empty. Icon-only buttons need a non-empty label for their accessible name.',
      );
    }
  }, [label]);

  return (
    <Tooltip
      content={label}
      decorative
      placement={tooltipPlacement}
      disabled={!tooltip || disabled || label.trim() === ''}
    >
      <Button
        ref={ref}
        {...rest}
        disabled={disabled}
        aria-label={label}
        // The icon goes in the startIcon slot to reuse Button's aria-hidden wrapper and icon sizing.
        startIcon={icon}
        data-icon-only=""
        children={null}
      />
    </Tooltip>
  );
});

IconButton.displayName = 'IconButton';

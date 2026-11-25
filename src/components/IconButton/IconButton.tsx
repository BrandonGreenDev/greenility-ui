import { forwardRef, useEffect, type ReactNode } from 'react';
import { Button, type ButtonProps } from '../Button';

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
}

/**
 * A square Button whose only content is an icon. Same variants, sizes and loading
 * behaviour as Button, including `loadingLabel`. `label` must be a non-empty string. Renders a native `<button>`; the ref and any other props go to it.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, ...rest },
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
    <Button
      ref={ref}
      {...rest}
      aria-label={label}
      // The icon goes in the startIcon slot to reuse Button's aria-hidden wrapper and icon sizing.
      startIcon={icon}
      data-icon-only=""
      children={null}
    />
  );
});

IconButton.displayName = 'IconButton';

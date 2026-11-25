import { forwardRef, type MouseEvent } from 'react';
import type { ButtonVariant } from '../../utils/types';
import { Button, type ButtonProps } from '../Button';
import { useDialogContext } from './DialogContext';

export interface DialogCloseProps extends ButtonProps {
  /** Visual style. @default 'secondary' */
  variant?: ButtonVariant;
}

/**
 * A Button that closes the nearest Dialog or AlertDialog after its own `onClick`, unless
 * that called `event.preventDefault()`. Throws when rendered outside a dialog. Renders a
 * native `<button>`; the ref and any other props go to it.
 */
export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(
  { variant = 'secondary', onClick, ...rest },
  ref,
) {
  const { close } = useDialogContext('DialogClose');

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) close();
  };

  return <Button ref={ref} variant={variant} {...rest} onClick={handleClick} />;
});

DialogClose.displayName = 'DialogClose';

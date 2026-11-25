import { forwardRef } from 'react';
import { DialogShell, type DialogProps } from './DialogShell';

export type { DialogProps } from './DialogShell';

/**
 * A modal window for a focused task, built on a native `<dialog>` opened with
 * `showModal()`: the page behind it is inert, it sits in the top layer, and Escape, the
 * close button, `DialogClose` and a backdrop click close it. The ref and any other props
 * go to the `<dialog>`.
 *
 * The content is unmounted while closed. Focus moves into the body on open and returns to
 * the trigger (or `returnFocusRef`) on close.
 */
export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(props, ref) {
  return <DialogShell ref={ref} {...props} />;
});

Dialog.displayName = 'Dialog';

import { forwardRef, useRef, type MouseEvent, type ReactNode } from 'react';
import type { ButtonVariant } from '../../utils/types';
import { DialogClose } from './DialogClose';
import { DialogShell, type DialogProps } from './DialogShell';

export interface AlertDialogProps extends Omit<
  DialogProps,
  'footer' | 'closeLabel' | 'initialFocusRef' | 'description'
> {
  /** Required: states the consequence, e.g. "This permanently deletes 3 files." */
  description: ReactNode;
  /** Confirm button text, e.g. "Delete files". */
  confirmLabel: ReactNode;
  /** Cancel button text. Cancel gets focus on open, as the least destructive action. @default 'Cancel' */
  cancelLabel?: ReactNode;
  /**
   * Called on confirm; the dialog then requests close (`onOpenChange(false)`). Call
   * `event.preventDefault()` to keep it open (e.g. while validating), or control `open`
   * to keep it open while the work runs.
   */
  onConfirm: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Style of the confirm button. @default 'danger' */
  confirmVariant?: Extract<ButtonVariant, 'danger' | 'primary'>;
}

/**
 * A modal confirmation for a destructive or consequential action (`role="alertdialog"`).
 * It has no close button and ignores backdrop clicks, so it cannot be dismissed by
 * accident; Escape and Cancel close it. Cancel is focused on open. The ref and any other
 * props go to the `<dialog>`.
 */
export const AlertDialog = forwardRef<HTMLDialogElement, AlertDialogProps>(function AlertDialog(
  { confirmLabel, cancelLabel = 'Cancel', onConfirm, confirmVariant = 'danger', ...rest },
  ref,
) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <DialogShell
      ref={ref}
      {...rest}
      alert
      initialFocusRef={cancelRef}
      footer={
        <>
          <DialogClose ref={cancelRef}>{cancelLabel}</DialogClose>
          {/* Runs onConfirm, then requests close. Control `open` to keep it open while working. */}
          <DialogClose
            variant={confirmVariant}
            onClick={(event) => {
              onConfirm(event);
            }}
          >
            {confirmLabel}
          </DialogClose>
        </>
      }
    />
  );
});

AlertDialog.displayName = 'AlertDialog';

import { createContext, useContext } from 'react';

/** What an open Dialog shares with `DialogClose` and AlertDialog's buttons. Internal. */
export interface DialogContextValue {
  /** Requests close: `onOpenChange(false)`, and closes when uncontrolled. */
  close: () => void;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

/** Reads the nearest Dialog. Throws when used outside a Dialog or AlertDialog. */
export function useDialogContext(component: string): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error(
      `Greenility: <${component}> must be rendered inside a <Dialog> or <AlertDialog>.`,
    );
  }
  return context;
}

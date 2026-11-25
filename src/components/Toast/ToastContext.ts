import { createContext, useContext, type ReactNode } from 'react';
import type { AlertTone } from '../../utils/types';

export interface ToastAction {
  /** Button text. */
  label: string;
  /** Called on click; the toast is then dismissed. */
  onAction: () => void;
}

export interface ToastOptions {
  /** Message headline. */
  title: ReactNode;
  /** Supporting text. */
  description?: ReactNode;
  /** Meaning; sets colour, icon and the announced prefix. @default 'neutral' */
  tone?: AlertTone;
  /** One optional action. Toasts with an action do not auto-dismiss by default (WCAG 2.2.1). */
  action?: ToastAction;
  /**
   * Auto-dismiss delay in ms; `Infinity` disables it.
   * @default the provider `duration` plus reading time (60 ms per character, up to +10 s);
   * `Infinity` when `action` is set or `tone` is 'warning' or 'danger'
   */
  duration?: number;
  /** Overrides the tone prefix (visually hidden and announced), e.g. 'Saved'. */
  toneLabel?: string;
}

export interface ToastApi {
  /** Shows a toast and returns its id. */
  show: (options: ToastOptions) => string;
  /** Dismisses one toast (visible or queued). Unknown ids are ignored. */
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** Returns `{ show, dismiss }` for the nearest ToastProvider. Throws outside one. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error('Greenility: useToast() must be called inside a <ToastProvider>.');
  }
  return api;
}

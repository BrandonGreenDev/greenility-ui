import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { AlertTone } from '../../utils/types';
import {
  CloseIcon,
  DangerIcon,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
  type IconComponent,
} from '../Icon';
import { IconButton } from '../IconButton';
import { VisuallyHidden } from '../VisuallyHidden';
import styles from './Alert.module.css';

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'role'> {
  /** Meaning; sets colour and icon. @default 'info' */
  tone?: AlertTone;
  /** Short heading line (not a heading element; wrap your own heading inside if needed). */
  title?: ReactNode;
  /** Body content. */
  children?: ReactNode;
  /**
   * Live-region behaviour. 'off': static content present at page load (no role).
   * 'polite': role="status", for non-urgent updates. 'assertive': role="alert",
   * only for urgent, time-sensitive messages. The role is set on the message wrapper
   * (prefix, title and body), not the root, so the dismiss button is outside the region.
   * A polite region must already be mounted before its content changes. Render it up front and
   * swap its children; do not mount it together with its message or toggle `live` to start
   * announcing.
   * @default 'off'
   */
  live?: 'off' | 'polite' | 'assertive';
  /** When provided, a dismiss button is shown and calls this. The Alert does not hide itself. */
  onDismiss?: () => void;
  /** Accessible name of the dismiss button. @default 'Dismiss' */
  dismissLabel?: string;
  /**
   * Hidden prefix announcing the tone, since icon and colour are not perceivable to everyone.
   * @default info 'Info', success 'Success', warning 'Warning', danger 'Error', neutral none
   */
  toneLabel?: string;
}

const toneIcons: Record<AlertTone, IconComponent> = {
  neutral: InfoIcon,
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  danger: DangerIcon,
};

const defaultToneLabels: Record<AlertTone, string | undefined> = {
  neutral: undefined,
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  danger: 'Error',
};

const liveRoles = { off: undefined, polite: 'status', assertive: 'alert' } as const;

/**
 * An inline message with a tone, an optional title and an optional dismiss button.
 * It never moves focus, and dismissal is left to the consumer through `onDismiss`.
 * The ref and any other props go to the root `<div>`; the live role (from `live`) goes to the
 * inner message wrapper.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    tone = 'info',
    title,
    children,
    live = 'off',
    onDismiss,
    dismissLabel = 'Dismiss',
    toneLabel = defaultToneLabels[tone],
    className,
    ...rest
  },
  ref,
) {
  const Icon = toneIcons[tone];
  const hasTitle = title != null && title !== false;
  const hasBody = children != null && children !== false;
  const prefix = toneLabel ? <VisuallyHidden>{`${toneLabel}: `}</VisuallyHidden> : null;

  return (
    <div ref={ref} className={cx(styles.root, className)} data-tone={tone} {...rest}>
      <Icon className={styles.icon} />
      {/* The live role wraps only the message, so the icon and dismiss button are not announced. */}
      <div className={styles.content} role={liveRoles[live]}>
        {hasTitle && (
          <div className={styles.title}>
            {prefix}
            {title}
          </div>
        )}
        {hasBody && (
          <div className={styles.body}>
            {!hasTitle && prefix}
            {children}
          </div>
        )}
      </div>
      {onDismiss && (
        <IconButton
          className={styles.dismiss}
          variant="ghost"
          size="sm"
          label={dismissLabel}
          icon={<CloseIcon />}
          onClick={() => {
            onDismiss();
          }}
        />
      )}
    </div>
  );
});

Alert.displayName = 'Alert';

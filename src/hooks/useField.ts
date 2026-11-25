import { useEffect, useId, type ReactNode } from 'react';
import { isRenderable } from '../utils/isRenderable';

/** Props shared by every field-like component, so the JSDoc is written once. */
export interface FieldBaseProps {
  /** Visible label. Required: every field has a programmatic name. */
  label: ReactNode;
  /** Help text shown below the label and linked with aria-describedby. */
  description?: ReactNode;
  /** Error text. Rendered and linked only when `invalid` is true. Always pass it together with `invalid`. */
  errorMessage?: ReactNode;
  /**
   * Marks the field invalid: sets aria-invalid="true", applies danger styling and shows `errorMessage`.
   * Pair it with an `errorMessage` that says how to fix the value. Without one the error is shown
   * by colour alone (WCAG 1.4.1, 3.3.1), so a console warning is logged.
   * @default false
   */
  invalid?: boolean;
  /** Sets native `required` (announced as "required") and shows an aria-hidden asterisk. @default false */
  required?: boolean;
  /** Disables the native control. @default false */
  disabled?: boolean;
}

export interface UseFieldOptions {
  /** Consumer id for the control. Falls back to a useId()-based id. */
  id?: string | undefined;
  /** Help text. A description id is produced only when this is renderable (not null/undefined/false). */
  description?: ReactNode;
  /** Error text. An error id is produced only when `invalid` is true and this is renderable. */
  errorMessage?: ReactNode;
  /** Whether the field is invalid. */
  invalid?: boolean | undefined;
  /** Whether the field is required. */
  required?: boolean | undefined;
  /** Whether the field is disabled. */
  disabled?: boolean | undefined;
  /** The consumer's own aria-describedby. It is merged, never overwritten. */
  'aria-describedby'?: string | undefined;
}

export interface UseFieldResult {
  /** Id of the native control (the consumer's `id` when given). */
  controlId: string;
  /** Id of the label (or legend). */
  labelId: string;
  /** Set only when there is a description to render. */
  descriptionId: string | undefined;
  /** Set only when `showError` is true. */
  errorId: string | undefined;
  /** `invalid` and there is an error message to render. */
  showError: boolean;
  /** Spread on `<label>`. */
  labelProps: { id: string; htmlFor: string };
  /** Spread on the description element. */
  descriptionProps: { id: string };
  /** Spread on the error element. */
  errorProps: { id: string };
  /** Spread on <input>/<textarea>/<select>. */
  controlProps: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: true;
    required?: boolean;
    disabled?: boolean;
  };
  /** Spread on <fieldset> (RadioGroup). No id/required/aria-invalid; those are invalid on role=group. */
  groupProps: { 'aria-describedby'?: string; disabled?: boolean };
}

/**
 * Generates ids and the ARIA wiring between a label, description, error and control,
 * so every field announces the same way. `aria-describedby` lists the description,
 * then the error, then the consumer's own ids (visual order).
 */
export function useField(options: UseFieldOptions): UseFieldResult {
  const {
    id,
    description,
    errorMessage,
    invalid = false,
    required,
    disabled,
    'aria-describedby': consumerDescribedBy,
  } = options;
  const base = useId();

  // Warn once each time a field becomes invalid without an error message, not on every render.
  const missingErrorMessage = invalid && !isRenderable(errorMessage);
  useEffect(() => {
    if (missingErrorMessage) {
      console.warn(
        'Greenility field: `invalid` is true but no `errorMessage` was given, so the error is shown by colour alone (WCAG 1.4.1, 3.3.1). Pass an `errorMessage` that explains how to fix the value.',
      );
    }
  }, [missingErrorMessage]);

  const controlId = id ?? `${base}-control`;
  const labelId = `${base}-label`;
  const showError = invalid && isRenderable(errorMessage);
  const descriptionId = isRenderable(description) ? `${base}-description` : undefined;
  const errorId = showError ? `${base}-error` : undefined;

  const describedBy =
    [descriptionId, errorId, consumerDescribedBy].filter(Boolean).join(' ') || undefined;

  const controlProps: UseFieldResult['controlProps'] = { id: controlId };
  if (describedBy) controlProps['aria-describedby'] = describedBy;
  if (invalid) controlProps['aria-invalid'] = true;
  if (required !== undefined) controlProps.required = required;
  if (disabled !== undefined) controlProps.disabled = disabled;

  const groupProps: UseFieldResult['groupProps'] = {};
  if (describedBy) groupProps['aria-describedby'] = describedBy;
  if (disabled !== undefined) groupProps.disabled = disabled;

  return {
    controlId,
    labelId,
    descriptionId,
    errorId,
    showError,
    labelProps: { id: labelId, htmlFor: controlId },
    descriptionProps: { id: `${base}-description` },
    errorProps: { id: `${base}-error` },
    controlProps,
    groupProps,
  };
}

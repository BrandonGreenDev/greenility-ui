import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import { getNextIndex, keyToAction } from '../../utils/listNavigation';
import { toIdPart } from '../../utils/toIdPart';
import { ChevronDownIcon } from '../Icon';
import styles from './Accordion.module.css';
import {
  AccordionContext,
  useAccordionContext,
  type AccordionContextValue,
} from './AccordionContext';

interface AccordionBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  /** Heading element level wrapping each trigger; match the page outline. @default 3 */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** `AccordionItem` elements. */
  children: ReactNode;
}

export interface AccordionSingleProps extends AccordionBaseProps {
  /** One item open at a time. @default false */
  multiple?: false;
  /** Controlled open item value (`''` = none open). */
  value?: string;
  /** Initially open item when uncontrolled (`''` = none). @default '' */
  defaultValue?: string;
  /** Called with the newly open item value, or `''` when the open item closes. */
  onValueChange?: (value: string) => void;
  /**
   * Whether the open item can be closed, leaving none open. When false, the open trigger
   * gets `aria-disabled="true"`.
   * @default true
   */
  collapsible?: boolean;
}

export interface AccordionMultipleProps extends AccordionBaseProps {
  /** Any number of items can be open. */
  multiple: true;
  /** Controlled open item values. */
  value?: string[];
  /** Initially open item values when uncontrolled. @default [] */
  defaultValue?: string[];
  /** Called with the new list of open item values. */
  onValueChange?: (value: string[]) => void;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

/** Both modes widened to one shape, for destructuring. Internal. */
type AccordionAnyProps = AccordionBaseProps & {
  multiple?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: ((value: string) => void) | ((value: string[]) => void);
  collapsible?: boolean;
};

function toList(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  return value === '' ? [] : [value];
}

/** Triggers that belong to this accordion (not a nested one), in DOM order. */
function getTriggers(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]')).filter(
    (trigger) => trigger.closest('[data-accordion]') === root,
  );
}

/**
 * Vertically stacked sections that show and hide their content (APG Accordion pattern:
 * a button inside a heading controlling a named region). Compose with `AccordionItem`.
 * The ref and `...rest` go to the root `<div>`.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(props, ref) {
  const allProps: AccordionAnyProps = props;
  const {
    multiple = false,
    value,
    defaultValue,
    onValueChange: _onValueChange,
    collapsible = true,
    headingLevel = 3,
    className,
    onKeyDown,
    children,
    ...rest
  } = allProps;

  const baseId = useId();

  // Narrow on the discriminant so each mode keeps its own callback type.
  const onMany = props.multiple ? props.onValueChange : undefined;
  const onOne = props.multiple ? undefined : props.onValueChange;
  const handleChange = useCallback(
    (next: string[]) => {
      if (multiple) onMany?.(next);
      else onOne?.(next[0] ?? '');
    },
    [multiple, onMany, onOne],
  );

  // Single mode maps a string to a new array; memoized so it is stable between renders.
  const controlledList = useMemo(() => toList(value), [value]);
  const [openValues, setOpenValues] = useControllableState<string[]>({
    value: controlledList,
    defaultValue: toList(defaultValue) ?? [],
    onChange: handleChange,
  });

  const lockOpen = !multiple && !collapsible;

  const toggle = useCallback(
    (itemValue: string) => {
      const isOpen = openValues.includes(itemValue);
      if (isOpen) {
        if (lockOpen) return;
        setOpenValues(openValues.filter((v) => v !== itemValue));
      } else {
        setOpenValues(multiple ? [...openValues, itemValue] : [itemValue]);
      }
    },
    [openValues, lockOpen, multiple, setOpenValues],
  );

  const context = useMemo<AccordionContextValue>(
    () => ({ baseId, openValues, toggle, lockOpen, headingLevel }),
    [baseId, openValues, toggle, lockOpen, headingLevel],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const action = keyToAction(event.key, 'vertical', false);
    if (!action) return;
    const triggers = getTriggers(event.currentTarget);
    const from = triggers.findIndex((trigger) => trigger === event.target);
    if (from === -1) return;
    event.preventDefault();
    const index = getNextIndex(
      triggers.length,
      from,
      action,
      (i) => triggers[i]?.disabled ?? true,
      true,
    );
    triggers[index]?.focus();
  };

  return (
    <AccordionContext.Provider value={context}>
      {/* Arrow keys are an optional shortcut; every trigger is a native, tabbable button. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={ref}
        className={cx(styles.root, className)}
        data-accordion=""
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
});
Accordion.displayName = 'Accordion';

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Value identifying the item. Any string except `''`; ids are escaped. */
  value: string;
  /** Trigger text inside the heading; also the region's accessible name. */
  title: ReactNode;
  /** Panel content. Stays mounted while closed (hidden from AT with `visibility`). */
  children: ReactNode;
  /** Native disabled on the trigger: not focusable, skipped by arrow keys. @default false */
  disabled?: boolean;
}

/**
 * One section: a heading with a toggle button, and the region it controls.
 * The ref and `...rest` go to the item `<div>`.
 */
export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { value, title, disabled = false, className, children, ...rest },
  ref,
) {
  const { baseId, openValues, toggle, lockOpen, headingLevel } = useAccordionContext();
  const open = openValues.includes(value);
  const locked = open && lockOpen;
  const triggerId = `${baseId}-trigger-${toIdPart(value)}`;
  const panelId = `${baseId}-panel-${toIdPart(value)}`;
  const state = open ? 'open' : 'closed';
  const Heading = `h${headingLevel}` as const;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Closed panels are inert (set on the DOM node: React 18 and 19 treat the `inert` prop
  // differently). If a panel closes from code while it holds focus, focus returns to its
  // trigger instead of being lost to <body>.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (!open && panel.contains(panel.ownerDocument.activeElement)) triggerRef.current?.focus();
    panel.inert = !open;
  }, [open]);

  return (
    <div
      ref={ref}
      className={cx(styles.item, className)}
      data-state={state}
      data-disabled={disabled || undefined}
      {...rest}
    >
      <Heading className={styles.heading}>
        <button
          ref={triggerRef}
          type="button"
          id={triggerId}
          data-accordion-trigger=""
          className={styles.trigger}
          aria-expanded={open}
          aria-controls={panelId}
          aria-disabled={locked || undefined}
          disabled={disabled}
          onClick={() => {
            toggle(value);
          }}
        >
          <span className={styles.title}>{title}</span>
          <ChevronDownIcon className={styles.chevron} />
        </button>
      </Heading>
      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={styles.panel}
        data-state={state}
      >
        <div className={styles.content}>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </div>
  );
});
AccordionItem.displayName = 'AccordionItem';

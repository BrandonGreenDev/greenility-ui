/**
 * Shared prop vocabulary. Every component uses these exact unions so the API stays
 * consistent across the library.
 */

/** Control size. Maps to the control metrics table (`--gn-size-control-*`, `--gn-size-icon-*`). */
export type Size = 'sm' | 'md' | 'lg';

/** Meaning of a status-like component such as Badge. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/** Visual style of Button and IconButton. `danger` is for destructive actions. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Visual style of Badge: a filled `solid` or a tinted `subtle` background. */
export type BadgeVariant = 'solid' | 'subtle';

/** Meaning of an Alert. Accent is a brand colour, not a message meaning, so it is excluded. */
export type AlertTone = Exclude<Tone, 'accent'>;

/** Checkbox state. `'indeterminate'` shows a dash and is exposed to assistive technology as "mixed". */
export type CheckedState = boolean | 'indeterminate';

/** Layout direction of a group of controls, e.g. RadioGroup. */
export type Orientation = 'vertical' | 'horizontal';

/** Preferred side of a floating element relative to its anchor. `start`/`end` follow the text direction. */
export type Placement = 'top' | 'bottom' | 'start' | 'end';

/** Cross-axis alignment of a floating element relative to its anchor. */
export type Align = 'start' | 'center' | 'end';

/** Tabs: `automatic` selects on arrow focus, `manual` selects on Enter/Space. */
export type ActivationMode = 'automatic' | 'manual';

/** Sort direction. Identical to the `aria-sort` values. */
export type SortDirection = 'ascending' | 'descending';

/** Sorted column and direction of a DataTable. */
export interface SortState {
  /** Id of the sorted column. */
  columnId: string;
  /** Sort direction. */
  direction: SortDirection;
}

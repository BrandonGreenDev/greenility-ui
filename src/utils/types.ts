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

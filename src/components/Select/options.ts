/** One choice in a Select. */
export interface SelectOption {
  /** Submitted value. Must be unique within the Select and must not be `''` (the "nothing selected" value). */
  value: string;
  /** Visible text; also used for typeahead. */
  label: string;
  /** Skipped by the keyboard and not selectable. @default false */
  disabled?: boolean;
  /** Never set. Only groups have `options`, which keeps the option/group union discriminable. */
  options?: never;
}

/** A named group of options. Groups cannot be nested: `options` holds plain options only. */
export interface SelectOptionGroup {
  /** Group heading; names the group for assistive technology. */
  label: string;
  /** Options in the group, in display order. */
  options: readonly SelectOption[];
}

/** An entry of the `options` prop. */
export type SelectItem = SelectOption | SelectOptionGroup;

/** An option with its position in the flattened list. */
export interface FlatOption {
  option: SelectOption;
  /** Position in the flattened list; also the option id suffix. */
  index: number;
}

/** What the listbox renders, in display order. */
export type Section =
  | { kind: 'option'; entry: FlatOption }
  | { kind: 'group'; label: string; groupIndex: number; entries: FlatOption[] };

export interface FlattenedOptions {
  /** Every option in display order; keyboard navigation, typeahead and ids use its indexes. */
  flat: FlatOption[];
  /** Render structure: top-level options and groups. */
  sections: Section[];
  /** Consumer mistakes (duplicate or `''` values), reported by the component in an effect. */
  problems: string[];
}

export function isGroup(item: SelectItem): item is SelectOptionGroup {
  return item.options !== undefined;
}

/** Flattens options once and checks values. Pure: problems are returned, not logged. */
export function flattenOptions(items: readonly SelectItem[]): FlattenedOptions {
  const flat: FlatOption[] = [];
  const sections: Section[] = [];
  const seen = new Set<string>();
  const problems: string[] = [];

  const add = (option: SelectOption): FlatOption => {
    if (option.value === '') {
      problems.push(
        `option "${option.label}" has the value '', which means "nothing selected"; give it a non-empty value.`,
      );
    } else if (seen.has(option.value)) {
      problems.push(
        `the value "${option.value}" is used by more than one option; values must be unique.`,
      );
    }
    seen.add(option.value);
    const entry = { option, index: flat.length };
    flat.push(entry);
    return entry;
  };

  items.forEach((item, groupIndex) => {
    if (isGroup(item)) {
      sections.push({
        kind: 'group',
        label: item.label,
        groupIndex,
        entries: item.options.map(add),
      });
    } else {
      sections.push({ kind: 'option', entry: add(item) });
    }
  });
  return { flat, sections, problems };
}

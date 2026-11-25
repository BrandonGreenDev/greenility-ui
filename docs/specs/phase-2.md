# Phase 2 spec: core components

Builders implement from this file. Anything not decided here: make a reasonable choice and add one line to `DECISIONS.md`.

---

## 0. Global rules for Phase 2

- **Where props go (field-like components: TextField, TextArea, Select, Checkbox, Switch, Radio).** `className` and `style` go to the outer root wrapper. `ref`, `id` and every other prop (`...rest`) go to the native control. JSDoc on the component says this. Other components put everything on their root element.
- **Native state, no mirroring.** Native form controls receive `value`/`defaultValue` (or `checked`/`defaultChecked`) directly. Our `onValueChange`/`onCheckedChange` is called from the native `change` event, after the consumer's own `onChange`, which is still supported and composed. These components do **not** use `useControllableState`; see Decisions.
- **Callback signature.** The value comes first and the event second: `onValueChange(value, event)` and `onCheckedChange(checked, event)`.
- **ARIA attribute values.** Emit `aria-invalid="true"` only when invalid, and omit it otherwise. Never emit `aria-invalid="false"`.
- **State styling.** Express state as `data-size`, `data-variant`, `data-tone`, `data-loading`, `data-disabled`, `data-orientation`, or as native/ARIA attributes (`:disabled`, `:checked`, `:indeterminate`, `[aria-invalid='true']`, `[aria-disabled='true']`).
- **Focus ring everywhere.** Use `outline: var(--gn-size-focus-ring-width) solid var(--gn-color-border-focus); outline-offset: var(--gn-size-focus-ring-offset);`.
  - Text-like boxes use `:focus-within` on the box, with `outline-offset: 0`.
  - Checkbox, Radio and Switch put the ring on the input.
- **Forced colors.** Every bordered control keeps a `1px` border (transparent if needed) so it stays visible in forced-colors mode. Each spec lists its specific fixes.
- **Shared files are frozen.** Only Stage 0 touches `src/tokens/*`, `src/utils/types.ts`, `src/hooks/useField.ts`, `src/components/{Field,Icon,VisuallyHidden}`.
- **Integrator-only files.** Batches never edit `src/index.ts` or `DECISIONS.md`. The integrator adds exports and decision lines after each batch lands.

### Control metrics (all sized controls use this table)

| size | box height (`min-block-size`) | font                | Button padding-inline | input padding-inline | inner gap        | icon / spinner      |
| ---- | ----------------------------- | ------------------- | --------------------- | -------------------- | ---------------- | ------------------- |
| `sm` | `--gn-size-control-sm`        | `--gn-font-size-sm` | `--gn-space-3`        | `--gn-space-2`       | `--gn-space-1-5` | `--gn-size-icon-sm` |
| `md` | `--gn-size-control-md`        | `--gn-font-size-md` | `--gn-space-4`        | `--gn-space-3`       | `--gn-space-2`   | `--gn-size-icon-md` |
| `lg` | `--gn-size-control-lg`        | `--gn-font-size-lg` | `--gn-space-5`        | `--gn-space-4`       | `--gn-space-2`   | `--gn-size-icon-lg` |

- **Radius.** All controls use `--gn-radius-md`. Checkbox uses `--gn-radius-sm`. Radio, Switch and Badge use `--gn-radius-full`. Alert uses `--gn-radius-lg`.
- **Font weight.** Labels and buttons use `--gn-font-weight-medium`. The Alert title uses `--gn-font-weight-semibold`.
- **Line height.** Body text uses `--gn-font-line-height-normal`. Buttons and badges use `--gn-font-line-height-tight`.

---

## 1. Shared vocabulary

Every component must use these exact names and unions. The types live in `src/utils/types.ts` and are exported publicly.

| Prop                                             | Type / union                                                                                                             | Default         | Used by                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------- | --------------------------------------------------------------------- |
| `size`                                           | `Size = 'sm' \| 'md' \| 'lg'`                                                                                            | `'md'`          | Button, IconButton, TextField, TextArea, Select, Badge, Spinner, Icon |
| `variant` (Button family)                        | `ButtonVariant = 'primary' \| 'secondary' \| 'ghost' \| 'danger'`                                                        | `'primary'`     | Button, IconButton                                                    |
| `variant` (Badge)                                | `BadgeVariant = 'solid' \| 'subtle'`                                                                                     | `'subtle'`      | Badge                                                                 |
| `tone`                                           | `Tone = 'neutral' \| 'accent' \| 'success' \| 'warning' \| 'danger' \| 'info'`                                           | `'neutral'`     | Badge                                                                 |
| `tone` (Alert)                                   | `AlertTone = Exclude<Tone, 'accent'>`                                                                                    | `'info'`        | Alert                                                                 |
| `label`                                          | `ReactNode`, required. IconButton uses `string`.                                                                         | –               | all form controls, IconButton                                         |
| `description`                                    | `ReactNode`                                                                                                              | –               | TextField, TextArea, Select, Checkbox, Switch, RadioGroup, Radio      |
| `errorMessage`                                   | `ReactNode`, shown only when `invalid`                                                                                   | –               | TextField, TextArea, Select, Checkbox, RadioGroup                     |
| `invalid`                                        | `boolean`                                                                                                                | `false`         | same as `errorMessage`                                                |
| `required`                                       | `boolean`                                                                                                                | `false`         | TextField, TextArea, Select, Checkbox, RadioGroup                     |
| `disabled`                                       | `boolean`                                                                                                                | `false`         | all interactive components                                            |
| `value` / `defaultValue` / `onValueChange`       | `string` / `string` / `(value: string, event) => void`                                                                   | –               | TextField, TextArea, Select, RadioGroup                               |
| `checked` / `defaultChecked` / `onCheckedChange` | Checkbox: `CheckedState = boolean \| 'indeterminate'`. Switch: `boolean`. Callback: `(checked: boolean, event) => void`. | –               | Checkbox, Switch                                                      |
| `loading`                                        | `boolean`                                                                                                                | `false`         | Button, IconButton                                                    |
| `startIcon` / `endIcon`                          | `ReactNode`                                                                                                              | –               | Button                                                                |
| `startAdornment` / `endAdornment`                | `ReactNode`                                                                                                              | –               | TextField                                                             |
| `orientation`                                    | `'vertical' \| 'horizontal'`                                                                                             | `'vertical'`    | RadioGroup                                                            |
| `placeholder`                                    | `string`                                                                                                                 | –               | TextField, TextArea (native), Select (adds an option)                 |
| `live`                                           | `'off' \| 'polite' \| 'assertive'`                                                                                       | `'off'`         | Alert                                                                 |
| `onDismiss` / `dismissLabel`                     | `() => void` / `string`                                                                                                  | – / `'Dismiss'` | Alert                                                                 |
| `toneLabel`                                      | `string`                                                                                                                 | per tone        | Alert                                                                 |
| `decorative`                                     | `boolean`                                                                                                                | `false`         | Spinner                                                               |

`FieldBaseProps` is exported from `src/hooks/useField.ts`. Field components extend it so the JSDoc is written once:

```ts
export interface FieldBaseProps {
  /** Visible label. Required: every field has a programmatic name. */
  label: ReactNode;
  /** Help text shown below the label and linked with aria-describedby. */
  description?: ReactNode;
  /** Error text. Rendered and linked only when `invalid` is true. */
  errorMessage?: ReactNode;
  /** Marks the field invalid: sets aria-invalid="true", applies danger styling and shows `errorMessage`. @default false */
  invalid?: boolean;
  /** Sets native `required` (announced as "required") and shows an aria-hidden asterisk. @default false */
  required?: boolean;
  /** Disables the native control. @default false */
  disabled?: boolean;
}
```

---

## 2. Shared building blocks (Stage 0)

### 2.1 `useField` hook: `src/hooks/useField.ts` (internal)

**Purpose:** generate ids and the ARIA wiring between a label, description, error and control, so every field announces the same way.

```ts
export interface UseFieldOptions {
  /** Consumer id for the control. Falls back to a useId()-based id. */
  id?: string | undefined;
  description?: ReactNode;
  errorMessage?: ReactNode;
  invalid?: boolean | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  /** The consumer's own aria-describedby. It is merged, never overwritten. */
  'aria-describedby'?: string | undefined;
}
export interface UseFieldResult {
  controlId: string;
  labelId: string;
  descriptionId: string | undefined; // set only when description != null && description !== false
  errorId: string | undefined; // set only when showError
  showError: boolean; // invalid && errorMessage != null && errorMessage !== false
  labelProps: { id: string; htmlFor: string };
  descriptionProps: { id: string };
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
export function useField(options: UseFieldOptions): UseFieldResult;
```

- **Ids.** `const base = useId()`. Then `controlId = id ?? \`${base}-control\``, `labelId = \`${base}-label\``, `descriptionId = \`${base}-description\``, `errorId = \`${base}-error\``.
- **`aria-describedby` order.** `[descriptionId, errorId, consumer]`, with empty entries removed, joined by spaces, and omitted when empty. The order follows visual order: description under the label, error under the control.
- **`aria-errormessage` is not used.** See Decisions.

### 2.2 `Field` UI pieces: `src/components/Field/` (internal, not exported)

Files: `Field.tsx`, `Field.module.css`, `control.module.css`, `Field.test.tsx`, `index.ts`.

- `Field`: `<div className={cx(styles.root, className)} data-disabled={disabled || undefined}>` with a vertical flex column and `gap: var(--gn-space-1-5)`.
- `FieldLabel` (`as?: 'label' | 'legend'`): renders `<label {...labelProps}>` or `<legend>`, then `{required && <span aria-hidden="true" className={styles.required}>*</span>}`.
  - Text: `--gn-color-fg-default`, `--gn-font-size-sm`, weight medium.
  - Asterisk: `--gn-color-danger-subtle-fg`, with `margin-inline-start: var(--gn-space-0-5)`.
  - Disabled: `--gn-color-fg-disabled`.
- `FieldDescription`: `<p {...descriptionProps}>`, `--gn-color-fg-muted`, `--gn-font-size-sm`, `margin: 0`.
- `FieldError`: `<p {...errorProps}><DangerIcon size="sm" /> {children}</p>`. Inline-flex, gap `--gn-space-1`, color `--gn-color-danger-subtle-fg`, `--gn-font-size-sm`. Rendered only when `showError`. Not a live region.
- `control.module.css` exports `.box`, the shared text-control frame used by TextField, TextArea and Select:
  - Base: `display: flex; align-items: center; gap: <inner gap>; background: var(--gn-color-bg-surface); color: var(--gn-color-fg-default); border: var(--gn-size-border-width) solid var(--gn-color-border-strong); border-radius: var(--gn-radius-md); min-block-size` from `[data-size]`; `transition: border-color var(--gn-motion-duration-fast) var(--gn-motion-easing-standard)`.
  - `:focus-within`: focus ring with offset 0.
  - `:has([aria-invalid='true'])`: `border-color: var(--gn-color-danger-border)`.
  - `:has(:disabled)`: `background: var(--gn-color-bg-disabled); color: var(--gn-color-fg-disabled); border-color: var(--gn-color-border-default); cursor: not-allowed`.
  - Inner native element: `.input` resets appearance, border, outline (the box shows focus), background and font (inherit), and uses `flex: 1; min-inline-size: 0; padding-inline` from the size table.
  - `::placeholder`: `--gn-color-fg-subtle`.
  - Forced colors: in the invalid state, the box border is `Mark`-coloured or 2px wide so the state does not depend on colour alone. Error text and icon remain regardless.

**Tests:**

- Label `htmlFor` matches the control id.
- A consumer `id` is used.
- `aria-describedby` contains the description only. When invalid with an `errorMessage`, it contains description then error, then the consumer's ids.
- The error is not rendered and not referenced when `invalid` is false.
- `aria-invalid` is omitted when valid.
- The asterisk is aria-hidden and the native `required` is set.
- `groupProps` carries no `aria-invalid`.

### 2.3 `VisuallyHidden`: `src/components/VisuallyHidden/` (public, full DoD)

- **Purpose:** content available to assistive technology but not shown on screen.
- **Pattern:** native `<span>`; no ARIA needed.
- **Anatomy and ref:** a `<span>`; the ref goes to the span.

```ts
export interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  /** Text for assistive technology only. */
  children: ReactNode;
}
```

- **CSS:** `position: absolute; inline-size: 1px; block-size: 1px; padding: 0; margin: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;`. Do not use `display: none` or `visibility: hidden`, because both remove the content from the accessibility tree.
- **Tests:**
  - The text is found with `getByText`.
  - The text contributes to a parent button's accessible name.
  - `className` is merged.
  - `ref` is forwarded.
  - axe passes.

### 2.4 Icons: `src/components/Icon/` (internal)

Files: `Icon.tsx` (`createIcon`), `icons.tsx`, `Icon.module.css`, `Icon.test.tsx`, `index.ts`.

```ts
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'children'> {
  /** Maps to --gn-size-icon-{size}. @default 'md' */
  size?: Size;
  /** If set, the icon is meaningful: role="img" + aria-label. Otherwise aria-hidden="true". */
  label?: string;
}
```

- **Common SVG attributes:** `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"` and `data-size`.
- **CSS:** `inline-size` and `block-size` come from `--gn-size-icon-*`, plus `flex-shrink: 0`.
- **Exports and original paths.** Each item is a separate `<path>`/`<circle>`:

| Icon              | Shapes                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `CheckIcon`       | `M5 12.5l4.5 4.5L19 7.5`                                                                  |
| `MinusIcon`       | `M6 12h12`                                                                                |
| `ChevronDownIcon` | `M6 9.5l6 6 6-6`                                                                          |
| `CloseIcon`       | `M6.5 6.5l11 11`, `M17.5 6.5l-11 11`                                                      |
| `InfoIcon`        | `<circle cx="12" cy="12" r="9"/>`, `M12 11v5.5`, `M12 7.75h.01`                           |
| `SuccessIcon`     | circle r=9, `M8 12.25l2.75 2.75L16 9.5`                                                   |
| `WarningIcon`     | `M12 3.75L21.25 19.5H2.75Z`, `M12 10v4`, `M12 17h.01`                                     |
| `DangerIcon`      | octagon `M8.25 3h7.5L21 8.25v7.5L15.75 21h-7.5L3 15.75v-7.5Z`, `M12 8v5`, `M12 16.25h.01` |

The four status icons have distinct shapes (circle-i, circle-check, triangle, octagon), so tone never depends on colour alone.

- **Tests:**
  - Default `aria-hidden="true"` and `focusable="false"`.
  - With `label`: `getByRole('img', { name })`.
  - `data-size` is reflected.

---

## 3. Components

### 3.1 Spinner (`src/components/Spinner/`)

1. **Purpose:** an indeterminate busy indicator.
2. **Pattern:** a status live region (https://www.w3.org/TR/wai-aria-1.2/#status) holding visually hidden text. When `decorative`, it is aria-hidden; the parent supplies the semantics.
3. **Anatomy:** the ref goes to the root span.
   - Standalone: `<span role="status" class="root" data-size><svg aria-hidden="true">` containing a `circle.track` and a `circle.arc` (r=9, stroke-width 2.5, `stroke-dasharray` showing about a quarter arc), followed by `</svg><VisuallyHidden>{label}</VisuallyHidden></span>`.
   - Decorative: `<span aria-hidden="true" class="root">`, the same SVG, and no text.

```ts
export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'role' | 'children'> {
  /** @default 'md' */
  size?: Size;
  /** Text announced to assistive technology. Ignored when decorative. @default 'Loading' */
  label?: string;
  /** Hide from assistive technology (e.g. inside a loading Button, which conveys state itself). @default false */
  decorative?: boolean;
}
```

5. **States and appearance:**
   - Sizes sm/md/lg map to `--gn-size-icon-*`.
   - The arc uses `currentColor`; the track uses `--gn-color-border-default`.
   - Motion: `rotate` 360° linear, infinite, over `var(--gn-motion-loop-spin)`.
   - `@media (prefers-reduced-motion: reduce)`: no rotation. The arc stays static and the whole SVG pulses opacity 1 → 0.4 over `var(--gn-motion-loop-pulse)`, ease-in-out, infinite. It still reads as busy, with no spatial motion.
   - Forced colors: arc `stroke: CanvasText`, track `stroke: GrayText`.
6. **Keyboard:** none; the spinner is not focusable.
7. **Focus:** none.
8. **Screen reader:** the name comes from the text content (not `aria-label`; live regions announce content, not names).
   - Announcement on mount is best-effort. A region that is already mounted is more reliable; document this in the MDX.
9. **Tokens:** `--gn-size-icon-*`, `--gn-color-border-default`, `--gn-motion-loop-spin` (**new**), `--gn-motion-loop-pulse` (**new**).
10. **Tests:**
    - `getByRole('status')` has text "Loading".
    - A custom label works.
    - `decorative` gives no status role, `aria-hidden` and no text.
    - `data-size` is reflected.
    - `className` and `ref` work.
    - axe passes in both modes.

### 3.2 Button (`src/components/Button/`)

1. **Purpose:** triggers an action.
2. **Pattern:** native `<button>`. APG Button (https://www.w3.org/WAI/ARIA/apg/patterns/button/) is satisfied natively.
3. **Anatomy:** the ref goes to the button.
   - `<button class="root" type data-variant data-size data-loading? aria-disabled?>`
   - Optional `<span class="icon" aria-hidden="true">{startIcon}</span>`
   - `<span class="label">{children}</span>`
   - Optional `<span class="icon" aria-hidden="true">{endIcon}</span>`
   - When loading, `<Spinner decorative size class="spinner"/>`, absolutely centred.

```ts
export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
> {
  /** Visible label and accessible name. */
  children: ReactNode;
  /** Visual style. `danger` is for destructive actions. @default 'primary' */
  variant?: ButtonVariant;
  /** @default 'md' */
  size?: Size;
  /**
   * Shows a spinner and ignores activation. The label stays in the DOM (opacity 0), so the
   * accessible name is unchanged. Uses aria-disabled="true", not `disabled`, so the button keeps focus.
   * @default false
   */
  loading?: boolean;
  /** Decorative icon before the label (wrapped aria-hidden). */
  startIcon?: ReactNode;
  /** Decorative icon after the label (wrapped aria-hidden). */
  endIcon?: ReactNode;
  /** Native type. Defaults to "button" so buttons never submit forms by accident. @default 'button' */
  type?: 'button' | 'submit' | 'reset';
  /** Native disabled: removed from tab order and not focusable. @default false */
  disabled?: boolean;
}
```

- **Loading behaviour.** While `loading && !disabled`:
  - `onClick` calls `event.preventDefault()` and returns without calling the consumer's handler. This also blocks form submission, including implicit Enter-submit from a text input.
  - The button sets `aria-disabled="true"` and `data-loading`.
  - `cursor: progress`.
- **Disabled behaviour.** When `disabled`, use native `disabled`. If both `disabled` and `loading` are set, `disabled` wins.

5. **Variants:**
   - `primary`: `accent-solid`/`accent-solid-fg`; hover `accent-solid-hover`; active `accent-solid-active`.
   - `secondary`: `accent-subtle`/`accent-subtle-fg`; hover and active `accent-subtle-hover`.
   - `ghost`: `transparent`/`fg-default`; hover `bg-hover`; active `bg-active`.
   - `danger`: `danger-solid`/`danger-solid-fg`; hover and active `danger-solid-hover`.
   - All variants have `border: var(--gn-size-border-width) solid transparent` (visible in forced colors).
   - Disabled: `bg-disabled`/`fg-disabled`, ghost stays transparent, `cursor: not-allowed`.
   - Loading keeps the variant colours.
   - Sizes come from the control metrics table. `inline-flex`, `gap`, `white-space: nowrap`.
   - Background transitions use `--gn-motion-duration-fast`.
   - `[data-icon-only]` (set by IconButton): `inline-size` equals the control height, `padding-inline: 0`.
6. **Keyboard:**

| Key           | Behavior                                                                             |
| ------------- | ------------------------------------------------------------------------------------ |
| Enter / Space | Activate (native). No-op while loading.                                              |
| Tab           | Focus moves in and out. A loading button stays focusable; a disabled one is skipped. |

7. **Focus:** native. A focused button that switches to loading keeps focus.
8. **Screen reader:**
   - Name comes from the children; icons are hidden.
   - Loading is announced as "dimmed/unavailable" through `aria-disabled`. The result of the action should be announced by the page (Alert with `live`, or Toast in Phase 3).
9. **Tokens:** `--gn-color-{accent-solid,accent-solid-hover,accent-solid-active,accent-solid-fg,accent-subtle,accent-subtle-hover,accent-subtle-fg,fg-default,bg-hover,bg-active,danger-solid,danger-solid-hover,danger-solid-fg,bg-disabled,fg-disabled,border-focus}`, `--gn-size-control-*`, `--gn-size-icon-*`, `--gn-space-*`, `--gn-font-size-*`, `--gn-font-weight-medium`, `--gn-radius-md`, `--gn-motion-duration-fast`, `--gn-motion-easing-standard`, focus-ring sizes.
10. **Tests:**
    - Default `type="button"`: clicking inside a form does not submit.
    - `type="submit"` submits.
    - `onClick` fires on click, Enter and Space.
    - `disabled`: native disabled, no click, skipped by Tab.
    - `loading`: `aria-disabled="true"`, still focusable via Tab, accessible name unchanged (`getByRole('button', { name: 'Save' })`), `onClick` not called, a `type=submit` loading button does not submit (click and Enter in input), and the spinner is aria-hidden.
    - Icons are aria-hidden.
    - `data-variant` and `data-size` are reflected.
    - `className` is merged and `ref` points at the button.
    - axe: default, each variant, disabled, loading.

### 3.3 IconButton (`src/components/IconButton/`)

1. **Purpose:** a Button whose only content is an icon.
2. **Pattern:** native `<button>` with `aria-label`.
3. **Anatomy:** composes `Button`, passing `data-icon-only=""`, `aria-label={label}` and the icon as children (already aria-hidden through Button's icon wrapper). The ref goes to the button.

```ts
export interface IconButtonProps extends Omit<
  ButtonProps,
  'children' | 'startIcon' | 'endIcon' | 'aria-label' | 'aria-labelledby'
> {
  /** Accessible name, applied as aria-label. Required: there is no visible text. */
  label: string;
  /** The icon to render (decorative; wrapped aria-hidden). */
  icon: ReactNode;
}
```

5. **Appearance:** same variants, sizes and loading behaviour as Button. Square, using the `[data-icon-only]` rules in Button.module.css. Icon size from the metrics table.
6. **Keyboard and focus:** same as Button.
7. **Screen reader:** the name is `label`. A Tooltip shown from `label` comes in Phase 3, not now.
8. **Tokens:** same as Button.
9. **Tests:**
   - `getByRole('button', { name: label })`.
   - The icon is aria-hidden.
   - A TypeScript-level check (`// @ts-expect-error` when `label` is missing) inside the test file.
   - Loading keeps the name.
   - `ref` is forwarded.
   - axe passes.

### 3.4 TextField (`src/components/TextField/`)

1. **Purpose:** a single-line text input with label, help and error text.
2. **Pattern:** native `<input>` plus `<label>`. Native semantics are complete; ARIA is used only for describedby and invalid.
3. **Anatomy:** the ref goes to the input.
   - `Field.root` (className, style)
     - `FieldLabel`
     - `FieldDescription?`
     - `div.box[data-size]`
       - `span.adornment?`
       - `input.input` (ref, rest, controlProps)
       - `span.adornment?`
     - `FieldError?`

```ts
export interface TextFieldProps
  extends
    FieldBaseProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'size' | 'type' | 'value' | 'defaultValue' | 'children' | 'required' | 'disabled'
    > {
  /** Native input type (text-like types only). @default 'text' */
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';
  /** @default 'md' */
  size?: Size;
  /** Controlled value (pass with onValueChange or onChange). */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  /** Called with the new value on every native change. */
  onValueChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  /** Content inside the box before the input (e.g. an icon or "$"). Not announced; repeat units in the label or description. */
  startAdornment?: ReactNode;
  /** Content inside the box after the input (e.g. unit text or a clear IconButton, which stays in the tab order after the input). */
  endAdornment?: ReactNode;
}
```

5. **States:** default, focus-within ring, invalid (danger border plus error row), disabled, read-only (native; `bg-subtle`), and the three sizes. Adornments use `--gn-color-fg-muted`, `display: flex`, and padding-inline matching the size.
6. **Keyboard:**

| Key              | Behavior                                         |
| ---------------- | ------------------------------------------------ |
| Tab              | Focus the input, then any interactive adornment. |
| All editing keys | Native.                                          |

7. **Focus:** native. Focus does not move when an error appears. Consumers focus the first invalid field on submit (documented in the MDX).
8. **Screen reader:**
   - Name from `<label for>`.
   - Description from `aria-describedby` (description, then error).
   - "invalid" from `aria-invalid`; "required" from native `required`.
9. **Tokens:** `control.module.css` tokens plus `--gn-color-fg-muted`, `--gn-color-fg-subtle`, `--gn-color-bg-subtle`, `--gn-color-danger-border`, `--gn-color-danger-subtle-fg`.
10. **Tests:**
    - `getByLabelText` and `getByRole('textbox', { name })`.
    - The description is the accessible description (`toHaveAccessibleDescription`).
    - The error is hidden unless `invalid`. When invalid, the description includes both texts and `aria-invalid="true"`.
    - `required` sets native required and the asterisk is aria-hidden.
    - Typing fires `onChange` and `onValueChange` with the value.
    - Controlled `value` does not change without the parent; uncontrolled `defaultValue` does.
    - A consumer `id` and `aria-describedby` are kept.
    - `disabled` blocks typing.
    - Adornments render, and an interactive adornment is tabbable after the input.
    - `className` goes to the root and `ref` to the input.
    - axe: default, invalid, disabled, with adornments.

### 3.5 TextArea (`src/components/TextArea/`)

1. **Purpose:** multi-line text input.
2. **Pattern:** native `<textarea>`.
3. **Anatomy:** same as TextField, with `textarea.input` inside `div.box`. No adornments. The ref goes to the textarea.

```ts
export interface TextAreaProps
  extends
    FieldBaseProps,
    Omit<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      'value' | 'defaultValue' | 'children' | 'required' | 'disabled'
    > {
  /** @default 'md' (font and padding only; height comes from rows). */
  size?: Size;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, event: ChangeEvent<HTMLTextAreaElement>) => void;
  /** @default 3 */
  rows?: number;
  /** Grow with content using CSS `field-sizing: content`. Browsers without support keep a fixed, user-resizable height. @default false */
  autoResize?: boolean;
}
```

5. **States and styling:** as TextField.
   - `.box` uses `align-items: stretch` and `padding-block: var(--gn-space-2)`.
   - Base: `resize: vertical`.
   - `[data-auto-resize]`: inside `@supports (field-sizing: content)`, `field-sizing: content; resize: none; min-block-size` from rows (`calc(var(--gn-font-line-height-normal) * 1em * rows)`; pass rows as `--rows` inline style, or rely on native `rows` as the minimum).
6. **Keyboard:** native. Enter inserts a newline; Tab leaves the field.
7. **Focus and screen reader:** as TextField.
8. **Tokens:** as TextField.
9. **Tests:**
   - `getByRole('textbox', { name })` is a TEXTAREA.
   - Description and error wiring as in TextField.
   - `rows` defaults to 3.
   - `autoResize` sets `data-auto-resize` (jsdom cannot measure, so check in Storybook).
   - Typing fires `onValueChange`.
   - `ref` points at the textarea.
   - axe: default and invalid.

### 3.6 Select (`src/components/Select/`)

1. **Purpose:** pick one option from a list.
2. **Pattern:** native `<select>`, styled. It gets native keyboard support, typeahead, the mobile picker, forms, autofill and solid AT support for free. See Decisions.
3. **Anatomy:** the ref goes to the select.
   - `Field.root`
     - `FieldLabel`
     - `FieldDescription?`
     - `div.box[data-size]`
       - `select.input` with `appearance: none` and `padding-inline-end: var(--gn-space-8)`
       - `ChevronDownIcon.chevron`: absolutely positioned, `pointer-events: none`, aria-hidden
     - `FieldError?`

```ts
export interface SelectProps
  extends
    FieldBaseProps,
    Omit<
      SelectHTMLAttributes<HTMLSelectElement>,
      'size' | 'multiple' | 'value' | 'defaultValue' | 'required' | 'disabled'
    > {
  /** @default 'md' */
  size?: Size;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
  /** Adds a first `<option value="" disabled>` prompt. When uncontrolled with no defaultValue, it is selected initially. */
  placeholder?: string;
  /** Native `<option>` / `<optgroup>` elements. */
  children: ReactNode;
}
```

5. **States:** as TextField. When the placeholder is selected, the select text uses `--gn-color-fg-subtle` (via `:has(option[value='']:checked)`). The chevron uses `--gn-color-fg-muted`, or `--gn-color-fg-disabled` when disabled. The popup follows the theme `color-scheme`.
6. **Keyboard:** native.

| Key                           | Behavior                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| Tab                           | Focus the select.                                                   |
| Space / Enter / Alt+ArrowDown | Open the picker (platform-dependent).                               |
| ArrowUp / ArrowDown           | Change the option (closed on Windows) or move within the open list. |
| Type a character              | Typeahead.                                                          |
| Escape                        | Close the picker.                                                   |

7. **Focus:** native.
8. **Screen reader:** native combobox or listbox semantics, named by the label and described as in TextField.
9. **Tokens:** as TextField, plus `--gn-space-8` and `--gn-size-icon-*`.
10. **Tests:**
    - `getByRole('combobox', { name })`.
    - `userEvent.selectOptions` fires `onValueChange('b')`.
    - Controlled vs uncontrolled.
    - The placeholder option is disabled with `value=""` and selected by default.
    - Required, invalid, description and error wiring.
    - The chevron is aria-hidden.
    - `disabled`.
    - `ref` points at the select.
    - axe: default, invalid, disabled.

### 3.7 Checkbox (`src/components/Checkbox/`)

1. **Purpose:** a binary or tri-state choice.
2. **Pattern:** native `<input type="checkbox">`, visually customised. The native `indeterminate` property exposes "mixed". APG Checkbox (https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/) is satisfied natively.
3. **Anatomy:** the ref goes to the input.
   - `div.root[data-disabled?]` (className, style)
     - `span.control`
       - `input.input[type=checkbox]` with `appearance: none`, drawn as the box (ref, rest, controlProps)
       - `CheckIcon.check`, aria-hidden
       - `MinusIcon.dash`, aria-hidden
     - `div.text`
       - `label.label[for]` with an optional asterisk
       - `FieldDescription?`
       - `FieldError?`

   The glyphs are siblings shown with `.input:checked ~ .check` and `.input:indeterminate ~ .dash`, with `pointer-events: none`.

```ts
export type CheckedState = boolean | 'indeterminate';
export interface CheckboxProps
  extends
    FieldBaseProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'type' | 'size' | 'checked' | 'defaultChecked' | 'children' | 'required' | 'disabled'
    > {
  /** Controlled state. 'indeterminate' shows a dash and exposes aria "mixed". */
  checked?: CheckedState;
  /** Initial state when uncontrolled. */
  defaultChecked?: CheckedState;
  /** Called when the user toggles. Always a boolean: user input clears indeterminate. */
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}
```

- **Implementation:**
  - Native `checked = checked === true` (controlled), or `defaultChecked = defaultChecked === true`.
  - A `useLayoutEffect` sets `input.indeterminate = (checked ?? initialDefault) === 'indeterminate'`. In the uncontrolled case it runs on mount only.
  - Do not set `aria-checked`.
  - The ref is composed with an internal ref through `composeRefs`.

5. **Styling:**
   - Box: `--gn-size-indicator` (**new**), `--gn-radius-sm`, `border: var(--gn-size-border-width) solid var(--gn-color-border-strong)`, `bg-surface`.
   - Hover: border `accent-solid`.
   - `:checked` and `:indeterminate`: background and border `accent-solid`, glyph `accent-solid-fg`; hover `accent-solid-hover`.
   - `[aria-invalid='true']`: border `danger-border`.
   - Disabled: border `border-default`, background `bg-disabled`. When checked: fill `fg-disabled`, glyph `bg-surface`. Label `fg-disabled`.
   - Focus-visible ring on the input.
   - Glyph sized to the indicator (about `calc(var(--gn-size-indicator) - 2px)`) through className.
   - Layout: root inline-flex, `gap: var(--gn-space-2)`, `align-items: flex-start`. The control is vertically centred to the first line of the label.
   - Forced colors: `.input:checked, .input:indeterminate { forced-color-adjust: none; background: Highlight; border-color: Highlight }` and glyph `color: HighlightText`. Disabled uses `GrayText`.
6. **Keyboard:**

| Key   | Behavior                                                |
| ----- | ------------------------------------------------------- |
| Space | Toggle (native). From indeterminate it goes to checked. |
| Tab   | Move focus.                                             |

7. **Focus:** native. Clicking the label toggles and focuses.
8. **Screen reader:**
   - Name from the label; description and error through describedby.
   - "checked / not checked / mixed" is native.
   - "required" and "invalid" via native `required` and `aria-invalid`.
9. **Tokens:** `--gn-size-indicator` (**new**), `--gn-color-{border-strong,accent-solid,accent-solid-hover,accent-solid-fg,bg-surface,danger-border,border-default,bg-disabled,fg-disabled,fg-default}`, `--gn-radius-sm`, `--gn-space-2`, focus-ring sizes, `--gn-motion-duration-fast`.
10. **Tests:**
    - `getByRole('checkbox', { name })`.
    - Click and Space toggle; `onCheckedChange(true)` then `(false)`.
    - Controlled `checked='indeterminate'` gives `toBePartiallyChecked()` and `.indeterminate === true`. After a click, `onCheckedChange(true)`.
    - Uncontrolled `defaultChecked='indeterminate'` is partially checked on mount.
    - Clicking the label toggles.
    - Description, error and invalid wiring.
    - Required.
    - Disabled does not toggle.
    - The glyphs are aria-hidden.
    - `name`/`value` submit with a form (FormData).
    - `ref` points at the input.
    - axe: unchecked, checked, indeterminate, invalid, disabled.

### 3.8 RadioGroup + Radio (`src/components/RadioGroup/`)

1. **Purpose:** choose exactly one option from a small set.
2. **Pattern:** native `<input type="radio">` sharing a `name`, inside `<fieldset>` + `<legend>`. Native radios already implement the APG Radio Group keyboard model (https://www.w3.org/WAI/ARIA/apg/patterns/radio/): arrow keys move and select, there is one tab stop, and form participation works. No roving tabindex is needed.
3. **Anatomy:**
   - `fieldset.root[data-orientation]` (the RadioGroup ref, rest, groupProps; a native `disabled` disables every option)
     - `FieldLabel as="legend"` with an asterisk if required
     - `FieldDescription?`
     - `div.options` (flex column or row, `gap: var(--gn-space-2)` vertical or `var(--gn-space-4)` horizontal)
       - per Radio, `div.radio`:
         - `span.control`
           - `input[type=radio]` (the Radio ref), `appearance: none`, circle
           - `span.dot`, aria-hidden
         - `div.text`
           - `label[for]`
           - `p.description?`
     - `FieldError?`

   Reset the fieldset: `border: 0; padding: 0; margin: 0; min-inline-size: 0`. Reset the legend: `padding: 0`.
   Context (`RadioGroupContext`) carries `{ name, value?, defaultValue?, invalid, required, onChange }`. A `Radio` used outside a group throws in dev.

```ts
export interface RadioGroupProps
  extends
    FieldBaseProps,
    Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange' | 'disabled' | 'children'> {
  /** Shared native `name`. @default a useId()-based name */
  name?: string;
  /** Controlled selected value. */
  value?: string;
  /** Initial selected value when uncontrolled. */
  defaultValue?: string;
  /** Called with the newly selected value. */
  onValueChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  /** Layout only; arrow keys work in both axes natively. @default 'vertical' */
  orientation?: 'vertical' | 'horizontal';
  /** `<Radio>` elements. */
  children: ReactNode;
}
export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'name' | 'checked' | 'defaultChecked' | 'size' | 'children' | 'value'
> {
  /** Value submitted and reported when selected. */
  value: string;
  /** Visible label. */
  label: ReactNode;
  /** Per-option help text (aria-describedby on this input). */
  description?: ReactNode;
  /** Disables this option only. @default false */
  disabled?: boolean;
}
```

- **Implementation:**
  - Controlled: `checked={ctx.value === value}`.
  - Uncontrolled: `defaultChecked={ctx.defaultValue === value}`.
  - `required={ctx.required}` and `aria-invalid={ctx.invalid || undefined}` on every input.
  - The group's describedby (description and error) goes on the fieldset.

5. **Styling:**
   - Radio circle: `--gn-size-indicator`, `--gn-radius-full`, `border-strong`. Hover border `accent-solid`.
   - `:checked`: background and border `accent-solid`; dot (`calc(var(--gn-size-indicator) / 2.5)`, `radius-full`) in `accent-solid-fg`.
   - Invalid: `danger-border`. Disabled as in Checkbox.
   - Forced colors: checked uses `Highlight`, dot `HighlightText`.
6. **Keyboard (native):**

| Key                    | Behavior                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Tab / Shift+Tab        | Into the group, onto the checked radio (or the first/last if none is checked), then out of the group. |
| ArrowDown / ArrowRight | Next enabled radio: focus and select, wrapping at the end.                                            |
| ArrowUp / ArrowLeft    | Previous enabled radio: focus and select, wrapping at the start.                                      |
| Space                  | Select the focused radio if it is unchecked.                                                          |

7. **Focus:** native, with one tab stop. Disabled options are skipped.
8. **Screen reader:**
   - The group is named by the legend; the group description comes from describedby on the fieldset.
   - Each radio: name from its label, "n of m", checked state, "required", "invalid".
9. **Tokens:** as Checkbox, plus `--gn-radius-full` and `--gn-space-4`.
10. **Tests:**
    - `getByRole('group', { name: legend })`.
    - Radios share a `name`.
    - Clicking selects; `onValueChange('b')`.
    - Arrow keys move the selection (user-event v14 emulates arrow walking on same-name radios; if it does not, cover this in Storybook manual checks and note it).
    - Controlled value is respected; uncontrolled `defaultValue` is checked.
    - Group `disabled` disables all radios; a per-radio `disabled` is skipped.
    - `required` and `aria-invalid` are on the inputs when set.
    - The error is in the fieldset's accessible description.
    - The per-radio description is linked.
    - FormData submits the selected value.
    - `Radio` outside a group throws.
    - Refs point at the fieldset and the input.
    - axe: default, invalid, disabled, horizontal.

### 3.9 Switch (`src/components/Switch/`)

1. **Purpose:** an on/off toggle that takes effect immediately.
2. **Pattern:** APG Switch (https://www.w3.org/WAI/ARIA/apg/patterns/switch/), implemented as `<input type="checkbox" role="switch">`. See Decisions.
3. **Anatomy:** the ref goes to the input.
   - `div.root[data-disabled?]`
     - `span.control`
       - `input.track[type=checkbox][role=switch]` with `appearance: none`, drawn as the track
       - `span.thumb`, aria-hidden
     - `div.text`
       - `label[for]`
       - `FieldDescription?`

```ts
export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role' | 'size' | 'checked' | 'defaultChecked' | 'children' | 'disabled'
> {
  /** Visible label naming the setting. */
  label: ReactNode;
  /** Help text linked with aria-describedby. */
  description?: ReactNode;
  /** Controlled on state. */
  checked?: boolean;
  /** Initial on state when uncontrolled. @default false */
  defaultChecked?: boolean;
  /** Called when the user toggles. */
  onCheckedChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  /** @default false */
  disabled?: boolean;
}
```

The Switch uses `useField` for ids and description only. It has no invalid or error props, because a switch applies its change immediately.

5. **Styling:**
   - Track: `--gn-size-switch-width` × `--gn-size-switch-height` (**new**), `radius-full`, `border-strong` border, `bg-surface`.
   - Thumb: `--gn-size-switch-thumb` (**new**), background `border-strong`, inset `calc((var(--gn-size-switch-height) - var(--gn-size-switch-thumb)) / 2)`.
   - `:checked`: track `accent-solid` (hover `accent-solid-hover`), thumb `accent-solid-fg`, translated by `calc(var(--gn-size-switch-width) - var(--gn-size-switch-height))`.
   - Thumb transition: `transform var(--gn-motion-duration-fast) var(--gn-motion-easing-standard)`.
   - Disabled: track `bg-disabled`, border and thumb `border-default` / `fg-disabled`.
   - Focus-visible ring on the input.
   - Forced colors: thumb `forced-color-adjust: none; background: ButtonText`; checked track `Highlight`, checked thumb `HighlightText`.
6. **Keyboard:**

| Key   | Behavior                                                             |
| ----- | -------------------------------------------------------------------- |
| Space | Toggle (native).                                                     |
| Enter | Nothing (APG lists Enter as optional; the native behaviour is kept). |
| Tab   | Move focus.                                                          |

7. **Focus:** native. Clicking the label toggles.
8. **Screen reader:** "switch, on/off" from `role=switch` plus the native checked state. Name from the label; description via describedby. AT without switch support falls back to "checkbox, checked", which is still correct.
9. **Tokens:** `--gn-size-switch-{width,height,thumb}` (**new**), `--gn-color-{border-strong,bg-surface,accent-solid,accent-solid-hover,accent-solid-fg,bg-disabled,border-default,fg-disabled}`, `--gn-radius-full`, `--gn-motion-duration-fast`, `--gn-motion-easing-standard`, focus-ring sizes.
10. **Tests:**
    - `getByRole('switch', { name })`.
    - Click, Space and a label click toggle.
    - `toBeChecked` / `aria-checked` is reflected.
    - `onCheckedChange(true/false)`.
    - Controlled vs uncontrolled.
    - The description is linked.
    - Disabled does not toggle.
    - `name`/`value` appear in FormData when on.
    - `ref` points at the input.
    - axe: off, on, disabled.

### 3.10 Badge (`src/components/Badge/`)

1. **Purpose:** a short, non-interactive status or label.
2. **Pattern:** native `<span>` with text; no role. It is not a live region.
3. **Anatomy:** `<span class="root" data-tone data-variant data-size>{children}</span>`. The ref goes to the span.

```ts
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Text content; it carries the meaning (colour is supplementary). */
  children: ReactNode;
  /** Meaning. @default 'neutral' */
  tone?: Tone;
  /** @default 'subtle' */
  variant?: BadgeVariant;
  /** @default 'md' */
  size?: Size;
}
```

5. **Variants:**
   - solid: `<tone>-solid` / `<tone>-solid-fg`.
   - subtle: `<tone>-subtle` / `<tone>-subtle-fg`.
   - accent tone: `accent-solid` / `accent-solid-fg` (solid) and `accent-subtle` / `accent-subtle-fg` (subtle).
   - neutral tone: solid `bg-inverse` / `fg-inverse`; subtle `bg-muted` / `fg-default`.
   - Sizes:
     - sm: `font-size-xs`, padding `space-0-5` / `space-1-5`.
     - md: `font-size-sm`, `space-0-5` / `space-2`.
     - lg: `font-size-md`, `space-1` / `space-3`.
   - `radius-full`, weight medium, `line-height-tight`, `white-space: nowrap`.
   - `border: 1px solid transparent` so the shape stays visible in forced colors.
6. **Keyboard:** none.
7. **Focus:** none.
8. **Screen reader:** read as plain text.
9. **Tokens:** the tone colour roles above, plus `bg-inverse`, `fg-inverse`, `bg-muted`, `fg-default`, `--gn-font-size-*`, `--gn-space-*`, `--gn-radius-full`.
10. **Tests:**
    - Renders the text.
    - No role and not focusable.
    - `data-tone`, `data-variant` and `data-size` are reflected, with defaults neutral, subtle and md.
    - `className` and `ref` work.
    - axe for the tone × variant matrix.

### 3.11 Alert (`src/components/Alert/`)

1. **Purpose:** an inline message with a tone, an optional title and an optional dismiss button.
2. **Pattern:**
   - `live='off'` (default): static, no role.
   - `live='polite'`: `role="status"`.
   - `live='assertive'`: `role="alert"` (APG Alert, https://www.w3.org/WAI/ARIA/apg/patterns/alert/).
3. **Anatomy:** the ref goes to the root div.
   - `div.root[data-tone][role?]`
     - Tone icon (`InfoIcon`, `SuccessIcon`, `WarningIcon` or `DangerIcon`; neutral uses `InfoIcon`), aria-hidden
     - `div.content`
       - `div.title?`, starting with `<VisuallyHidden>{toneLabel}: </VisuallyHidden>`
       - `div.body?`, carrying the prefix if there is no title
     - Optional `IconButton.dismiss`: `variant="ghost" size="sm" label={dismissLabel} icon={<CloseIcon/>} onClick={onDismiss}`

```ts
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
   * only for urgent, time-sensitive messages. @default 'off'
   */
  live?: 'off' | 'polite' | 'assertive';
  /** When provided, a dismiss button is shown and calls this. The Alert does not hide itself. */
  onDismiss?: () => void;
  /** Accessible name of the dismiss button. @default 'Dismiss' */
  dismissLabel?: string;
  /** Hidden prefix announcing the tone, since icon and colour are not perceivable to everyone.
   *  @default info 'Info', success 'Success', warning 'Warning', danger 'Error', neutral none */
  toneLabel?: string;
}
```

5. **Styling:**
   - `display: grid; grid-template-columns: auto 1fr auto; gap: var(--gn-space-3); padding: var(--gn-space-4); border-radius: var(--gn-radius-lg); border: var(--gn-size-border-width) solid var(--gn-color-<tone>-border)`.
   - Background `<tone>-subtle`; text, title and body `<tone>-subtle-fg`; icon colour `<tone>-border`.
   - Neutral: `bg-muted`, `fg-default`, border `border-default`, icon `fg-muted`.
   - The dismiss button inherits `color: var(--gn-color-<tone>-subtle-fg)`. On hover its background stays transparent and its border becomes `<tone>-border`, so no untested pairs are introduced.
   - Title: semibold. Body: `font-size-sm`.
6. **Keyboard:**

| Key           | Behavior                               |
| ------------- | -------------------------------------- |
| Tab           | Reaches the dismiss button if present. |
| Enter / Space | Dismiss (Button).                      |

7. **Focus:**
   - An Alert never steals focus, including `role="alert"`.
   - After dismissal the button unmounts. The consumer moves focus to a logical target (documented with an example); the Alert does not manage this.
8. **Screen reader:**
   - The tone is announced through the VisuallyHidden prefix.
   - Live roles announce content changes. Announcement of a freshly mounted `role=status` is unreliable, so keep the Alert mounted and swap its children, or use Toast (Phase 3). `role=alert` on mount is widely supported.
9. **Tokens:** `--gn-color-{info,success,warning,danger}-{subtle,subtle-fg,border}`, `bg-muted`, `fg-default`, `fg-muted`, `border-default`, `--gn-space-3`, `--gn-space-4`, `--gn-radius-lg`, `--gn-size-icon-md`, `--gn-font-weight-semibold`, `--gn-font-size-sm`.
10. **Tests:**
    - Default has no role.
    - `live='polite'` gives `getByRole('status')`; `'assertive'` gives `getByRole('alert')`.
    - The text content includes "Warning:" for the warning tone, and a custom `toneLabel` works.
    - Neutral has no prefix.
    - The icon is aria-hidden.
    - With no `onDismiss` there is no button. With it, `getByRole('button', { name: 'Dismiss' })`, click and Enter call it, and a custom `dismissLabel` works.
    - A title-only and a body-only Alert both render the prefix once.
    - `ref` and `className` work.
    - axe: each tone, each live mode, dismissible.

---

## 4. Missing tokens and pairs (Stage 0 adds them, then runs `npm run tokens`)

**`src/tokens/tokens.ts`, `scales.size`, append:**

```ts
'indicator': '1.125rem',      // --gn-size-indicator: checkbox / radio box
'switch-width': '2.25rem',    // --gn-size-switch-width
'switch-height': '1.25rem',   // --gn-size-switch-height
'switch-thumb': '0.875rem',   // --gn-size-switch-thumb
```

**`scales.motion`, append.** These are deliberately not prefixed `duration-`, so `render-tokens.ts` does not collapse them to 0.01ms. A 0.01ms loop would flash, so components swap the animation under reduced motion instead. Update the comment above `reducedMotionDuration` to say so.

```ts
'loop-spin': '800ms',    // --gn-motion-loop-spin: one spinner rotation
'loop-pulse': '1600ms',  // --gn-motion-loop-pulse: reduced-motion opacity pulse
```

**Not adding a disabled-opacity token.** Disabled states use the existing `bg-disabled`, `fg-disabled` and `border-default` roles. Opacity over arbitrary backgrounds gives unpredictable colours and nests badly. Control padding uses the existing space scale through the metrics table in §0, so no new tokens are needed for it.

**`src/tokens/pairs.ts`, add:**

```ts
{ fg: 'fg-default', bg: 'bg-hover', min: 4.5, usage: 'Ghost button hover' },
{ fg: 'fg-default', bg: 'bg-active', min: 4.5, usage: 'Ghost button pressed' },
...(['bg-canvas', 'bg-surface', 'bg-raised'] as const).map((bg): ContrastPair =>
  ({ fg: 'danger-subtle-fg', bg, min: 4.5, usage: 'Field error text / required mark' })),
{ fg: 'danger-border', bg: 'bg-canvas', min: 3, usage: 'Invalid input border on canvas' },
{ fg: 'fg-subtle', bg: 'bg-disabled', min: 3, usage: 'n/a – remove if failing; disabled is exempt' }, // optional, skip if noisy
...(['success', 'warning', 'danger', 'info'] as const).map((tone): ContrastPair =>
  ({ fg: 'border-focus', bg: `${tone}-subtle`, min: 3, usage: `Focus ring inside ${tone} alert` })),
{ fg: 'border-focus', bg: 'accent-subtle', min: 3, usage: 'Focus ring on secondary button surface' },
```

If a new focus-ring pair fails in either theme, do not change `border-focus`. Give the Alert dismiss button `outline-offset: 0`, so the ring sits on the button's own transparent background over the alert, and record the decision.

---

## 5. Build order

**Stage 0: shared pieces.** One builder, merged before anything else starts.

1. Tokens and pairs (§4), then `npm run tokens`, then the contrast test passes.
2. `src/utils/types.ts` (`Size`, `Tone`, `ButtonVariant`, `BadgeVariant`, `AlertTone`, `CheckedState`).
3. `src/hooks/useField.ts` with tests.
4. `src/components/Icon/` with tests.
5. `src/components/VisuallyHidden/` with full DoD (stories and MDX).
6. `src/components/Field/` (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `control.module.css`) with tests.

The integrator then exports `VisuallyHidden` and the types from `src/index.ts`.

**Batches 1–3 run in parallel.** Each batch owns only its own component folders. Within a batch, components are built in the listed order.

| Batch                              | Components (in order)                  | Why grouped                                                                                                                    |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **A: actions and feedback**        | Spinner → Button → IconButton → Alert  | Button uses Spinner; IconButton composes Button and relies on its `[data-icon-only]` CSS; Alert uses IconButton.               |
| **B: text fields**                 | TextField → TextArea → Select          | All use `Field` and `control.module.css` the same way; one builder keeps them visually identical.                              |
| **C: choice controls and display** | Checkbox → RadioGroup → Switch → Badge | Checkbox, Radio and Switch share the indicator pattern and forced-colors approach; Badge is independent and balances the load. |

- **No file conflicts.** No batch edits `src/index.ts`, `DECISIONS.md`, tokens, pairs, or any Stage 0 file.
- **When a batch finds a token or pair is missing,** it reports it to the integrator instead of editing `tokens.ts`.
- **After each batch,** the integrator adds exports to `src/index.ts`, appends decision lines, and runs `npm run ci`.

---

## 6. Decisions (copy into `DECISIONS.md` under "Phase 2")

- **Errors use `aria-describedby`, not `aria-errormessage`.** `aria-errormessage` is still not announced by VoiceOver, and NVDA support is partial. Using both double-announces in JAWS.
- **`aria-describedby` order is description then error,** matching visual order.
- **Field errors are not live regions.** Announcing on every keystroke validation is noisy. Errors are read on focus, and the docs tell consumers to focus the first invalid field on submit.
- **Required fields use native `required` plus an aria-hidden asterisk.** Required is announced once, with no "star", and native validation stays available (consumers can use `noValidate`).
- **Native form controls receive `value`/`checked` directly instead of going through `useControllableState`.** The DOM already owns the state. Mirroring it in React breaks `form.reset()` and autofill and risks controlled/uncontrolled warnings. `useControllableState` stays for non-native state (`open` in Phase 3).
- **On field components, `className`/`style` go to the root wrapper and `ref`/`id`/rest go to the native control.** Layout styling and DOM access each land where they are useful.
- **Button variants are primary, secondary, ghost and danger, with no separate `tone`.** Only one destructive style is needed, and a variant × tone matrix would add untested contrast pairs.
- **Button defaults to `type="button"`.** This prevents accidental form submits.
- **A loading Button uses `aria-disabled` and swallows clicks, not `disabled`.** Native `disabled` drops focus to `<body>` mid-interaction. The label stays in the DOM at opacity 0 to keep the accessible name and width.
- **A disabled (not loading) Button uses native `disabled`.** It matches platform behaviour and removes the button from the tab order.
- **IconButton `label` is a required `string` mapped to `aria-label`, and `aria-labelledby` is omitted from its props.** A name is guaranteed at compile time.
- **IconButton composes Button through a `data-icon-only` attribute.** There is one source of variant and loading logic and no duplicated CSS.
- **Checkbox uses `checked: boolean | 'indeterminate'`.** A single source of truth makes "checked and indeterminate at once" unrepresentable. `onCheckedChange` always returns a boolean, because the user can only produce boolean states.
- **Checkbox indeterminate is set through the DOM `indeterminate` property, not `aria-checked`.** The browser exposes "mixed" natively and clears it on user input.
- **Checkbox, Radio and Switch style the real input with `appearance: none`, with glyphs as aria-hidden siblings.** The focusable, clickable element is the real input, which keeps forms, labels and forced-colors behaviour.
- **RadioGroup uses native radios in a fieldset with a legend, not an ARIA radiogroup with roving tabindex.** Browsers implement the APG keyboard model, single tab stop and form submission natively, with no JS.
- **RadioGroup puts `aria-invalid` and `required` on each radio and describedby on the fieldset.** `aria-invalid` and `aria-required` are not supported on `role=group`. Group help is read on entry without repeating on every arrow press.
- **Switch is `<input type="checkbox" role="switch">`, not `<button role="switch">`.** It gets native name/value form submission, reset, label click and Space toggling for free. AT without switch support still hears a correct checkbox.
- **Switch has no invalid or error props.** A switch applies its change immediately and is not validated.
- **Select uses a native `<select>`.** It provides robust keyboard support and typeahead, the mobile picker, autofill, form participation and AT support, all of which a custom listbox would have to reimplement. A custom listbox can be reconsidered when `appearance: base-select` is widely supported.
- **The Select placeholder is a disabled `value=""` option, not `hidden`.** iOS ignores `hidden` on options.
- **TextArea `autoResize` uses CSS `field-sizing: content`.** No JS measuring is needed, and unsupported browsers fall back to a fixed, user-resizable height.
- **TextField adornments are not auto-linked to the input description.** Most adornments are decorative icons. Units should also appear in the label or description.
- **Alert uses a `live` prop (`off` → no role, `polite` → `status`, `assertive` → `alert`) with default `off`.** Most alerts are static page content, and `role="alert"` interrupts the user, so it should be opt-in.
- **Alert neutral tone is included and accent is excluded.** Neutral covers plain notices. Accent is a brand colour, not a meaning for messages.
- **Alert announces its tone with a visually hidden prefix (`toneLabel`).** Tone otherwise lives only in colour and an aria-hidden icon (WCAG 1.4.1).
- **Alert dismissal is consumer-controlled (`onDismiss`).** The Alert holds no hidden state, and the consumer decides removal and the focus target.
- **Spinner is `role="status"` with visually hidden text, and `decorative` hides it inside Button.** Live regions announce text content, not `aria-label`. The Button already conveys its own state.
- **Under reduced motion, the Spinner swaps rotation for a slow opacity pulse.** It still signals busy without spatial motion. Its loop tokens are `loop-*` so they are not collapsed to 0.01ms, which would make them flash.
- **Status icons use four distinct shapes (circle-i, circle-check, triangle, octagon).** Tone stays distinguishable without colour.
- **Icons are internal in Phase 2.** This keeps the public API small; they can be exported later without breaking changes.
- **Disabled states use semantic colour roles, with no opacity token.** Opacity over arbitrary backgrounds gives unpredictable colours.
- **Batches do not edit `src/index.ts`, `DECISIONS.md` or tokens.** These are the only files all batches would share, so the integrator owns them to avoid merge conflicts.

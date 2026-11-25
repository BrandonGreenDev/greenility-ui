# Phase 3 spec: advanced components

Builders implement from this file. If something is not decided here, make a reasonable choice and add one line to `DECISIONS.md`. Phase 2 rules (`docs/specs/phase-2.md` §0) still apply unless this file overrides them.

---

## 0. Global rules for Phase 3

- **No Portal component.** Everything renders where it is placed in the React tree, so `[data-theme]` and the tokens inherit naturally. Elements get out of `overflow`/`transform` clipping through the browser top layer: `<dialog>.showModal()` for dialogs and the `popover` attribute for floating elements. See §2.1 and Decisions.
- **Non-native state goes through `useControllableState`.** This covers `open`, Tabs/Accordion/custom Select `value`, DataTable `sort`/`page`/`pageSize`. Callbacks receive **only the value**: `onOpenChange(open)`, `onValueChange(value)`. No native change event exists to pass, and this matches `useControllableState`'s `onChange(value)`. Native controls keep the Phase 2 `(value, event)` signature.
- **Handler composition.** When we add a handler to a consumer element (trigger, Button), the consumer's handler runs first. Ours is skipped if the consumer called `event.preventDefault()`. Use `mergeProps` (§2.3).
- **Escape layering.** Any component that handles Escape calls `preventDefault()` and `stopPropagation()`. Floating layers (Tooltip, Menu, Select listbox) handle Escape through `useDismiss`, a document **capture** listener. Only the topmost entry in `layerStack` acts. Dialog handles Escape in its own bubbling `onKeyDown`, skips events that are `defaultPrevented`, and also guards `cancel` (§3.1). So Escape closes the innermost thing first.
- **Floating element rendering** (Tooltip, Menu, Select listbox):
  - Rendered as the next DOM sibling of its trigger, with `popover="manual"`. `showPopover()`/`hidePopover()` run in a layout effect, guarded by `'showPopover' in el`.
  - The element composes `.floating` from `Floating/floating.module.css`. That class resets the UA popover styles and sets `position: fixed` and a `--gn-z-*` fallback.
  - Without popover support the element is still a fixed-position layer, so the fallback is automatic.
  - Position comes from `useFloating` (§2.2).
- **Strings.** Every built-in string has an English default and a prop to override it (`closeLabel`, `dismissLabel`, `cancelLabel`, `messages`, ...).
- **IDs** use `useId()`. Ids made from a consumer `value` go through `toIdPart()`.
- **Shared files are frozen after Stage 0:**
  - `src/tokens/*`, `src/utils/*`, `src/hooks/*`, `src/test/setup.ts`
  - `src/components/{Icon,Field,Floating,NativeSelect}`
  - `src/components/Button/Button.module.css`
- **Integrator-only files.** As in Phase 2, batches never edit `src/index.ts` or `DECISIONS.md`.
- **Forced colors.** Every floating surface keeps a visible `1px` border. Active/selected items use `Highlight`/`HighlightText` with `forced-color-adjust: none`.
- **jsdom limits.** Inert, top layer, layout, scroll lock and real positioning cannot be observed in jsdom. Tests assert the calls and attributes. The Storybook a11y run plus a manual check in Chrome, Safari and Firefox cover the rest; the MDX lists them under "Verified manually".

---

## 1. Shared vocabulary additions

New types live in `src/utils/types.ts` and are exported publicly.

| Prop                                                | Type / union                                                                                  | Default                              | Used by                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `open` / `defaultOpen` / `onOpenChange`             | `boolean` / `boolean` / `(open: boolean) => void`                                             | – / `false`                          | Dialog, AlertDialog, Tooltip, Menu                                     |
| `trigger`                                           | `ReactElement` (a focusable element, usually `Button`/`IconButton`), cloned with merged props | –                                    | Dialog, AlertDialog, Menu                                              |
| `title`                                             | `ReactNode`                                                                                   | –                                    | Dialog, AlertDialog, AccordionItem, toast options (same name as Alert) |
| `description`                                       | `ReactNode`                                                                                   | –                                    | Dialog (optional), AlertDialog (required), toast options               |
| `size`                                              | `Size`                                                                                        | `'md'`                               | Dialog (panel width), Select                                           |
| `placement`                                         | `Placement = 'top' \| 'bottom' \| 'start' \| 'end'`                                           | Tooltip `'top'`, Menu `'bottom'`     | Tooltip, Menu, IconButton (`tooltipPlacement`)                         |
| `align`                                             | `Align = 'start' \| 'center' \| 'end'`                                                        | Menu `'start'`                       | Menu                                                                   |
| `orientation`                                       | `Orientation`                                                                                 | Tabs `'horizontal'`                  | Tabs (RadioGroup keeps `'vertical'`)                                   |
| `activation`                                        | `ActivationMode = 'automatic' \| 'manual'`                                                    | `'automatic'`                        | Tabs                                                                   |
| `multiple` / `collapsible`                          | `boolean` / `boolean`                                                                         | `false` / `true`                     | Accordion                                                              |
| `decorative`                                        | `boolean`, meaning "hidden from AT; the parent supplies semantics" (as on Spinner)            | `false`                              | Tooltip                                                                |
| `tooltip`                                           | `boolean`                                                                                     | `true`                               | IconButton                                                             |
| `tone`                                              | `AlertTone`                                                                                   | `'neutral'`                          | toast options                                                          |
| `closeLabel` / `dismissLabel` / `cancelLabel`       | `string`                                                                                      | `'Close'` / `'Dismiss'` / `'Cancel'` | Dialog / Toast / AlertDialog                                           |
| `options`                                           | `readonly (SelectOption \| SelectOptionGroup)[]`                                              | –                                    | Select                                                                 |
| `sort` / `defaultSort` / `onSortChange`             | `SortState \| null`                                                                           | `null`                               | DataTable                                                              |
| `page` / `defaultPage` / `onPageChange`             | `number` (1-based)                                                                            | `1`                                  | DataTable                                                              |
| `pageSize` / `defaultPageSize` / `onPageSizeChange` | `number`                                                                                      | `10`                                 | DataTable                                                              |
| `loading`                                           | `boolean`                                                                                     | `false`                              | DataTable (same name as Button)                                        |

```ts
// src/utils/types.ts additions
export type Placement = 'top' | 'bottom' | 'start' | 'end';
export type Align = 'start' | 'center' | 'end';
export type ActivationMode = 'automatic' | 'manual';
export type SortDirection = 'ascending' | 'descending'; // identical to aria-sort values
export interface SortState {
  columnId: string;
  direction: SortDirection;
}
```

**Empty value sentinel.** `''` means "nothing selected" for the custom Select and for single Accordion. This matches NativeSelect's `value=""` placeholder. Option and item values must not be `''`.

---

## 2. Stage 0: shared building blocks

### 2.1 Decision: top layer + `popover` + a small JS positioner (no Portal, no CSS anchor positioning)

**Options compared:**

- **Portal (`createPortal` to `body`).**
  - Escapes clipping.
  - Breaks `[data-theme]` inheritance: a dark section's menu would render light.
  - Needs z-index management, and portaled content inside a modal `<dialog>` is inert.
  - Rejected.
- **`popover` attribute.**
  - Puts the element in the top layer: no clipping and no z-index wars.
  - DOM position and CSS inheritance are kept, so themes work.
  - It is a descendant of a modal dialog, so it is not inert inside one.
  - Baseline since April 2024, so widely available by late 2026.
  - Without support it degrades to a `position: fixed` layer with `--gn-z-*`.
  - Accepted, as `popover="manual"`. `auto` light-dismiss would conflict with our trigger toggle (a pointerdown on the trigger closes the popover, then the click reopens it), its Escape handling bypasses our focus return, and it is harder to drive in jsdom. One `useDismiss` model serves all three components.
- **CSS anchor positioning.**
  - Chromium since 125. Safari 26 and Firefox added it only recently; the builder confirms current versions on caniuse at build time.
  - It is "newly available" at best, not widely available, so a JS fallback is required anyway.
  - Two code paths would double the test surface, and jsdom can test neither.
  - Rejected for now; revisit when it is Baseline widely available.
- **Small JS positioner (`computePosition` + `useFloating`).**
  - Pure, unit-testable math: flip, shift, RTL and available height.
  - About 120 lines, with no dependency.
  - Accepted.

### 2.2 Positioning: `src/utils/position.ts` (pure) and `src/hooks/useFloating.ts`

```ts
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ComputePositionInput {
  /** Anchor border box in viewport coordinates (getBoundingClientRect). */
  anchor: Box;
  /** Floating element MARGIN box size. Its computed margin is the gap and the viewport padding. */
  floating: { width: number; height: number };
  viewport: { width: number; height: number };
  placement: Placement;
  align: Align;
  rtl: boolean;
}
export interface ComputePositionResult {
  /** Left/top of the margin box, written to style.left/top. */
  x: number;
  y: number;
  /** Placement after flipping. */
  placement: Placement;
  /** Space on the chosen side, for max-block-size (listbox). */
  availableBlockSize: number;
}
export function computePosition(input: ComputePositionInput): ComputePositionResult;
```

**Algorithm:**

1. Map logical to physical. `start`/`end` become `left`/`right`, swapped when `rtl`. `align: 'start'` lines up with the anchor's inline-start edge (the right edge in RTL).
2. **Flip** to the opposite side when the floating size does not fit on the preferred side and the opposite side has more space.
3. **Shift** along the cross axis by clamping into `[0, viewport - size]`.
4. `availableBlockSize` is the space between the anchor and the viewport edge on the chosen side (top or bottom placements).

```ts
export interface UseFloatingOptions {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  floatingRef: RefObject<HTMLElement | null>;
  placement: Placement;
  /** @default 'center' */
  align?: Align;
  /** Sets min-inline-size to the anchor width (Select listbox). @default false */
  matchAnchorWidth?: boolean;
}
/** Positions the floating element while open. Returns the final placement, also written to `data-placement`. */
export function useFloating(options: UseFloatingOptions): { placement: Placement };
```

- Runs in a layout effect on open, so there is no flash at 0,0.
- Re-runs on window `resize` and on `scroll` (capture, passive), throttled with rAF.
- Also re-runs from a `ResizeObserver` on the anchor and the floating element, only if `ResizeObserver` exists (jsdom has none).
- Writes:
  - `style.left` and `style.top` in px
  - `data-placement`
  - `--gn-floating-available-block-size` in px
  - `min-inline-size` when `matchAnchorWidth`
- RTL comes from `getDirection(el)`: `el.closest('[dir]')?.getAttribute('dir') === 'rtl'`. This is deterministic in jsdom; CSS-only `direction` is not supported, and the docs say so.
- **The offset is a CSS token, not a JS constant.** `.floating` has `margin: var(--gn-space-1)`. The positioner measures the margin box, so the gap and the viewport edge padding both come from the token.

### 2.3 Utilities (`src/utils/`)

| File                | Export                                                                                       | Contract                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mergeProps.ts`     | `mergeProps(theirs, ours)`                                                                   | Handlers: theirs first, ours unless `defaultPrevented`. `className` via `cx`. `style` shallow-merged (ours wins). `aria-describedby`/`aria-labelledby` tokens joined and de-duplicated. Other keys: ours win for ARIA we own (`aria-expanded`, `aria-controls`, `aria-haspopup`, `id` only if the consumer gave none), theirs win otherwise. |
| `mergeProps.ts`     | `getElementRef(element): Ref \| undefined`                                                   | Reads `element.props.ref` (React 19) or `element.ref` (React 18). Callers compose it with `composeRefs`.                                                                                                                                                                                                                                     |
| `mergeProps.ts`     | `cloneTrigger(element, ours, ref)`                                                           | `cloneElement(element, { ...mergeProps(element.props, ours), ref: composeRefs(getElementRef(element), ref) })`.                                                                                                                                                                                                                              |
| `toIdPart.ts`       | `toIdPart(value: string): string`                                                            | Injective escape for ids: `[A-Za-z0-9_-]` kept, every other char becomes `_<codepoint base36>_`.                                                                                                                                                                                                                                             |
| `listNavigation.ts` | `getNextIndex(count, from, action, isDisabled, loop)`                                        | `action`: `'next' \| 'prev' \| 'first' \| 'last' \| { by: number }` (PageUp/Down; clamps, never wraps). Skips disabled items; returns `-1` if all are disabled.                                                                                                                                                                              |
| `listNavigation.ts` | `keyToAction(key, orientation, rtl)`                                                         | `ArrowDown`/`ArrowUp` (vertical), `ArrowRight`/`ArrowLeft` (horizontal, swapped in RTL), `Home`, `End`; otherwise `null`.                                                                                                                                                                                                                    |
| `focusable.ts`      | `getTabbables(root): HTMLElement[]`                                                          | Matches `a[href], button, input, select, textarea, [tabindex], [contenteditable=true]`, minus `:disabled`, `[tabindex='-1']`, `[hidden]`/`[inert]` ancestors and `input[type=hidden]`. No layout checks (jsdom).                                                                                                                             |
| `layerStack.ts`     | `pushLayer(token: symbol): () => void`, `isTopLayer(token)`, `hasLayers()`                   | Module-level array of symbols (not ids or counters). It records which floating layer gets Escape first.                                                                                                                                                                                                                                      |
| `direction.ts`      | `getDirection(el): 'ltr' \| 'rtl'`                                                           | As in §2.2.                                                                                                                                                                                                                                                                                                                                  |
| `overlayHost.ts`    | `OverlayHostContext`, `interface OverlayHost { registerModal(el: HTMLElement): () => void }` | Provided by ToastProvider and consumed by Dialog (§3.1, §3.5). It keeps toasts usable while a modal is open.                                                                                                                                                                                                                                 |

### 2.4 Hooks (`src/hooks/`)

```ts
/** Escape and outside-pointer dismissal for floating layers. */
export interface UseDismissOptions {
  enabled: boolean;
  /** Elements counted as "inside" (trigger + floating). */
  refs: readonly RefObject<HTMLElement | null>[];
  onDismiss: (reason: 'escape' | 'outside') => void;
  /** Listen for outside pointerdown. Tooltip passes false. @default true */
  outsidePointer?: boolean;
}
export function useDismiss(options: UseDismissOptions): void;
```

- While enabled, pushes a layer onto `layerStack`.
- Escape:
  - Listens with `ownerDocument.addEventListener('keydown', fn, true)`.
  - Acts only when `isTopLayer`. Then it calls `preventDefault()` and `stopPropagation()`, then `onDismiss('escape')`.
- Outside pointer: `pointerdown` (capture) whose target is outside every ref calls `onDismiss('outside')`.

```ts
/** Remembers the focused element and restores it on demand. */
export function useFocusReturn(): {
  /** Store document.activeElement. */
  capture: () => void;
  /** Focus the fallback if given and connected, else the captured element if connected and not disabled. */
  restore: (fallback?: HTMLElement | null) => void;
};
```

```ts
/** Typeahead over item labels. */
export function useTypeahead(): (
  event: KeyboardEvent,
  labels: readonly string[],
  current: number,
  isDisabled: (i: number) => boolean,
) => number; // -1 when no match or not a typeahead key
```

- **What counts:** a key is handled only if `key.length === 1` with no Ctrl, Meta or Alt.
- **Space:** handled only when the buffer is non-empty. Otherwise Space is left for activation.
- **Matching:**
  - The buffer is lower-cased and resets after 500ms.
  - If the buffer is one repeated char, it cycles through items starting with that char, after `current`.
  - Otherwise it matches the first item that starts with the buffer, from `current` inclusive, wrapping.
  - Matching uses `localeCompare(..., { sensitivity: 'base' })` on prefixes.

```ts
/** True when the element's content overflows on the axis. Re-checks with ResizeObserver; false when RO is unavailable. */
export function useIsOverflowing(
  ref: RefObject<HTMLElement | null>,
  axis: 'inline' | 'block',
): boolean;
```

### 2.5 Floating styles: `src/components/Floating/` (internal)

Files: `floating.module.css`, `index.ts` (re-exports nothing; components import the CSS directly, as with `Field/control.module.css`).

- **`.floating`** resets the UA popover styles. It sets:
  - `position: fixed; inset: auto; margin: var(--gn-space-1); padding: 0; overflow: visible`
  - `color: inherit; background: transparent; border: 0`
  - `max-inline-size: calc(100vw - 2 * var(--gn-space-1))`
  - `animation: gnFloatingIn var(--gn-motion-duration-fast) var(--gn-motion-easing-enter)`, an opacity-only fade
- **`.surface`** (Menu, listbox):
  - `background: var(--gn-color-bg-raised); color: var(--gn-color-fg-default)`
  - `border: var(--gn-size-border-width) solid var(--gn-color-border-default)`
  - `border-radius: var(--gn-radius-md); box-shadow: var(--gn-shadow-lg); padding: var(--gn-space-1)`
  - `min-inline-size: var(--gn-size-menu-min-width)`
  - `max-block-size: min(var(--gn-size-listbox-max-height), var(--gn-floating-available-block-size, var(--gn-size-listbox-max-height)))`
  - `overflow-y: auto`
- **`.item`:**
  - `display: flex; align-items: center; gap: var(--gn-space-2); min-block-size: var(--gn-size-control-sm)`
  - `padding-inline: var(--gn-space-3); border-radius: var(--gn-radius-sm)`
  - `font-size: var(--gn-font-size-sm); cursor: pointer`
  - Reset as a button (`border: 0; background: transparent; inline-size: 100%; text-align: start; font: inherit; color: inherit`)
- **`.item[data-active]`** (keyboard or hover): `background: var(--gn-color-bg-hover); outline: var(--gn-size-focus-ring-width) solid var(--gn-color-border-focus); outline-offset: calc(-1 * var(--gn-size-focus-ring-width))`.
  - The background change alone between `bg-raised` and `bg-hover` is about 1.1:1, which fails 1.4.11. The inset ring carries the focus indication.
  - Hover without keyboard uses the same style, so there is one active item.
- **`.item[aria-selected='true']`:** `background: var(--gn-color-accent-subtle); color: var(--gn-color-accent-subtle-fg)`, plus the check glyph.
- **`.item[aria-disabled='true']`:** `color: var(--gn-color-fg-disabled); cursor: not-allowed`.
- **`.groupLabel`:** `padding: var(--gn-space-1-5) var(--gn-space-3) var(--gn-space-1); font-size: var(--gn-font-size-xs); font-weight: semibold; color: var(--gn-color-fg-muted)`.
- **`.separator`:** `block-size: 1px; margin-block: var(--gn-space-1); background: var(--gn-color-border-default)`.
- **Forced colors:**
  - `.surface` border becomes `CanvasText`.
  - `.item[data-active]` uses `forced-color-adjust: none; background: Highlight; color: HighlightText; outline-color: HighlightText`.
  - Selected items show only the check icon (in `CanvasText`).
  - Disabled items use `GrayText`.
  - `.separator` uses `CanvasText`.
- **Reduced motion:** the duration tokens collapse; there is no spatial motion anyway.

### 2.6 Icons (add to `src/components/Icon/icons.tsx`, original paths)

| Icon               | Shapes                                                                    | Used by            |
| ------------------ | ------------------------------------------------------------------------- | ------------------ |
| `ChevronLeftIcon`  | `M14.5 6l-6 6 6 6`                                                        | DataTable previous |
| `ChevronRightIcon` | `M9.5 6l6 6-6 6`                                                          | DataTable next     |
| `ArrowUpIcon`      | `M12 19V5`, `M6.5 10.5L12 5l5.5 5.5`                                      | sorted ascending   |
| `ArrowDownIcon`    | `M12 5v14`, `M6.5 13.5L12 19l5.5-5.5`                                     | sorted descending  |
| `ArrowUpDownIcon`  | `M8 19V5`, `M4.5 8.5L8 5l3.5 3.5`, `M16 5v14`, `M12.5 15.5L16 19l3.5-3.5` | sortable, unsorted |

Directional chevrons are mirrored in RTL by the consumer component (`:dir(rtl) svg { transform: scaleX(-1) }`).

### 2.7 Other Stage 0 changes

- **Rename `Select` to `NativeSelect`.**
  - Move `src/components/Select/*` to `src/components/NativeSelect/`.
  - Rename the component, `NativeSelectProps`, `displayName`, the story title `Components/NativeSelect`, the MDX, and the tests.
  - The API, CSS and behaviour are unchanged.
  - The `Select` folder is then empty and is owned by Batch C.
- **Button `aria-disabled` styling** (`Button.module.css`):
  - `.root[aria-disabled='true']:not([data-loading])` gets the same colours and cursor as `:disabled` (ghost stays transparent), plus the matching forced-colors rule.
  - This lets DataTable's Prev/Next keep focus at the bounds. Native `disabled` drops focus to `<body>` (the Phase 2 loading rationale).
  - Click suppression stays with the caller.
- **`src/test/setup.ts` jsdom shims** (feature-detected, so they no-op when jsdom grows support):
  - `HTMLDialogElement.prototype.showModal` sets `open` and a `data-modal` attribute.
  - `close()` removes `open` and dispatches `close`.
  - `HTMLElement.prototype.showPopover`/`hidePopover`/`togglePopover` toggle `data-popover-open`.
  - `Element.prototype.scrollIntoView` is a no-op.
- **Tokens and pairs:** §4.
- **Types:** §1.

**Stage 0 tests:**

- `computePosition` table tests:
  - bottom/top/start/end
  - flip when there is no room
  - no flip when the opposite side is smaller
  - shift at both edges
  - `align` start/center/end in LTR and RTL
  - `availableBlockSize`
- `getNextIndex`: wrap, no-wrap, skip disabled, all disabled → -1, `{ by: 10 }` clamps.
- `keyToAction`: RTL swaps Left and Right only.
- `useTypeahead` (fake timers):
  - a prefix match
  - repeated-char cycling
  - reset after 500ms
  - modifiers ignored
  - Space only when the buffer is non-empty
- `useDismiss`:
  - Escape calls `onDismiss('escape')` and stops propagation.
  - Of two layers, only the top one handles Escape.
  - Outside pointerdown dismisses; inside does not.
  - A disabled hook adds no listeners.
- `useFocusReturn`: restores to the captured element; skips disconnected elements; uses the fallback first.
- `mergeProps`: order, `defaultPrevented` skip, describedby join, className merge.
- `getElementRef`: works for a forwardRef child.
- `toIdPart`: injective on `a b`, `a_20_b`, `a-b`.
- `getTabbables`: excludes disabled, hidden and `tabindex=-1`.
- NativeSelect: the existing test suite passes under the new name.
- Button: `aria-disabled` sets no `data-loading`, and the test suite is unchanged.

---

## 3. Components

### 3.1 Dialog and AlertDialog (`src/components/Dialog/`)

1. **Purpose:** a modal window for a focused task (Dialog) or a destructive confirmation (AlertDialog).
2. **Patterns:**
   - Dialog follows APG Dialog (Modal), https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/.
   - AlertDialog follows APG Alert Dialog, https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/.
   - Built on native `<dialog>` with `showModal()`. That gives:
     - top layer (no z-index or clipping problems)
     - an inert background (outside content leaves the a11y tree and the tab order, with no JS trap)
     - `::backdrop`
     - a native modal role
     - Escape as `cancel`
   - A div with `role="dialog"` would need a JS focus trap, `aria-modal`, sibling `inert` management and a z-index portal. The native element is now Baseline everywhere. See Decisions.
   - **Focus trap:** none in JS. Inert stops focus leaving to the page. Tab may move from the last element into the browser chrome and back, which is the accepted platform behaviour.
3. **Anatomy:** the ref goes to `<dialog>`.

```
[trigger clone]                       (onClick → open)
<dialog class=root data-size role="alertdialog"? aria-labelledby=titleId aria-describedby=descId?>
  <div class=panel>                   (only rendered while open)
    <div class=header>
      <h2 id=titleId class=title>{title}</h2>
      <IconButton variant=ghost size=sm label={closeLabel} icon=<CloseIcon/>/>   (Dialog only)
    </div>
    <p id=descId class=description>{description}</p>     (if renderable)
    <div class=body tabindex=0 only when overflowing>{children}</div>
    <div class=footer>{footer}</div>                     (if renderable; AlertDialog: Cancel + Confirm)
  </div>
  <div class=overlayOutlet />         (registered with OverlayHostContext; toasts render here, see §3.5)
</dialog>
```

```ts
export interface DialogProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  'open' | 'title' | 'role' | 'children'
> {
  /** Heading (rendered as <h2>) and the dialog's accessible name via aria-labelledby. */
  title: ReactNode;
  /** Supporting text under the title, linked with aria-describedby. */
  description?: ReactNode;
  /** Dialog body. */
  children?: ReactNode;
  /** Actions row at the bottom, e.g. a `DialogClose` and a primary Button. */
  footer?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state when uncontrolled. @default false */
  defaultOpen?: boolean;
  /** Called with the requested state (trigger, close button, DialogClose, Escape, backdrop click). */
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (e.g. `<Button>`). It is cloned with a composed onClick. Focus returns to it on close. */
  trigger?: ReactElement;
  /** Panel max width: --gn-size-dialog-{size}. @default 'md' */
  size?: Size;
  /** Accessible name of the close button. @default 'Close' */
  closeLabel?: string;
  /** Element to focus on open. Default: first tabbable in body, then footer, then the close button, then the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Element to focus on close when the trigger no longer exists (e.g. the deleted row's neighbour). Default: the element focused before opening. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export interface DialogCloseProps extends ButtonProps {
  /** @default 'secondary' */
  variant?: ButtonVariant;
}
/** A Button that closes the nearest Dialog after its own onClick (unless that called preventDefault). Throws outside a Dialog. */

export interface AlertDialogProps extends Omit<
  DialogProps,
  'footer' | 'closeLabel' | 'initialFocusRef' | 'description'
> {
  /** Required: states the consequence ("This permanently deletes 3 files."). */
  description: ReactNode;
  /** Confirm button text, e.g. "Delete files". */
  confirmLabel: ReactNode;
  /** @default 'Cancel' */
  cancelLabel?: ReactNode;
  /** Called on confirm; the dialog then requests close (onOpenChange(false)). Control `open` to keep it open while working. */
  onConfirm: () => void;
  /** @default 'danger' */
  confirmVariant?: Extract<ButtonVariant, 'danger' | 'primary'>;
}
```

**Implementation:**

- **State.** `const [open, setOpen] = useControllableState({ value, defaultValue: defaultOpen, onChange: onOpenChange })`. A `DialogContext` provides `{ close }`.
- **Sync effect** (layout effect). If `open && !el.open`:
  - `focusReturn.capture()`
  - `el.showModal()`
  - focus the initial target (§7)
  - If `!open && el.open`: `el.close()`, then `focusReturn.restore(returnFocusRef?.current)`.
  - The effect re-runs on a `syncTick` state that the native `close` handler bumps.
- **Escape.**
  - The dialog's `onKeyDown`: if `key === 'Escape' && !e.defaultPrevented`, then `preventDefault()` and `setOpen(false)`.
  - `onCancel`: always `preventDefault()`; if `!hasLayers()`, `setOpen(false)`.
  - `onClose` (native close, e.g. Chrome's close watcher after repeated Escape): if React still thinks it is open, `setOpen(false)` and bump `syncTick`. A controlled parent that keeps `open` gets `showModal()` again.
  - Consumer `onKeyDown`/`onCancel`/`onClose` are composed first.
- **Backdrop click (Dialog only).**
  - The `<dialog>` is a transparent full-viewport box (`inset: 0; max-inline-size: none; max-block-size: none; inline-size: 100%; block-size: 100%; display: grid; place-items: center; padding: var(--gn-space-4); background: transparent; border: 0`).
  - A `click` whose `target === dialogEl` (outside `.panel`) closes it.
  - Track `pointerdown` on the same target, so a drag from inside the panel to outside does not close.
  - AlertDialog never closes on backdrop click.
- **Scroll lock, pure CSS (no JS, no ref counting):** `:global(html):has(.root[open]) { overflow: hidden; scrollbar-gutter: stable; }`. `scrollbar-gutter` prevents layout shift. Nested dialogs work automatically.
- **Children are unmounted while closed.** State resets, and no ids point at missing nodes. The `<dialog>` element itself stays mounted. It never renders the `open` attribute from React (SSR-safe).
- **OverlayHost.** While open, `useContext(OverlayHostContext)?.registerModal(outletEl)`; the cleanup unregisters.
- **AlertDialog** reuses the same internal `DialogShell` with:
  - `role="alertdialog"`
  - no close IconButton
  - footer = `<DialogClose>{cancelLabel}</DialogClose>` plus `<Button variant={confirmVariant} onClick={() => { onConfirm(); close(); }}>{confirmLabel}</Button>`
  - initial focus on Cancel, the least destructive action (per APG)
- **Trigger.** `cloneTrigger(trigger, { onClick: () => setOpen(true) })`. No `aria-haspopup="dialog"` or `aria-expanded`: APG does not require them for dialogs, and the modal covers the trigger.

5. **Variants and states:**
   - Sizes: the panel's `inline-size: min(100%, var(--gn-size-dialog-{sm|md|lg}))`.
   - Panel:
     - `max-block-size: calc(100dvh - 2 * var(--gn-space-8))`
     - `display: flex; flex-direction: column`
     - `background: var(--gn-color-bg-raised)`
     - `border: var(--gn-size-border-width) solid var(--gn-color-border-default)`
     - `border-radius: var(--gn-radius-lg); box-shadow: var(--gn-shadow-xl); padding: var(--gn-space-6); gap: var(--gn-space-4)`
   - Body: `overflow-y: auto; min-block-size: 0`.
   - Title: `font-size-xl`, semibold, `line-height-tight`, `margin: 0`. Description: `fg-muted`, `font-size-sm`, `margin: 0`.
   - Header: flex, `align-items: start; justify-content: space-between; gap: var(--gn-space-4)`.
   - Footer: flex, `justify-content: flex-end; gap: var(--gn-space-2); flex-wrap: wrap`.
   - `::backdrop { background: var(--gn-color-overlay) }`. `::backdrop` inherits custom properties from its element (Baseline 2024).
   - **Enter motion:** the panel animates `opacity 0→1` and `translate: 0 var(--gn-space-2) → 0` over `duration-normal`/`easing-enter`. The backdrop fades over `duration-normal`.
   - **No exit animation:** closing is instant. `allow-discrete`/`overlay` exit transitions are not cross-browser.
   - Reduced motion: the tokens collapse.
   - Forced colors: the panel border becomes `CanvasText`, and the backdrop keeps the system default.
6. **Keyboard:**

| Key                                         | Behavior                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Enter / Space on trigger                    | Open the dialog (Button).                                                              |
| Tab / Shift+Tab                             | Move through tabbables inside the dialog. The background is inert.                     |
| Escape                                      | Close (both variants), unless an inner layer (Select, Menu, Tooltip) handled it first. |
| Enter / Space on close, DialogClose, Cancel | Close.                                                                                 |

7. **Focus:**
   - **On open:** `initialFocusRef`, else the first tabbable in `.body`, then `.footer`, then the close button, then `.panel` (`tabindex=-1`). This avoids landing on the header close button, so content-first users start in the content. AlertDialog focuses Cancel.
   - **On close:** `returnFocusRef`, else the element focused before opening (usually the trigger), if it is still connected.
   - **Body scrolling:** `useIsOverflowing(body, 'block')` gives `.body` `tabindex=0` only when it scrolls (WCAG 2.1.1 for scrollable content).
8. **Screen reader:**
   - The name comes from the `<h2>` via `aria-labelledby`, and the description via `aria-describedby`.
   - Native `<dialog>` with `showModal` is exposed as a modal dialog. AlertDialog is announced as "alert dialog".
   - The rest of the page is inert, so it is not reachable with the virtual cursor.
9. **Tokens:**
   - `--gn-size-dialog-{sm,md,lg}` (**new**)
   - `--gn-color-{bg-raised,fg-default,fg-muted,border-default,overlay}`
   - `--gn-shadow-xl`, `--gn-radius-lg`, `--gn-space-{2,4,6,8}`
   - `--gn-font-size-{xl,sm}`, `--gn-font-weight-semibold`
   - `--gn-motion-duration-normal`, `--gn-motion-easing-enter`
10. **Tests:**
    - Clicking the trigger calls `showModal` (spy); the dialog is `getByRole('dialog', { name: title })`; the description is its accessible description.
    - Uncontrolled `defaultOpen`. Controlled: `onOpenChange(false)` on Escape, but it stays open if the parent does not update.
    - Escape closes and focus returns to the trigger; the close button does the same.
    - `DialogClose` closes after its own `onClick`; `preventDefault` in that onClick keeps it open; `DialogClose` outside a Dialog throws.
    - Initial focus: first body tabbable; `initialFocusRef`; falls back to the close button when the body has none.
    - `returnFocusRef` wins when the trigger was removed.
    - Backdrop click (`target === dialog`) closes a Dialog; it does not close an AlertDialog; a click inside the panel does not close.
    - Escape with an open inner layer (render a Menu inside, open it): the first Escape closes only the menu.
    - Native `close` event while controlled open: `onOpenChange(false)` is called.
    - Children are not in the DOM while closed.
    - AlertDialog:
      - `getByRole('alertdialog')`
      - focus is on Cancel
      - Confirm calls `onConfirm` then `onOpenChange(false)`
      - no close IconButton
      - `confirmVariant` is reflected
    - `size` → `data-size`; `className` and `ref` go to `<dialog>`.
    - Registers with `OverlayHostContext` when a provider is present (a mock provider).
    - axe: open Dialog, open AlertDialog.

### 3.2 Tabs (`src/components/Tabs/`)

1. **Purpose:** switch between related panels of content in one view.
2. **Pattern:** APG Tabs, https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ (automatic and manual activation).
3. **Anatomy:**

```
<div class=root data-orientation>                         (Tabs ref, rest)
  <div role=tablist aria-orientation class=list>          (TabList ref, rest; consumer adds aria-label)
    <button role=tab type=button id aria-selected aria-controls tabindex=0|-1 disabled? data-value>  (Tab ref)
  <div role=tabpanel id aria-labelledby=tabId tabindex=0 hidden?>   (TabPanel ref)
```

```ts
export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'dir'> {
  /** Controlled selected tab value. */
  value?: string;
  /** Initially selected tab when uncontrolled. Default: the first enabled tab. */
  defaultValue?: string;
  /** Called with the newly selected value. */
  onValueChange?: (value: string) => void;
  /** 'automatic': arrow keys select. 'manual': arrows move focus; Enter/Space select. @default 'automatic' */
  activation?: ActivationMode;
  /** Arrow axis and layout. @default 'horizontal' */
  orientation?: Orientation;
  /** A TabList and TabPanels. */
  children: ReactNode;
}
export interface TabListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Tab elements. Give the list an aria-label or aria-labelledby when the page has no heading naming it. */
  children: ReactNode;
}
export interface TabProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'value'
> {
  /** Value linking the tab to its TabPanel. No whitespace restrictions (ids go through toIdPart). */
  value: string;
  /** Visible label and accessible name. */
  children: ReactNode;
  /** Native disabled: skipped by arrows and Tab. @default false */
  disabled?: boolean;
}
export interface TabPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Value of the Tab that labels this panel. */
  value: string;
  children: ReactNode;
}
```

- **Context:** `{ baseId, selected, select, activation, orientation }`. Ids are `${baseId}-tab-${toIdPart(value)}` and `${baseId}-panel-${toIdPart(value)}`.
- **Navigation:**
  - Queries `[role=tab]` in the tablist on keydown (DOM order, so no registration).
  - Uses `keyToAction(key, orientation, getDirection(list))` and `getNextIndex(..., isDisabled = el.disabled, loop = true)`.
  - Calls `.focus()`; automatic activation also selects.
- **Roving tabindex:** the selected tab has `tabindex=0`. If it is missing or disabled, the first enabled tab does. All others get -1.
- **Default selection:** uncontrolled with no `defaultValue` selects the first enabled tab's `data-value` in a layout effect.
- **Panels:** all panels stay mounted; inactive ones are `hidden`. This keeps their state, and `aria-controls` always resolves.
- Tab, TabList or TabPanel outside `Tabs` throws.

5. **States:**
   - Tab:
     - `min-block-size: var(--gn-size-control-md); padding-inline: var(--gn-space-4)`
     - `font-size-sm`, medium weight
     - text `fg-muted`; hover `fg-default` + `bg-hover`
     - `aria-selected=true`: `fg-default`
     - disabled: `fg-disabled`, `not-allowed`
     - focus-visible ring with `outline-offset: calc(-1 * var(--gn-size-focus-ring-width))` (inset, so the list's overflow does not clip it)
   - Selected indicator:
     - `::after` with `block-size: var(--gn-size-tab-indicator)` (**new**) and `background: var(--gn-color-accent-solid)`, at the block-end edge
     - in vertical mode it is at the inline-end edge, with `inline-size` from the same token
     - `transition: background-color var(--gn-motion-duration-fast)`
   - List: `border-block-end: var(--gn-size-border-width) solid var(--gn-color-border-default)`. Vertical uses `border-inline-end` and `flex-direction: column`, and the root becomes a row.
   - Overflow: the horizontal list uses `overflow-x: auto`.
   - Panel: `padding-block: var(--gn-space-4)` and a focus-visible ring.
   - Forced colors: the selected `::after` uses `forced-color-adjust: none; background: Highlight`, not a border. Transparent borders become visible in forced colors, so a border could not tell selected from unselected.
6. **Keyboard** (RTL swaps only Left and Right):

| Key                                 | Behavior                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| Tab                                 | Into the list onto the selected tab; next Tab goes to the panel (`tabindex=0`).      |
| ArrowRight / ArrowLeft (horizontal) | Next / previous enabled tab, wrapping. Automatic mode also selects it.               |
| ArrowDown / ArrowUp (vertical)      | Same, vertically.                                                                    |
| Home / End                          | First / last enabled tab (selects in automatic mode).                                |
| Enter / Space                       | Manual mode: select the focused tab. Automatic mode: no-op (it is already selected). |

7. **Focus:** focus never moves on selection by pointer or by a controlled `value` change. Arrows move DOM focus. Disabled tabs are skipped.
8. **Screen reader:**
   - "tab, n of m, selected". The panel is named by its tab.
   - `aria-orientation` is set on the tablist, so AT announces the arrow axis.
   - Disabled is announced natively ("dimmed").
9. **Tokens:**
   - `--gn-size-tab-indicator` (**new**), `--gn-size-control-md`
   - `--gn-color-{fg-muted,fg-default,bg-hover,accent-solid,border-default,fg-disabled,border-focus}`
   - `--gn-space-4`, `--gn-font-size-sm`, `--gn-font-weight-medium`
   - `--gn-motion-duration-fast`, focus-ring sizes
10. **Tests:**
    - Roles and links: tablist, tab, tabpanel; `aria-controls` ↔ panel id; panel `aria-labelledby` ↔ tab.
    - Selection and roving: only the selected panel is visible (others `hidden`); the selected tab has `tabindex=0` and the others -1.
    - Automatic mode: ArrowRight focuses and selects the next tab; wraps from the last; Home/End work.
    - Manual mode: ArrowRight moves focus without selecting; Enter or Space selects.
    - Vertical orientation: Up/Down work and Left/Right do nothing; `aria-orientation="vertical"`.
    - RTL (`dir="rtl"` wrapper): ArrowLeft moves to the next tab.
    - Disabled tabs are skipped by arrows and are not clickable.
    - Default selection: the first enabled tab when no `defaultValue`.
    - Controlled `value` is respected; `onValueChange` is called with the value.
    - Tab key order: tab → panel.
    - Values with spaces produce valid ids.
    - Tab outside Tabs throws.
    - `ref`/`className` on each part.
    - axe: horizontal, vertical, with a disabled tab.

### 3.3 Accordion (`src/components/Accordion/`)

1. **Purpose:** vertically stacked sections that show and hide their content.
2. **Pattern:** APG Accordion, https://www.w3.org/WAI/ARIA/apg/patterns/accordion/. A button inside a heading, with `aria-expanded` and `aria-controls`, controlling a panel with `role="region"`.
   - **Native `<details>` was considered.** It needs no JS, auto-expands for find-in-page, and supports `name` exclusivity. It was rejected because:
     - A heading inside `<summary>` loses its heading semantics in several screen readers, so heading navigation breaks.
     - "Single, not collapsible" cannot be enforced.
     - Controlled state must be mirrored from `toggle` events.
     - Height animation needs `::details-content` and `interpolate-size`, which are Chromium-only.
3. **Anatomy:**

```
<div class=root>                                                  (Accordion ref, rest)
  <div class=item data-state=open|closed data-disabled?>          (AccordionItem ref, rest)
    <h3 class=heading>                                            (level from headingLevel)
      <button type=button class=trigger id aria-expanded aria-controls disabled? aria-disabled?>
        <span class=title>{title}</span><ChevronDownIcon class=chevron/>
    <div class=panel id role=region aria-labelledby=triggerId data-state>
      <div class=content>{children}</div>
```

```ts
interface AccordionBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  /** Heading element level wrapping each trigger; match the page outline. @default 3 */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** AccordionItem elements. */
  children: ReactNode;
}
export interface AccordionSingleProps extends AccordionBaseProps {
  /** One item open at a time. @default false */
  multiple?: false;
  /** Controlled open item value ('' = none). */
  value?: string;
  /** Initial open item when uncontrolled. @default '' */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Whether the open item can be closed, leaving none open. When false, the open trigger gets aria-disabled="true". @default true */
  collapsible?: boolean;
}
export interface AccordionMultipleProps extends AccordionBaseProps {
  /** Any number of items open. */
  multiple: true;
  value?: string[];
  /** @default [] */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}
export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Value identifying the item (not ''). */
  value: string;
  /** Trigger text inside the heading; the region's accessible name. */
  title: ReactNode;
  /** Panel content. */
  children: ReactNode;
  /** Native disabled on the trigger. @default false */
  disabled?: boolean;
}
```

- **State:** internally `useControllableState<string[]>`, with single mode mapped to and from `string`.
- **Panel ids:** `${base}-trigger-${toIdPart(value)}` and `${base}-panel-${...}`.
- **Collapse animation** (no JS measuring):
  - `.panel` is `display: grid; grid-template-rows: 0fr; visibility: hidden`, with `transition: grid-template-rows var(--gn-motion-duration-normal) var(--gn-motion-easing-standard), visibility var(--gn-motion-duration-normal)`.
  - `[data-state='open']` sets `grid-template-rows: 1fr; visibility: visible`.
  - `.content` is `min-block-size: 0; overflow: hidden`.
  - `visibility: hidden` removes closed content from the a11y tree and the tab order. The visibility transition keeps the content visible until the collapse finishes.
  - Under reduced motion the duration tokens collapse, so the change is instant.
- **Region role:** always set (it is named, so it becomes a landmark). The MDX advises against more than about six items in `multiple` mode, per APG.

5. **States:**
   - Item: `border-block-end: var(--gn-size-border-width) solid var(--gn-color-border-default)`.
   - Trigger:
     - full width, flex, `justify-content: space-between; gap: var(--gn-space-3)`
     - `min-block-size: var(--gn-size-control-lg); padding-inline: var(--gn-space-4)`
     - `font-size-md`, medium weight, `fg-default`, transparent background
     - hover `bg-hover`
     - focus-visible ring with inset offset
     - disabled: `fg-disabled`, `not-allowed`
   - Chevron: `fg-muted`, rotated 180° when open (`transition: rotate var(--gn-motion-duration-fast)`).
   - Content: `padding: 0 var(--gn-space-4) var(--gn-space-4)`.
   - Forced colors: the item border becomes `CanvasText` and disabled uses `GrayText`.
6. **Keyboard:**

| Key                 | Behavior                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Enter / Space       | Toggle the focused item (native button). A non-collapsible open item is `aria-disabled`, so nothing happens. |
| Tab                 | Through triggers and any focusable content in open panels.                                                   |
| ArrowDown / ArrowUp | Next / previous enabled trigger, wrapping (the optional APG keys).                                           |
| Home / End          | First / last enabled trigger.                                                                                |

7. **Focus:** stays on the trigger when toggled. Arrows query `.trigger` buttons in the root (DOM order, skipping `:disabled`).
8. **Screen reader:**
   - "heading level 3, Shipping, button, collapsed/expanded".
   - The region is named by its trigger.
   - A non-collapsible open item is announced as "dimmed/unavailable" through `aria-disabled`.
9. **Tokens:**
   - `--gn-color-{border-default,fg-default,fg-muted,bg-hover,fg-disabled,border-focus}`
   - `--gn-size-control-lg`, `--gn-space-{3,4}`, `--gn-font-size-md`, `--gn-font-weight-medium`
   - `--gn-motion-duration-{fast,normal}`, `--gn-motion-easing-standard`, `--gn-size-icon-md`
10. **Tests:**
    - `getByRole('heading', { level: 3 })` contains `getByRole('button', { name: title })`; `headingLevel` changes the level.
    - `aria-expanded` toggles; `aria-controls` ↔ region id; the region is named by the trigger.
    - Single mode: opening B closes A, and `onValueChange('b')`.
    - Collapsible: clicking the open item closes it, giving `''`.
    - Non-collapsible: the open trigger has `aria-disabled="true"` and clicking it keeps it open.
    - Multiple mode: independent toggling, and `onValueChange(['a','b'])`.
    - Controlled vs uncontrolled.
    - `disabled` item: native disabled, skipped by arrows.
    - Arrows, Home and End move focus between triggers.
    - A closed panel has `data-state="closed"`. Visibility and the grid can only be checked in Storybook (jsdom).
    - `ref`/`className`.
    - axe: all closed, one open, multiple open, with a disabled item.

### 3.4 Tooltip (`src/components/Tooltip/`) and the IconButton integration

1. **Purpose:** a short text hint shown on hover and keyboard focus.
2. **Pattern:** APG Tooltip, https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/.
   - `role="tooltip"`, referenced by the trigger's `aria-describedby`.
   - Meets WCAG 1.4.13:
     - **dismissable:** Escape closes it without moving pointer or focus
     - **hoverable:** the pointer can move onto the bubble
     - **persistent:** no timeout
   - It is never interactive: no focusable content. Use a Dialog or Menu for that.
3. **Anatomy:** the ref goes to the tooltip `<div>`; the trigger ref is composed through `cloneTrigger`.

```
{cloneTrigger(children, { 'aria-describedby': tooltipId (unless decorative), onPointerEnter/Leave, onFocus/onBlur, onPointerDown, onKeyDown })}
<div id class="floating tooltip" role="tooltip" (omitted when decorative) aria-hidden="true" (when decorative)
     popover="manual" hidden (when closed) data-placement>{content}</div>
```

The bubble is always mounted, so `aria-describedby` resolves even while it is hidden. Referenced hidden content still forms the description. It is the trigger's next sibling: `display: none` when closed and out of flow (top layer or fixed) when open, so it causes no layout shift. It still counts for `:last-child`-style selectors; the MDX notes this.

```ts
export interface TooltipProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'content' | 'children' | 'role'
> {
  /** Short, plain hint text. No interactive content. */
  content: ReactNode;
  /** One focusable element (Button, IconButton, link). Receives aria-describedby and event handlers; its ref is preserved. */
  children: ReactElement;
  /** Preferred side; flips when there is no room. @default 'top' */
  placement?: Placement;
  /** Hover delay before showing, in ms. Keyboard focus shows immediately. @default 500 */
  delay?: number;
  /** Controlled open state. */
  open?: boolean;
  /** @default false */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Never show the tooltip (renders the child unchanged). Use for disabled triggers, which get no events anyway. @default false */
  disabled?: boolean;
  /**
   * The tooltip repeats the trigger's accessible name (e.g. IconButton label), so hide it from assistive technology:
   * aria-hidden, no role, no aria-describedby. Prevents double announcement. @default false
   */
  decorative?: boolean;
}
```

- **Opening:**
  - On `pointerenter` (ignored for `pointerType === 'touch'`), after `delay`.
  - On `focus`, immediately, but only when the trigger `matches(':focus-visible')`. Mouse-click focus and programmatic focus after a pointer interaction show nothing. Guard `matches` in try/catch for jsdom, falling back to true.
- **Closing:**
  - `pointerleave` from the trigger and the bubble, with a 100ms grace timer. Entering the bubble cancels it (hoverable).
  - `blur`.
  - Escape via `useDismiss({ outsidePointer: false })`.
  - `pointerdown`, or Enter/Space on the trigger (activation hides the hint, e.g. as a Menu opens).
  - After an Escape it stays closed until the pointer leaves and re-enters, or focus leaves and returns.
- **Positioning:** `useFloating({ placement, align: 'center' })`.

**IconButton changes** (owned by Batch B):

```ts
// added to IconButtonProps
/** Shows `label` as a visible tooltip on hover and keyboard focus. The tooltip is decorative (aria-hidden):
 *  the name already comes from aria-label, so it is not announced twice. @default true */
tooltip?: boolean;
/** @default 'top' */
tooltipPlacement?: Placement;
```

- IconButton renders `<Tooltip content={label} decorative placement={tooltipPlacement} disabled={!tooltip || disabled}><Button ref={ref} .../></Tooltip>`.
- **Decision: the name stays on `aria-label` and the tooltip is aria-hidden.** The name then never depends on a mounted node or a timing race. The alternative (`aria-labelledby` pointing at the tooltip) would make every IconButton's name depend on the Tooltip.
- Alert, Dialog and Toast close buttons get the tooltip automatically. No change is needed there; the `.root > .dismiss` selector still matches because the bubble is a sibling, not a wrapper.

5. **States:**
   - Bubble:
     - `background: var(--gn-color-bg-inverse); color: var(--gn-color-fg-inverse)`
     - `font-size-sm`, `line-height-tight`
     - `padding: var(--gn-space-1) var(--gn-space-2); border-radius: var(--gn-radius-md); box-shadow: var(--gn-shadow-md)`
     - `max-inline-size: var(--gn-size-tooltip-max-width)` (**new**)
     - `border: var(--gn-size-border-width) solid transparent` (visible in forced colors)
     - `pointer-events: auto` (hoverable)
     - `z-index: var(--gn-z-tooltip)` as the fallback
   - Motion: the `.floating` fade.
   - Forced colors: border `CanvasText`.
6. **Keyboard:**

| Key                              | Behavior                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tab (focus-visible onto trigger) | Shows the tooltip immediately.                                                                    |
| Escape                           | Hides the tooltip only; focus stays. A second Escape reaches outer layers (e.g. closes a Dialog). |
| Enter / Space                    | Trigger activates (its own behaviour); the tooltip hides.                                         |
| Tab away                         | Hides it.                                                                                         |

7. **Focus:** the tooltip never takes focus.
8. **Screen reader:**
   - Standalone: the trigger is described by the tooltip text (`aria-describedby`), and the name is unchanged.
   - `decorative` (IconButton): nothing extra is announced; the name comes from `aria-label`.
9. **Tokens:**
   - `--gn-color-{bg-inverse,fg-inverse}` (the pair already exists: "Tooltip text")
   - `--gn-size-tooltip-max-width` (**new**)
   - `--gn-font-size-sm`, `--gn-space-{1,2}`, `--gn-radius-md`, `--gn-shadow-md`, `--gn-z-tooltip`, `--gn-motion-duration-fast`
10. **Tests** (fake timers with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`):
    - **Showing and hiding:**
      - Hover shows it after `delay`, not before.
      - Keyboard Tab shows it immediately.
      - Leaving with the pointer hides it after the grace delay.
      - Moving the pointer onto the bubble keeps it open.
    - **Escape (1.4.13):** hides it with focus unchanged; it does not reopen until re-hover or re-focus.
    - **Inside a Dialog:** the first Escape closes the tooltip only, and the dialog stays open.
    - **ARIA:**
      - Standalone: `toHaveAccessibleDescription(content)`, `role="tooltip"`.
      - `decorative`: no `aria-describedby`, `aria-hidden="true"`, no tooltip role.
    - **Other behaviour:**
      - Touch `pointerenter` does not show it.
      - `pointerdown` on the trigger hides it.
      - `disabled` renders the child only.
      - The child ref is preserved (`ref.current` is the button).
      - Controlled `open`.
      - `showPopover` is called on open (spy).
    - **IconButton:**
      - The name is still `label`, with no accessible description from the tooltip.
      - Hover shows the visible text.
      - `tooltip={false}` renders no bubble.
      - Disabled renders no bubble.
      - The ref still points at the button.
      - The existing IconButton tests pass.
    - axe: open tooltip; IconButton with tooltip open.

### 3.5 Toast (`src/components/Toast/`)

1. **Purpose:** brief, non-modal notifications raised imperatively, for example "Saved".
2. **Pattern:**
   - A status live region (WCAG 4.1.3; https://www.w3.org/TR/wai-aria-1.2/#status) that is **always mounted** in the provider, per the Phase 2 "mount first, then change content" decision.
   - The visible toasts are a labelled `<section>` holding an `<ol>`.
   - The visible toasts are **not** live regions. A separate VisuallyHidden polite region announces only the message text, so close and action buttons are never read out as part of an announcement (the same idea as Alert putting its role on the message only).
   - Each toast's visual is an `Alert` (`live="off"`), plus an action.
3. **Anatomy:** the ref goes to the `<section>`.

```
<ToastProvider>{children}
  <section class=region aria-label={label} tabindex=-1>       (ref, className, rest; fixed, bottom-end)
    <ol class=list>
      <li class=toast data-tone> <Alert tone title onDismiss dismissLabel toneLabel>{description}
            {action && <div class=actions><Button variant=secondary size=sm>{action.label}</Button></div>}</Alert>
  <div role=status class=announcer (VisuallyHidden)>          (always mounted)
    <p key=id>{toneLabel}: {title} {description} {action ? actionHint : ''}</p>   (one per visible toast)
```

**While a modal Dialog is open:**

- `showModal()` makes the region inert: it cannot be clicked and is removed from the a11y tree, so it would not be announced.
- The provider implements `OverlayHost.registerModal(outletEl)` with a stack. While the stack is non-empty, it renders the region **and** announcer through `createPortal` into the topmost dialog's `.overlayOutlet`. That outlet is not inert and sits in the top layer above the panel.
- The announcer remounts when the dialog opens, before any toast raised inside it, so the next toast is announced.
- When the stack empties, the region moves back.

```ts
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
  /** @default 'neutral' */
  tone?: AlertTone;
  /** One optional action. Toasts with an action do not auto-dismiss by default (WCAG 2.2.1). */
  action?: ToastAction;
  /** Auto-dismiss delay in ms; Infinity disables. @default provider `duration`; Infinity when `action` is set or tone is 'danger' */
  duration?: number;
  /** Overrides the Alert tone prefix. */
  toneLabel?: string;
}
export interface ToastApi {
  /** Shows a toast and returns its id. */
  show: (options: ToastOptions) => string;
  /** Dismisses one toast. */
  dismiss: (id: string) => void;
}
export interface ToastProviderProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** The app. */
  children: ReactNode;
  /** Default auto-dismiss in ms. Expose this as a user setting to satisfy "adjustable" timing; Infinity disables. @default 6000 */
  duration?: number;
  /** Maximum visible toasts; extra toasts queue and appear as others close. @default 3 */
  max?: number;
  /** Region accessible name. @default 'Notifications' */
  label?: string;
  /** KeyboardEvent.key that moves focus to the newest toast. @default 'F8' */
  hotkey?: string;
  /** Accessible name of each close button. @default 'Dismiss' */
  dismissLabel?: string;
  /** Appended to announcements of toasts with an action. @default `Press ${hotkey} to go to notifications.` */
  actionHint?: string;
}
export function useToast(): ToastApi; // throws outside ToastProvider
```

- **Ids** come from `useId()` plus an id per `show`. The design avoids a global counter: the provider builds ids from its own `useId()` base plus a provider-local `useRef` sequence, which is scoped and SSR-safe, and the decision line records this.
- **Timers** pause while the pointer is over the region, while focus is within it, and while `document.visibilityState === 'hidden'`. They resume with the remaining time. One shared pause covers all toasts, which keeps behaviour predictable.
- **Order:** DOM order is chronological, so the newest is last. The list is a `flex-direction: column` stack anchored at the bottom.

5. **States:**
   - Region:
     - `position: fixed; inset-block-end: var(--gn-space-4); inset-inline-end: var(--gn-space-4)`
     - `inline-size: min(var(--gn-size-toast-width), calc(100vw - 2 * var(--gn-space-4)))` (**new**)
     - `z-index: var(--gn-z-toast)`
     - list `gap: var(--gn-space-2)`, no list style
     - `pointer-events: none` on the region and `auto` on toasts
   - Each toast's Alert gets `box-shadow: var(--gn-shadow-lg)`. The Alert tone styles are reused, so the contrast pairs already exist.
   - Enter: `opacity` and `translate: 0 var(--gn-space-2)` over `duration-normal`/`easing-enter` (vertical, so direction-agnostic). Exit is instant.
   - Reduced motion: the tokens collapse.
   - Region focus-visible ring (after the hotkey).
6. **Keyboard:**

| Key                              | Behavior                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F8 (`hotkey`, anywhere)          | Stores the current focus and moves focus to the newest toast's first button (action, else dismiss), or to the region if it is empty. F6 is rejected: browsers use it to cycle panes. |
| Tab / Shift+Tab                  | Through action and dismiss buttons of all toasts (normal DOM order).                                                                                                                 |
| Enter / Space on action          | `onAction()` then dismiss.                                                                                                                                                           |
| Escape (focus inside the region) | Dismiss the toast containing focus.                                                                                                                                                  |

7. **Focus:**
   - A toast never steals focus on appear.
   - When the toast containing focus is dismissed, focus moves to:
     1. the next toast's first button
     2. else the previous toast's
     3. else the element stored at F8, if still connected
     4. else the region
8. **Screen reader:**
   - Announced politely once, when it becomes visible (queued toasts are announced as they appear).
   - Text: tone prefix, title, description and the action hint.
   - The region is a labelled `section`, so its landmark is named "Notifications".
   - Danger toasts are also polite; `role=alert` stays reserved for the Alert component.
9. **Tokens:**
   - `--gn-size-toast-width` (**new**), `--gn-space-{2,4}`, `--gn-z-toast`, `--gn-shadow-lg`
   - `--gn-motion-duration-normal`, `--gn-motion-easing-enter`, focus-ring sizes
   - The Alert tone tokens
10. **Tests** (fake timers):
    - **Region and announcer:**
      - The announcer `role=status` exists before any toast.
      - `show()` adds the text to it, including the tone prefix and the action hint when there is an action.
      - The visible toast is not inside the status element; the close and action buttons are not inside the status.
      - The region is `getByRole('region', { name: 'Notifications' })`.
    - **Timing:**
      - Auto-dismiss after `duration`.
      - Paused while hovered and while focus is inside; resumes with the remaining time.
      - `action` and `tone: 'danger'` default to persistent; per-toast `duration` overrides.
      - Provider `duration={Infinity}`.
    - **Actions and dismissal:**
      - Action click calls `onAction` and dismisses.
      - Dismiss button with `dismissLabel`.
      - `dismiss(id)`.
    - **Stacking:** `max` caps visible toasts; the queued one appears after one closes.
    - **Hotkey:** F8 focuses the newest toast's button; Escape dismisses it; focus moves on dismissal (all branches).
    - `useToast` outside the provider throws.
    - With a mounted Dialog registering an outlet (real Dialog): the region renders inside the `<dialog>`, and moves back after it closes.
    - axe: empty provider; three tones visible; toast with action.

### 3.6 Menu (`src/components/Menu/`)

1. **Purpose:** a button that opens a list of actions.
2. **Pattern:** APG Menu Button, https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/, with Menu, https://www.w3.org/WAI/ARIA/apg/patterns/menubar/.
   - Scope: `menuitem`, groups and separators.
   - **`menuitemcheckbox`/`menuitemradio` are out of scope.** They add a second state API and can be added later without breaking changes.
3. **Anatomy:** the ref goes to the menu `<div>`.

```
{cloneTrigger(trigger, { id: triggerId, 'aria-haspopup': 'menu', 'aria-expanded', 'aria-controls': open ? menuId : undefined, onClick, onKeyDown })}
<div id=menuId role=menu aria-labelledby=triggerId class="floating surface" popover=manual data-placement>  (mounted only while open)
  <button type=button role=menuitem tabindex=-1 class=item aria-disabled? data-active? data-text-value>  (MenuItem ref)
  <div role=separator class=separator />
  <div role=group aria-labelledby=gid><div role=presentation id=gid class=groupLabel>{label}</div>...items</div>
```

```ts
export interface MenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role'> {
  /** The menu button, e.g. <Button endIcon={<ChevronDownIcon/>}>Actions</Button> or an IconButton. */
  trigger: ReactElement;
  /** MenuItem, MenuGroup and MenuSeparator elements. */
  children: ReactNode;
  open?: boolean;
  /** @default false */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** @default 'bottom' */
  placement?: Placement;
  /** @default 'start' */
  align?: Align;
}
export interface MenuItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'disabled' | 'onSelect'
> {
  /** Item content and accessible name. */
  children: ReactNode;
  /** Called when activated, after the menu closes and focus returns to the trigger (so it can open a Dialog). */
  onSelect?: () => void;
  /** Focusable but not activatable (aria-disabled), per APG. @default false */
  disabled?: boolean;
  /** Text used for typeahead when children are not plain text. Default: textContent. */
  textValue?: string;
}
export interface MenuGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Visible group heading; names the group. */
  label: ReactNode;
  children: ReactNode;
}
export type MenuSeparatorProps = Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'>;
```

- **State:** `useControllableState` for `open`.
- **Floating:** `useFloating({ placement, align })` and `useDismiss({ refs: [trigger, menu] })`.
  - Escape closes and restores focus to the trigger.
  - Outside pointer closes without restoring focus (focus goes where the user clicked).
- **Closing on focus loss:** `onBlur` of the menu, when `relatedTarget` is outside the trigger and the menu, closes without restoring (covers Tab).
- **Navigation:**
  - The menu's `onKeyDown` queries `[role=menuitem]` in DOM order.
  - Disabled items are included (focusable).
  - Up and Down wrap.
  - Typeahead over `data-text-value`.
- **Hover:** `pointermove` on an item focuses it, so the keyboard continues from there.
- **Activation:** click (or Enter/Space natively) on a non-disabled item closes the menu, restores focus, then calls `onSelect`. On an `aria-disabled` item it is a no-op.
- Items, groups or separators outside a Menu throw.

5. **States:**
   - `.surface` and `.item` from Floating.
   - `data-active` mirrors `:focus` (the item that has focus). Use `:focus-visible` plus `[data-active]` for the ring; hover also gets the ring, so there is one consistent active style.
   - Disabled uses `fg-disabled`.
   - `z-index: var(--gn-z-dropdown)` as the fallback.
6. **Keyboard:**

| Key                                  | Behavior                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------- |
| Enter / Space / ArrowDown on trigger | Open; focus the first item.                                                 |
| ArrowUp on trigger                   | Open; focus the last item.                                                  |
| ArrowDown / ArrowUp                  | Next / previous item (disabled included), wrapping.                         |
| Home / End                           | First / last item.                                                          |
| Printable chars                      | Typeahead to the matching item.                                             |
| Enter / Space on item                | Activate (no-op when disabled); close; focus the trigger.                   |
| Escape                               | Close; focus the trigger.                                                   |
| Tab / Shift+Tab                      | Close; focus moves naturally (next after the menu, or back to the trigger). |

7. **Focus:**
   - Moves into the menu on open (the first item on pointer open too; it is not `:focus-visible` after a mouse click).
   - Returns to the trigger on Escape and on activation.
   - Not returned on outside click or Tab.
8. **Screen reader:**
   - Trigger: "Actions, menu button, collapsed/expanded".
   - Menu named by the trigger. Items: "menu item, n of m"; disabled ones are announced as unavailable.
   - Groups are named by their label. Separators are not focusable.
9. **Tokens:**
   - Floating `.surface`/`.item` tokens
   - `--gn-size-menu-min-width` (**new**), `--gn-z-dropdown`
10. **Tests:**
    - **Trigger and opening:**
      - The trigger has `aria-haspopup="menu"` and `aria-expanded` false/true; `aria-controls` points at the menu only while open.
      - Click opens and focuses the first item; ArrowDown opens to the first; ArrowUp opens to the last.
      - `showPopover` is called.
    - **Navigation:**
      - Arrows wrap; Home/End.
      - Typeahead: "d" goes to "Duplicate"; repeated "d" cycles; resets after 500ms.
      - A disabled item is focused by arrows, has `aria-disabled`, and clicking or Enter does not call `onSelect` or close.
    - **Activation and closing:**
      - Enter and click call `onSelect` after the trigger is refocused (assert `document.activeElement` inside `onSelect`).
      - Escape closes and focuses the trigger.
      - Tab closes.
      - Outside click closes without refocusing the trigger.
    - **Structure:**
      - The group has `role=group` named by its label; the separator has `role=separator` and is not focusable.
      - An IconButton trigger works (name kept, tooltip hidden on open).
    - Controlled `open`.
    - Inside a Dialog, Escape closes the menu only.
    - axe: closed; open with group, separator and a disabled item.

### 3.7 Select, custom (`src/components/Select/`)

1. **Purpose:** pick one option from a styled popup list. It uses the same Field API as NativeSelect.
2. **Pattern:** APG select-only combobox, https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/.
   - `role=combobox` on a `<button>`. ARIA in HTML allows `combobox` on `button`, and the native button gives `disabled`, focusability and form-safe `type=button`.
   - The popup is a `listbox`, navigated with `aria-activedescendant`; DOM focus stays on the combobox.
3. **Anatomy:** the ref goes to the combobox `<button>`. `className`/`style` go to the Field root; `id` and rest go to the button.

```
Field.root
  FieldLabel {...labelProps} onClick={preventDefault + focus combobox}   (label click focuses, does not open, like native)
  FieldDescription?
  div.box (control.module.css) data-size
    button.input#controlId type=button role=combobox aria-labelledby=labelId aria-controls=listboxId
           aria-expanded aria-activedescendant={open ? activeOptionId : undefined}
           aria-describedby aria-invalid? aria-required? disabled?
      span.value | span.placeholder
    ChevronDownIcon.chevron (aria-hidden)
  div#listboxId role=listbox aria-labelledby=labelId class="floating surface" popover=manual  (only while open)
    div#optId role=option aria-selected aria-disabled? data-active? class=item  <CheckIcon aria-hidden/> {label}
    div role=group aria-labelledby=gid > div role=presentation#gid.groupLabel {label}, options...
  input type=hidden name form value     (only when `name` is set)
  FieldError?
```

```ts
export interface SelectOption {
  /** Submitted value. Must not be ''. */
  value: string;
  /** Visible text; also used for typeahead. */
  label: string;
  /** Skipped by keyboard and not selectable. @default false */
  disabled?: boolean;
}
export interface SelectOptionGroup {
  /** Group heading; names the group. */
  label: string;
  options: readonly SelectOption[];
}
export interface SelectProps
  extends
    FieldBaseProps,
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'type' | 'role' | 'value' | 'defaultValue' | 'children' | 'disabled' | 'name' | 'form'
    > {
  /** Options and option groups, in display order. */
  options: readonly (SelectOption | SelectOptionGroup)[];
  /** Controlled value ('' = nothing selected). */
  value?: string;
  /** Initial value when uncontrolled. @default '' */
  defaultValue?: string;
  /** Called with the newly selected value. */
  onValueChange?: (value: string) => void;
  /** Text shown while nothing is selected. */
  placeholder?: string;
  /** Same metrics as NativeSelect. @default 'md' */
  size?: Size;
  /** Form field name; renders a hidden input carrying the value. */
  name?: string;
  /** Associates the hidden input with a form by id. */
  form?: string;
}
```

- **Data:** `options` is flattened once (`useMemo`) to `{ option, index, groupIndex }`. Option ids are `${base}-option-${index}`.
- **State:**
  - `value` via `useControllableState`.
  - `open` and `activeIndex` are internal. The value is the API; open state is not exposed (unlike Menu and Dialog).
- **Field wiring:** `useField` provides `id`, `aria-describedby`, `aria-invalid` and `disabled`. **`required` maps to `aria-required="true"`**, not native `required`, which is not valid on a button. The asterisk works as in Phase 2.
- **Forms:**
  - Hidden input `type=hidden`; native constraint validation is not available. The MDX points to NativeSelect for native `required` validation.
  - Uncontrolled reset: listen for the owner form's `reset` event (`hiddenInput.form` or `closest('form')`) and reset to `defaultValue`.
- **Popup behaviour:**
  - The listbox uses `useFloating({ placement: 'bottom', align: 'start', matchAnchorWidth: true })` and `useDismiss`.
  - Escape closes without changing the value.
  - Outside click closes.
  - A combobox `blur` to outside closes.
  - The active option is scrolled into view with `scrollIntoView({ block: 'nearest' })`.
  - Option `pointerdown` calls `preventDefault()` to keep focus on the combobox.
  - Hover sets the active option.
  - Click selects and closes.

5. **States:**
   - Same as NativeSelect: sizes, invalid, disabled and placeholder colour (`fg-subtle`) through `control.module.css` and a copied chevron rule set.
   - The `.box:has(> .input:focus)` ring applies, because the button is `.input`.
   - The button resets to look like the box content: `text-align: start`, ellipsis.
   - The chevron rotates when `aria-expanded=true` (`duration-fast`).
   - Listbox: Floating `.surface` and `.item`; the selected option shows the check icon (`accent-subtle` background); `z-index: var(--gn-z-dropdown)` as the fallback.
6. **Keyboard** (per APG):

| Key (closed)                              | Behavior                                                              |
| ----------------------------------------- | --------------------------------------------------------------------- |
| ArrowDown / Alt+ArrowDown / Enter / Space | Open; the active option is the selected one (else the first enabled). |
| ArrowUp                                   | Open; the active option is the first enabled (APG).                   |
| Home / End                                | Open; active is the first / last enabled.                             |
| Printable chars                           | Open; active is the typeahead match.                                  |

| Key (open)          | Behavior                                                                    |
| ------------------- | --------------------------------------------------------------------------- |
| ArrowDown / ArrowUp | Next / previous enabled option (no wrap, per APG).                          |
| Home / End          | First / last enabled.                                                       |
| PageDown / PageUp   | Move 10 enabled options (clamped).                                          |
| Printable chars     | Typeahead.                                                                  |
| Enter / Space       | Select the active option and close.                                         |
| Alt+ArrowUp         | Select the active option and close.                                         |
| Tab                 | Select the active option, close, and let focus move on (no preventDefault). |
| Escape              | Close without changing the value.                                           |

7. **Focus:** DOM focus always stays on the combobox. Visual focus is `aria-activedescendant` plus `data-active`. Disabled options are skipped, as in native `<select>`.
8. **Screen reader:**
   - "Fruit, combobox, collapsed, Apple"; the value comes from the button content, and the placeholder when empty.
   - Description, error, invalid and required are wired as in Phase 2.
   - When open, the active option is announced through `aria-activedescendant` as "Banana, n of m, selected/not selected".
   - Groups are named.
9. **Tokens:**
   - `control.module.css` tokens, Floating tokens
   - `--gn-size-listbox-max-height` (**new**), `--gn-size-icon-*`, `--gn-z-dropdown`
   - `--gn-color-{accent-subtle,accent-subtle-fg,fg-subtle,fg-muted}`, `--gn-motion-duration-fast`
10. **Tests:**
    - **Roles and naming:**
      - `getByRole('combobox', { name: label })`; `aria-expanded` false/true; `aria-controls` ↔ listbox id.
      - The listbox is named by the label.
    - **Opening and closing:**
      - Click opens; `aria-activedescendant` is the selected option's id; selecting an option calls `onValueChange('b')`, closes, and the combobox text shows the label.
      - Each closed-state key row: Down, Alt+Down, Up (first), Home, End, Enter, Space, typing.
      - Each open-state key row, including PageDown by 10 and Alt+Up.
      - Tab selects the active option, closes, and focus moves to the next field.
      - Escape keeps the value.
    - **Disabled options:** skipped by keys; clicking does nothing.
    - **Groups:** `role=group` named.
    - **Field wiring:**
      - Placeholder shown when the value is `''`.
      - `required` gives `aria-required` and the asterisk.
      - `invalid` with `errorMessage` gives `aria-invalid` and a description (description then error).
      - `disabled` gives native disabled and no open.
    - **Forms:**
      - Hidden input `name`/`value` appear in FormData.
      - `form.reset()` restores `defaultValue` (uncontrolled).
    - Controlled vs uncontrolled.
    - Label click focuses without opening.
    - Option pointerdown does not blur the combobox.
    - `className` goes to the root and `ref` to the button.
    - axe: closed, open, invalid, disabled, with groups.

### 3.8 DataTable (`src/components/DataTable/`)

1. **Purpose:** a typed, sortable, paginated table of rows.
2. **Pattern:**
   - Native `<table>` with `<caption>`, `<th scope>` and APG Sortable Table, https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/: a `<button>` inside each sortable `<th>`, and `aria-sort` only on the sorted column.
   - Not `role=grid`: cells are not interactive, so grid navigation would only add keystrokes.
3. **Anatomy:** `className`/`style` go to the root; ref and rest go to `<table>`.

```
<div class=root>
  <div class=scroll role=region? aria-labelledby=captionId? tabindex=0?>   (role/label/tabindex only while overflowing inline)
    <table aria-busy={loading || undefined}>                                  (ref, rest)
      <caption id=captionId class=caption [VisuallyHidden when captionHidden]>{caption}</caption>
      <thead><tr><th scope=col aria-sort? data-align>
            sortable: <button type=button class=sortButton>{header}<Arrow*Icon aria-hidden/></button> ; else {header}
      <tbody>
        rows: <tr key=getRowId(row)> <th scope=row> for rowHeader column, else <td data-align>
        empty: <tr><td colSpan=n class=empty>{emptyState}</td></tr>
        loading with no rows: <tr><td colSpan=n><Spinner decorative/> {messages.loading}</td></tr>
  <div class=pagination role=group aria-label={messages.pagination}>   (when paginated)
    <NativeSelect size=sm label={messages.rowsPerPage} className=pageSize value=pageSize>{pageSizeOptions}</NativeSelect>
    <p class=range>{messages.range(start, end, total)}</p>
    <Button variant=secondary size=sm startIcon=<ChevronLeftIcon/> aria-disabled={atStart || undefined}>{messages.previous}</Button>
    <Button variant=secondary size=sm endIcon=<ChevronRightIcon/> aria-disabled={atEnd || undefined}>{messages.next}</Button>
  <div role=status class=announcer (VisuallyHidden)>{announcement}</div>   (always mounted)
```

```ts
export type CellValue = string | number | bigint | boolean | Date | null | undefined;
type KeysWithCellValue<Row> = {
  [K in keyof Row]-?: Row[K] extends CellValue ? K : never;
}[keyof Row];

export interface DataTableColumn<Row> {
  /** Stable column id, used in SortState. */
  id: string;
  /** Header text (also used in the sort announcement). */
  header: string;
  /** Row key or function giving the cell's raw value (display default and sort input). */
  accessor?: KeysWithCellValue<Row> | ((row: Row) => CellValue);
  /** Custom cell content. Default: String(value), with Date via toLocaleDateString() and null as ''. */
  cell?: (row: Row) => ReactNode;
  /** Header becomes a sort button. Needs `accessor` or `compare`. @default false */
  sortable?: boolean;
  /** Ascending comparator. Default: nulls last, numbers/bigint/dates numeric, booleans false<true, strings Intl.Collator({ numeric: true, sensitivity: 'base' }). */
  compare?: (a: Row, b: Row) => number;
  /** Text alignment; use 'end' for numbers. @default 'start' */
  align?: 'start' | 'end';
  /** Render this column's cells as <th scope="row"> (names each row for screen readers). @default false */
  rowHeader?: boolean;
}

export interface DataTableMessages {
  /** @default (s, e, t) => t === 0 ? '0 results' : `Showing ${s}–${e} of ${t}` */
  range: (start: number, end: number, total: number) => string;
  /** @default (header, dir) => `Sorted by ${header}, ${dir}` */
  sorted: (header: string, direction: SortDirection) => string;
  /** @default 'Rows per page' */ rowsPerPage: string;
  /** @default 'Previous' */ previous: string;
  /** @default 'Next' */ next: string;
  /** @default 'Pagination' */ pagination: string;
  /** @default 'Loading' */ loading: string;
}

export interface DataTableProps<Row> extends Omit<
  TableHTMLAttributes<HTMLTableElement>,
  'children'
> {
  /** Rows to show (all rows, or the current page when `manual`). */
  rows: readonly Row[];
  /** Column definitions, in display order. */
  columns: readonly DataTableColumn<Row>[];
  /** Stable unique id per row (React key). */
  getRowId: (row: Row) => string;
  /** Required table name, rendered as <caption>; also labels the scroll region. */
  caption: ReactNode;
  /** Keep the caption for assistive technology only. @default false */
  captionHidden?: boolean;
  /** Controlled sort; null = unsorted. */
  sort?: SortState | null;
  /** @default null */
  defaultSort?: SortState | null;
  /** Called with the new sort; clicking cycles ascending ↔ descending, a new column starts ascending. */
  onSortChange?: (sort: SortState | null) => void;
  /** Show pagination controls. @default true */
  paginated?: boolean;
  /** Controlled 1-based page. Out-of-range values are clamped for display. */
  page?: number;
  /** @default 1 */
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  /** @default 10 */
  defaultPageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  /** @default [10, 25, 50] */
  pageSizeOptions?: readonly number[];
  /** Rows are already sorted and paginated by the server; DataTable only renders and reports changes. Requires `totalRows`. @default false */
  manual?: boolean;
  /** Total row count when `manual`. */
  totalRows?: number;
  /** Sets aria-busy, shows a spinner and announces `messages.loading`. @default false */
  loading?: boolean;
  /** Shown in a full-width cell when there are no rows. @default 'No results' */
  emptyState?: ReactNode;
  /** Override built-in strings. */
  messages?: Partial<DataTableMessages>;
}

/** Generic forwardRef: inner function + cast, displayName on the inner. */
export const DataTable: <Row>(
  props: DataTableProps<Row> & { ref?: Ref<HTMLTableElement> },
) => ReactElement;
```

**Implementation:**

- **State:** `sort`, `page` and `pageSize` go through `useControllableState`.
- **Client mode:** sort a copy, stable, with the comparator negated for descending; nulls are always last. Then slice the page.
- **Page reset:** a sort change or page-size change calls `setPage(1)`.
- **Prev/Next** use `aria-disabled` (Stage 0 Button style) so focus stays at the bounds. The handler no-ops at the bounds.
- **Announcements** go to the always-mounted status region:
  - sort click → `messages.sorted(header, dir)`
  - page or page-size change → `messages.range(...)`
  - `loading` false→true → `messages.loading`; true→false → `messages.range(...)`
- **Warnings** (console, once):
  - `manual` without `totalRows`
  - a `sortable` column without `accessor` or `compare`
- **Scroll container:** `useIsOverflowing(scroll, 'inline')`. Only while overflowing it gets `role=region`, `aria-labelledby=captionId` and `tabIndex=0`. This meets WCAG 1.4.10 and 2.1.1 without adding a landmark and tab stop to every table.
- **Out of scope:** row selection, column resizing and sticky headers. They can be added later; `getRowId` already exists for selection.

5. **States:**
   - Table: `inline-size: 100%; border-collapse: collapse; font-size-sm`.
   - Cells: `padding: var(--gn-space-2) var(--gn-space-3)` and `border-block-end: var(--gn-size-border-width) solid var(--gn-color-border-default)`.
   - `th`: `background: var(--gn-color-bg-subtle); color: var(--gn-color-fg-default)`, semibold, `text-align: start`.
   - `[data-align='end']`: `text-align: end`, tabular-nums.
   - Sort button:
     - inherits font; transparent; `inline-size: 100%`; `display: inline-flex; gap: var(--gn-space-1)`
     - `justify-content` follows the alignment
     - hover `color: var(--gn-color-fg-default)` with an underline
     - focus-visible ring with inset offset
     - icon `fg-muted` when unsorted, `fg-default` when sorted
   - Caption: `text-align: start; padding-block-end: var(--gn-space-2)`, semibold.
   - Loading with rows: `tbody` gets `color: var(--gn-color-fg-muted)` and a decorative `Spinner` sits next to the range text.
   - Empty and loading cells: centred, `fg-muted`, `padding: var(--gn-space-8)`.
   - Pagination:
     - flex, wrap, `gap: var(--gn-space-3)`, `align-items: center`, `justify-content: flex-end`, `padding-block-start: var(--gn-space-3)`
     - `.pagination .pageSize` is `flex-direction: row; align-items: center`
   - RTL: `:dir(rtl)` mirrors the chevrons.
   - Forced colors: cell borders become `CanvasText`.
6. **Keyboard:**

| Key                                 | Behavior                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Tab                                 | Sort buttons (in header order), the scroll region (only when overflowing), page size, Previous, Next. |
| Enter / Space on sort button        | Toggle sort for the column; focus stays.                                                              |
| Arrow keys in focused scroll region | Scroll horizontally (native).                                                                         |
| Enter / Space on Previous/Next      | Change page; no-op at the bounds (still focusable).                                                   |

7. **Focus:** never moves on sort or page change. A button pressed at a bound keeps focus (`aria-disabled`).
8. **Screen reader:**
   - The table is named by its caption, and cells are associated with `th scope=col/row`.
   - The sorted column is announced as "sorted ascending/descending" on its header (`aria-sort`); unsorted columns carry no `aria-sort`.
   - Sort and page changes are announced politely through the status region.
   - `aria-busy` while loading.
   - The visible range text is not live, so it does not double-announce.
9. **Tokens:**
   - `--gn-color-{bg-subtle,fg-default,fg-muted,border-default,border-focus}`
   - `--gn-space-{1,2,3,8}`, `--gn-font-size-sm`, `--gn-font-weight-semibold`
   - `--gn-size-icon-sm`, focus-ring sizes
10. **Tests** (with a typed `Row` fixture, e.g. `{ id: string; name: string; age: number; joined: Date | null }`):
    - **Structure:**
      - `getByRole('table', { name: caption })`; `captionHidden` still names it.
      - Column headers; a `rowHeader` column renders `rowheader` cells.
    - **Sorting:**
      - Sortable header renders a button with the header name.
      - Click gives `aria-sort="ascending"` on that `th` only, rows in order, and the status text "Sorted by Name, ascending".
      - Second click gives descending; another column starts ascending.
      - Numbers sort numerically ("10" after "9"); dates; nulls last in both directions.
      - A custom `compare` is used.
    - **Pagination:**
      - The default page size 10 shows 10 rows and "Showing 1–10 of 42".
      - Next gives rows 11–20 and the status announces the range.
      - On the last page, Next has `aria-disabled="true"`, keeps focus, and pressing it does nothing.
      - Page size 25 resets to page 1.
      - A sort change resets to page 1.
      - Controlled `page` and `sort` call callbacks and do not change without the parent.
      - Out-of-range `page` is clamped.
      - `paginated={false}` shows all rows and no controls.
    - **Manual mode:** rows rendered as given, no client sort or slice, `totalRows` used in the range, callbacks fire.
    - **Empty and loading:**
      - Empty: `emptyState` in a cell with `colSpan` = column count.
      - Loading: `aria-busy="true"`; the status announces "Loading", then the range when done.
    - **Other:**
      - `cell` render is used.
      - Type-level checks: `// @ts-expect-error` for an `accessor` key whose value is an object, and for a missing `getRowId`.
      - `className` goes to the root and `ref` to the table.
    - axe: default, sorted, empty, loading.

---

## 4. Missing tokens and pairs (Stage 0 adds them, then runs `npm run tokens`)

**`scales.size`, append:**

```ts
'dialog-sm': '24rem',          // --gn-size-dialog-sm
'dialog-md': '32rem',          // --gn-size-dialog-md
'dialog-lg': '48rem',          // --gn-size-dialog-lg
'tooltip-max-width': '20rem',  // --gn-size-tooltip-max-width
'menu-min-width': '10rem',     // --gn-size-menu-min-width (menu and listbox surfaces)
'listbox-max-height': '18rem', // --gn-size-listbox-max-height
'toast-width': '22rem',        // --gn-size-toast-width
'tab-indicator': '0.125rem',   // --gn-size-tab-indicator (selected tab bar)
```

**Existing tokens reused, with no change:**

- `--gn-z-{dropdown,overlay,modal,toast,tooltip}`. These are only fallbacks; the top layer handles stacking where supported.
- `--gn-shadow-{md,lg,xl}`.
- `--gn-color-overlay` (the dialog backdrop).
- `--gn-motion-duration-{fast,normal}` and `--gn-motion-easing-{standard,enter}`.

**No new colour roles.** Toast reuses the Alert tone roles. Menu and listbox use `bg-raised`, `bg-hover` and `accent-subtle`. Tooltip uses `bg-inverse`/`fg-inverse`. Toast and tooltip delays are behaviour, set in JS (ms props), not tokens.

**`src/tokens/pairs.ts`, add:**

```ts
{ fg: 'border-focus', bg: 'bg-hover', min: 3, usage: 'Active menu item / listbox option ring' },
{ fg: 'border-focus', bg: 'bg-subtle', min: 3, usage: 'Focus ring on table header sort button' },
{ fg: 'fg-muted', bg: 'bg-hover', min: 4.5, usage: 'Unselected tab text on hover (before color change settles)' },
{ fg: 'accent-subtle-fg', bg: 'bg-raised', min: 4.5, usage: 'n/a guard: selected option text if background is not painted (forced off)' }, // optional; drop if redundant
...(['success', 'warning', 'danger', 'info'] as const).map((tone): ContrastPair =>
  ({ fg: `${tone}-border`, bg: 'bg-raised', min: 3, usage: `${tone} border/icon on raised surface` })),
```

Pre-computed by hand: `border-focus` on `bg-hover` is about 3.7:1 in light and about 8.3:1 in dark. The dark-theme tone borders on `neutral.800` range from about 4.5 to 5.7:1. If any pair fails, do not change `border-focus`; report it to the integrator.

---

## 5. Build order

**Stage 0: shared pieces.** One builder, merged before anything else starts.

1. Tokens and pairs (§4), then `npm run tokens`, then the contrast test passes.
2. `src/utils/types.ts` additions; `mergeProps.ts`, `toIdPart.ts`, `listNavigation.ts`, `focusable.ts`, `layerStack.ts`, `direction.ts`, `position.ts`, `overlayHost.ts`, each with tests.
3. Hooks `useFloating`, `useDismiss`, `useFocusReturn`, `useTypeahead`, `useIsOverflowing`, with tests.
4. `src/test/setup.ts` shims.
5. Icons (§2.6) and `src/components/Floating/floating.module.css`.
6. Rename Select → `NativeSelect` (folder, component, types, stories, MDX, tests).
7. `Button.module.css` `aria-disabled` styling, with one test that the existing Button tests still pass.

The integrator then updates `src/index.ts`: export `NativeSelect` and the new types, remove `Select`. `npm run ci` must be green.

**Batches A–E run in parallel.** Each batch owns only the files listed.

| Batch                | Owns (in order)                                         | Why grouped                                                                                                                        |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **A: overlays**      | `Dialog/` (Dialog, DialogClose, AlertDialog) → `Toast/` | Both use the `OverlayHostContext` contract; one builder tests Dialog + Toast together. Toast reuses Alert unchanged.               |
| **B: floating**      | `Tooltip/` → `IconButton/` (tooltip props) → `Menu/`    | Tooltip and Menu share `useFloating` and `useDismiss`; IconButton gets its tooltip and is tested as a Menu trigger.                |
| **C: custom select** | `Select/`                                               | Largest keyboard surface; uses Field, control.module.css and Floating, all frozen.                                                 |
| **D: disclosure**    | `Tabs/` → `Accordion/`                                  | Both use `listNavigation` with DOM-queried items and `toIdPart` ids; one builder keeps the indicators and focus styles consistent. |
| **E: data**          | `DataTable/`                                            | Uses NativeSelect, Button, Spinner and VisuallyHidden, all frozen.                                                                 |

- **No file conflicts.** No batch edits `src/index.ts`, `DECISIONS.md`, tokens, pairs, `setup.ts` or any Stage 0 file. Batch B is the only one that touches `IconButton/`.
- **Cross-batch effect.** After B lands, every IconButton (Alert, Dialog, Toast) shows a decorative tooltip. Tooltips are aria-hidden and have no role, so role- and name-based queries in A's tests are unaffected. The integrator reruns the full suite after each merge.
- **When a batch finds a missing token, pair or util,** it reports it to the integrator instead of editing a frozen file.
- **After each batch,** the integrator adds exports:
  - `Dialog`, `DialogClose`, `AlertDialog`
  - `ToastProvider`, `useToast`
  - `Tooltip`
  - `Menu`, `MenuItem`, `MenuGroup`, `MenuSeparator`
  - `Select`
  - `Tabs`, `TabList`, `Tab`, `TabPanel`
  - `Accordion`, `AccordionItem`
  - `DataTable`
  - and every `*Props` and option type

  It also appends decision lines and runs `npm run ci` and `npm run test:a11y`.

- **Before Checkpoint 3,** do a manual browser pass (Chrome, Safari, Firefox; NVDA and VoiceOver spot checks) of:
  - inert background
  - Escape layering inside a Dialog
  - scroll lock
  - positioning flip and RTL
  - toasts inside an open Dialog
  - the Accordion animation under reduced motion

  Record the results in each MDX "Verified manually" note.

---

## 6. Decisions (copy into `DECISIONS.md` under "Phase 3")

- **No Portal: overlays render in place and reach the top layer through `<dialog>.showModal()` and `popover="manual"`.** Theme inheritance from `[data-theme]` is kept, there are no z-index wars, and content inside a modal stays non-inert.
- **Positioning is a small pure JS `computePosition` (flip, shift, RTL), not CSS anchor positioning.** Anchor positioning is not yet Baseline widely available, so a JS fallback would be needed anyway. One path is testable; revisit later.
- **The floating offset and edge padding come from a CSS margin token (`--gn-space-1`), which the positioner measures.** No px constants in JS.
- **`popover="manual"`, not `auto`.** Auto light-dismiss fights the trigger toggle and bypasses our focus return. One `useDismiss` model serves Tooltip, Menu and Select.
- **Escape uses a capture listener with a layer stack for floating layers; Dialog ignores `defaultPrevented` Escape and guards `cancel`.** The innermost layer always closes first.
- **Non-native state callbacks receive only the value (`onOpenChange(open)`, `onValueChange(value)`).** There is no native event to pass, and it matches `useControllableState`.
- **Consumer handlers on cloned triggers run first; ours are skipped after `preventDefault()`.** Consumers can always veto library behaviour.
- **Dialog uses native `<dialog>` + `showModal()` instead of `role="dialog"` with a JS trap.** Inert background, top layer, backdrop and Escape come from the platform. Tab may leave to the browser chrome, which is accepted platform behaviour.
- **Dialog has a prop-based API (`title`, `description`, `footer`, `trigger`) plus `DialogClose`, not a six-part compound.** The name and description are wired correctly by construction, with the smallest API.
- **AlertDialog is a separate component with a required `description`, initial focus on Cancel, no close button and no backdrop close.** Destructive confirmations cannot be dismissed by accident, per APG.
- **Dialog scroll lock is pure CSS (`html:has(dialog[open])`, with `overflow: hidden` and `scrollbar-gutter: stable`).** No JS ref counting, no layout shift, and nesting works.
- **Dialog has an enter animation only; closing is instant.** Discrete exit transitions (`overlay`, `allow-discrete`) are not cross-browser.
- **Dialog initial focus prefers body content over the header close button.** Users start in the content, and the close button's tooltip does not flash on open.
- **Dialog content unmounts while closed; the `<dialog>` element stays mounted and never renders `open` from React.** State resets, there are no dangling ids, and it is SSR-safe.
- **Toasts move into the topmost open modal through `OverlayHostContext`.** Otherwise `showModal()` makes them inert, so they could not be clicked and were not announced.
- **Toast announcements use a separate always-mounted polite region with message text only.** Buttons are not read out, and the Phase 2 "mount first" rule holds.
- **All toasts are polite, including danger.** `role=alert` stays reserved for the Alert component's opt-in `assertive`.
- **Toasts with an action and danger toasts do not auto-dismiss by default; timers pause on hover, on focus and when the tab is hidden, and the provider `duration` can be a user setting.** This meets WCAG 2.2.1.
- **The toast hotkey is F8, not F6.** Browsers use F6 to cycle panes.
- **At most 3 toasts are visible and extras queue rather than drop.** Persistent action toasts are never lost.
- **Toast ids combine the provider's `useId()` with a provider-local ref sequence.** They are scoped and SSR-safe, with no module-level counter.
- **Tooltip is always mounted (hidden when closed) and opens on hover after a delay or on `:focus-visible` immediately; touch is ignored.** `aria-describedby` always resolves, and mouse clicks do not flash tooltips.
- **IconButton shows its `label` as a decorative (aria-hidden) tooltip by default; the name stays on `aria-label`.** No double announcement, and the name never depends on the tooltip node.
- **Tooltip `decorative` reuses Spinner's vocabulary.** "Hidden from AT; the parent supplies semantics" means the same thing everywhere.
- **Menu scope is `menuitem`, group and separator; checkbox and radio items are deferred.** This avoids a second state API in Phase 3 and can be added without breaking changes.
- **Disabled menu items stay focusable (`aria-disabled`), while disabled tabs and Select options are skipped.** The first follows APG's menu guidance; the second matches native tabs and `<select>`.
- **MenuItem `onSelect` runs after the menu closes and focus returns to the trigger.** A Dialog opened from a menu then returns focus to the menu button.
- **Phase 2 `Select` is renamed `NativeSelect` with an identical API; the new `Select` is a custom select-only combobox.** The owner asked for a custom Select. The native one stays for mobile pickers and native validation.
- **The custom Select takes an `options` array (with groups), not `<SelectOption>` children.** Typeahead, indexing and activedescendant ids work without registration effects, and it is SSR-safe.
- **The custom Select combobox is a `<button role="combobox">`.** It gets native disabled, focus and `type=button`, and ARIA in HTML allows the role.
- **The custom Select maps `required` to `aria-required` and submits through a hidden input; it resets on form `reset`.** Native `required` is invalid on a button. NativeSelect is documented for native validation.
- **A custom Select label click focuses the combobox without opening it.** This matches native `<select>`.
- **`''` is the "nothing selected" value for Select and single Accordion.** It matches NativeSelect's placeholder value and keeps `useControllableState` controlled detection simple.
- **Tabs and Accordion query their items from the DOM on keydown instead of registering them.** Order always matches the DOM, with no effects or index bookkeeping.
- **All tab panels stay mounted (inactive ones `hidden`).** Panel state is kept, and `aria-controls` always resolves.
- **The selected-tab indicator is a `::after` background painted `Highlight` in forced colors, not a border.** Transparent borders become visible in forced colors and would erase the difference.
- **Accordion is the APG button-in-heading pattern, not `<details>`.** Heading semantics are lost inside `<summary>`, non-collapsible mode cannot be enforced, and height animation there is Chromium-only.
- **Accordion animates with `grid-template-rows` 0fr↔1fr and `visibility`.** No JS measuring, cross-browser, closed content leaves the a11y tree, and reduced motion collapses it through tokens. Find-in-page reveal is traded away.
- **RTL is read from the nearest `[dir]` ancestor.** It is deterministic in jsdom; CSS-only `direction` is documented as unsupported.
- **DataTable is a native `<table>` with sort buttons in headers, not `role=grid`.** Cells are not interactive, so grid navigation would only add keystrokes.
- **DataTable requires a `caption` (with `captionHidden`).** Every table has a name, which also labels the scroll region.
- **The DataTable scroll container gets `role=region`, a label and `tabIndex=0` only while it overflows.** It meets WCAG 1.4.10 and 2.1.1 without a landmark and tab stop per table.
- **DataTable announces sort, page and loading changes through one always-mounted polite region; the visible range text is not live.** One announcement per action, no duplicates.
- **DataTable Prev/Next use `aria-disabled` at the bounds (Stage 0 Button style).** Native `disabled` would drop focus to `<body>` on the last page.
- **A sort or page-size change resets DataTable to page 1, and an out-of-range page is clamped for display without a callback.** The user always sees the start of the new ordering.
- **DataTable `manual` mode (with `totalRows`) is included.** Controlled sort and page and the loading state are only useful with server data.
- **DataTable row selection is deferred.** The scope stays reasonable, and `getRowId` already exists for it.
- **DataTable column header is `header: string` and the column type is exported as `DataTableColumn<Row>`.** The sort announcement needs text, and a bare `Column` export is too generic for the package index.
- **DataTable uses a generic `forwardRef` cast pattern.** `forwardRef` erases generics, and the cast keeps `Row` inference.
- **DataTable `className`/`style` go to the root wrapper, and ref/rest go to the `<table>`.** This mirrors the field rule: layout on the wrapper, DOM access on the main element.
- **Floating surfaces show the active item with an inset focus ring, not only a background change.** `bg-hover` on `bg-raised` is about 1.1:1, which fails 1.4.11.
- **jsdom shims for `showModal`, `popover` and `scrollIntoView` are feature-detected in `setup.ts`.** Tests run today and automatically use real implementations when jsdom adds them.

Relevant files read for this spec:

- `d:\Projects\component-library\CLAUDE.md`
- `d:\Projects\component-library\DECISIONS.md`
- `d:\Projects\component-library\docs\specs\phase-2.md`
- `d:\Projects\component-library\src\tokens\tokens.ts`
- `d:\Projects\component-library\src\tokens\pairs.ts`
- `d:\Projects\component-library\scripts\render-tokens.ts`
- `d:\Projects\component-library\src\hooks\useControllableState.ts`
- `d:\Projects\component-library\src\hooks\useField.ts`
- `d:\Projects\component-library\src\utils\types.ts`
- `d:\Projects\component-library\src\utils\composeRefs.ts`
- `d:\Projects\component-library\src\utils\composeChange.ts`
- `d:\Projects\component-library\src\components\Button\Button.tsx`
- `d:\Projects\component-library\src\components\Button\Button.module.css`
- `d:\Projects\component-library\src\components\IconButton\IconButton.tsx`
- `d:\Projects\component-library\src\components\Select\Select.tsx`
- `d:\Projects\component-library\src\components\Select\Select.module.css`
- `d:\Projects\component-library\src\components\Field\Field.tsx`
- `d:\Projects\component-library\src\components\Field\control.module.css`
- `d:\Projects\component-library\src\components\Alert\Alert.tsx`
- `d:\Projects\component-library\src\components\Alert\Alert.module.css`
- `d:\Projects\component-library\src\components\Icon\Icon.tsx`
- `d:\Projects\component-library\src\components\Icon\icons.tsx`
- `d:\Projects\component-library\src\test\setup.ts`
- `d:\Projects\component-library\src\index.ts`

Notes for the integrator:

- Browser-support claims for CSS anchor positioning (Safari 26, Firefox) and the Chrome behaviour of `preventDefault()` on Escape keydown suppressing dialog `cancel` are from memory. The Dialog spec guards against the latter with the `cancel` and `close` handlers. The builder should confirm support on caniuse at build time.
- Whether jsdom implements `showModal` and `showPopover` was not checked against the installed version, so the shims are feature-detected.

---

## 7. Stage 0 handoff notes (as built, read before using shared code)

- **mergeProps / cloneTrigger:** `cloneTrigger(element, ours, ref?)`. For `aria-expanded`, `aria-controls` and `aria-haspopup`, our value wins whenever we pass the key, even as `undefined`, so pass `'aria-controls': open ? id : undefined`. For `id` and every other key, theirs win, so use `trigger.props.id ?? triggerId` for `aria-labelledby`.
- **useFloating(options): { placement }:** the floating element must already be displayed when its layout effect runs. Declare the `showPopover()` layout effect before calling `useFloating`. A `dir` change while open is only picked up on the next resize or scroll.
- **useDismiss(options): void:** `refs` and `onDismiss` are read at event time, so they need not be stable. It pushes the layer in `useEffect` while `enabled`. `DismissReason` is exported.
- **useFocusReturn(): { capture, restore }:** the returned object is stable. `restore` clears the captured element. It does not capture `<body>`.
- **useTypeahead(): (event, labels, current, isDisabled) => number:** returns -1 for no match or a non-typeahead key, but `preventDefault()` has still been called if the key was consumed. `TYPEAHEAD_TIMEOUT = 500` is exported.
- **useIsOverflowing(ref, axis): boolean:** always false without ResizeObserver, so tests stub ResizeObserver (`vi.stubGlobal`, then `vi.unstubAllGlobals()`).
- **keyToAction:** returns only `'next' | 'prev' | 'first' | 'last' | null`; PageUp/PageDown are not mapped (Select passes `{ by: ±10 }`). `getNextIndex({ by: n })` moves across n enabled items. Without `loop` it stays put at the ends; from -1, next goes to the first item and prev to the last.
- **getTabbables(root):** also accepts `contenteditable=""`.
- **jsdom shims:** `showModal()` sets `open` and `data-modal`. `close()` removes both and dispatches `close`, only if the dialog was open. The popover methods toggle `data-popover-open`. `scrollIntoView` is a no-op.
- **Floating classes:** `.floating`, `.surface`, `.item`, `.groupLabel`, `.separator`. The Tooltip overrides `z-index` with `--gn-z-tooltip`. `.item` shows its ring on `[data-active]` and `:focus-visible`.
- **Button:** a caller-set `aria-disabled="true"` looks disabled, but `onClick` still fires, so the caller must suppress it.
- **Icons:** `ChevronLeftIcon`, `ChevronRightIcon`, `ArrowUpIcon`, `ArrowDownIcon` and `ArrowUpDownIcon` are exported from `src/components/Icon`.
- **toIdPart** also escapes `_`.

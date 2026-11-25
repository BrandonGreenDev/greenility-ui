# Decisions

One line per decision, with the reason. Newest at the bottom of each phase.

## Phase 1: Foundation

- Working brand name **Greenility** (`greenility-ui`, token prefix `--gn-`). It is made up and easy to rename before Phase 4.
- ESLint pinned to v9: `eslint-plugin-jsx-a11y` does not support ESLint 10 yet, and jsx-a11y is a requirement.
- Kept `forwardRef` although React 19 accepts `ref` as a prop: it works on both React 18 and 19, so the peer range can stay `>=18.2`.
- ESM-only build with `preserveModules`: modern bundlers tree-shake per file, and CJS adds a dual-package hazard for little gain.
- One compiled `styles.css` that consumers import once, rather than CSS injected by JS: no runtime cost, works with SSR, and CSP friendly.
- Tokens are authored in TypeScript (`tokens.ts`) and generated to CSS: one typed source feeds the CSS, the docs page and the contrast tests, and CI fails on drift.
- Three token layers (palette → semantic → scales): dark mode is just a different semantic mapping, and components never touch raw palette values.
- Hex palette values (not OKLCH): WCAG contrast can be computed exactly in unit tests, and they have universal browser support.
- Contrast is unit-tested for every fg/bg pair in both themes: it catches regressions at the token level, which jsdom-based axe cannot (it has no layout or computed styles).
- axe's `color-contrast` rule is disabled in jsdom tests and checked in the browser by the Storybook a11y addon instead: jsdom cannot compute colors, so the rule produces false results there.
- Theme is selected with `data-theme="light|dark"` on any element (`system` on `<html>` follows the OS): no provider is needed, themes nest, and it works without JS on first paint.
- The library does not reset host page styles: only `[data-theme]` surfaces get a background, color and font, which avoids clobbering consumer apps.
- Reduced motion sets durations to `0.01ms` rather than `0`: `transitionend`/`animationend` still fire, so exit animations cannot hang.
- The Storybook a11y addon runs with `test: 'error'`: violations show as errors in the panel, not warnings.
- Did not add `@storybook/addon-vitest` (browser-mode story tests): it needs Playwright browsers in CI. jsdom tests plus the a11y panel cover the requirement at lower CI cost. Revisit in Phase 4.
- Storybook uses its own `.storybook/vite.config.ts`, so the library build's dts plugin and lib output do not run inside Storybook.
- `react-docgen-typescript` for props tables: it reads JSDoc through `forwardRef` and extended interfaces. A `propFilter` hides inherited DOM attributes.
- Added `scripts/run.ts` to launch Vitest, Vite and Storybook from the real path: on Windows a lower-case drive letter made Vitest load twice and vite-plugin-dts silently skip declaration files.
- `playwright` is a dev dependency only for `scripts/screenshot.ts` (visual checks and README screenshots). It is not used in CI.
- Hand-written `cx` and `composeRefs` instead of `clsx` and similar: about five lines each, so there are zero runtime dependencies.
- Renamed to **Greenility** at Checkpoint 1 (owner's choice). The token prefix is `--gn-` and the package is `greenility-ui`.
- The brand palette is "fern", an original teal-green, to match the name. Light-theme accent uses fern-700 (6:1 on white). It is teal enough to stay distinct from the yellower `success` green, and status always comes with an icon or text anyway.

## Phase 2: Core components

Full spec: `docs/specs/phase-2.md`.

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
- Added a shared `Orientation` type to `src/utils/types.ts` (used by RadioGroup).
- `FieldLabel as="legend"` drops `htmlFor`, because `for` is not valid on `<legend>`; the legend greys out from a parent `fieldset:disabled` or `[data-disabled]`.
- `useField` sets `aria-describedby` ids only when that content renders, so it never points at a missing element.
- An invalid field box uses a `Mark` border in forced-colors mode rather than a thicker border: there is no layout shift and no raw px value.
- Icons accept `className` and forward a ref to the `<svg>`, consistent with every other component.
- Button positions its loading Spinner with a higher-specificity selector (`.root > .spinner`): with `preserveModules` the consumer's bundler decides CSS order, so cross-module overrides must win on specificity, not order.
- IconButton passes its icon through Button's `startIcon` slot with `children={null}`, so it reuses Button's aria-hidden icon wrapper, sizing and loading styles.
- Button `loadingLabel` (default "Loading") is an aria-hidden VisuallyHidden span referenced by `aria-describedby` while loading: the name stays the label, and screen readers hear that it is busy.
- IconButton warns on an empty or whitespace `label` (with no env check, because library code avoids `process.env`).
- Alert puts its live role on the message wrapper (prefix, title, body), not the root, so the icon and dismiss button are not re-announced with each update.
- Alert uses an `auto 1fr` grid plus an implicit auto column, so there is no empty gap when the alert has no dismiss button.
- The neutral Alert's dismiss hover border uses `border-strong` (border-default on bg-muted is about 1.2:1).
- Live regions (Alert `live`, Spinner) are documented as "mount first, then change content", because a role added on mount is not reliably announced.
- A `Radio` outside a `RadioGroup` throws in every environment: without the group it has no shared name or value, so it is always a programming error.
- Checkbox, Radio and Switch share `Field/indicator.module.css` for layout, states and forced colors. Indeterminate rules stay in Checkbox, because radios match `:indeterminate` when nothing in the group is selected.
- Indicator glyphs are centered by stacking them with the input in one grid cell, not with `translate(-50%, -50%)`: a physical transform is off-center in RTL.
- Indicator controls and labels are at least `--gn-size-target-min` (24px) tall, and a transparent `::before` widens the hit area across the gap to the label (WCAG 2.5.8, no dead zone).
- The Switch thumb moves with a logical `inset-inline-start`, so it slides the right way in RTL with no direction-specific rule.
- A disabled checked Switch fills its track with `fg-disabled`, so disabled on and off stay distinguishable, consistent with Checkbox and Radio.
- In forced colors, invalid controls show a thicker border in the system color, not `Mark`: Mark is a fixed yellow that is about 1.1:1 on light high-contrast themes.
- A controlled Checkbox restores `indeterminate` before consumer callbacks run, so handlers see the DOM as React will render it.
- Badges are not live regions; consumers announce changing statuses in a separate polite region.
- `danger-border` and `accent-solid-hover` contrast is tested against every surface, because indicators sit on cards and dialogs too.

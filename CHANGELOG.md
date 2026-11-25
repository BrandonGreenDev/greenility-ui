# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Project foundation: Vite library build, strict TypeScript, ESLint (jsx-a11y strict), Prettier, Vitest + Testing Library + axe, Storybook 10 with the a11y addon, and GitHub Actions CI.
- Design tokens for color, typography, spacing, radius, shadow, motion, z-index and sizes, authored in TypeScript and generated to CSS.
- Light and dark themes via `data-theme`, with OS preference as the fallback, and reduced-motion support.
- Contrast tests for every foreground/background token pairing in both themes.
- Storybook Introduction and Design Tokens pages.
- Shared utilities: `cx`, `composeRefs`, `useControllableState`.
- `VisuallyHidden`: text for assistive technology that is not shown on screen.
- `Spinner`: indeterminate busy indicator, a polite status region or decorative, with a reduced-motion pulse.
- `Button`: primary, secondary, ghost and danger variants, three sizes, decorative icons, and a loading state that keeps focus.
- `IconButton`: square icon-only Button with a required, non-empty `label`.
- `Alert`: inline message in five tones with a hidden tone prefix, optional dismiss button and opt-in `live` region.
- `Checkbox`: native checkbox with indeterminate state, description, error message and required support.
- `RadioGroup` and `Radio`: native radios in a fieldset with a legend, vertical or horizontal.
- `Switch`: native `role="switch"` checkbox for settings that apply immediately.
- `Badge`: non-interactive status label in six tones, two variants and three sizes.
- `TextField`: native single-line input with label, description, error message and optional start/end adornments.
- `TextArea`: native multi-line input with label, description, error message and optional CSS `autoResize`.
- `NativeSelect` (named `Select` during Phase 2): styled native `<select>` with label, description, error message and a disabled placeholder option.
- MDX docs pages for each of these components, with usage, examples, props, accessibility notes and do/don't guidance.
- Phase 3 shared building blocks: positioning (`computePosition`, `useFloating`), dismissal and a layer stack (`useDismiss`), focus return, typeahead, list navigation, overflow detection, floating-surface styles, sort/arrow icons, and the public types `Placement`, `Align`, `ActivationMode`, `SortDirection`, `SortState`.
- `Dialog` and `DialogClose`: modal dialog on native `<dialog>` + `showModal()`, with a title, description, footer, trigger, three sizes, focus management, scroll lock and backdrop close.
- `AlertDialog`: confirmation dialog for destructive actions, with a required description, Cancel focused first, no backdrop close and a cancellable `onConfirm(event)`.
- `ToastProvider` and `useToast`: polite, queued notifications with an F8 hotkey, pausing timers, persistent warning, danger and action toasts, and support inside dialogs.
- `Tooltip`: short hint on hover (after a delay) or keyboard focus, hoverable and dismissible with Escape, with a `decorative` mode; IconButton shows its label as a decorative tooltip.
- `Menu`, `MenuItem`, `MenuGroup` and `MenuSeparator`: menu button with arrow-key navigation, typeahead, focusable disabled items and `onSelect` after focus returns to the trigger.
- `Select`: custom select-only combobox with an `options` array, groups, typeahead, form submission through a hidden input and form reset.
- `Tabs`, `TabList`, `Tab` and `TabPanel`: automatic or manual activation, horizontal or vertical, RTL-aware, with a scrolling tab list when tabs overflow.
- `Accordion` and `AccordionItem`: single, multiple or non-collapsible sections in headings of a configurable level.
- `DataTable`: typed, sortable, paginated native table with a required caption, polite announcements, a scroll region when it overflows, and a `manual` mode for server data.
- MDX docs pages for each Phase 3 component.

### Changed

- **Breaking (0.x):** the Phase 2 `Select` (a styled native `<select>`) is renamed `NativeSelect`, with the same API. The name `Select` now refers to the new custom select. Replace `Select` with `NativeSelect` in existing code to keep the native behavior.

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
- `Select`: styled native `<select>` with label, description, error message and a disabled placeholder option.
- MDX docs pages for each of these components, with usage, examples, props, accessibility notes and do/don't guidance.

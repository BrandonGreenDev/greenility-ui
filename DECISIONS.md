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

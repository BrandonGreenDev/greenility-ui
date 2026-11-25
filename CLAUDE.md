# Lumora UI: project guide for Claude

Read this first in every session. It is the contract for how this project is built.

## Goal

A production-quality, accessible React component library with a live Storybook docs site.
It is a portfolio project that must show senior-level front-end work: clean strict TypeScript,
real accessibility (keyboard and screen reader), design tokens with light/dark themes,
automated tests and polished docs. Everything is original. Do not copy component code,
styles or docs from other libraries.

The owner wants minimal hands-on work. Claude plans, builds, tests, reviews and fixes, and
stops only at the phase checkpoints or for logins/payment. Do not ask questions mid-phase.
Make a reasonable decision, add one line to `DECISIONS.md` with the reason, and keep going.

## Stack

- React 19 (peer range `>=18.2`) + TypeScript 6 in strict mode
- Vite 8 library mode (ESM, `preserveModules` for tree-shaking) + `vite-plugin-dts`
- CSS custom properties (design tokens) + CSS Modules. No UI framework, no CSS-in-JS.
- Storybook 10 (`@storybook/react-vite`) with `addon-docs` (autodocs + MDX) and `addon-a11y`
- Vitest 5 + jsdom + React Testing Library + user-event + `vitest-axe`
- ESLint 9 flat config (typescript-eslint strict type-checked, react, react-hooks, jsx-a11y strict, storybook) + Prettier
- GitHub Actions CI; Storybook deployed to Vercel

## Commands

| Command                   | What it does                                                   |
| ------------------------- | -------------------------------------------------------------- |
| `npm run storybook`       | Storybook dev server on http://localhost:6006                  |
| `npm test`                | Run all tests once (`npm run test:watch` to watch)             |
| `npm run lint`            | ESLint, zero warnings allowed                                  |
| `npm run typecheck`       | `tsc --noEmit`                                                 |
| `npm run format`          | Prettier write (`format:check` in CI)                          |
| `npm run tokens`          | Regenerate `src/tokens/tokens.css` from `src/tokens/tokens.ts` |
| `npm run build`           | Build the library to `dist/`                                   |
| `npm run build-storybook` | Static Storybook in `storybook-static/`                        |
| `npm run ci`              | Everything CI runs, in order                                   |

Windows note: `test`, `build` and `storybook` go through `scripts/run.ts`, which starts the
tool from the real path of the folder. A lower-case drive letter (`d:\`) otherwise makes Vitest
load twice and makes vite-plugin-dts skip declaration files. Always use the npm scripts, not
bare `npx vitest`/`npx vite`. To run one test file: `npm test -- src/components/Button`.

## Folder structure

```
.claude/agents/         planner, component-builder, test-writer, a11y-reviewer, code-reviewer, docs-writer
.github/workflows/      ci.yml
.storybook/             main.ts, preview.tsx (theme toolbar + decorator), manager.ts (branding)
scripts/                build-tokens.ts, render-tokens.ts, run.ts, screenshot.ts
src/
  components/<Name>/    <Name>.tsx, <Name>.module.css, <Name>.stories.tsx, <Name>.test.tsx, <Name>.mdx, index.ts
  hooks/                shared hooks (useControllableState, ...)
  utils/                shared helpers (cx, composeRefs, ...)
  tokens/               tokens.ts (source of truth), tokens.css (generated), contrast.ts, pairs.ts
  styles/base.css       minimal themed-surface styles
  docs/                 Introduction.mdx, DesignTokens.mdx and their helper components
  test/                 setup.ts, axe.ts
  index.ts              public API (named exports only)
```

## Coding conventions

**Components**

- One folder per component, PascalCase. Named exports only, never default exports (except stories/config).
- Use `forwardRef` and set `displayName`. The ref goes to the main interactive or native element, and the JSDoc says which.
- Props interfaces are named `<Name>Props`, are exported, extend the right native attributes type (`Omit` any conflicts), and have JSDoc on every prop with `@default` where relevant.
- Always accept `className` and merge it with `cx(styles.root, className)`. Spread `...rest` onto the documented element.
- Shared prop vocabulary, so the API stays consistent:
  - `size`: `'sm' | 'md' | 'lg'` (default `'md'`)
  - `variant` (visual style), e.g. Button: `'primary' | 'secondary' | 'ghost'`
  - `tone` (meaning): `'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'`
  - form fields: `label`, `description`, `errorMessage`, `invalid`, `disabled`, `required`
  - controlled state: `value`/`defaultValue`/`onValueChange`, or `checked`/`defaultChecked`/`onCheckedChange`, `open`/`defaultOpen`/`onOpenChange`, always through `useControllableState`
- Prefer native elements and semantics. Add ARIA only where native is not enough, and follow the matching WAI-ARIA APG pattern.
- IDs use React `useId()`. Never use random or global counters.
- No new runtime dependencies. If one is truly needed, record why in `DECISIONS.md`.

**Styles**

- CSS Modules, with class names in camelCase. The root class is `.root`. State is expressed through data/ARIA attributes (`[data-size='sm']`, `[aria-invalid='true']`) rather than extra classes where possible.
- Tokens only: `var(--lu-*)`. Use no raw colors and no raw px/rem values for spacing, radius, font, shadow or duration. Allowed literals: `0`, `1px` hairlines, `100%`, `50%`, `currentColor`, `transparent`.
- Components use semantic tokens (`--lu-color-*`), never palette tokens (`--lu-palette-*`).
- Every interactive element has `:focus-visible` using `--lu-color-border-focus`, `--lu-size-focus-ring-width` and `--lu-size-focus-ring-offset`.
- Motion uses the `--lu-motion-*` tokens. They collapse to `0.01ms` under reduced motion, so never hard-code a duration.
- Add `@media (forced-colors: active)` fixes where a border, focus ring or state would vanish.

**Tokens**

- Edit `src/tokens/tokens.ts`, then run `npm run tokens`. Never edit `tokens.css` by hand.
- Any new foreground/background pairing a component relies on is added to `src/tokens/pairs.ts`, so contrast is tested in both themes.

**Stories**

- CSF3, title `Components/<Name>`, `tags: ['autodocs']` until an MDX page exists.
- One story per variant, size and state, plus `DarkMode` with `parameters: { theme: 'dark' }`.

**Tests**

- `<Name>.test.tsx` next to the component. Query by role/label, drive with `userEvent`, and include no snapshots.
- At least one `expect(await axe(container)).toHaveNoViolations()` per meaningful state, using `src/test/axe.ts`.

**Commits**

- Conventional commits: `feat(button): add Button component`, `fix(tabs): ...`, `chore: ...`, `docs: ...`, `test: ...`, `ci: ...`.
- One commit per component once its definition of done is met.

## Definition of done (per component)

- [ ] Typed props with JSDoc, forwards refs, accepts `className`
- [ ] Uses design tokens only (no hard-coded colors/spacing)
- [ ] Works in light and dark themes and respects `prefers-reduced-motion`
- [ ] Fully keyboard operable with visible focus
- [ ] Stories for all variants and states; MDX docs page
- [ ] Tests pass, including an axe check with zero violations
- [ ] a11y-reviewer and code-reviewer findings all fixed
- [ ] Lint, typecheck and build are clean

## Workflow (per component)

1. **planner** writes the spec: API, variants, states, APG pattern, keyboard map, test plan.
2. **component-builder** implements the component, styles and stories.
3. **test-writer** writes the tests.
4. **a11y-reviewer** and **code-reviewer** review in parallel (report only).
5. **component-builder** fixes every finding.
6. Rerun lint, typecheck and tests until green. **docs-writer** adds the MDX page.
7. Commit with a conventional-commit message.

Independent components run in parallel. Components that share a building block (e.g. the
form-field wrapper, or popover positioning) wait for that block to land first.

## Phases and checkpoints

1. **Foundation**: tooling, tokens, theming, CI, Introduction and Design Tokens pages. → Checkpoint 1
2. **Core components**: Button, IconButton, TextField, TextArea, Checkbox, RadioGroup, Switch, Select, Badge, Alert, Spinner. → Checkpoint 2
3. **Advanced components**: Dialog, Tabs, Accordion, Tooltip, Toast, Menu, DataTable (sortable, paginated). → Checkpoint 3
4. **Ship it**: docs polish, README, public GitHub repo, Vercel deploy, green CI. → Checkpoint 4
5. **Interview prep**: `INTERVIEW_NOTES.md`.

GitHub and Vercel use the `gh` and `vercel` CLIs. If one is missing or logged out, give
the owner the exact command to run and wait.

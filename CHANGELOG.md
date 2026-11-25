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

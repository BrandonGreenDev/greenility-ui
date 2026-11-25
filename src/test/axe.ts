import type { AxeResults, RunOptions } from 'axe-core';
import { configureAxe } from 'vitest-axe';

/**
 * Shared axe runner for component tests.
 *
 * `color-contrast` is turned off because jsdom does not compute styles or
 * layout, so the rule can only produce false results there. Contrast is
 * instead verified from the token values in `src/tokens/tokens.test.ts`
 * and in the browser by the Storybook a11y addon.
 */
export const axe: (html: Element | string, options?: RunOptions) => Promise<AxeResults> =
  configureAxe({
    rules: {
      'color-contrast': { enabled: false },
    },
  });

declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}

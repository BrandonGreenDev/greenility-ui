/**
 * Greenility design tokens: the single source of truth.
 *
 * There are three layers:
 *  1. `palette`: raw color primitives. Components never use these directly.
 *  2. `scales`: theme-independent tokens (type, space, radius, motion, z-index, sizes).
 *  3. `themes`: semantic color and shadow tokens per theme. Colors reference
 *     palette entries, so a theme is just a mapping of intent -> primitive.
 *
 * `scripts/build-tokens.ts` turns this file into `tokens.css`. The contrast
 * test in `tokens.test.ts` checks every foreground/background pairing in both themes.
 */

export const palette = {
  neutral: {
    0: '#ffffff',
    50: '#f7f8fa',
    100: '#eef0f4',
    200: '#dde1e8',
    300: '#c4cad4',
    400: '#9aa2b1',
    500: '#6b7385',
    600: '#535b6b',
    700: '#3d4452',
    800: '#2a2f3a',
    900: '#1b1f27',
    950: '#11141a',
  },
  fern: {
    50: '#ecfdf7',
    100: '#d0f8ea',
    200: '#a3efd6',
    300: '#6ddfbe',
    400: '#38c9a2',
    500: '#18ad88',
    600: '#0e8c6f',
    700: '#0d705a',
    800: '#0e5949',
    900: '#0d493d',
    950: '#052a23',
  },
  green: {
    50: '#ecfbf1',
    100: '#d2f5df',
    200: '#a6eac0',
    400: '#3fcf7a',
    500: '#22b15e',
    600: '#178a48',
    700: '#146f3c',
    800: '#12572f',
    900: '#0e3f23',
    950: '#082615',
  },
  amber: {
    50: '#fff8e6',
    100: '#ffefc2',
    200: '#ffdf85',
    400: '#f7b733',
    500: '#e09b0a',
    600: '#b57a00',
    700: '#8f5f00',
    800: '#6b4700',
    900: '#4a3100',
    950: '#2e1e00',
  },
  red: {
    50: '#fff0f0',
    100: '#ffdcdc',
    200: '#ffb8b8',
    400: '#f26b6b',
    500: '#e04545',
    600: '#c22f2f',
    700: '#a02424',
    800: '#7d1d1d',
    900: '#5a1515',
    950: '#380c0c',
  },
  blue: {
    50: '#eef6ff',
    100: '#d6e9ff',
    200: '#addaff',
    400: '#4ea1f5',
    500: '#2a86e6',
    600: '#1b6cc4',
    700: '#175aa3',
    800: '#144a85',
    900: '#0f3661',
    950: '#09213d',
  },
} as const;

export type PaletteName = keyof typeof palette;

/** A reference to a palette entry, e.g. `neutral.900`. */
export type PaletteRef = {
  [P in PaletteName]: `${P}.${Extract<keyof (typeof palette)[P], number>}`;
}[PaletteName];

export function resolveRef(ref: PaletteRef): string {
  const [name, step] = ref.split('.') as [PaletteName, string];
  const scale = palette[name] as Record<string, string>;
  const value = scale[step];
  if (value === undefined) throw new Error(`Unknown palette ref: ${ref}`);
  return value;
}

export const scales = {
  font: {
    'family-sans':
      "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    'family-mono':
      "ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace",
    'size-xs': '0.75rem',
    'size-sm': '0.875rem',
    'size-md': '1rem',
    'size-lg': '1.125rem',
    'size-xl': '1.25rem',
    'size-2xl': '1.5rem',
    'size-3xl': '1.875rem',
    'size-4xl': '2.25rem',
    'weight-regular': '400',
    'weight-medium': '500',
    'weight-semibold': '600',
    'weight-bold': '700',
    'line-height-tight': '1.25',
    'line-height-normal': '1.5',
    'line-height-relaxed': '1.625',
  },
  space: {
    '0': '0',
    '0-5': '0.125rem',
    '1': '0.25rem',
    '1-5': '0.375rem',
    '2': '0.5rem',
    '3': '0.75rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '8': '2rem',
    '10': '2.5rem',
    '12': '3rem',
    '16': '4rem',
  },
  radius: {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.625rem',
    xl: '1rem',
    full: '9999px',
  },
  motion: {
    'duration-instant': '0ms',
    'duration-fast': '120ms',
    'duration-normal': '200ms',
    'duration-slow': '320ms',
    'easing-standard': 'cubic-bezier(0.2, 0, 0, 1)',
    'easing-enter': 'cubic-bezier(0, 0, 0.2, 1)',
    'easing-exit': 'cubic-bezier(0.4, 0, 1, 1)',
  },
  z: {
    base: '0',
    dropdown: '1000',
    sticky: '1100',
    overlay: '1200',
    modal: '1300',
    toast: '1400',
    tooltip: '1500',
  },
  size: {
    'control-sm': '2rem',
    'control-md': '2.5rem',
    'control-lg': '3rem',
    'icon-sm': '1rem',
    'icon-md': '1.25rem',
    'icon-lg': '1.5rem',
    'focus-ring-width': '2px',
    'focus-ring-offset': '2px',
    'border-width': '1px',
  },
} as const;

/**
 * Under `prefers-reduced-motion: reduce` every duration becomes 0.01ms rather than 0,
 * so `transitionend`/`animationend` still fire and components never get stuck
 * mid-exit.
 */
export const reducedMotionDuration = '0.01ms';

/** The semantic color roles each theme must define. */
export type ColorRole =
  // surfaces
  | 'bg-canvas'
  | 'bg-surface'
  | 'bg-subtle'
  | 'bg-muted'
  | 'bg-raised'
  | 'bg-inverse'
  | 'bg-hover'
  | 'bg-active'
  | 'bg-disabled'
  | 'overlay'
  // text
  | 'fg-default'
  | 'fg-muted'
  | 'fg-subtle'
  | 'fg-inverse'
  | 'fg-disabled'
  | 'fg-link'
  // borders
  | 'border-default'
  | 'border-strong'
  | 'border-focus'
  // accent (brand)
  | 'accent-solid'
  | 'accent-solid-hover'
  | 'accent-solid-active'
  | 'accent-solid-fg'
  | 'accent-subtle'
  | 'accent-subtle-hover'
  | 'accent-subtle-fg'
  | 'accent-border'
  // status tones
  | `${'success' | 'warning' | 'danger' | 'info'}-${
      'solid' | 'solid-hover' | 'solid-fg' | 'subtle' | 'subtle-fg' | 'border'}`;

/** A semantic color is a palette reference, or a raw value for alpha colors like overlays. */
export type ColorValue = PaletteRef | { raw: string };

export interface Theme {
  colorScheme: 'light' | 'dark';
  color: Record<ColorRole, ColorValue>;
  shadow: Record<'sm' | 'md' | 'lg' | 'xl', string>;
}

const light: Theme = {
  colorScheme: 'light',
  color: {
    'bg-canvas': 'neutral.50',
    'bg-surface': 'neutral.0',
    'bg-subtle': 'neutral.50',
    'bg-muted': 'neutral.100',
    'bg-raised': 'neutral.0',
    'bg-inverse': 'neutral.900',
    'bg-hover': 'neutral.100',
    'bg-active': 'neutral.200',
    'bg-disabled': 'neutral.100',
    overlay: { raw: 'rgb(17 20 26 / 0.55)' },

    'fg-default': 'neutral.900',
    'fg-muted': 'neutral.600',
    'fg-subtle': 'neutral.500',
    'fg-inverse': 'neutral.0',
    'fg-disabled': 'neutral.400',
    'fg-link': 'fern.700',

    'border-default': 'neutral.200',
    'border-strong': 'neutral.500',
    'border-focus': 'fern.600',

    'accent-solid': 'fern.700',
    'accent-solid-hover': 'fern.800',
    'accent-solid-active': 'fern.900',
    'accent-solid-fg': 'neutral.0',
    'accent-subtle': 'fern.50',
    'accent-subtle-hover': 'fern.100',
    'accent-subtle-fg': 'fern.800',
    'accent-border': 'fern.700',

    'success-solid': 'green.700',
    'success-solid-hover': 'green.800',
    'success-solid-fg': 'neutral.0',
    'success-subtle': 'green.50',
    'success-subtle-fg': 'green.800',
    'success-border': 'green.600',

    'warning-solid': 'amber.400',
    'warning-solid-hover': 'amber.500',
    'warning-solid-fg': 'neutral.950',
    'warning-subtle': 'amber.50',
    'warning-subtle-fg': 'amber.800',
    'warning-border': 'amber.600',

    'danger-solid': 'red.600',
    'danger-solid-hover': 'red.700',
    'danger-solid-fg': 'neutral.0',
    'danger-subtle': 'red.50',
    'danger-subtle-fg': 'red.800',
    'danger-border': 'red.600',

    'info-solid': 'blue.600',
    'info-solid-hover': 'blue.700',
    'info-solid-fg': 'neutral.0',
    'info-subtle': 'blue.50',
    'info-subtle-fg': 'blue.800',
    'info-border': 'blue.600',
  },
  shadow: {
    sm: '0 1px 2px rgb(17 20 26 / 0.06), 0 1px 3px rgb(17 20 26 / 0.08)',
    md: '0 2px 4px rgb(17 20 26 / 0.06), 0 4px 12px rgb(17 20 26 / 0.08)',
    lg: '0 4px 8px rgb(17 20 26 / 0.06), 0 12px 28px rgb(17 20 26 / 0.12)',
    xl: '0 8px 16px rgb(17 20 26 / 0.08), 0 24px 56px rgb(17 20 26 / 0.18)',
  },
};

const dark: Theme = {
  colorScheme: 'dark',
  color: {
    'bg-canvas': 'neutral.950',
    'bg-surface': 'neutral.900',
    'bg-subtle': 'neutral.900',
    'bg-muted': 'neutral.800',
    'bg-raised': 'neutral.800',
    'bg-inverse': 'neutral.50',
    'bg-hover': 'neutral.800',
    'bg-active': 'neutral.700',
    'bg-disabled': 'neutral.800',
    overlay: { raw: 'rgb(0 0 0 / 0.65)' },

    'fg-default': 'neutral.50',
    'fg-muted': 'neutral.300',
    'fg-subtle': 'neutral.400',
    'fg-inverse': 'neutral.900',
    'fg-disabled': 'neutral.500',
    'fg-link': 'fern.300',

    'border-default': 'neutral.700',
    'border-strong': 'neutral.400',
    'border-focus': 'fern.300',

    'accent-solid': 'fern.400',
    'accent-solid-hover': 'fern.300',
    'accent-solid-active': 'fern.200',
    'accent-solid-fg': 'neutral.950',
    'accent-subtle': 'fern.950',
    'accent-subtle-hover': 'fern.900',
    'accent-subtle-fg': 'fern.200',
    'accent-border': 'fern.400',

    'success-solid': 'green.400',
    'success-solid-hover': 'green.200',
    'success-solid-fg': 'neutral.950',
    'success-subtle': 'green.950',
    'success-subtle-fg': 'green.200',
    'success-border': 'green.500',

    'warning-solid': 'amber.400',
    'warning-solid-hover': 'amber.200',
    'warning-solid-fg': 'neutral.950',
    'warning-subtle': 'amber.950',
    'warning-subtle-fg': 'amber.200',
    'warning-border': 'amber.500',

    'danger-solid': 'red.400',
    'danger-solid-hover': 'red.200',
    'danger-solid-fg': 'neutral.950',
    'danger-subtle': 'red.950',
    'danger-subtle-fg': 'red.200',
    'danger-border': 'red.400',

    'info-solid': 'blue.400',
    'info-solid-hover': 'blue.200',
    'info-solid-fg': 'neutral.950',
    'info-subtle': 'blue.950',
    'info-subtle-fg': 'blue.200',
    'info-border': 'blue.400',
  },
  shadow: {
    sm: '0 1px 2px rgb(0 0 0 / 0.4)',
    md: '0 2px 4px rgb(0 0 0 / 0.35), 0 4px 12px rgb(0 0 0 / 0.35)',
    lg: '0 4px 8px rgb(0 0 0 / 0.35), 0 12px 28px rgb(0 0 0 / 0.45)',
    xl: '0 8px 16px rgb(0 0 0 / 0.4), 0 24px 56px rgb(0 0 0 / 0.55)',
  },
};

export const themes = { light, dark } as const;
export type ThemeName = keyof typeof themes;

/** The CSS custom property prefix used by every token. */
export const TOKEN_PREFIX = '--gn';

/** Builds the CSS variable reference for a token, e.g. `cssVar('color', 'fg-default')`. */
export function cssVar(group: string, name: string): string {
  return `var(${TOKEN_PREFIX}-${group}-${name})`;
}

/** Resolves a semantic color to a concrete CSS color string. */
export function resolveColor(value: ColorValue): string {
  return typeof value === 'string' ? resolveRef(value) : value.raw;
}

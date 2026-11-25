import type { ColorRole } from './tokens.ts';

/**
 * Foreground/background pairings that components actually use, with the WCAG 2.2
 * minimum each must meet: 4.5 for text (1.4.3), 3 for UI boundaries and focus
 * indicators (1.4.11). The contrast test and the Design Tokens docs page both read this.
 */
export interface ContrastPair {
  fg: ColorRole;
  bg: ColorRole;
  min: 3 | 4.5;
  usage: string;
}

const surfaces = ['bg-canvas', 'bg-surface', 'bg-raised', 'bg-muted'] as const;

export const contrastPairs: ContrastPair[] = [
  ...surfaces.flatMap((bg): ContrastPair[] => [
    { fg: 'fg-default', bg, min: 4.5, usage: 'Body text' },
    { fg: 'fg-muted', bg, min: 4.5, usage: 'Secondary text' },
    { fg: 'fg-link', bg, min: 4.5, usage: 'Links' },
    { fg: 'border-strong', bg, min: 3, usage: 'Input borders' },
    { fg: 'border-focus', bg, min: 3, usage: 'Focus ring' },
    { fg: 'accent-solid', bg, min: 3, usage: 'Checked controls' },
    { fg: 'accent-solid-hover', bg, min: 3, usage: 'Checked controls on hover' },
  ]),
  { fg: 'fg-subtle', bg: 'bg-surface', min: 4.5, usage: 'Placeholder text' },
  // Read-only fields use bg-subtle (their placeholder switches to fg-muted).
  { fg: 'fg-default', bg: 'bg-subtle', min: 4.5, usage: 'Read-only field text' },
  { fg: 'fg-muted', bg: 'bg-subtle', min: 4.5, usage: 'Read-only placeholder' },
  { fg: 'border-strong', bg: 'bg-subtle', min: 3, usage: 'Read-only field border' },
  { fg: 'danger-border', bg: 'bg-subtle', min: 3, usage: 'Read-only invalid border' },
  { fg: 'fg-inverse', bg: 'bg-inverse', min: 4.5, usage: 'Tooltip text' },
  { fg: 'accent-solid-fg', bg: 'accent-solid', min: 4.5, usage: 'Primary button' },
  { fg: 'accent-solid-fg', bg: 'accent-solid-hover', min: 4.5, usage: 'Primary button hover' },
  { fg: 'accent-solid-fg', bg: 'accent-solid-active', min: 4.5, usage: 'Primary button pressed' },
  { fg: 'accent-subtle-fg', bg: 'accent-subtle', min: 4.5, usage: 'Accent badge / selected row' },
  { fg: 'accent-subtle-fg', bg: 'accent-subtle-hover', min: 4.5, usage: 'Secondary button hover' },
  { fg: 'fg-default', bg: 'bg-hover', min: 4.5, usage: 'Ghost button hover' },
  { fg: 'fg-default', bg: 'bg-active', min: 4.5, usage: 'Ghost button pressed' },
  ...(['bg-canvas', 'bg-surface', 'bg-raised'] as const).map((bg): ContrastPair => ({
    fg: 'danger-subtle-fg',
    bg,
    min: 4.5,
    usage: 'Field error text / required mark',
  })),
  ...(['bg-canvas', 'bg-surface', 'bg-raised'] as const).map((bg): ContrastPair => ({
    fg: 'danger-border',
    bg,
    min: 3,
    usage: 'Invalid control border',
  })),
  ...(['success', 'warning', 'danger', 'info'] as const).map((tone): ContrastPair => ({
    fg: 'border-focus',
    bg: `${tone}-subtle`,
    min: 3,
    usage: `Focus ring inside ${tone} alert`,
  })),
  {
    fg: 'border-focus',
    bg: 'accent-subtle',
    min: 3,
    usage: 'Focus ring on secondary button surface',
  },
  ...(['success', 'warning', 'danger', 'info'] as const).flatMap((tone): ContrastPair[] => [
    { fg: `${tone}-solid-fg`, bg: `${tone}-solid`, min: 4.5, usage: `${tone} solid` },
    { fg: `${tone}-solid-fg`, bg: `${tone}-solid-hover`, min: 4.5, usage: `${tone} solid hover` },
    { fg: `${tone}-subtle-fg`, bg: `${tone}-subtle`, min: 4.5, usage: `${tone} subtle` },
    { fg: `${tone}-border`, bg: `${tone}-subtle`, min: 3, usage: `${tone} alert border` },
    { fg: `${tone}-border`, bg: 'bg-surface', min: 3, usage: `${tone} border on surface` },
  ]),
];

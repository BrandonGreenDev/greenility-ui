import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderTokensCss } from '../../scripts/render-tokens.ts';
import { contrastRatio } from './contrast.ts';
import { contrastPairs } from './pairs.ts';
import { resolveColor, themes, type ThemeName } from './tokens.ts';

describe('contrastRatio', () => {
  it('matches known WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});

describe.each(Object.keys(themes) as ThemeName[])('%s theme contrast', (themeName) => {
  const theme = themes[themeName];

  it.each(contrastPairs.map((pair) => [`${pair.fg} on ${pair.bg}`, pair] as const))(
    '%s meets its WCAG minimum',
    (_label, pair) => {
      const ratio = contrastRatio(
        resolveColor(theme.color[pair.fg]),
        resolveColor(theme.color[pair.bg]),
      );
      expect(ratio, `${pair.usage}: ${ratio.toFixed(2)}:1 < ${pair.min}:1`).toBeGreaterThanOrEqual(
        pair.min,
      );
    },
  );
});

describe('tokens.css', () => {
  it('is in sync with tokens.ts (run `npm run tokens` if this fails)', () => {
    const file = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8').replace(
      /\r\n/g,
      '\n',
    );
    expect(file).toBe(renderTokensCss());
  });

  it('defines the same color roles in every theme', () => {
    const light = Object.keys(themes.light.color).sort();
    const dark = Object.keys(themes.dark.color).sort();
    expect(dark).toEqual(light);
  });
});

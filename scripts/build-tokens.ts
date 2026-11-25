/**
 * Generates src/tokens/tokens.css from src/tokens/tokens.ts.
 *
 *   node scripts/build-tokens.ts          write the file
 *   node scripts/build-tokens.ts --check  exit 1 if the file is out of date (used in CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderTokensCss } from './render-tokens.ts';

const outFile = resolve(import.meta.dirname, '../src/tokens/tokens.css');
const css = renderTokensCss();

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(outFile, 'utf8');
  } catch {
    // A missing file counts as out of date.
  }
  if (current.replace(/\r\n/g, '\n') !== css) {
    console.error('tokens.css is out of date. Run `npm run tokens` and commit the result.');
    process.exit(1);
  }
  console.log('tokens.css is up to date.');
} else {
  writeFileSync(outFile, css);
  console.log(`Wrote ${outFile}`);
}

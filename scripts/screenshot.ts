/**
 * Captures a full-page screenshot of a Storybook URL and reports console errors.
 *
 *   node scripts/screenshot.ts <url> <out.png> [--dark] [--width=1280]
 *
 * Used to produce the README screenshots and to visually check pages.
 */
import { chromium } from 'playwright';

const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const [url, out] = positional;
if (!url || !out) {
  console.error('Usage: node scripts/screenshot.ts <url> <out.png> [--dark] [--width=1280]');
  process.exit(1);
}
const widthArg = process.argv.find((arg) => arg.startsWith('--width='));
const width = widthArg ? Number(widthArg.split('=')[1]) : 1280;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height: 800 },
  colorScheme: process.argv.includes('--dark') ? 'dark' : 'light',
  deviceScaleFactor: 2,
});
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: out, fullPage: true });
await browser.close();

console.log(errors.length ? `Console errors:\n${errors.join('\n')}` : 'No console errors.');

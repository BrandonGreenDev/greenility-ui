/**
 * Runs axe-core in a real browser against every story in a built Storybook,
 * in light and dark themes. Unlike the jsdom unit tests, this includes the
 * color-contrast rule, because real layout and computed styles are available.
 *
 *   npm run build-storybook && node scripts/a11y-stories.ts [--port=6008] [--browser=chromium|firefox|webkit] [--root=dir]
 *
 * Exits 1 if any violation is found.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
}

const root = resolve(arg('root') ?? resolve(import.meta.dirname, '../storybook-static'));
const browserName = arg('browser') ?? 'chromium';
const engines = { chromium, firefox, webkit } as const;
if (!(browserName in engines)) {
  console.error(`Unknown --browser=${browserName}; use chromium, firefox or webkit.`);
  process.exit(1);
}
const portArg = process.argv.find((arg) => arg.startsWith('--port='));
const port = portArg ? Number(portArg.split('=')[1]) : 6008;
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
  const file = join(root, path === '/' ? 'index.html' : path);
  readFile(file)
    .then((body) => {
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    })
    .catch(() => {
      res.writeHead(404);
      res.end();
    });
});
await new Promise<void>((done) => server.listen(port, done));

interface Entry {
  id: string;
  type: string;
  tags?: string[];
}
const index = JSON.parse(await readFile(join(root, 'index.json'), 'utf8')) as {
  entries: Record<string, Entry>;
};
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');

interface Violation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[] }[];
}

const browser = await engines[browserName as keyof typeof engines].launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
let failures = 0;

for (const story of stories) {
  for (const theme of ['light', 'dark'] as const) {
    const url = `http://localhost:${port}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('#storybook-root > *', { timeout: 10_000 }).catch(() => undefined);
    // Let transitions settle: a color measured mid-transition is not what users see.
    await page
      .evaluate(() =>
        Promise.race([
          Promise.all(document.getAnimations().map((animation) => animation.finished)),
          new Promise((done) => setTimeout(done, 2000)),
        ]),
      )
      .catch(() => undefined);
    await page.addScriptTag({ path: axePath });
    const violations = (await page.evaluate(async () => {
      const axe = (
        window as unknown as {
          axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: unknown[] }> };
        }
      ).axe;
      const result = await axe.run(document.querySelector('#storybook-root'), {
        resultTypes: ['violations'],
      });
      return result.violations;
    })) as Violation[];
    for (const violation of violations) {
      failures += 1;
      const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ');
      console.log(
        `✗ ${story.id} [${theme}] ${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}\n    ${targets}`,
      );
    }
  }
}

await browser.close();
server.close();

console.log(
  failures === 0
    ? `axe (${browserName}): ${stories.length} stories x 2 themes, no violations.`
    : `axe (${browserName}): ${failures} violation(s) across ${stories.length} stories.`,
);
process.exit(failures === 0 ? 0 : 1);

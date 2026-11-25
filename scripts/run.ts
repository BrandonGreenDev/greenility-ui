/**
 * Runs a command from the canonical (real) path of the working directory.
 *
 *   node scripts/run.ts vitest run
 *
 * <command> must be an installed package that has a bin of the same name
 * (vitest, vite, storybook). Its bin is resolved under the canonical path and
 * run with the current Node, without going through node_modules/.bin shims,
 * because those carry the lower-case path from PATH.
 *
 * On Windows a terminal can report the drive letter in lower case (`d:\...`)
 * while Node resolves modules with an upper-case one (`D:\...`). Vite-based
 * tools then see two different paths for the same file. Vitest loads itself
 * twice ("failed to find the current suite") and vite-plugin-dts silently
 * skips most declaration files. Starting from the native realpath avoids both.
 * On macOS and Linux this is a no-op.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/run.ts <command> [...args]');
  process.exit(1);
}

const cwd = realpathSync.native(process.cwd());
const pkgDir = join(cwd, 'node_modules', command);
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as {
  bin?: string | Record<string, string>;
};
const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[command];
if (!bin) {
  console.error(`Package "${command}" has no bin named "${command}".`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [join(pkgDir, bin), ...args], { cwd, stdio: 'inherit' });
process.exit(result.status ?? 1);

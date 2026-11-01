// Produce a publish-ready copy of this plugin under the name it will carry on
// npm. The live install in the DSH profile keeps using `@local/...` (unpublishable
// scope), so the rename happens here instead of in the working tree.
//
//   node scripts/prepare-npm.mjs            # -> dist-npm/
//   npm publish dist-npm --access public
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(root, 'dist-npm');

const OLD = '@local/dsh-sidebar-dock';
const NEW = 'dsh-sidebar-dock';

const files = [
  'package.json',
  'index.js',
  'client.js',
  'cordis.patch.yml',
  'icon.svg',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'locale/zh.json',
  'locale/en.json',
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const file of files) {
  cpSync(join(root, file), join(out, file), { recursive: true });
}

const rewrites = [];

const pkgPath = join(out, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.name = NEW;
pkg.repository = pkg.repository ?? { type: 'git', url: 'git+https://github.com/OWNER/dsh-sidebar-dock.git' };
pkg.homepage = pkg.homepage ?? 'https://github.com/OWNER/dsh-sidebar-dock#readme';
pkg.bugs = pkg.bugs ?? { url: 'https://github.com/OWNER/dsh-sidebar-dock/issues' };
pkg.publishConfig = { access: 'public' };
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
rewrites.push(`package.json name -> ${NEW}`);

for (const file of ['cordis.patch.yml', 'client.js']) {
  const path = join(out, file);
  const before = readFileSync(path, 'utf8');
  const after = before.split(OLD).join(NEW);
  if (before !== after) writeFileSync(path, after, 'utf8');
  rewrites.push(`${file} ${OLD} -> ${NEW}${before === after ? ' (no change)' : ''}`);
}

console.log(rewrites.join('\n'));
console.log(`\nready: ${out}`);
console.log('publish with:  npm publish dist-npm --access public');

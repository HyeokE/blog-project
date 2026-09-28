import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Leave room below Vercel's 250 MB limit for platform runtime files.
const budget = 200 * 1024 * 1024;
const publicAssets = ['images', '_gallery'].map((directory) =>
  `${path.resolve('public', directory)}${path.sep}`,
);

for (const route of ['gallery', '2025/gallery', '2026/gallery']) {
  const tracePath = path.resolve('.next/server/app', route, 'page.js.nft.json');
  const trace = JSON.parse(await readFile(tracePath, 'utf8'));
  const files = [...new Set(trace.files.map((file) => path.resolve(path.dirname(tracePath), file)))];
  const images = files.filter((file) => publicAssets.some((prefix) => file.startsWith(prefix)));
  assert.equal(images.length, 0, `/${route} bundles public gallery assets: ${images.join(', ')}`);
  const sizes = await Promise.all(files.map(async (file) => (await stat(file)).size));
  const bytes = sizes.reduce((sum, size) => sum + size, 0);
  assert.ok(bytes < budget, `/${route} traced function exceeds 200 MiB: ${bytes} bytes`);
  console.log(`Gallery function /${route}: ${(bytes / 1024 / 1024).toFixed(2)} MiB; no bundled photos.`);
}

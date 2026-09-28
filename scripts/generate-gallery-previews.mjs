import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Source images stay untouched. The content hash also versions every encoder setting.
const pipeline = { version: 1, widths: [320, 640, 960, 1280, 1920], quality: 86, effort: 4 };
const sourceDirectory = path.join(process.cwd(), 'public/images');
const outputDirectory = path.join(process.cwd(), 'public/_gallery');
const manifestPath = path.join(outputDirectory, 'manifest.json');
const supported = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

await mkdir(outputDirectory, { recursive: true });
let previous = { images: {} };
try {
  previous = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {
  // The first build has no preview cache.
}
const names = (await readdir(sourceDirectory))
  .filter((name) => supported.has(path.extname(name).toLowerCase()))
  .sort();
const images = {};
let next = 0;
let generated = 0;
let cached = 0;
const started = Date.now();

async function generate(name) {
  const source = `/images/${name}`;
  const input = await readFile(path.join(sourceDirectory, name));
  const hash = createHash('sha256')
    .update(JSON.stringify(pipeline))
    .update(input)
    .digest('hex')
    .slice(0, 20);
  const old = previous.images?.[source];
  if (old?.hash === hash && old.previews?.length) {
    const complete = await Promise.all(
      old.previews.map(({ src }) =>
        access(path.join(process.cwd(), 'public', src)).then(
          () => true,
          () => false,
        ),
      ),
    );
    if (complete.every(Boolean)) {
      images[source] = old;
      cached++;
      return;
    }
  }

  const metadata = await sharp(input).metadata();
  const swap = (metadata.orientation ?? 1) >= 5;
  const width = swap ? metadata.height : metadata.width;
  const height = swap ? metadata.width : metadata.height;
  if (!width || !height) {
    throw new Error(`Missing image dimensions: ${name}`);
  }
  const widths = [...new Set(pipeline.widths.map((size) => Math.min(size, width)))];
  const previews = [];
  for (const size of widths) {
    const fileName = `${hash}-${size}.webp`;
    const { data, info } = await sharp(input)
      .rotate()
      .resize({ width: size, withoutEnlargement: true })
      .webp({ quality: pipeline.quality, effort: pipeline.effort, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    // Atomic files prevent an interrupted generation from leaving a partial cached image.
    const destination = path.join(outputDirectory, fileName);
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, data);
    await rename(temporary, destination);
    previews.push({ src: `/_gallery/${fileName}`, width: info.width, height: info.height });
  }
  const blur = await sharp(input)
    .rotate()
    .resize({ width: 12 })
    .blur()
    .jpeg({ quality: 45 })
    .toBuffer();
  images[source] = {
    hash,
    width,
    height,
    blurDataURL: `data:image/jpeg;base64,${blur.toString('base64')}`,
    previews,
  };
  generated++;
}

async function worker() {
  while (next < names.length) {
    const name = names[next++];
    await generate(name);
  }
}

// Bound decoding memory on build workers; requests never run this encoder.
await Promise.all([worker(), worker()]);
const manifest = {
  version: pipeline.version,
  images: Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b))),
};
const temporaryManifest = `${manifestPath}.${process.pid}.tmp`;
await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`);
await rename(temporaryManifest, manifestPath);
console.log(
  `Gallery previews: ${generated} generated, ${cached} cached (${((Date.now() - started) / 1000).toFixed(1)}s).`,
);

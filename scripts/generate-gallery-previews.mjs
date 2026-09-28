import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import exifr from 'exifr';
import { EXIF_PARSE_OPTIONS, normalizeExifData } from '../src/utils/gallery/normalizeExifData.js';

// Source images stay untouched. The content hash also versions every encoder setting.
const pipeline = { version: 1, widths: [320, 640, 960, 1280, 1920], quality: 86, effort: 4 };
const sourceDirectory = path.join(process.cwd(), 'public/images');
const outputDirectory = path.join(process.cwd(), 'public/_gallery');
const manifestPath = path.join(outputDirectory, 'manifest.json');
const runtimeManifestPath = path.join(process.cwd(), 'src/generated/gallery-manifest.json');
const metadataVersion = createHash('sha256')
  .update(await readFile(new URL('../src/utils/gallery/normalizeExifData.js', import.meta.url)))
  .digest('hex')
  .slice(0, 20);
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
  let galleryMetadata;
  if (old?.hash === hash && old.metadataVersion === metadataVersion && old.galleryMetadata) {
    galleryMetadata = old.galleryMetadata;
  } else {
    try {
      galleryMetadata = await normalizeExifData(await exifr.parse(input, EXIF_PARSE_OPTIONS));
    } catch (error) {
      console.warn(`Gallery metadata unavailable: ${name}`, error.message);
      galleryMetadata = { metadata: {}, hasValidMetadata: false };
    }
  }
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
      images[source] = { ...old, metadataVersion, galleryMetadata };
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
    metadataVersion,
    galleryMetadata,
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
// Statically imported by the server bundle. No runtime photo directory access is needed.
const runtimeManifest = {
  version: 1,
  images: names.map((name, index) => {
    const src = `/images/${name}`;
    const { width, height, blurDataURL, previews, galleryMetadata } = images[src];
    const aspectRatio = height / width;
    return {
      id: index + 1,
      src,
      alt: `갤러리 이미지 ${index + 1}`,
      ...galleryMetadata,
      width,
      height,
      aspectRatio,
      isWide: aspectRatio < 0.9,
      blurDataURL,
      previews,
    };
  }),
};
await mkdir(path.dirname(runtimeManifestPath), { recursive: true });
const temporaryRuntimeManifest = `${runtimeManifestPath}.${process.pid}.tmp`;
await writeFile(temporaryRuntimeManifest, `${JSON.stringify(runtimeManifest)}\n`);
await rename(temporaryRuntimeManifest, runtimeManifestPath);
console.log(
  `Gallery previews: ${generated} generated, ${cached} cached (${((Date.now() - started) / 1000).toFixed(1)}s).`,
);

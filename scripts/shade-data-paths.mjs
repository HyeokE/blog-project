import { realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = await realpath(fileURLToPath(new URL('../', import.meta.url)));

/** Catalog inputs and generated data exports must stay outside the source checkout. */
export async function externalShadeDataPath(filePath) {
  const absolute = resolve(filePath);
  let resolved;
  try {
    resolved = await realpath(absolute);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    resolved = join(await realpath(dirname(absolute)), basename(absolute));
  }
  const location = relative(repositoryRoot, resolved);
  if (!isAbsolute(location) && location !== '..' && !location.startsWith(`..${sep}`)) {
    throw new TypeError('Shade data files must be outside the repository. Supply an external file path.');
  }
  return resolved;
}

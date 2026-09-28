import galleryManifest from '@/generated/gallery-manifest.json';
import type { ImageMetadata as DisplayMetadata } from './metadataClient';

type ImageMetadata = DisplayMetadata & { dateTimeOriginal?: Date };

export interface ImageData {
  id: number;
  src: string;
  alt: string;
  metadata: ImageMetadata;
  hasValidMetadata?: boolean;
  width?: number;
  height?: number;
  aspectRatio?: number;
  isWide?: boolean;
  blurDataURL?: string;
  previews?: Array<{ src: string; width: number; height: number }>;
}

type ManifestImage = Omit<ImageData, 'metadata'> & {
  metadata: Omit<ImageMetadata, 'dateTimeOriginal'> & { dateTimeOriginal?: string | null };
};

const images = galleryManifest.images as ManifestImage[];
const imagesBySource = new Map(images.map((image) => [image.src, image]));

function hydrateImage(image: ManifestImage): ImageData {
  const { dateTimeOriginal, ...metadata } = image.metadata;
  return {
    ...image,
    metadata: {
      ...metadata,
      ...(dateTimeOriginal ? { dateTimeOriginal: new Date(dateTimeOriginal) } : {}),
    },
    previews: image.previews?.map((preview) => ({ ...preview })),
  };
}

/** Build-time EXIF and preview metadata, without reading original photos in server functions. */
export const fetchImagesList = async (): Promise<ImageData[]> => images.map(hydrateImage);

/** Retains the shared gallery API and each caller's order, IDs, labels and selected subset. */
export const loadImagesMetadata = async (imageList: ImageData[]): Promise<ImageData[]> =>
  imageList.map((image) => {
    const generated = imagesBySource.get(image.src);
    if (!generated) {
      return image;
    }
    const hydrated = hydrateImage(generated);
    return { ...hydrated, id: image.id, alt: image.alt };
  });

/** The build generator and the legacy parser share the same EXIF formatting. */
export const EXIF_PARSE_OPTIONS = {
  tiff: true,
  exif: true,
  gps: true,
  pick: [
    'Make',
    'Model',
    'LensModel',
    'DateTimeOriginal',
    'GPSLatitude',
    'GPSLongitude',
    'FNumber',
    'ApertureValue',
    'ShutterSpeedValue',
    'ExposureTime',
    'ISO',
    'FocalLength',
  ],
};

/** @param {number[] | number} value */
function decimal(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 3) {
      return value[0] + value[1] / 60 + value[2] / 3600;
    }
    if (value.length === 2) {
      return value[0] + value[1] / 60;
    }
    if (value.length === 1) {
      return value[0];
    }
  }
  return NaN;
}

/** @param {number} lat @param {number} lng */
const coordinateLabel = async (lat, lng) => `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;

/**
 * @param {Record<string, any> | undefined} exifData
 * @param {(lat: number, lng: number) => Promise<string>} resolveLocation
 * @returns {Promise<{metadata: import('./metadataClient').ImageMetadata & {dateTimeOriginal?: Date}, hasValidMetadata: boolean}>}
 */
export async function normalizeExifData(exifData, resolveLocation = coordinateLabel) {
  if (!exifData) {
    return { metadata: {}, hasValidMetadata: false };
  }
  try {
    const lat = decimal(exifData.GPSLatitude);
    const lng = decimal(exifData.GPSLongitude);
    let coordinates, location;
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      coordinates = { lat, lng };
      location = await resolveLocation(lat, lng);
    }
    let aperture;
    if (exifData.FNumber) {
      aperture = `f/${exifData.FNumber.toFixed(1)}`;
    } else if (exifData.ApertureValue) {
      aperture = `f/${Math.pow(Math.sqrt(2), exifData.ApertureValue).toFixed(1)}`;
    }
    let shutterSpeed;
    const exposureTime =
      exifData.ExposureTime ||
      (exifData.ShutterSpeedValue ? Math.pow(2, -exifData.ShutterSpeedValue) : undefined);
    if (exposureTime) {
      shutterSpeed =
        exposureTime >= 1 ? `${exposureTime.toFixed(1)}초` : `1/${Math.round(1 / exposureTime)}초`;
    }
    const dateTimeOriginal = exifData.DateTimeOriginal
      ? new Date(exifData.DateTimeOriginal)
      : undefined;
    const metadata = {
      location,
      lens: exifData.LensModel,
      device: exifData.Model || exifData.Make,
      dateTime: dateTimeOriginal
        ? dateTimeOriginal.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : undefined,
      dateTimeOriginal,
      aperture,
      shutterSpeed,
      iso: exifData.ISO ? `ISO ${exifData.ISO}` : undefined,
      focalLength: exifData.FocalLength ? `${exifData.FocalLength}mm` : undefined,
      coordinates,
    };
    const hasValidMetadata = Boolean(
      metadata.lens ||
      metadata.device ||
      metadata.dateTime ||
      metadata.location ||
      metadata.aperture ||
      metadata.shutterSpeed ||
      metadata.iso ||
      metadata.focalLength,
    );
    return { metadata, hasValidMetadata };
  } catch (error) {
    console.error('EXIF 데이터 처리 중 오류 발생:', error);
    return { metadata: {}, hasValidMetadata: false };
  }
}

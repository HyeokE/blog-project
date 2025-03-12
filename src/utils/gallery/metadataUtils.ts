// exifr를 동적으로 import하도록 수정
// import exifr from 'exifr';

/**
 * 이미지 메타데이터 인터페이스 정의
 */
export interface ImageMetadata {
  location?: string;
  lens?: string;
  device?: string;
  dateTime?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  focalLength?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * 날짜를 한국어 형식으로 포맷팅하는 유틸리티 함수
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Next.js API 라우트를 통해 GPS 좌표를 주소로 변환
 */
export const getLocationFromCoordinates = async (lat: number, lng: number): Promise<string> => {
  try {
    // 좌표 유효성 검사
    if (!isValidCoordinate(lat, lng)) {
      console.warn('유효하지 않은 GPS 좌표입니다:', lat, lng);
      return '알 수 없는 위치';
    }

    // 로컬 API 라우트 호출 (서버 컴포넌트에서 사용 가능하도록 절대 URL 사용)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/geocode?lat=${lat}&lng=${lng}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // API에서 위치 정보 반환
    return data.location || `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('위치 정보를 가져오는 중 오류가 발생했습니다:', error);
    return `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
  }
};

/**
 * GPS 좌표 유효성 검사 함수
 */
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  // lat와 lng이 숫자인지 확인
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }

  // lat와 lng이 NaN이나 Infinity가 아닌지 확인
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    return false;
  }

  // 위도 범위: -90 ~ 90
  if (lat < -90 || lat > 90) {
    return false;
  }

  // 경도 범위: -180 ~ 180
  if (lng < -180 || lng > 180) {
    return false;
  }

  return true;
};

/**
 * GPS 좌표 배열을 단일 숫자로 변환하는 함수
 * EXIF 데이터에서 GPS 좌표는 종종 [degrees, minutes, seconds] 또는 [degrees, minutes] 형식의 배열로 저장됩니다.
 */
export const convertGPSArrayToDecimal = (coordinates: number[] | number): number => {
  // 이미 숫자인 경우 그대로 반환
  if (typeof coordinates === 'number') {
    return coordinates;
  }

  // 배열인 경우 DMS(도, 분, 초) 또는 DM(도, 분) 형식으로 가정하고 변환
  if (Array.isArray(coordinates)) {
    if (coordinates.length === 3) {
      // DMS 형식: [degrees, minutes, seconds]
      return coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600;
    } else if (coordinates.length === 2) {
      // DM 형식: [degrees, minutes]
      return coordinates[0] + coordinates[1] / 60;
    } else if (coordinates.length === 1) {
      // 단일 값만 있는 경우
      return coordinates[0];
    }
  }

  // 변환할 수 없는 경우 NaN 반환
  console.warn('변환할 수 없는 GPS 좌표 형식:', coordinates);
  return NaN;
};

/**
 * 이미지 메타데이터를 파싱하는 유틸리티 함수
 * exifr 라이브러리를 사용하여 EXIF 데이터를 추출합니다
 */
export const parseImageMetadata = async (
  url: string,
): Promise<{ metadata: ImageMetadata; hasValidMetadata: boolean }> => {
  try {
    // 실제 exifr 라이브러리를 사용하여 EXIF 데이터를 파싱합니다
    const response = await fetch(url, { cache: 'no-store' });

    // Blob 대신 ArrayBuffer 사용
    const arrayBuffer = await response.arrayBuffer();

    // 동적으로 exifr 라이브러리 import
    const exifr = (await import('exifr')).default;

    try {
      // exifr 라이브러리로 EXIF 데이터 추출
      const exifData = await exifr.parse(arrayBuffer, {
        // 필요한 태그만 지정하여 파싱 속도를 향상시킵니다
        tiff: true,
        exif: true,
        gps: true,
        // 필요한 특정 태그들 (추가 메타데이터 포함)
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
      });

      // EXIF 데이터가 없는 경우 빈 객체와 유효하지 않음 플래그 반환
      if (!exifData) {
        return { metadata: {}, hasValidMetadata: false };
      }

      // EXIF 데이터 로깅 (디버깅 용도)
      console.info('추출된 EXIF 데이터:', {
        lat: exifData.GPSLatitude,
        lng: exifData.GPSLongitude,
        lens: exifData.LensModel,
        device: exifData.Model || exifData.Make,
        date: exifData.DateTimeOriginal,
        aperture: exifData.FNumber || exifData.ApertureValue,
        shutterSpeed: exifData.ShutterSpeedValue || exifData.ExposureTime,
        iso: exifData.ISO,
        focalLength: exifData.FocalLength,
      });

      // GPS 좌표 변환 (배열 → 십진수)
      let decimalLat, decimalLng;

      if (exifData.GPSLatitude !== undefined) {
        decimalLat = convertGPSArrayToDecimal(exifData.GPSLatitude);
      }

      if (exifData.GPSLongitude !== undefined) {
        decimalLng = convertGPSArrayToDecimal(exifData.GPSLongitude);
      }

      // 변환된 좌표가 유효한지 확인하고 좌표 저장
      let coordinates, location;
      if (
        decimalLat !== undefined &&
        decimalLng !== undefined &&
        isValidCoordinate(decimalLat, decimalLng)
      ) {
        coordinates = {
          lat: decimalLat,
          lng: decimalLng,
        };

        // 변환된 좌표 로깅
        console.info('변환된 GPS 좌표:', coordinates);

        // 서버 API를 통해 좌표에서 위치 정보 얻기
        location = await getLocationFromCoordinates(decimalLat, decimalLng);
      }

      // 조리개값 포맷팅
      let aperture;
      if (exifData.FNumber) {
        aperture = `f/${exifData.FNumber.toFixed(1)}`;
      } else if (exifData.ApertureValue) {
        // ApertureValue는 APEX 값으로 저장되므로 변환이 필요합니다
        const fNumber = Math.pow(Math.sqrt(2), exifData.ApertureValue);
        aperture = `f/${fNumber.toFixed(1)}`;
      }

      // 셔터 스피드 포맷팅
      let shutterSpeed;
      if (exifData.ExposureTime) {
        // ExposureTime은 초 단위로 저장됩니다 (예: 1/100초는 0.01로 저장)
        const exposureTime = exifData.ExposureTime;
        if (exposureTime >= 1) {
          shutterSpeed = `${exposureTime.toFixed(1)}초`;
        } else {
          const denominator = Math.round(1 / exposureTime);
          shutterSpeed = `1/${denominator}초`;
        }
      } else if (exifData.ShutterSpeedValue) {
        // ShutterSpeedValue는 APEX 값으로 저장되므로 변환이 필요합니다
        const exposureTime = Math.pow(2, -exifData.ShutterSpeedValue);
        if (exposureTime >= 1) {
          shutterSpeed = `${exposureTime.toFixed(1)}초`;
        } else {
          const denominator = Math.round(1 / exposureTime);
          shutterSpeed = `1/${denominator}초`;
        }
      }

      // ISO 포맷팅
      const iso = exifData.ISO ? `ISO ${exifData.ISO}` : undefined;

      // 초점 거리 포맷팅
      const focalLength = exifData.FocalLength ? `${exifData.FocalLength}mm` : undefined;

      // 날짜 포맷팅
      const dateTime = exifData.DateTimeOriginal
        ? formatDate(new Date(exifData.DateTimeOriginal))
        : undefined;

      const metadata = {
        location,
        lens: exifData.LensModel,
        device: exifData.Model || exifData.Make,
        dateTime,
        aperture,
        shutterSpeed,
        iso,
        focalLength,
        coordinates,
      };

      // 메타데이터가 유효한지 확인 (최소한 하나 이상의 필드가 존재해야 함)
      const hasValidMetadata = Boolean(
        location ||
          exifData.LensModel ||
          exifData.Model ||
          exifData.Make ||
          dateTime ||
          aperture ||
          shutterSpeed ||
          iso ||
          focalLength,
      );

      return { metadata, hasValidMetadata };
    } catch (exifrError) {
      console.error('EXIF 데이터 파싱 오류:', exifrError);
      return { metadata: {}, hasValidMetadata: false };
    }
  } catch (error) {
    console.error('이미지 메타데이터 파싱 오류:', error);
    // 에러 발생 시 빈 객체와 유효하지 않음 플래그 반환
    return { metadata: {}, hasValidMetadata: false };
  }
};

/**
 * 좌표를 사용자가 링크로 열 수 있는 형식으로 변환
 */
export const getMapLink = (coordinates: { lat: number; lng: number }) => {
  const { lat, lng } = coordinates;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

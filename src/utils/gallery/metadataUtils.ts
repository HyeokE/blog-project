import exifr from 'exifr';

/**
 * 이미지 메타데이터 인터페이스 정의
 */
export interface ImageMetadata {
  location?: string;
  lens?: string;
  device?: string;
  dateTime?: string;
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

    // 로컬 API 라우트 호출
    const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);

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
    const response = await fetch(url);
    const blob = await response.blob();

    // exifr 라이브러리로 EXIF 데이터 추출
    const exifData = await exifr.parse(blob, {
      // 필요한 태그만 지정하여 파싱 속도를 향상시킵니다
      tiff: true,
      exif: true,
      gps: true,
      // 필요한 특정 태그들
      pick: ['Make', 'Model', 'LensModel', 'DateTimeOriginal', 'GPSLatitude', 'GPSLongitude'],
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

    // 날짜 포맷팅
    const dateTime = exifData.DateTimeOriginal
      ? formatDate(new Date(exifData.DateTimeOriginal))
      : undefined;

    const metadata = {
      location,
      lens: exifData.LensModel,
      device: exifData.Model || exifData.Make,
      dateTime,
      coordinates,
    };

    // 메타데이터가 유효한지 확인 (최소한 하나 이상의 필드가 존재해야 함)
    const hasValidMetadata = Boolean(
      location || exifData.LensModel || exifData.Model || exifData.Make || dateTime,
    );

    return { metadata, hasValidMetadata };
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

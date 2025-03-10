import { NextResponse } from 'next/server';

// Google Maps API 키
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(request: Request) {
  // URL에서 쿼리 파라미터 추출
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  // 파라미터 유효성 검사
  if (!lat || !lng) {
    return NextResponse.json(
      { error: '위도(lat)와 경도(lng) 파라미터가 필요합니다.' },
      { status: 400 },
    );
  }

  try {
    // Google Maps Geocoding API 호출
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ko&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // API 응답 확인
    if (data.status !== 'OK') {
      // API 오류 발생 시 기본 위치 정보 반환
      return NextResponse.json({
        location: `위도 ${lat}, 경도 ${lng}`,
        error: data.error_message || data.status,
      });
    }

    // 결과가 없는 경우
    if (!data.results || data.results.length === 0) {
      return NextResponse.json({
        location: `위도 ${lat}, 경도 ${lng}`,
      });
    }

    // 가장 상세한 주소 정보 선택 (첫 번째 결과 사용)
    const addressComponents = data.results[0].address_components;

    // 적절한 주소 컴포넌트 찾기 (행정 구역 우선)
    const sublocality = addressComponents.find(
      (component: any) =>
        component.types.includes('sublocality_level_1') || component.types.includes('sublocality'),
    );

    const locality = addressComponents.find((component: any) =>
      component.types.includes('locality'),
    );

    const adminArea = addressComponents.find((component: any) =>
      component.types.includes('administrative_area_level_1'),
    );

    // 주소 조합
    let formattedAddress = '';

    if (adminArea) {
      formattedAddress += adminArea.short_name;
    }

    if (locality && locality.short_name !== adminArea?.short_name) {
      formattedAddress += ` ${locality.short_name}`;
    }

    if (sublocality) {
      formattedAddress += ` ${sublocality.short_name}`;
    }

    const location = formattedAddress.trim() || data.results[0].formatted_address;

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Geocoding API 오류:', error);
    return NextResponse.json(
      {
        location: `위도 ${lat}, 경도 ${lng}`,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 },
    );
  }
}

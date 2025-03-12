import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 지원하는 이미지 확장자
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export async function GET() {
  try {
    // public/images 디렉토리 경로
    const imagesDirectory = path.join(process.cwd(), 'public', 'images');

    console.log('이미지 디렉토리 경로:', imagesDirectory);

    // 디렉토리가 존재하는지 확인
    if (!fs.existsSync(imagesDirectory)) {
      console.error('이미지 디렉토리를 찾을 수 없습니다:', imagesDirectory);
      // 디렉토리가 없으면 생성 시도
      try {
        fs.mkdirSync(imagesDirectory, { recursive: true });
        console.log('이미지 디렉토리를 생성했습니다:', imagesDirectory);
        // 빈 배열 반환 (이미지 없음)
        return NextResponse.json({ images: [] });
      } catch (mkdirError) {
        console.error('이미지 디렉토리 생성 실패:', mkdirError);
        return NextResponse.json(
          { error: '이미지 디렉토리를 찾을 수 없고 생성할 수 없습니다.' },
          { status: 500 },
        );
      }
    }

    // 디렉토리 내용 읽기
    const fileNames = fs.readdirSync(imagesDirectory);
    console.log('이미지 디렉토리 내 파일 수:', fileNames.length);

    // 이미지 파일만 필터링
    const imageFiles = fileNames.filter((fileName) => {
      const extension = path.extname(fileName).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(extension);
    });

    console.log('필터링된 이미지 파일 수:', imageFiles.length);

    // 이미지 데이터 구성
    const images = imageFiles.map((fileName, index) => ({
      id: index + 1,
      src: `/images/${fileName}`,
      alt: `갤러리 이미지 ${index + 1}`,
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error('이미지 목록을 가져오는 중 오류 발생:', error);
    // 오류 세부 정보 포함
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('오류 메시지:', errorMessage);
    console.error('오류 스택:', errorStack);

    return NextResponse.json(
      {
        error: '이미지 목록을 가져오는 중 오류가 발생했습니다.',
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

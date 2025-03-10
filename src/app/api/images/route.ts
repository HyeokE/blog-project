import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 지원하는 이미지 확장자
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export async function GET() {
  try {
    // public/images 디렉토리 경로
    const imagesDirectory = path.join(process.cwd(), 'public', 'images');

    // 디렉토리가 존재하는지 확인
    if (!fs.existsSync(imagesDirectory)) {
      return NextResponse.json({ error: 'images 디렉토리를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 디렉토리 내용 읽기
    const fileNames = fs.readdirSync(imagesDirectory);

    // 이미지 파일만 필터링
    const imageFiles = fileNames.filter((fileName) => {
      const extension = path.extname(fileName).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(extension);
    });

    // 이미지 데이터 구성
    const images = imageFiles.map((fileName, index) => ({
      id: index + 1,
      src: `/images/${fileName}`,
      alt: `갤러리 이미지 ${index + 1}`,
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error('이미지 목록을 가져오는 중 오류 발생:', error);
    return NextResponse.json(
      { error: '이미지 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

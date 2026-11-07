import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Shade Finder — 익숙한 컬러에서, 새로운 선택으로. 파운데이션과 쿠션의 비슷한 컬러 찾기';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const fontData = Promise.all(['SUIT-Regular.ttf', 'SUIT-ExtraBold.ttf'].map(file =>
  readFile(join(process.cwd(), 'public', 'fonts', file)),
));
const swatches = [
  { hex: '#efd7bb', left: 8, top: 24, angle: -15 },
  { hex: '#e5bda0', left: 88, top: 4, angle: -5 },
  { hex: '#c89a76', left: 168, top: 4, angle: 5 },
  { hex: '#a57350', left: 248, top: 24, angle: 15 },
];

export default async function Image() {
  const [regular, bold] = await fontData;
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '54px 64px', background: '#fafafa', color: '#262626', fontFamily: 'SUIT' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>HYEOK.</span>
        <span style={{ fontSize: 18, letterSpacing: 3, color: '#626262' }}>CRAFT</span>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 590 }}>
          <div style={{ display: 'flex', fontSize: 82, fontWeight: 800, letterSpacing: -3, lineHeight: 1.1 }}>Shade Finder</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30, fontSize: 43, fontWeight: 800, lineHeight: 1.3, letterSpacing: -1 }}>
            <span>익숙한 컬러에서,</span>
            <span>새로운 선택으로.</span>
          </div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 23, color: '#626262' }}>파운데이션 · 쿠션 컬러 찾기</div>
        </div>

        <div style={{ display: 'flex', position: 'relative', width: 424, height: 336, marginRight: 10 }}>
          {swatches.map(swatch => <div key={swatch.hex} style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: swatch.left, top: swatch.top, width: 156, height: 284, padding: 9, background: '#ffffff', border: '1px solid #d8d8d8', borderRadius: 4, transform: `rotate(${swatch.angle}deg)`, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', width: '100%', height: 228, background: swatch.hex, borderRadius: 2 }} />
            <span style={{ marginTop: 12, fontSize: 15, color: '#626262' }}>{swatch.hex}</span>
          </div>)}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d5d5d5', paddingTop: 23, fontSize: 18, color: '#626262' }}>
        <span>내가 쓰는 컬러로 찾는 새로운 제품</span>
        <span>hyeok.dev/craft/shade-finder</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'SUIT', data: regular, weight: 400, style: 'normal' },
        { name: 'SUIT', data: bold, weight: 800, style: 'normal' },
      ],
    },
  );
}

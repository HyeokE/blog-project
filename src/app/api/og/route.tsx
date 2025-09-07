import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get('title') || '';
    const header = searchParams.get('header') || '';
    
    const date = searchParams.get('date') || '';

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const fontData = await fetch(`${siteUrl}/fonts/SUIT-Regular.ttf`).then((res) =>
      res.arrayBuffer(),
    );
    const fontBoldData = await fetch(`${siteUrl}/fonts/SUIT-Bold.ttf`).then((res) =>
      res.arrayBuffer(),
    );

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#fefbf6',
            color: '#4b4d39',
            display: 'flex',
            position: 'relative',
            fontFamily: 'SUIT',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '80px',
              width: '100%',
              height: '100%',
              gap: 28,
            }}
          >
            {header ? (
              <div
                style={{
                  fontSize: 32,
                  color: '#4b4d39',
                  fontFamily: 'SUIT',
                  fontWeight: 800,
                }}
              >
                {header}
              </div>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 800,
                  lineHeight: 1.08,
                  width: '100%',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'SUIT',
                }}
              >
                {title}
              </div>
            </div>
            
            {date ? (
              <div style={{ fontSize: 36, color: '#4b4d39' }}>{date}</div>
            ) : null}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'SUIT',
            data: fontData,
            style: 'normal',
            weight: 400,
          },
          {
            name: 'SUIT',
            data: fontBoldData,
            style: 'normal',
            weight: 800,
          },
        ],
      },
    );
  } catch (_e: unknown) {
    return new Response('Failed to generate the Image', { status: 500 });
  }
}

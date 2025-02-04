import { ImageResponse } from 'next/og';

// export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fontData = await fetch(new URL('../../fonts/SUIT-Regular.ttf', import.meta.url)).then(
      (res) => res.arrayBuffer(),
    );

    const hasTitle = searchParams.has('title');
    const title = decodeURIComponent(
      hasTitle ? (searchParams.get('title')?.slice(0, 100) ?? '') : 'Hyeok.dev',
    );

    const size = { width: 2400, height: 1260 };

    return new ImageResponse(
      (
        <div
          style={{
            backgroundColor: 'white',
            color: 'black',
            fontFamily: 'SUIT',
            fontSize: '64px',
            background: 'white',
            width: '100%',
            height: '100%',
            padding: '50px 200px',
            textAlign: 'center',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {title}
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: 'SUIT',
            data: fontData,
            style: 'normal',
          },
        ],
      },
    );
  } catch (_e: unknown) {
    return new Response(`Failed to generate the Image`, { status: 500 });
  }
}

import GalleryContent from '@/container/gallery/GalleryPage';
import WallPageShell from '../WallPageShell';

export default function GalleryPage() {
  return (
    <WallPageShell className="wall-gallery-page">
      <div className="wall-gallery-content">
        <header className="wall-page-intro">
          <h1>Gallery</h1>
          <p>혼자 보기 아쉬운 아름다운 순간을 공유합니다.</p>
        </header>
        <div className="wall-gallery">
          <GalleryContent />
        </div>
      </div>
    </WallPageShell>
  );
}

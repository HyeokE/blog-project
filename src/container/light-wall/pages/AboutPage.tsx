import AboutContent from '@/container/about/AboutPage';
import WallPageShell from '../WallPageShell';

export default function AboutPage() {
  return (
    <WallPageShell className="wall-about-page" lighting={false}>
      <div className="wall-reading wall-about-content">
        <AboutContent />
      </div>
    </WallPageShell>
  );
}

import WallPageShell from '@/container/light-wall/WallPageShell';
import SiteError from '@/components/site-error/SiteError';

export default function NotFound() {
  return <WallPageShell lighting={false}><SiteError status="404" /></WallPageShell>;
}

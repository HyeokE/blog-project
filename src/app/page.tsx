import HomePage from '@/container/home/HomePage';
import { NavDock } from '@/components/NavDock';

export default function Home() {
  return (
    <div className="flex flex-col w-dvw gap-8 items-center justify-center h-dvh">
      <HomePage />
      <NavDock />
    </div>
  );
}

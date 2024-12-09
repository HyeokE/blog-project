import * as motion from 'motion/react-client';
import HomePage from '@/container/home/HomePage';
import { NavDock } from '@/components/NavDock';
import React from 'react';

export default function Home() {
  return (
    <div className="flex flex-col w-full gap-8 items-center justify-center pt-[100px]">
      <motion.main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <HomePage />
      </motion.main>
      <NavDock />
    </div>
  );
}

'use client';

import { LayoutGroup, motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <LayoutGroup>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: 'easeInOut', duration: 0.75 }}
      >
        {children}
      </motion.div>
    </LayoutGroup>
  );
}
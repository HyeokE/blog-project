'use client';

import { useScrollContext } from '@/context/ScrollContext';
import { motion, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import type { AboutProfile, PortfolioCompanyGroup, WorkPrinciple } from '../data';
import { AboutHeroSection } from './AboutHeroSection';
import { ContactSection } from './ContactSection';
import { SelectedWorkSection } from './SelectedWorkSection';
import { WorkPrinciplesSection } from './WorkPrinciplesSection';

interface AboutPortfolioSceneProps {
  profile: AboutProfile;
  companyGroups: PortfolioCompanyGroup[];
  principles: WorkPrinciple[];
}

function ScrollProgressBar() {
  const containerRef = useScrollContext();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (containerRef?.current) {
      setIsReady(true);
    }
    const timer = window.setTimeout(() => {
      if (containerRef?.current) {
        setIsReady(true);
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [containerRef]);

  const { scrollYProgress } = useScroll({
    container: isReady && containerRef ? containerRef : undefined,
    layoutEffect: false,
  });

  return (
    <motion.div
      style={{ scaleX: scrollYProgress }}
      className="fixed top-0 right-0 left-0 z-50 h-[2px] bg-foreground/20 [transform-origin:left]"
    />
  );
}

export function AboutPortfolioScene({ profile, companyGroups, principles }: AboutPortfolioSceneProps) {
  return (
    <div className="relative">
      <ScrollProgressBar />
      <AboutHeroSection profile={profile} />
      <SelectedWorkSection companyGroups={companyGroups} />
      <WorkPrinciplesSection principles={principles} />
      <ContactSection />
    </div>
  );
}

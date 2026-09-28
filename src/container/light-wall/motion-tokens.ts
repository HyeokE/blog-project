export const motionTokens = {
  duration: { instant: 0.08, fast: 0.18, normal: 0.35 },
  easing: { smooth: [0.22, 1, 0.36, 1] as const },
  distance: { xs: 4, sm: 8 },
  scale: { subtle: 0.98, press: 0.95 },
  stagger: 0.06,
};

export const springs = {
  snappy: { type: 'spring' as const, stiffness: 300, damping: 30 },
  gentle: { type: 'spring' as const, stiffness: 180, damping: 25, mass: 0.8 },
};

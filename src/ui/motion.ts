import type { Transition, Variants } from 'motion/react';

/** Motion durations (seconds) and easings, mirrored from the theme tokens for Motion. */
export const duration = { fast: 0.15, base: 0.25, slow: 0.45 } as const;
export const easing = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.3, 0, 0, 1.15],
  exit: [0.4, 0, 1, 1],
} as const;

export const baseTransition: Transition = { duration: duration.base, ease: easing.standard };

/** Container that reveals its children one after the other (guides the eye top to bottom). */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: easing.standard } },
};

/** Step transitions in multi-step flows: forward slides left, back slides right. */
export const stepVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0, transition: { duration: duration.base, ease: easing.standard } },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir >= 0 ? -32 : 32,
    transition: { duration: duration.fast, ease: easing.exit },
  }),
};

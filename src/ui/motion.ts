/** Motion durations (seconds) and easings, mirrored from the theme tokens for Motion. */
export const duration = { fast: 0.15, base: 0.25, slow: 0.45 } as const;
export const easing = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.3, 0, 0, 1.15],
  exit: [0.4, 0, 1, 1],
} as const;

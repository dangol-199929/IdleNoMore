import { useEffect, useMemo, useState } from 'react';

import type { Photo } from '../types/photo';

/** Deterministic shuffle so the order stays stable between renders. */
function shuffled<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Advances through photos on a timer. The timer only runs while `running` is
 * true (page visible, app in foreground, not paused), so a hidden slideshow
 * costs nothing.
 */
export function useSlideshow(
  photos: Photo[],
  intervalSeconds: number,
  shuffle: boolean,
  running: boolean,
) {
  const [seed] = useState(() => Date.now() % 100000);
  const order = useMemo(() => (shuffle ? shuffled(photos, seed) : photos), [photos, shuffle, seed]);
  const [index, setIndex] = useState(0);
  const safeIndex = order.length === 0 ? 0 : index % order.length;

  useEffect(() => {
    if (!running || order.length < 2) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % order.length),
      intervalSeconds * 1000,
    );
    return () => clearInterval(timer);
  }, [running, order.length, intervalSeconds]);

  const step = (delta: number) =>
    setIndex((i) => (order.length === 0 ? 0 : (i + delta + order.length) % order.length));

  return {
    current: order[safeIndex] ?? null,
    next: order.length > 1 ? order[(safeIndex + 1) % order.length] : null,
    index: safeIndex,
    count: order.length,
    previous: () => step(-1),
    advance: () => step(1),
  };
}

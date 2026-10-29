// A small loop of offsets (in dp) that the clock steps through, so static
// pixels are not lit in exactly the same place all day. This spreads OLED wear
// a little; it does not guarantee against burn-in.
const OFFSETS: readonly [number, number][] = [
  [0, 0],
  [4, 2],
  [6, -3],
  [2, -6],
  [-3, -5],
  [-6, -1],
  [-4, 4],
  [1, 6],
  [5, 5],
];

const MINUTES_PER_STEP = 3;

export function burnInOffset(date: Date): { x: number; y: number } {
  const minute = date.getHours() * 60 + date.getMinutes();
  const [x, y] = OFFSETS[Math.floor(minute / MINUTES_PER_STEP) % OFFSETS.length];
  return { x, y };
}

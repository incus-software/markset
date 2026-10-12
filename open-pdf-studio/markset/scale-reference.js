// Markset: pure helper for the Calibrate tool (scale-tools.js).

const MIN_PX = 3; // screen pixels: shorter is a slip, not a reference line

/** Page-space length of the reference line, or null when it is too short. */
export function referenceLength(p1, p2, zoom = 1) {
  if (!p1 || !p2) return null;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  return len * (zoom > 0 ? zoom : 1) >= MIN_PX ? len : null;
}

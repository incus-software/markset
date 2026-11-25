// Markset: helpers for the compare change list. Upstream listed each change as
// "~123×45 px @ (310, 88)" in detection pixels, which tells a reviewer
// nothing. Here a change is described by where it sits on the sheet (a 3×3
// grid: upper left … lower right) and its size on paper in inches, and the
// list can be stepped through change by change.

/** i18n keys (ribbon.json compare.zone.*) for the 3×3 sheet grid, row by row. */
export const SHEET_ZONES = [
  'upperLeft', 'upperCenter', 'upperRight',
  'middleLeft', 'center', 'middleRight',
  'lowerLeft', 'lowerCenter', 'lowerRight',
];

/**
 * Where on the sheet a change sits, as a SHEET_ZONES key, from the centre of
 * its box. Needs the sheet size in the change's own px (sheetW/sheetH, set by
 * compare-viewport.js). Returns null when that is unknown.
 */
export function sheetZone(change) {
  if (!change || !(change.sheetW > 0) || !(change.sheetH > 0)) return null;
  const fx = (change.x + change.width / 2) / change.sheetW;
  const fy = (change.y + change.height / 2) / change.sheetH;
  const col = Math.max(0, Math.min(2, Math.floor(fx * 3)));
  const row = Math.max(0, Math.min(2, Math.floor(fy * 3)));
  return SHEET_ZONES[row * 3 + col];
}

/**
 * Size of a change on paper, e.g. `2.1" × 0.8"`. Detection px / detectScale is
 * PDF points; 72 points to the inch. Returns null without a detectScale.
 */
export function changeSizeInches(change) {
  if (!change || !(change.detectScale > 0)) return null;
  const inch = (px) => {
    const v = px / change.detectScale / 72;
    return v < 0.1 ? '<0.1' : v.toFixed(1);
  };
  return `${inch(change.width)}" × ${inch(change.height)}"`;
}

/**
 * The change after (dir = 1) or before (dir = -1) `current` in `list`,
 * wrapping at the ends. With no current change, the first (or last) one.
 */
export function stepChange(list, current, dir = 1) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const i = list.indexOf(current);
  if (i < 0) return dir < 0 ? list[list.length - 1] : list[0];
  return list[(i + (dir < 0 ? -1 : 1) + list.length) % list.length];
}

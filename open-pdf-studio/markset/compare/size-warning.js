// Markset: reactive "sheets are different sizes" warning for the compare view.
// Set by compare-viewport.js after each detection run, shown by CompareView.
import { createSignal } from 'solid-js';

const [mismatch, setMismatch] = createSignal(null);

/** null, or { old: '36.0" × 24.0"', new: '42.0" × 30.0"' } */
export { mismatch as compareSizeMismatch };
export function setCompareSizeMismatch(value) { setMismatch(value || null); }

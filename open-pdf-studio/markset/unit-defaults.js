// Markset: the unit-system defaults for the current preferences. Kept apart
// from us-units.js so that module stays free of app state.
import { state } from '../js/core/state.js';
import { unitDefaultsFor } from './us-units.js';

/** { unit, ratio, scaleString, viewportPreset, paper } for the unitSystem preference. */
export function unitDefaults() {
  return unitDefaultsFor(state.preferences);
}

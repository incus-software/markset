// Markset: single-key shortcuts for bundled symbols (K = checkmark, X = X).
// keyboard-handlers.js calls this for keys it does not use itself.
import { marksetShortcutSymbol } from './index.js';

/** Starts placing the symbol bound to `key`; true when the key was handled. */
export function marksetSymbolKey(key) {
  const symbol = marksetShortcutSymbol(key);
  if (!symbol) return false;
  // Same path as a click in the symbol palette.
  import('../../js/solid/components/SymbolPalette.jsx').then(m => m.selectSymbol(symbol));
  return true;
}

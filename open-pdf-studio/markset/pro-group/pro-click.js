// Markset: what clicking a Pro tool does, shared by the Toolpalette's
// "Markset Pro" group and the Markset Pro ribbon tab.
import { setTool } from '../../js/tools/manager.js';
import { showMessage } from '../../js/solid/stores/dialogStore.js';
import { openExtern } from '../../js/core/extern-openen.js';
import { proUpsellMessage, PRO_URL } from './pro-tools.js';

/**
 * Run a Pro tool from proTools(). A greyed-out one (no Pro plugin) explains
 * that it is part of Markset Pro instead.
 * @returns {boolean} true when the tool ran
 */
export function clickProTool(t) {
  if (!t.enabled) {
    showMessage(proUpsellMessage(t), 'Markset Pro', { action: { label: 'Visit usemarkset.com', onClick: () => openExtern(PRO_URL) } });
    return false;
  }
  if (t.tool) setTool(t.tool);
  else t.onClick?.();
  return true;
}

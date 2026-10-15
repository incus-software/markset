import test from 'node:test';
import assert from 'node:assert/strict';
import { proTools, registerProTool, unregisterProTool, proUpsellMessage, PRO_TOOL_PLACEHOLDERS } from './pro-tools.js';

test('Pro tools are listed greyed out until the plugin turns them on', () => {
  const before = proTools();
  assert.deepEqual(before.map((t) => t.id), PRO_TOOL_PLACEHOLDERS.map((t) => t.id));
  assert.ok(before.every((t) => !t.enabled));

  const off = registerProTool({ id: 'seal', tool: 'markset-pro-seal' });
  const seal = proTools().find((t) => t.id === 'seal');
  assert.equal(seal.enabled, true);
  assert.equal(seal.tool, 'markset-pro-seal');
  assert.equal(seal.label, 'Seal'); // keeps the placeholder's label and icon
  assert.ok(seal.icon.includes('<svg'));

  off();
  assert.equal(proTools().find((t) => t.id === 'seal').enabled, false);
});

test('plugins can add tools beyond the placeholders, and must give an action', () => {
  registerProTool({ id: 'future-tool', label: 'Future tool', onClick() {} });
  assert.ok(proTools().some((t) => t.id === 'future-tool' && t.enabled));
  unregisterProTool('future-tool');
  assert.ok(!proTools().some((t) => t.id === 'future-tool'));
  // A listed tool goes back to greyed out, not away.
  registerProTool({ id: 'submittal-log', onClick() {} });
  unregisterProTool('submittal-log');
  assert.ok(proTools().some((t) => t.id === 'submittal-log' && !t.enabled));
  assert.throws(() => registerProTool({ id: 'x' }), /tool or onClick/);
  assert.throws(() => registerProTool({ tool: 'y' }), /id is required/);
});

test('upsell message names the tool', () => {
  assert.match(proUpsellMessage({ label: 'Seal', description: 'Place it.' }), /Seal is part of Markset Pro/);
});

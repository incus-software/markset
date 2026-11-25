import test from 'node:test';
import assert from 'node:assert/strict';
import { proTools, proSections, PRO_SECTIONS, registerProTool, unregisterProTool, proUpsellMessage, PRO_TOOL_PLACEHOLDERS, defaultClosedSections, ribbonColumns } from './pro-tools.js';

test('ribbon tab: short sections get large buttons, long ones stacks of three small', () => {
  const tools = (n) => Array.from({ length: n }, (_, i) => ({ id: `t${i}` }));
  assert.deepEqual(ribbonColumns(tools(6)).map((c) => c.length), [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(ribbonColumns(tools(7)).map((c) => c.length), [3, 3, 1]);
  assert.deepEqual(ribbonColumns(tools(26)).flat().map((t) => t.id), tools(26).map((t) => t.id), 'every tool, in order');
  assert.deepEqual(ribbonColumns([]), []);
});

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

test('tools are listed under their sections, in a fixed order, with unnamed ones under More', () => {
  const offs = [
    registerProTool({ id: 'case-file', section: 'Expert Witness', label: 'Case file', onClick() {} }),
    registerProTool({ id: 'revisions', section: 'Construction Admin', label: 'Revisions', onClick() {} }),
    registerProTool({ id: 'old-plugin-tool', label: 'Old tool', onClick() {} }),
    registerProTool({ id: 'mine', section: 'My Section', label: 'Mine', onClick() {} }),
  ];
  const sections = proSections();
  assert.deepEqual(sections.map((s) => s.name),
    ['Review & Seal', 'Construction Admin', 'Expert Witness', 'General', 'My Section', 'More']);
  assert.deepEqual(sections[0].tools.map((t) => t.id).slice(0, 2), ['review-stamp', 'seal']);
  assert.deepEqual(sections.find((s) => s.name === 'Expert Witness').tools.map((t) => t.id), ['case-file']);
  assert.deepEqual(sections.at(-1).tools.map((t) => t.id), ['old-plugin-tool']);
  offs.forEach((off) => off());
  // Without the plugin, only the placeholders' sections.
  assert.deepEqual(proSections().map((s) => s.name), ['Review & Seal', 'General']);
  assert.deepEqual(PRO_SECTIONS.slice(0, 3), ['Review & Seal', 'Construction Admin', 'Expert Witness']);
});

test('a plugin can move a placeholder tool to another section', () => {
  const off = registerProTool({ id: 'firm-kit', section: 'Review & Seal', onClick() {} });
  assert.ok(proSections()[0].tools.some((t) => t.id === 'firm-kit'));
  off();
});

test('until the user opens or closes a section, only one section is open', () => {
  const sections = [
    { name: 'Review & Seal', tools: [{ enabled: false }] },
    { name: 'Construction Admin', tools: [{ enabled: true }] },
    { name: 'Expert Witness', tools: [{ enabled: true }] },
    { name: 'General', tools: [{ enabled: true }] },
  ];
  // The last used Pro tool's section stays open.
  assert.deepEqual(defaultClosedSections(sections, 'Expert Witness'), ['Review & Seal', 'Construction Admin', 'General']);
  // Nothing used yet (or a section that is gone): the first one with a tool you can use.
  assert.deepEqual(defaultClosedSections(sections), ['Review & Seal', 'Expert Witness', 'General']);
  assert.deepEqual(defaultClosedSections(sections, 'Gone'), ['Review & Seal', 'Expert Witness', 'General']);
  // Without Markset Pro nothing can be used: the first section.
  const free = sections.map((x) => ({ ...x, tools: [{ enabled: false }] }));
  assert.deepEqual(defaultClosedSections(free), ['Construction Admin', 'Expert Witness', 'General']);
  assert.deepEqual(defaultClosedSections([]), []);
});

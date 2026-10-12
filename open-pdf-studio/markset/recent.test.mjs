import test from 'node:test';
import assert from 'node:assert/strict';
import { startScreenRecents, folderOf } from './recent.js';

test('start screen: pinned first, then most recent, at most 8', () => {
  const files = [
    { path: 'C:\\a.pdf', timestamp: 1 },
    { path: 'C:\\b.pdf', timestamp: 5, pinned: true },
    { path: 'C:\\c.pdf', timestamp: 9 },
    { path: 'C:\\d.pdf', timestamp: 3, pinned: true },
    null, { name: 'no path' },
  ];
  assert.deepEqual(startScreenRecents(files).map(f => f.path), ['C:\\b.pdf', 'C:\\d.pdf', 'C:\\c.pdf', 'C:\\a.pdf']);
  const many = Array.from({ length: 20 }, (_, i) => ({ path: `/f${i}.pdf`, timestamp: i }));
  assert.equal(startScreenRecents(many).length, 8);
  assert.equal(startScreenRecents(many)[0].path, '/f19.pdf');
  assert.deepEqual(startScreenRecents(undefined), []);
});

test('folderOf', () => {
  assert.equal(folderOf('C:\\Jobs\\2026\\A-101.pdf'), 'C:\\Jobs\\2026');
  assert.equal(folderOf('/home/me/plan.pdf'), '/home/me');
  assert.equal(folderOf('plan.pdf'), '');
});

// Plugin file pickers: many files at once, a folder, and cancelling.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickedPaths, createFilePickApi } from './plugin-file-pick.js';

test('pickedPaths: one path, a list, objects with a path, or nothing', () => {
  assert.deepEqual(pickedPaths('C:/a.jpg'), ['C:/a.jpg']);
  assert.deepEqual(pickedPaths(['C:/a.jpg', 'C:/b.HEIC']), ['C:/a.jpg', 'C:/b.HEIC']);
  assert.deepEqual(pickedPaths([{ path: 'C:/a.jpg' }, null, '']), ['C:/a.jpg']);
  assert.deepEqual(pickedPaths(null), []);
});

test('pickFilePaths asks for many files; pickFolderPath for a folder', async () => {
  const calls = [];
  const api = createFilePickApi({
    openFileDialog: async (exts, opts) => { calls.push(['file', exts, opts]); return ['D:/Site/IMG_1.jpg', 'D:/Site/IMG_2.jpg']; },
    openFolderDialog: async (title) => { calls.push(['folder', title]); return 'E:/Working'; },
  });
  assert.deepEqual(await api.pickFilePaths(['jpg', 'heic']), ['D:/Site/IMG_1.jpg', 'D:/Site/IMG_2.jpg']);
  assert.equal(await api.pickFolderPath('Save the copies in'), 'E:/Working');
  assert.deepEqual(calls, [['file', ['jpg', 'heic'], { multiple: true }], ['folder', 'Save the copies in']]);

  const cancelled = createFilePickApi({ openFileDialog: async () => null, openFolderDialog: async () => null });
  assert.deepEqual(await cancelled.pickFilePaths(), []);
  assert.equal(await cancelled.pickFolderPath(), null);
});

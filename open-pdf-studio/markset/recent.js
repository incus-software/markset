// Markset: which recent files the start screen lists. Pure.

/** Pinned files first, then the most recent, at most `limit`. */
export function startScreenRecents(files, limit = 8) {
  const list = (Array.isArray(files) ? files : []).filter(f => f && f.path);
  const byTime = (a, b) => (b.timestamp || 0) - (a.timestamp || 0);
  return [...list.filter(f => f.pinned).sort(byTime), ...list.filter(f => !f.pinned).sort(byTime)].slice(0, limit);
}

/** The folder part of a path, for the second line of an entry. */
export function folderOf(path) {
  const p = String(path || '');
  const i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
  return i > 0 ? p.slice(0, i) : '';
}

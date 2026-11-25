// Markset: a readable name for a tool id that has no translation, for the
// status bar's "Tool:" (StatusBar.jsx). Without it the bar showed internal ids
// such as "marksetTextHighlighter" or "markset-pro-deficiency-tool".
//
//   marksetTextHighlighter        -> Text highlighter
//   markset-pro-deficiency-tool   -> Deficiency
//   splineArrow                   -> Spline arrow

export function readableToolName(id) {
  let s = String(id || '').trim();
  if (!s) return '';
  s = s.replace(/^markset[-_]?(pro[-_])?/i, '').replace(/[-_]tool$/i, '');
  const words = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (!words.length) return String(id);
  const out = words.join(' ');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

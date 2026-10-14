// Markset: a smart template's own Properties section (markset.propertiesPanel,
// see hooks.js), mounted as plain DOM so a plugin can draw it without Solid.
//
// The renderer gets { params, setParam, onParamsChange }: params() reads the
// live params, setParam(key, value) writes one, onParamsChange(fn) calls fn
// with the new params after any change (undo, the sheet, another field).
import { onMount, onCleanup, createEffect, on } from 'solid-js';

export default function TemplatePanel(props) {
  let el;
  const listeners = new Set();
  onMount(() => {
    let cleanup;
    try {
      cleanup = props.render(el, {
        params: () => props.params(),
        setParam: (key, value) => props.setParam(key, value),
        onParamsChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
      });
    } catch (e) {
      console.warn('[markset] template properties panel failed:', e);
    }
    onCleanup(() => {
      listeners.clear();
      if (typeof cleanup === 'function') try { cleanup(); } catch { /* best effort */ }
    });
  });
  // Deep: the store may merge a new params object into the old one.
  createEffect(on(() => JSON.stringify(props.params()), () => {
    const p = props.params();
    for (const fn of listeners) try { fn(p); } catch { /* one listener does not stop the rest */ }
  }, { defer: true }));
  return <div ref={el} class="markset-template-panel" />;
}

// Meet zoomen op een groot blad in de enkele-paginaweergave, via de testrig.
//
// Per scenario (een reeks Ctrl+wiel-stappen op het midden van het beeld):
//   - langste framegat tijdens het gebaar (ms)          -> haperen
//   - tijd van de laatste wielstap tot het beeld scherp is (1:1 bitmap of
//     tegel op zoom x dpr die het hele zichtbare deel dekt)  -> nawazigheid
//   - de renders die het gebaar startte (paginabitmaps en tegels, met maat
//     en duur) en de grootste bitmap die op het scherm stond -> geheugen
//
// Voorwaarden (zelfde rig als verify-snelzoom.mjs):
//   - de app draait met --mcp-server en CDP via
//     WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<poort>
//
// Gebruik: node scripts/meet-zoom-scherpte.mjs <pdf>   (DPR=1.5 voor een 150 %-scherm)
// Een gegenereerd testblad: node scripts/maak-groot-vectorblad.mjs <uit.pdf>

const MCP = process.env.MCP_URL || 'http://127.0.0.1:9223/mcp';
const CDP_POORT = process.env.CDP_PORT || '9345';
const PDF = (process.argv[2] || '').replace(/\\/g, '/');
if (!PDF) { console.error('gebruik: node scripts/meet-zoom-scherpte.mjs <pdf>'); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mcpId = 0;
async function mcp(naam, args = {}) {
  const res = await fetch(MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++mcpId, method: 'tools/call', params: { name: naam, arguments: args } }),
  });
  const j = JSON.parse(await res.text());
  if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  const c = j?.result?.content?.[0];
  if (c?.type === 'text') { try { return JSON.parse(c.text); } catch { return c.text; } }
  return j.result;
}

let ws = null, cdpId = 0;
const wachters = new Map();
async function cdpVerbind() {
  const lijst = await (await fetch(`http://127.0.0.1:${CDP_POORT}/json/list`)).json();
  const page = lijst.find((t) => t.type === 'page');
  if (!page) throw new Error('geen CDP-pagina gevonden');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && wachters.has(m.id)) {
      const { res, rej } = wachters.get(m.id);
      wachters.delete(m.id);
      if (m.error) rej(new Error(JSON.stringify(m.error))); else res(m.result);
    }
  });
}
function cdp(method, params = {}) {
  return new Promise((res, rej) => { const id = ++cdpId; wachters.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
}
async function evalJs(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}

await cdpVerbind();
// Een dev-server compileert de app bij de eerste keer laden: wacht tot hij er is.
for (let i = 0; i < 240; i++) {
  const klaar = await evalJs(`!!(document.readyState === 'complete' && document.getElementById('pdf-canvas'))`).catch(() => false);
  if (klaar) break;
  await sleep(500);
}
await sleep(3000);
// DPR=1.5 bootst een scherm op 150 % Windows-schaal na (de meeste laptops).
if (process.env.DPR) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: 0, height: 0, deviceScaleFactor: Number(process.env.DPR), mobile: false });
  await sleep(1500);
  console.log('devicePixelRatio:', await evalJs('window.devicePixelRatio'));
}
console.log('open:', PDF.split('/').pop());
const open = await mcp('app_open_pdf', { path: PDF });
if (!open?.ok) throw new Error('openen mislukt: ' + JSON.stringify(open).slice(0, 200));
await sleep(6000);
await mcp('app_fit_page', {}).catch(() => {});
await sleep(4000);

// In-page meetkit: logregels van de renderpaden, een RAF-volger die per frame
// vastlegt of het beeld scherp is, en een wielvuurder.
await evalJs(`(() => {
  if (window.__zm) return true;
  const zm = window.__zm = { logs: [], frames: [], aan: false };
  const orig = console.log;
  console.log = function (...a) {
    try {
      const s = String(a[0] ?? '');
      if (/^\\[(pbc|tile-orch|zoom-render)\\]/.test(s)) zm.logs.push({ t: performance.now(), s });
    } catch {}
    return orig.apply(this, a);
  };
  const scherp = () => {
    const v = window.__pdfViewport;
    const dpr = window.devicePixelRatio || 1;
    const c = document.getElementById('pdf-canvas');
    if (!v || !c) return { scherp: false };
    const need = v.zoom * dpr;
    const cssW = c.width / dpr, cssH = c.height / dpr;
    // Zichtbaar deel in paginapunten (geen weergaverotatie in deze meting).
    const x0 = Math.max(0, -v.offsetX / v.zoom), y0 = Math.max(0, -v.offsetY / v.zoom);
    const x1 = Math.min(v.pageW, (cssW - v.offsetX) / v.zoom), y1 = Math.min(v.pageH, (cssH - v.offsetY) / v.zoom);
    const m = v.currentTileMeta;
    const tegelDekt = !!(v.currentTile && m && m.regionXpt <= x0 + 0.5 && m.regionYpt <= y0 + 0.5
      && m.regionXpt + m.regionWpt >= x1 - 0.5 && m.regionYpt + m.regionHpt >= y1 - 0.5);
    const tegelScherp = tegelDekt && Math.abs(m.renderScale / need - 1) < 0.02;
    const b = v.currentBitmap;
    const bitmapScherp = !!(b && b.width > 0 && Math.abs(b.width / (v.pageW * need) - 1) < 0.02);
    return {
      scherp: tegelScherp || bitmapScherp,
      bmp: b ? b.width * b.height : 0,
      bmpW: b ? b.width : 0, bmpH: b ? b.height : 0,
      tile: v.currentTile ? v.currentTile.width * v.currentTile.height : 0,
      // Resolutie van wat er nu staat t.o.v. wat het scherm vraagt (1 = 1:1).
      // Dekt de tegel het beeld, dan telt de tegel; anders de paginabitmap.
      res: tegelDekt ? m.renderScale / need : (b && b.width > 0 ? b.width / (v.pageW * need) : 0),
    };
  };
  zm.scherp = scherp;
  let vorige = 0;
  const lus = (t) => {
    if (zm.aan) {
      const s = scherp();
      zm.frames.push({ t, gap: vorige ? t - vorige : 0, ...s });
    }
    vorige = t;
    requestAnimationFrame(lus);
  };
  requestAnimationFrame(lus);
  zm.vuur = (dy) => {
    const c = document.getElementById('pdf-canvas');
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new WheelEvent('wheel', {
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      deltaY: dy, deltaMode: 0, ctrlKey: true, bubbles: true, cancelable: true,
    }));
  };
  return true;
})()`);

async function scenario(naam, stappen, tussenMs, wachtMs = 8000) {
  const r = JSON.parse(await evalJs(`(async () => {
    const zm = window.__zm;
    const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
    zm.logs = []; zm.frames = []; zm.aan = true;
    const t0 = performance.now();
    const z0 = window.__pdfViewport.zoom;
    for (const dy of ${JSON.stringify(stappen)}) { zm.vuur(dy); await slaap(${tussenMs}); }
    const tLaatste = performance.now();
    const z1 = window.__pdfViewport.zoom;
    // Wacht tot scherp (of de wachttijd om is).
    let tScherp = null;
    while (performance.now() - tLaatste < ${wachtMs}) {
      await slaap(50);
      if (zm.scherp().scherp) { tScherp = performance.now(); break; }
    }
    await slaap(600);
    zm.aan = false;
    const tijdens = zm.frames.filter((f) => f.t >= t0 && f.t <= tLaatste + 200);
    const na = zm.frames.filter((f) => f.t > tLaatste);
    // Werd het beeld na scherp nog eens wazig (vervangen door een grovere)?
    const terugval = tScherp ? na.filter((f) => f.t > tScherp + 30 && !f.scherp).length : null;
    return JSON.stringify({
      zoom: [+z0.toFixed(3), +z1.toFixed(3)],
      dpr: window.devicePixelRatio,
      maxFrameGapTijdensMs: Math.round(Math.max(0, ...tijdens.map((f) => f.gap))),
      maxFrameGapNaMs: Math.round(Math.max(0, ...na.map((f) => f.gap))),
      totScherpMs: tScherp ? Math.round(tScherp - tLaatste) : 'niet binnen ${wachtMs}ms',
      terugvalFrames: terugval,
      // Hoe grof was het beeld tussen de laatste stap en scherp: de laagste
      // resolutieverhouding, en hoe lang het onder de helft zat.
      minResNa: +Math.min(1, ...na.filter((f) => !tScherp || f.t <= tScherp).map((f) => f.res)).toFixed(3),
      grofMs: Math.round(na.filter((f) => f.res < 0.5 && (!tScherp || f.t <= tScherp)).reduce((a, f) => a + f.gap, 0)),
      piekBitmapMpx: +(Math.max(0, ...zm.frames.map((f) => f.bmp)) / 1e6).toFixed(1),
      piekBitmap: (() => { const f = zm.frames.reduce((a, b) => (b.bmp > (a?.bmp || 0) ? b : a), null); return f ? f.bmpW + 'x' + f.bmpH : '-'; })(),
      piekTegelMpx: +(Math.max(0, ...zm.frames.map((f) => f.tile)) / 1e6).toFixed(1),
      // De drie langste framegaten, met het moment (ms na de eerste stap) waarop ze eindigden.
      gaten: zm.frames.slice().sort((x, y) => y.gap - x.gap).slice(0, 3).filter((f) => f.gap > 40)
        .map((f) => Math.round(f.t - t0) + 'ms:' + Math.round(f.gap)),
      renders: zm.logs.map((l) => Math.round(l.t - t0) + 'ms ' + l.s.slice(0, 110)),
    });
  })()`));
  console.log(`\n== ${naam}`);
  const { renders, ...rest } = r;
  console.log(JSON.stringify(rest));
  for (const l of renders) console.log('   ', l);
  return r;
}

const uitslag = [];
uitslag.push(await scenario('in: 6 wielklikken, 120 ms uit elkaar (fit -> ~2x)', Array(6).fill(-100), 120));
uitslag.push(await scenario('in: snelle burst 8 klikken, 30 ms', Array(8).fill(-100), 30));
uitslag.push(await scenario('in: nog 4 klikken, 120 ms (hoog zoomniveau)', Array(4).fill(-100), 120));
uitslag.push(await scenario('uit: 6 klikken, 120 ms', Array(6).fill(100), 120));
uitslag.push(await scenario('uit: burst 10 klikken, 30 ms', Array(10).fill(100), 30));
uitslag.push(await scenario('in: 3 klikken, 250 ms (stap voor stap)', Array(3).fill(-100), 250));

const welScherp = uitslag.filter((u) => typeof u.totScherpMs === 'number').length;
console.log(`\nscherp binnen de wachttijd: ${welScherp}/${uitslag.length}`);
process.exit(0);

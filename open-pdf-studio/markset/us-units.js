// Markset: US customary units — feet-inch fractions, US drawing scales and
// ANSI/ARCH sheet sizes.
//
// Dependency-free so it runs directly under `node --test`. The app keeps its
// own unit model (a length is a number plus 'mm' | 'cm' | 'm' | 'in' | 'ft',
// a scale is "1:N"); everything here maps onto that model instead of
// replacing it, so upstream files only need small hooks.

export const MM_PER_UNIT = Object.freeze({
  mm: 1, cm: 10, dm: 100, m: 1000, km: 1000000,
  in: 25.4, ft: 304.8, yd: 914.4, mi: 1609344,
});

export const FRACTION_DENOMINATORS = Object.freeze([2, 4, 8, 16, 32, 64]);
export const DEFAULT_DENOMINATOR = 16;

const UNIT_ALIASES = {
  mm: 'mm', millimeter: 'mm', millimeters: 'mm', millimetre: 'mm', millimetres: 'mm',
  cm: 'cm', centimeter: 'cm', centimeters: 'cm', centimetre: 'cm', centimetres: 'cm',
  dm: 'dm',
  m: 'm', meter: 'm', meters: 'm', metre: 'm', metres: 'm',
  km: 'km', kilometer: 'km', kilometers: 'km', kilometre: 'km', kilometres: 'km',
  in: 'in', inch: 'in', inches: 'in', '"': 'in',
  ft: 'ft', foot: 'ft', feet: 'ft', "'": 'ft',
  yd: 'yd', yard: 'yd', yards: 'yd',
  mi: 'mi', mile: 'mi', miles: 'mi',
  px: 'px', pixel: 'px', pixels: 'px',
};

/** Canonical unit for an alias ("feet" → "ft"), or null when unknown. */
export function normalizeUnit(raw) {
  if (raw == null) return null;
  return UNIT_ALIASES[String(raw).trim().toLowerCase()] || null;
}

// Exact factors between imperial units; going through mm gives 12.000000000000002.
const IN_PER_UNIT = { in: 1, ft: 12, yd: 36, mi: 63360 };

/** Convert a length between units that MM_PER_UNIT knows. NaN otherwise. */
export function convertLength(value, from, to) {
  if (from === to) return value;
  if (IN_PER_UNIT[from] && IN_PER_UNIT[to]) return (value * IN_PER_UNIT[from]) / IN_PER_UNIT[to];
  const a = MM_PER_UNIT[from];
  const b = MM_PER_UNIT[to];
  if (!a || !b) return NaN;
  return (value * a) / b;
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function validDenominator(d) {
  return FRACTION_DENOMINATORS.includes(d) ? d : DEFAULT_DENOMINATOR;
}

// Whole inches plus a reduced fraction: (6, 6, 16) → "6 3/8". With
// keepZero (feet-inch text) a zero stays: (0, 4, 16) → "0 1/4", not "1/4".
function inchText(whole, num, den, keepZero = false) {
  if (!num) return String(whole);
  const g = gcd(num, den);
  const frac = `${num / g}/${den / g}`;
  return whole || keepZero ? `${whole} ${frac}` : frac;
}

/**
 * A length in feet as feet-inch text, rounded to 1/denominator inch:
 * 12.53125 → `12'-6 3/8"`, 0.5 → `0'-6"`, 2 → `2'-0"`.
 */
export function formatFeetInches(feet, denominator = DEFAULT_DENOMINATOR) {
  const den = validDenominator(denominator);
  if (!Number.isFinite(feet)) return '';
  const sign = feet < 0 ? '-' : '';
  const ticks = Math.round(Math.abs(feet) * 12 * den); // in 1/den inch
  const perFoot = 12 * den;
  const ft = Math.floor(ticks / perFoot);
  const rest = ticks - ft * perFoot;
  return `${sign}${ft}'-${inchText(Math.floor(rest / den), rest % den, den, true)}"`;
}

/**
 * A length in inches as fractional inch text, rounded to 1/denominator:
 * 6.375 → `6 3/8"`, 0.25 → `1/4"`.
 */
export function formatFractionalInches(inches, denominator = DEFAULT_DENOMINATOR) {
  const den = validDenominator(denominator);
  if (!Number.isFinite(inches)) return '';
  const sign = inches < 0 ? '-' : '';
  const ticks = Math.round(Math.abs(inches) * den);
  return `${sign}${inchText(Math.floor(ticks / den), ticks % den, den)}"`;
}

// "6", "6.5", ".5", "6 3/8", "6-3/8", "3/8" → number, or NaN.
const NUMBER = String.raw`(?:\d+(?:\.\d*)?|\.\d+)`;
const MIXED = String.raw`(?:${NUMBER}(?:[\s-]+\d+\/\d+)?|\d+\/\d+)`;

function parseMixed(text) {
  const s = text.trim();
  let m = s.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : NaN;
  m = s.match(new RegExp(String.raw`^(${NUMBER})[\s-]+(\d+)\/(\d+)$`));
  if (m) return Number(m[3]) ? Number(m[1]) + Number(m[2]) / Number(m[3]) : NaN;
  return new RegExp(`^${NUMBER}$`).test(s) ? Number(s) : NaN;
}

const FEET_MARK = String.raw`(?:'|ft\.?|feet|foot)`;
const INCH_MARK = String.raw`(?:"|''|in\.?|inch|inches)`;
const FEET_INCH = new RegExp(
  String.raw`^(${NUMBER})\s*${FEET_MARK}(?:\s*-?\s*(${MIXED})\s*${INCH_MARK}?)?$`, 'i');
const VALUE_UNIT = new RegExp(String.raw`^(${MIXED})\s*([a-zA-Zµ"']+\.?)?$`);

/**
 * Parse a typed length. Accepts metric and decimal input ("1500", "1,5 m",
 * "12.5 ft") and US feet-inch input ("12'-6 3/8\"", "12' 6\"", "12ft 6in",
 * "6 3/8\"", "3/8 in"). Feet-inch input returns unit 'ft'.
 * @returns {{ value: number, unit: string } | null}
 */
export function parseLength(input, fallbackUnit = 'mm') {
  let s = String(input ?? '').trim()
    .replace(/[′’]/g, "'")            // ′ ’ → '
    .replace(/[″”“]/g, '"')      // ″ ” “ → "
    .replace(/\s+/g, ' ');
  if (!s) return null;
  // A decimal comma ("1,5 m") — only when no fraction slash is involved.
  if (!s.includes('/')) s = s.replace(/(\d),(\d)/g, '$1.$2');

  let m = s.match(FEET_INCH);
  if (m) {
    const ft = Number(m[1]);
    const inches = m[2] != null ? parseMixed(m[2]) : 0;
    if (!Number.isFinite(ft) || !Number.isFinite(inches)) return null;
    const value = ft + inches / 12;
    return value > 0 ? { value, unit: 'ft' } : null;
  }

  m = s.match(VALUE_UNIT);
  if (!m) return null;
  const value = parseMixed(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (!m[2]) return { value, unit: fallbackUnit };
  const unit = normalizeUnit(m[2].replace(/\.$/, '')) || (m[2] === "''" ? 'in' : null);
  return unit ? { value, unit } : null;
}

/** parseLength, converted to `unit`. Returns a positive number or NaN. */
export function parseLengthAs(input, unit) {
  const parsed = parseLength(input, unit);
  if (!parsed) return NaN;
  return convertLength(parsed.value, parsed.unit, unit);
}

// --- Scales ---------------------------------------------------------------
//
// A US scale "P\" = 1'-0\"" is the ratio 1:(12/P); "1\" = N'" is 1:(12·N).
// Ratios match the app's "1:N" scaleRatio, so nothing new is persisted.

/** Architectural scales, smallest first. */
export const ARCHITECTURAL_SCALES = Object.freeze([
  { label: '1/16" = 1\'-0"', ratio: 192 },
  { label: '3/32" = 1\'-0"', ratio: 128 },
  { label: '1/8" = 1\'-0"', ratio: 96 },
  { label: '3/16" = 1\'-0"', ratio: 64 },
  { label: '1/4" = 1\'-0"', ratio: 48 },
  { label: '3/8" = 1\'-0"', ratio: 32 },
  { label: '1/2" = 1\'-0"', ratio: 24 },
  { label: '3/4" = 1\'-0"', ratio: 16 },
  { label: '1" = 1\'-0"', ratio: 12 },
  { label: '1 1/2" = 1\'-0"', ratio: 8 },
  { label: '3" = 1\'-0"', ratio: 4 },
].map(Object.freeze));

/** Civil/engineering scales. */
export const ENGINEERING_SCALES = Object.freeze([
  { label: '1" = 10\'', ratio: 120 },
  { label: '1" = 20\'', ratio: 240 },
  { label: '1" = 30\'', ratio: 360 },
  { label: '1" = 40\'', ratio: 480 },
  { label: '1" = 50\'', ratio: 600 },
  { label: '1" = 60\'', ratio: 720 },
  { label: '1" = 100\'', ratio: 1200 },
].map(Object.freeze));

export const US_SCALES = Object.freeze([...ARCHITECTURAL_SCALES, ...ENGINEERING_SCALES]);

/** The US label for a ratio ("1:48" or 48 → `1/4" = 1'-0"`), or null. */
export function usScaleLabel(ratio) {
  const n = typeof ratio === 'string' ? Number(ratio.match(/^1:(\d+(?:\.\d+)?)$/)?.[1]) : Number(ratio);
  return US_SCALES.find(s => s.ratio === n)?.label || null;
}

/** PDF points per real foot at 1:ratio (72 pt per paper inch). */
export function pointsPerFoot(ratio) {
  return (72 * 12) / ratio;
}

// `1/4" = 1'-0"`, `1 1/2"=1'-0"`, `1-1/2" = 1'-0"`, `1" = 20'`,
// `1" = 20'-0"`, `1/8 in = 1 ft`. The paper size may not follow a digit, dot,
// slash or hyphen, so a sheet number like "A-101" is never read as inches.
const US_SCALE_TEXT = new RegExp(
  String.raw`(?<![\d./-])(\d+(?:[ -]\d+\/\d+)?|\d+\/\d+|\d*\.\d+)\s*${INCH_MARK}\s*=\s*(\d+)\s*${FEET_MARK}(?:\s*-?\s*(\d+(?:\.\d+)?)\s*${INCH_MARK})?`, 'gi');

/**
 * Find a US drawing scale in text. Returns the 1:N ratio, rounded to 3
 * decimals, or null. Only ratios from 1 to 10000 count as scales; other
 * matches are skipped and the search goes on.
 * @returns {{ ratio: number, scaleText: string } | null}
 */
export function findUsScale(text) {
  const s = String(text ?? '')
    .replace(/[′’]/g, "'")
    .replace(/[″”“]/g, '"');
  const re = new RegExp(US_SCALE_TEXT.source, US_SCALE_TEXT.flags);
  let m;
  while ((m = re.exec(s))) {
    const paperIn = parseMixed(m[1]);
    const realIn = Number(m[2]) * 12 + (m[3] != null ? Number(m[3]) : 0);
    const ratio = Math.round((realIn / paperIn) * 1000) / 1000;
    if (paperIn > 0 && ratio >= 1 && ratio <= 10000) return { ratio, scaleText: m[0].trim() };
    re.lastIndex = m.index + 1;
  }
  return null;
}

// --- Sheet sizes ------------------------------------------------------------
//
// Same shape as NewDocDialog's PAPER_SIZES (points, portrait) so they can be
// spread straight into it. widthIn/heightIn drive the option labels.

function sheet(label, widthIn, heightIn) {
  return Object.freeze({
    label,
    width: widthIn * 72,
    height: heightIn * 72,
    widthIn,
    heightIn,
    widthMm: Math.round(widthIn * 25.4),
    heightMm: Math.round(heightIn * 25.4),
  });
}

export const ANSI_SHEETS = Object.freeze({
  'ansi-a': sheet('ANSI A', 8.5, 11),
  'ansi-b': sheet('ANSI B', 11, 17),
  'ansi-c': sheet('ANSI C', 17, 22),
  'ansi-d': sheet('ANSI D', 22, 34),
  'ansi-e': sheet('ANSI E', 34, 44),
});

export const ARCH_SHEETS = Object.freeze({
  'arch-a': sheet('ARCH A', 9, 12),
  'arch-b': sheet('ARCH B', 12, 18),
  'arch-c': sheet('ARCH C', 18, 24),
  'arch-d': sheet('ARCH D', 24, 36),
  'arch-e1': sheet('ARCH E1', 30, 42),
  'arch-e': sheet('ARCH E', 36, 48),
});

export const US_SHEETS = Object.freeze({ ...ANSI_SHEETS, ...ARCH_SHEETS });

/** Option label for a sheet: "ARCH D (24 x 36 in)". */
export function sheetOptionLabel(key) {
  const s = US_SHEETS[key];
  return s ? `${s.label} (${s.widthIn} x ${s.heightIn} in)` : '';
}

// --- Display ----------------------------------------------------------------

/**
 * Feet-inch display for a measured length, or null when the caller should
 * use its normal decimal formatting. `format` is the measureImperialFormat
 * preference: 'feet-inch' (default) or 'decimal'. Areas (ft², in²) always
 * stay decimal.
 */
export function formatImperialLength(value, unit, format = 'feet-inch', denominator = DEFAULT_DENOMINATOR) {
  if (format === 'decimal' || !Number.isFinite(value)) return null;
  if (unit === 'ft') return formatFeetInches(value, denominator);
  if (unit === 'in') return formatFractionalInches(value, denominator);
  return null;
}

/**
 * Feet-inch text for a ft/in length when the preferences ask for it, else
 * `fallback` (the caller's own decimal text). `prefs` is state.preferences.
 * Lets upstream call sites keep their expression as the fallback.
 */
export function imperialOr(value, unit, prefs, fallback) {
  return formatImperialLength(value, unit, prefs?.measureImperialFormat,
    prefs?.measureFractionDenominator) ?? fallback;
}

// --- Unit system ------------------------------------------------------------
//
// The unitSystem preference ('us' by default in Markset, or 'metric') picks the
// starting values of the scale and sheet dialogs. Existing scales on a
// document always win; this only fills in what the user has not chosen yet.

export const UNIT_SYSTEMS = Object.freeze(['us', 'metric']);

const DEFAULTS = Object.freeze({
  us: Object.freeze({ unit: 'ft', ratio: 48, scaleString: '1:48', viewportPreset: 'us:48', paper: 'arch-d' }),
  metric: Object.freeze({ unit: 'mm', ratio: 100, scaleString: '1:100', viewportPreset: '100', paper: 'a1' }),
});

/** Dialog defaults for the unit system in `prefs` (state.preferences). */
export function unitDefaultsFor(prefs) {
  return prefs?.unitSystem === 'metric' ? DEFAULTS.metric : DEFAULTS.us;
}

// A new scale bar: 5 m in metric units, 20' (5' steps) or 24" (6" steps) in
// imperial ones. Unknown units keep the old 5000-unit default.
const SCALE_BAR_DEFAULTS = {
  mm: [5000, 5], cm: [500, 5], m: [5, 5], ft: [20, 4], in: [24, 4],
};

/** { totalUnits, divisions } for a new scale bar in `unit`. */
export function defaultScaleBar(unit) {
  const [totalUnits, divisions] = SCALE_BAR_DEFAULTS[unit] || [5000, 5];
  return { totalUnits, divisions };
}

// `12'-6 3/8"`, `0'-6"`, `3/8"`, `6 3/8"`: the unit marks are part of the
// number, so a "hide the unit" option must leave them alone.
const FEET_INCH_TEXT = /(?:\d+'-)?(?:\d+(?: \d+\/\d+)?|\d+\/\d+)"$/;

export function isFeetInchText(text) {
  return typeof text === 'string' && FEET_INCH_TEXT.test(text.trim());
}

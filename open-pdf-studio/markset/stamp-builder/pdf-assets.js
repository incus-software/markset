// Markset: a review stamp's logo is stored ONCE per PDF, however many stamps
// use it. Without this every placed stamp carried the logo twice: as the
// image in its appearance and as a base64 data URL inside its OPS_Params.
//
//  - Saving: the logo's original PNG/JPEG bytes go into one stream per PDF
//    (shared by reference through each stamp's OPS_MarksetLogo key), and the
//    stamp's OPS_Params says `logo: "markset-asset:logo"` instead of the data
//    URL. The appearance image is embedded once too (embedSmartImages).
//  - Opening: the stream is read back into the data URL.
//
// Files saved before this change keep working: their params hold the data URL.
import { STAMP_TEMPLATE_ID } from './layout.js';

export const LOGO_REF = 'markset-asset:logo';
const DATA_URL = /^data:image\/(png|jpe?g);base64,(.+)$/i;
const shared = new WeakMap(); // pdf-lib document -> Map(data URL -> stream ref)

export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

/**
 * Params to write for annotation `ann`, plus extra annotation keys. For a
 * stamp with a logo: the logo becomes a reference to one shared stream.
 * Anything else is returned unchanged with no extra keys.
 */
export function stampParamsForSave(ann, pdfDoc) {
  const params = ann?.params || {};
  const m = ann?.symbolId === STAMP_TEMPLATE_ID && DATA_URL.exec(String(params.logo || ''));
  if (!m || !pdfDoc?.context) return { params, extra: {} };
  let byUrl = shared.get(pdfDoc);
  if (!byUrl) shared.set(pdfDoc, (byUrl = new Map()));
  let ref = byUrl.get(params.logo);
  if (!ref) {
    const kind = m[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
    const stream = pdfDoc.context.stream(base64ToBytes(m[2]), { OPS_ImageType: kind });
    ref = pdfDoc.context.register(stream);
    byUrl.set(params.logo, ref);
  }
  return { params: { ...params, logo: LOGO_REF }, extra: { OPS_MarksetLogo: ref } };
}

/** The logo data URL from an annotation's OPS_MarksetLogo value, or undefined. */
export function readStampLogo(context, raw, PDFName) {
  try {
    const stream = context.lookup(raw) || raw;
    const bytes = typeof stream?.getContents === 'function' ? stream.getContents() : stream?.contents;
    if (!bytes?.length) return undefined;
    const type = String(stream.dict?.get(PDFName.of('OPS_ImageType')) || '').replace(/^\//, '');
    return `data:image/${type === 'jpeg' ? 'jpeg' : 'png'};base64,${bytesToBase64(bytes)}`;
  } catch { return undefined; }
}

/** Params as loaded: the logo reference replaced by the logo itself. */
export function restoreStampParams(params, logo) {
  if (params?.logo !== LOGO_REF) return params;
  return { ...params, logo: logo || '' };
}

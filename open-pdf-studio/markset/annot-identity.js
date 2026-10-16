// Markset: the page link (/P) and a stable unique name (/NM) on every saved
// markup. Both are optional in the PDF standard, but the comment lists of
// other PDF apps use /NM to tell markups apart (and to match them between
// versions of a set), and some readers expect /P.
//
// A markup keeps the name it was opened with (`pdfNm`, read by the loader);
// a new one is named from its Markset id. Names are kept unique per saved
// file, so a copied markup gets its own.
import { PDFName, PDFString } from 'pdf-lib';

const used = new WeakMap(); // PDF context -> names written in this save

const clean = (s) => String(s || '').replace(/[^A-Za-z0-9._{}-]/g, '').slice(0, 100);

export function setAnnotIdentity(annotDict, { pageRef, id, pdfNm, context }) {
  if (!annotDict || typeof annotDict.set !== 'function') return;
  if (pageRef && !annotDict.has(PDFName.of('P'))) annotDict.set(PDFName.of('P'), pageRef);
  if (annotDict.has(PDFName.of('NM'))) return;
  let names = context ? used.get(context) : null;
  if (context && !names) { names = new Set(); used.set(context, names); }
  let nm = clean(pdfNm);
  if (!nm || names?.has(nm)) nm = `markset-${clean(id) || Math.random().toString(36).slice(2, 10)}`;
  while (names?.has(nm)) nm = `${nm}-${Math.random().toString(36).slice(2, 6)}`;
  names?.add(nm);
  annotDict.set(PDFName.of('NM'), PDFString.of(nm));
}

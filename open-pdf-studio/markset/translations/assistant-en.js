// Markset: English text for upstream's assistant panel, which has its Dutch
// strings written into the code instead of the locale files. Applied at
// build time by vite-brand.mjs (like the product name), so the upstream files
// stay unchanged. translations.test.mjs fails when upstream changes one of
// these strings, so a merge can never silently bring the Dutch back.
//
// Each entry: [exact source text, replacement source text]. Both are pieces of
// JavaScript source, so quotes and escapes are written as they are in the file.
// The long instructions for the model (Dutch building skills) are not shown to
// the user and stay as they are; the model is told to answer in English.

export const ASSISTANT_EN = {
  'js/solid/components/AssistantPanel.jsx': [
    [String.raw`'Hallo! Ik ben de **OpenAEC-assistent**. Ik kan: 🌐 vertalen, 📝 samenvatten, ✏️ tekenen op de tekening, en 🚪 deuren herkennen. Kies hieronder een vaardigheid of stel je vraag.'`,
      String.raw`'Hi! I am the **Markset assistant**. I can 🌐 translate, 📝 summarize, ✏️ draw on the sheet and 🚪 find doors. Pick a skill below or ask a question.'`],
    [String.raw`'⚠️ Ongeldige Claude (Anthropic) API-sleutel. Controleer de sleutel via het 🔑-knopje rechtsboven in het paneel.'`,
      String.raw`'⚠️ Invalid Claude (Anthropic) API key. Check the key with the 🔑 button at the top right of the panel.'`],
    ['`⚠️ De Claude-API gaf een fout.\\n\\n_Detail: ${raw}_`', '`⚠️ The Claude API returned an error.\\n\\n_Detail: ${raw}_`'],
    [String.raw`'⚠️ Geen verbinding met de AI-dienst.'`, String.raw`'⚠️ Cannot reach the AI service.'`],
    ["`⚠️ AI-aanroep mislukt.\\n\\n_Detail: ${raw || 'onbekende fout'}_`", "`⚠️ The AI request failed.\\n\\n_Detail: ${raw || 'unknown error'}_`"],
    [String.raw`'Je bent de OpenAEC-assistent in Open PDF Studio (een PDF-annotatie-editor). Help de gebruiker met vragen over het geopende PDF-document en algemene taken.\n\n'`,
      String.raw`'You are the Markset assistant in Markset, a PDF markup app for architects, engineers and contractors. Help the user with questions about the open PDF and with general tasks.\n\n'`],
    [String.raw`'Geen antwoord ontvangen.'`, String.raw`'No answer received.'`],
    ["`${m.role === 'user' ? 'Gebruiker' : 'Assistent'}: ${m.content}`", "`${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`"],
    ['`Geopend document: ${docName}\\n\\n`', '`Open document: ${docName}\\n\\n`'],
    ['${history}\\n\\nAssistent:`', '${history}\\n\\nAssistant:`'],
    [String.raw`'niet verbonden'`, String.raw`'not connected'`],
    [String.raw`title={t('assistantTitle') || 'OpenAEC-assistent'}`, String.raw`title="Markset assistant"`],
    ['✨ OpenAEC-assistent', '✨ Markset assistant'],
    ['`werkt in: ${activeDocName()}', '`working in: ${activeDocName()}'],
    ['title="Claude (Anthropic) API-sleutel instellen"', 'title="Set your Claude (Anthropic) API key"'],
    ['placeholder="Claude (Anthropic) API-sleutel — sk-ant-…"', 'placeholder="Claude (Anthropic) API key — sk-ant-…"'],
    ['>Opslaan</button>', '>Save</button>'],
    ['>Denken…</div>', '>Thinking…</div>'],
    ['placeholder="Vraag iets over deze PDF…"', 'placeholder="Ask something about this PDF…"'],
  ],

  'js/assistant-skills.js': [
    [String.raw`label: 'Vertaal',`, String.raw`label: 'Translate',`],
    [String.raw`hint: 'Vertaal de tekst van het document',`, String.raw`hint: 'Translate the text of the document',`],
    [String.raw`invoke: 'Vertaal de tekst van het geopende document. Is het Nederlands, vertaal dan naar het Engels; anders naar het Nederlands. Geef de vertaling overzichtelijk terug.',`,
      String.raw`invoke: 'Translate the text of the open document into English. If it is already in English, ask me which language to translate it into. Lay the translation out clearly.',`],
    [String.raw`label: 'Vat samen',`, String.raw`label: 'Summarize',`],
    [String.raw`hint: 'Vat het document of de tekening samen',`, String.raw`hint: 'Summarize the document or drawing',`],
    [String.raw`invoke: 'Vat het geopende document of de tekening bondig samen: waar gaat het over, de belangrijkste onderdelen en eventuele aandachtspunten.',`,
      String.raw`invoke: 'Briefly summarize the open document or drawing: what it is about, the main parts and anything that needs attention.',`],
    [String.raw`label: 'Teken',`, String.raw`label: 'Draw',`],
    [String.raw`hint: 'Teken een element of annotatie op de tekening',`, String.raw`hint: 'Draw an element or markup on the sheet',`],
    [String.raw`invoke: 'Teken op de tekening: ',`, String.raw`invoke: 'Draw on the sheet: ',`],
    [String.raw`label: 'Herken deuren',`, String.raw`label: 'Find doors',`],
    [String.raw`hint: 'Detecteer de deuren in de plattegrond en markeer ze',`, String.raw`hint: 'Find the doors in the floor plan and mark them',`],
    [String.raw`invoke: 'Bekijk de plattegrond, herken de deuren en markeer elke deur op de tekening met een markering en een korte label.',`,
      String.raw`invoke: 'Look at the floor plan, find the doors and mark each door on the sheet with a markup and a short label.',`],
    [String.raw`label: 'Zet constructie uit',`, String.raw`label: 'Structural layout',`],
    [String.raw`hint: 'Stramien, kolommen, balken, vloervelden met overspanningsrichting en de constructiestaat',`,
      String.raw`hint: 'Column grid, columns, beams, floor bays with span direction, and a member schedule',`],
    [String.raw`invoke: 'Zet de draagstructuur uit op de tekening: stramien, kolommen op de knopen, balken op de rasterlijnen, per vloerveld de overspanningsrichting, peilmaten, positie-aanduidingen en een constructiestaat. Opgave: ',`,
      String.raw`invoke: 'Lay out the structure on the sheet: column grid, columns at the grid intersections, beams on the grid lines, the span direction of each floor bay, levels, member marks and a member schedule. Brief: ',`],
    [String.raw`'Antwoord in het Nederlands, bondig en praktisch. Voer gevraagde acties direct uit en meld kort wat je gedaan hebt.\n'`,
      String.raw`'Answer in English (or in the language the user writes in), briefly and practically. Text placed on the sheet is in English unless the user asks otherwise. Carry out requested actions right away and report briefly what you did.\n'`],
  ],

  'js/plattegrond/skill.js': [
    [String.raw`label: 'Plattegrond',`, String.raw`label: 'Floor plan',`],
    [String.raw`hint: 'Teken een bouwkundige plattegrond: wanden, kozijnen, ruimten, maatvoering en inrichting (sanitair, keuken)',`,
      String.raw`hint: 'Draw an architectural floor plan: walls, doors and windows, rooms, dimensions and fixtures (bathroom, kitchen)',`],
    [String.raw`invoke: 'Teken een bouwkundige plattegrond. Werk als tekenaar: zet eerst de schaal, teken dan de wanden met hun deuren en ramen erin, laat de ruimten zichzelf herkennen en zet er maatvoering bij. Wat er getekend moet worden: ',`,
      String.raw`invoke: 'Draw an architectural floor plan. Work like a drafter: set the scale first, then draw the walls with their doors and windows, let the rooms detect themselves and add dimensions. What to draw: ',`],
  ],

  'js/constructieoverzicht/skill.js': [
    [String.raw`label: 'Constructieoverzicht',`, String.raw`label: 'Structural overview',`],
    [String.raw`hint: 'Constructieoverzicht per bouwlaag op de plattegronden van de architect: fundering, vloeren met overspanning, onderliggende dragende wanden, liggers en kolommen, legenda en toelichting',`,
      String.raw`hint: 'Structural overview per level on the architect\'s floor plans: foundations, floors with span direction, bearing walls below, beams and columns, legend and notes',`],
    [String.raw`invoke: 'Maak een constructieoverzicht op dit blad met knipsels uit de plattegronden van de architect, per bouwlaag en volgens de conventies. Bron, bouwlagen en constructieprincipe: ',`,
      String.raw`invoke: 'Make a structural overview on this sheet from clippings of the architect\'s floor plans, one per level, following the usual conventions. Source, levels and structural system: ',`],
  ],

  'js/assistant-mcp-relay.js': [
    [String.raw`'assistent nog niet gereed'`, String.raw`'assistant not ready yet'`],
    [String.raw`'Geen MCP-client beantwoordde de vraag op tijd (time-out).'`, String.raw`'No MCP client answered the question in time (timeout).'`],
    ['`onbekende of verlopen vraag-id: ${id}`', '`unknown or expired question id: ${id}`'],
  ],
};

/** `code` of upstream file `relPath` (from open-pdf-studio/) with the English text. */
export function applyTranslations(code, relPath, table = ASSISTANT_EN) {
  const pairs = table[relPath];
  if (!pairs) return code;
  let out = code;
  for (const [from, to] of pairs) out = out.split(from).join(to);
  return out;
}

// Standaardwaarden van de AI-koppeling (MCP). Los van constants.ts zodat de
// unit-test ze zonder bundelaar kan lezen; DEFAULT_PREFERENCES neemt ze over.
export const MCP_STANDAARD = Object.freeze({
  // Markset: off by default (2026-11-24). While on, any program on this
  // computer can drive the app; people who use an AI tool turn it on.
  mcpEnabled: false,
  mcpPort: 9223,
});

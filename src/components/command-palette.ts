// @ts-nocheck
export function initCommandPalette() {
  document.getElementById('command-palette')?.remove();
  delete window.openCommandPalette;
}

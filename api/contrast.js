/* WCAG relative luminance and contrast ratio.
   Duplicated (deliberately, ~20 lines) in Site/v2/js/contrast.js — the API
   cannot import browser modules and the browser cannot require() this file.
   Keep both copies in sync. */

function hexToRgb(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function srgbChannel(v) {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(srgbChannel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* Returns contrast ratio between two hex colours (1–21), or null if either is invalid. */
function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

module.exports = { hexToRgb, luminance, ratio };

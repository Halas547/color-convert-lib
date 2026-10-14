/**
 * Core color conversion logic. All functions operate on plain integer/number
 * tuples and avoid floating-point round-tripping losses where possible.
 */

/**
 * Maximum legal value for an 8-bit color channel.
 */
export const MAX_CHANNEL = 255;

/**
 * Normalize a single channel value to the inclusive range [0, 255], rounded to
 * the nearest integer.
 *
 * Rationale: callers may pass negative values, values greater than 255, or
 * non-integers (e.g. from an HSL→RGB step). We clamp before rounding so that
 * out-of-gamut HSL inputs do not produce channel values like 256.
 */
function normalizeChannel(value) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Channel value must be finite: ${value}`);
  }
  if (value < 0) return 0;
  if (value > MAX_CHANNEL) return MAX_CHANNEL;
  return Math.round(value);
}

/**
 * Hue is conventionally an angle in degrees in [0, 360). Because it is
 * cyclic we normalize by modulo rather than clamping, so 360° and 480°
 * both become 0°.
 */
function normalizeHue(hue) {
  if (!Number.isFinite(hue)) {
    throw new RangeError(`Hue must be finite: ${hue}`);
  }
  const normalized = hue % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/**
 * Clamp a percentage-like ratio into [0, 1]. Saturation and lightness are
 * not cyclic, so we clamp instead of wrapping.
 */
function normalizeRatio(ratio) {
  if (!Number.isFinite(ratio)) {
    throw new RangeError(`Ratio must be finite: ${ratio}`);
  }
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

/**
 * @typedef {[number, number, number]} RGB
 * @typedef {[number, number, number]} HSL
 */

/**
 * Convert a hex color string to an [r, g, b] tuple of integers in [0, 255].
 *
 * Accepted forms: `#rgb`, `#rrggbb`, `rgb`, `rrggbb` (case-insensitive).
 * Leading `#` is optional. No shorthand expansion fuzziness: `#abc` maps to
 * `#aabbcc`, the standard CSS interpretation.
 *
 * @param {string} hex
 * @returns {RGB}
 */
export function hexToRgb(hex) {
  if (typeof hex !== 'string') {
    throw new TypeError(`hex must be a string, got ${typeof hex}`);
  }
  let s = hex.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (!/^[0-9a-fA-f]+$/.test(s)) {
    throw new RangeError(`Invalid hex color: ${hex}`);
  }
  let r, g, b;
  if (s.length === 3) {
    r = parseInt(s[0] + s[0], 16);
    g = parseInt(s[1] + s[1], 16);
    b = parseInt(s[2] + s[2], 16);
  } else if (s.length === 6) {
    r = parseInt(s.slice(0, 2), 16);
    g = parseInt(s.slice(2, 4), 16);
    b = parseInt(s.slice(4, 6), 16);
  } else {
    throw new RangeError(`Hex color must be 3 or 6 digits: ${hex}`);
  }
  return [r, g, b];
}

/**
 * Convert an [r, g, b] tuple to a lowercase `#rrggbb` hex string.
 *
 * Values are clamped to [0, 255] and rounded to integers, so passing the
 * raw output of an HSL→RGB conversion is safe.
 *
 * @param {RGB} rgb
 * @returns {string}
 */
export function rgbToHex(rgb) {
  const [r, g, b] = rgb;
  const toHex = (v) => normalizeChannel(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert an [r, g, b] tuple to an [h, s, l] tuple where:
 *   h ∈ [0, 360), s ∈ [0, 1], l ∈ [0, 1].
 *
 * We keep hue as a float rather than rounding so downstream code can make
 * its own precision decisions. Saturation and lightness are computed from
 * the normalized integer channels to keep the conversion stable.
 *
 * @param {RGB} rgb
 * @returns {HSL}
 */
export function rgbToHsl(rgb) {
  const [r0, g0, b0] = rgb;
  const r = normalizeChannel(r0) / MAX_CHANNEL;
  const g = normalizeChannel(g0) / MAX_CHANNEL;
  const b = normalizeChannel(b0) / MAX_CHANNEL;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [normalizeHue(h), s, l];
}

/**
 * Convert an [h, s, l] tuple to an [r, g, b] tuple of integers in [0, 255].
 *
 * h is in degrees (cyclic, any finite value accepted), s and l are ratios in
 * [0, 1] (clamped if out of range).
 *
 * @param {HSL} hsl
 * @returns {RGB}
 */
export function hslToRgb(hsl) {
  const [h0, s0, l0] = hsl;
  const h = normalizeHue(h0) / 360;
  const s = normalizeRatio(s0);
  const l = normalizeRatio(l0);

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [normalizeChannel(r * MAX_CHANNEL), normalizeChannel(g * MAX_CHANNEL), normalizeChannel(b * MAX_CHANNEL)];
}

/**
 * Convert a hex string directly to HSL, composing hexToRgb and rgbToHsl.
 *
 * @param {string} hex
 * @returns {HSL}
 */
export function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

/**
 * Convert an HSL tuple directly to a hex string, composing hslToRgb and
 * rgbToHex.
 *
 * @param {HSL} hsl
 * @returns {string}
 */
export function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}

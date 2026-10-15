import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
} from '../src/index.js';

/**
 * Helper: compare two HSL tuples with a fixed epsilon so we never use
 * strict equality on floating-point values.
 */
function assertHslClose(actual, expected, message, eps = 1e-9) {
  assert.equal(actual.length, 3, message);
  for (let i = 0; i < 3; i++) {
    assert.ok(
      Math.abs(actual[i] - expected[i]) < eps,
      `${message ?? ''} index ${i}: |${actual[i]} - ${expected[i]}| >= ${eps}`
    );
  }
}

// --- hexToRgb ---

test('hexToRgb parses 6-digit hex with hash', () => {
  assert.deepEqual(hexToRgb('#ff0080'), [255, 0, 128]);
});

test('hexToRgb parses 6-digit hex without hash', () => {
  assert.deepEqual(hexToRgb('00ff00'), [0, 255, 0]);
});

test('hexToRgb expands 3-digit shorthand', () => {
  assert.deepEqual(hexToRgb('#abc'), [170, 187, 204]);
});

test('hexToRgb is case-insensitive', () => {
  assert.deepEqual(hexToRgb('#AABBCC'), [170, 187, 204]);
});

test('hexToRgb rejects invalid characters', () => {
  assert.throws(() => hexToRgb('#gggggg'), RangeError);
});

test('hexToRgb rejects wrong length', () => {
  assert.throws(() => hexToRgb('#1234'), RangeError);
});

test('hexToRgb rejects non-string input', () => {
  assert.throws(() => hexToRgb(0xff0080), TypeError);
});

// --- rgbToHex ---

test('rgbToHex produces lowercase 6-digit output', () => {
  assert.equal(rgbToHex([255, 0, 128]), '#ff0080');
});

test('rgbToHex clamps out-of-range values', () => {
  assert.equal(rgbToHex([300, -10, 128]), '#ff0080');
});

test('rgbToHex rounds fractional channel values', () => {
  assert.equal(rgbToHex([127.6, 0.4, 128.5]), '#800081');
});

// --- round-trip stability ---

test('rgbToHex and hexToRgb round-trip exactly', () => {
  const original = '#3a5f0c';
  assert.equal(rgbToHex(hexToRgb(original)), original);
});

// --- rgbToHsl ---

test('rgbToHsl returns [0,0,0] for pure black', () => {
  assertHslClose(rgbToHsl([0, 0, 0]), [0, 0, 0]);
});

test('rgbToHsl returns [0,0,1] for pure white', () => {
  assertHslClose(rgbToHsl([255, 255, 255]), [0, 0, 1]);
});

test('rgbToHsl returns [0,1,0.5] for pure red', () => {
  assertHslClose(rgbToHsl([255, 0, 0]), [0, 1, 0.5]);
});

test('rgbToHsl returns [120,1,0.5] for pure green', () => {
  assertHslClose(rgbToHsl([0, 255, 0]), [120, 1, 0.5]);
});

test('rgbToHsl returns [240,1,0.5] for pure blue', () => {
  assertHslClose(rgbToHsl([0, 0, 255]), [240, 1, 0.5]);
});

test('rgbToHsl clamps invalid channel values before converting', () => {
  assertHslClose(rgbToHsl([300, -10, 0]), [0, 1, 0.5]);
});

// --- hslToRgb ---

test('hslToRgb converts pure red hue back to [255,0,0]', () => {
  assert.deepEqual(hslToRgb([0, 1, 0.5]), [255, 0, 0]);
});

test('hslToRgb converts pure green hue back to [0,255,0]', () => {
  assert.deepEqual(hslToRgb([120, 1, 0.5]), [0, 255, 0]);
});

test('hslToRgb handles grayscale (s=0) by setting all channels to l*255', () => {
  assert.deepEqual(hslToRgb([0, 0, 0.5]), [128, 128, 128]);
});

test('hslToRgb wraps hue cyclically (360 === 0)', () => {
  assert.deepEqual(hslToRgb([360, 1, 0.5]), [255, 0, 0]);
});

test('hslToRgb clamps saturation and lightness into range', () => {
  assert.deepEqual(hslToRgb([0, 2, -0.5]), [0, 0, 0]);
});

// --- composed conversions ---

test('hexToHsl matches rgbToHsl(hexToRgb(...))', () => {
  assertHslClose(hexToHsl('#ff0000'), rgbToHsl(hexToRgb('#ff0000')));
});

test('hslToHex matches rgbToHex(hslToRgb(...))', () => {
  assert.equal(hslToHex([0, 1, 0.5]), rgbToHex(hslToRgb([0, 1, 0.5])));
});

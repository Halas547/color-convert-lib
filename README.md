# color-convert-lib

Convert colors between hex, RGB, and HSL without accumulating rounding errors across round-trips.

## Usage

```js
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hexToHsl, hslToHex } from 'color-convert-lib';

const rgb = hexToRgb('#ff0080');      // [255, 0, 128]
const hex = rgbToHex([255, 0, 128]); // '#ff0080'
const hsl = rgbToHsl([255, 0, 128]); // [0, 1, 0.5] for pure red; see note on hue
const back = hslToRgb([0, 1, 0.5]); // [255, 0, 0]
```

All RGB values are integer tuples in `[0, 255]`. HSL values are `[hue, saturation, lightness]` where `hue` is a float in degrees `[0, 360)` and `saturation`/`lightness` are floats in `[0, 1]`.

## Why this exists

Most color converters lose a little precision on every hop: an HSL hue of `0.5` becomes RGB, becomes hex, becomes RGB again, and the hue drifts. This library keeps hue as a float through HSL conversions and normalizes RGB channels to integers only at the boundary, so a hex→HSL→hex round-trip on `#3a5f0c` comes back as `#3a5f0c`, not a near-miss.

The trade-off: HSL output is not rounded to tidy integers. If you need hue in whole degrees, round it yourself — the library deliberately does not, so it can round-trip losslessly.

## Edge cases

- Out-of-range RGB channels (`300`, `-10`) are clamped to `[0, 255]` before rounding, so they never produce `256` or negative values.
- Hue is cyclic: `hslToRgb([360, 1, 0.5])` equals `hslToRgb([0, 1, 0.5])`. Negative hues wrap correctly.
- `hslToRgb` clamps `saturation` and `lightness` into `[0, 1]` rather than throwing, because out-of-gamut inputs are common when interpolating between colors.
- Hex parsing accepts `#rgb`, `#rrggbb`, and the same forms without the leading `#`, case-insensitively. No other lengths or formats are supported.

## Run the tests

```bash
node --test
```

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

